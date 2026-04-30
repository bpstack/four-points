"""
model.py — Construye y resuelve el modelo CP-SAT para un mes de scheduling.

Constraints activas:
  H1 — Cobertura mínima M/T/N por día
  H2 — Bloque de noches: mínimo/máximo consecutivos, 1 bloque NUEVO por mes
  H3 — Transiciones prohibidas: N→M/T/PI/P, T→M
  H4 — Máximo días consecutivos de trabajo
  H5 — ≥2 descansos en ventana de 7 días
  H6 — Libres mensuales [min, max]
  H7 — Celdas bloqueadas; turnos especiales prohibidos fuera de bloqueos
  day_blocks — Bloques mínimos M/T; M→T prohibido
  employee_rules — noWeekends, fixedShift

Función objetivo (soft):
  S1 — Balanceo de noches: minimiza max(total_N) - min(total_N) entre empleados rotatorios
       usando nightsHistory (noches acumuladas en meses anteriores) + noches del mes actual.
  S2 — Libres sueltos: penaliza L aislado (sin L adyacente en el día anterior o siguiente).
  S3 — Preferencia de turno: penaliza días con turno distinto al shiftPriority del empleado.

Cross-month (días virtuales):
  Los empleados con previousMonthTail reciben variables para los días virtuales
  -TAIL_LENGTH...-1, bloqueadas desde el tail del mes anterior publicado.
  Todos los constraints iteran sobre (virt_days + real_days) de forma uniforme.
  El controller TS ignora las claves negativas del matrix al volcar en BD.

Nota: fixedDays se resuelve antes del solver — build-solver-input.ts inyecta el patrón
como lockedCells, por lo que el solver lo ve como H7.
"""

import time
from ortools.sat.python import cp_model

from schemas import SolverInput, SolverOutput, SolverSuccess, SolverInfeasible, SolverError, SolverStats
from constraints import coverage, rest, locked_cells, libres, night_block, transitions, day_blocks, employee_rules


ASSIGNABLE_SHIFTS = ["M", "T", "N", "L"]
WORK_SHIFTS       = {"M", "T", "N"}
TAIL_LENGTH       = 7   # días de historia del mes anterior usados como días virtuales


def solve(input: SolverInput) -> SolverOutput:
    t0 = time.time()

    employees   = input.employees
    days        = input.days
    cfg         = input.config
    num_emps    = len(employees)
    day_numbers = [d.dayNumber for d in days]

    emp_idx_by_id = {emp.id: i for i, emp in enumerate(employees)}

    # ── Conjunto de turnos posibles: ASSIGNABLE + locked cells + tail ─────────
    all_shifts_needed = set(ASSIGNABLE_SHIFTS)
    for day_map in input.lockedCells.values():
        all_shifts_needed.update(day_map.values())
    for tail_list in input.previousMonthTail.values():
        all_shifts_needed.update(tail_list)

    model = cp_model.CpModel()

    # ── Variables para días reales (1..31) ────────────────────────────────────
    x: dict = {}
    for e in range(num_emps):
        for d in day_numbers:
            for s in all_shifts_needed:
                x[e, d, s] = model.new_bool_var(f"x_{e}_{d}_{s}")

    for e in range(num_emps):
        for d in day_numbers:
            model.add_exactly_one(x[e, d, s] for s in all_shifts_needed)

    # ── Variables para días virtuales (días negativos del tail del mes anterior) ──
    # Empleados sin tail no reciben días virtuales → inicio de mes sin contexto.
    # Los días virtuales están inmediatamente bloqueados desde el tail.
    virtual_days_by_emp: dict[int, list[int]] = {}

    for e_idx, emp in enumerate(employees):
        raw_tail = input.previousMonthTail.get(emp.id, [])
        if not raw_tail:
            continue

        # Tomar últimos TAIL_LENGTH días; rellenar inicio con L si el tail es más corto
        tail   = list(raw_tail[-TAIL_LENGTH:])
        padded = ['L'] * (TAIL_LENGTH - len(tail)) + tail

        virt_days = list(range(-TAIL_LENGTH, 0))        # [-7, -6, ..., -1]
        virtual_days_by_emp[e_idx] = virt_days

        for k, d_virt in enumerate(virt_days):
            known_shift = padded[k]
            for s in all_shifts_needed:
                x[e_idx, d_virt, s] = model.new_bool_var(f"x_{e_idx}_{d_virt}_{s}")
            model.add_exactly_one(x[e_idx, d_virt, s] for s in all_shifts_needed)
            model.add(x[e_idx, d_virt, known_shift] == 1)

    # ── Aplicar constraints ───────────────────────────────────────────────────

    locked_cells.apply(model, x, input, emp_idx_by_id)
    coverage.apply(model, x, input, employees, days)
    rest.apply(model, x, input, employees, days, virtual_days_by_emp)
    libres.apply(model, x, input, employees, days)
    night_block.apply(model, x, input, employees, days, virtual_days_by_emp)
    transitions.apply(model, x, input, employees, days, virtual_days_by_emp)
    day_blocks.apply(model, x, input, employees, days, virtual_days_by_emp)
    employee_rules.apply(model, x, input, employees, days)

    # ── Función objetivo (soft constraints) ──────────────────────────────────
    # Pesos: S1 es el objetivo primario; S2 y S3 son secundarios.
    W_NIGHT_BALANCE  = 10   # S1: por noche de diferencia entre max y min empleado
    W_ISOLATED_L     = 2    # S2: por cada L aislado (sin L adyacente)
    W_SHIFT_PRIORITY = 1    # S3: por cada día con turno distinto al preferido

    objective_terms: list = []

    # ── S1: Balanceo de noches ────────────────────────────────────────────────
    # Empleados rotatorios (sin fixedShift): minimiza rango del total de noches
    # (histórico + mes actual). Con esto, el solver prefiere asignar noches a
    # los empleados con menos acumuladas, equilibrando el reparto a lo largo del año.
    hist = input.nightsHistory
    rotary_emps = [
        (e_idx, emp)
        for e_idx, emp in enumerate(employees)
        if not emp.rules.fixedShift
    ]
    night_range = None   # definido aquí para ser accesible en el bloque de output
    if len(rotary_emps) >= 2:
        big_M = len(day_numbers) + max(hist.values(), default=0) + 1
        total_nights_vars = []
        for e_idx, emp in rotary_emps:
            hist_n = hist.get(emp.id, 0)
            curr_n_expr = sum(
                x[e_idx, d, 'N']
                for d in day_numbers
                if (e_idx, d, 'N') in x
            )
            total = model.new_int_var(0, hist_n + len(day_numbers), f"total_n_{e_idx}")
            model.add(total == hist_n + curr_n_expr)
            total_nights_vars.append(total)

        max_n = model.new_int_var(0, big_M, "max_n")
        min_n = model.new_int_var(0, big_M, "min_n")
        model.add_max_equality(max_n, total_nights_vars)
        model.add_min_equality(min_n, total_nights_vars)
        night_range = model.new_int_var(0, big_M, "night_range")
        model.add(night_range == max_n - min_n)
        objective_terms.append(W_NIGHT_BALANCE * night_range)

    # ── S2: Libres sueltos ────────────────────────────────────────────────────
    # Penaliza L que no tiene ningún L adyacente (ni anterior ni siguiente).
    # Incentiva agrupar libres en pares/tríos en lugar de distribuirlos 1 a 1.
    for e_idx in range(num_emps):
        for pos, d in enumerate(day_numbers):
            if (e_idx, d, 'L') not in x:
                continue

            prev_d = day_numbers[pos - 1] if pos > 0 else None
            next_d = day_numbers[pos + 1] if pos < len(day_numbers) - 1 else None

            # Verificar si el día anterior es L (puede ser virtual)
            prev_L = None
            if prev_d is not None and (e_idx, prev_d, 'L') in x:
                prev_L = x[e_idx, prev_d, 'L']
            elif pos == 0:
                virt = virtual_days_by_emp.get(e_idx, [])
                if virt and (e_idx, virt[-1], 'L') in x:
                    prev_L = x[e_idx, virt[-1], 'L']

            next_L = x[e_idx, next_d, 'L'] if next_d is not None and (e_idx, next_d, 'L') in x else None

            iso = model.new_bool_var(f"iso_{e_idx}_{d}")

            # Condiciones necesarias (upper bounds):
            model.add(iso <= x[e_idx, d, 'L'])
            if prev_L is not None:
                model.add(iso <= 1 - prev_L)
            if next_L is not None:
                model.add(iso <= 1 - next_L)

            # Condición suficiente (lower bound: iso ≥ L - prev_L - next_L):
            lb = x[e_idx, d, 'L']
            if prev_L is not None:
                lb = lb - prev_L
            if next_L is not None:
                lb = lb - next_L
            model.add(iso >= lb)

            objective_terms.append(W_ISOLATED_L * iso)

    # ── S3: Preferencia de turno (shiftPriority) ──────────────────────────────
    # Penaliza días de trabajo con turno distinto al preferido del empleado.
    for e_idx, emp in enumerate(employees):
        priority = emp.rules.shiftPriority
        if not priority or priority not in WORK_SHIFTS:
            continue
        for d in day_numbers:
            for s in WORK_SHIFTS:
                if s != priority and (e_idx, d, s) in x:
                    objective_terms.append(W_SHIFT_PRIORITY * x[e_idx, d, s])

    if objective_terms:
        model.minimize(cp_model.LinearExpr.Sum(objective_terms))

    # ── Resolver ──────────────────────────────────────────────────────────────

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(input.options.timeoutSeconds)
    solver.parameters.log_search_progress = False
    if input.options.seed is not None:
        solver.parameters.random_seed = input.options.seed

    status = solver.solve(model)
    elapsed_ms  = int((time.time() - t0) * 1000)
    status_name = solver.status_name(status)

    # ── Construir output ──────────────────────────────────────────────────────

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        matrix: dict[str, dict[str, str]] = {}
        for e_idx, emp in enumerate(employees):
            matrix[emp.id] = {}
            # Días reales
            for d in day_numbers:
                for s in all_shifts_needed:
                    if solver.value(x[e_idx, d, s]):
                        matrix[emp.id][str(d)] = s
                        break
            # Días virtuales (debug): claves negativas ignoradas por el controller TS
            # al aplicar la matriz en BD (dayMap.get(negative) === undefined → skip).
            for d in virtual_days_by_emp.get(e_idx, []):
                for s in all_shifts_needed:
                    if (e_idx, d, s) in x and solver.value(x[e_idx, d, s]):
                        matrix[emp.id][str(d)] = s
                        break

        soft_penalty = int(solver.objective_value) if objective_terms else 0
        # softPenaltyBreakdown solo incluye S1 (night_balance).
        # S2 (isolated_L) y S3 (shift_priority) contribuyen al softPenalty total
        # pero no se desglosan individualmente (calcularlos requeriría iterar sobre
        # todas las variables iso/priority del solver, que no se almacenan por separado).
        soft_breakdown: dict[str, int] = {}
        if night_range is not None:
            night_r = solver.value(night_range)
            soft_breakdown["night_balance"] = W_NIGHT_BALANCE * night_r

        return SolverSuccess(
            status="ok",
            matrix=matrix,
            stats=SolverStats(
                solveTimeMs=elapsed_ms,
                hardConstraintsSatisfied=True,
                softPenalty=soft_penalty,
                softPenaltyBreakdown=soft_breakdown,
                status=status_name,
            ),
        )

    elif status == cp_model.INFEASIBLE:
        return SolverInfeasible(
            status="infeasible",
            conflictingConstraints=[{
                "constraintName": "unknown",
                "humanExplanation": (
                    "No se encontro solucion factible con las constraints actuales. "
                    f"Tiempo: {elapsed_ms}ms."
                ),
            }],
            suggestedRelaxations=[
                {
                    "constraint": "minMonthlyLibre",
                    "currentValue": cfg.minMonthlyLibre,
                    "proposedValue": max(7, cfg.minMonthlyLibre - 1),
                    "impact": "Reducir libres minimos puede desbloquear la solucion",
                },
                {
                    "constraint": "minMorningStaff",
                    "currentValue": cfg.minMorningStaff,
                    "proposedValue": max(0, cfg.minMorningStaff - 1),
                    "impact": "Reducir cobertura minima de manana puede desbloquear la solucion",
                },
            ],
        )

    else:
        return SolverError(
            status="error",
            errorCode="TIMEOUT" if status == cp_model.UNKNOWN else "INTERNAL",
            message=f"Solver termino con status {status_name} en {elapsed_ms}ms",
        )
