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
# Turnos que cuentan como "día de trabajo" para detectar bloques mínimos (S4 +
# continuidad cross-block). DEBE incluir N para mantener paridad con el TS
# validator (`isWorkShift` en `utils/matrix.ts` incluye N): un patrón como
# L-M-N-N-N-N-L es UN bloque de trabajo continuo de 5 días, no un M aislado.
# La protección 4-6 noches consecutivas la sigue garantizando night_block.py
# como hard — esto solo afecta a cómo se cuentan los bordes de un bloque mixto.
ALL_WORK_SHIFTS   = {"M", "T", "N", "P", "PI"}
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
    # Pesos: S1 es el objetivo primario; S2/S3/S4 son secundarios.
    W_NIGHT_BALANCE   = 10   # S1: por noche de diferencia entre max y min empleado
    W_ISOLATED_L      = 2    # S2: por cada L aislado (sin L adyacente)
    W_SHIFT_PRIORITY  = 1    # S3: por cada día con turno distinto al preferido
    W_SHORT_WORK_BLOCK = 3   # S4: por día faltante en bloque corto de trabajo (mín 3 consec)

    objective_terms: list = []
    short_block_vars: list = []   # acumulador para softPenaltyBreakdown S4

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

    # ── S4: Bloques de trabajo cortos (mín 3 consecutivos) ────────────────────
    # Soft constraint (CONSTRAINTS §3, peso 3 por día faltante). Hard constraints
    # (cobertura, H5, night_block) pueden dejar al solver sin alternativa a un
    # bloque de 1-2 días. Se penaliza pero no se prohíbe.
    #
    # Las noches NO se ven afectadas: night_block.py ya impone hard que cualquier
    # bloque N tenga minNightBlock..maxNightBlock noches consecutivas (4-6). Y
    # transitions.py prohíbe N→M/T sin libre. Por tanto un bloque corto que
    # incluya N no puede ocurrir; S4 solo penaliza bloques mixtos M/T/P/PI.
    #
    # Detección: para cada día d, mira si termina un bloque corto:
    #   - bloque de 1 día anclado en d  → gap = 2 (penalty 6)
    #   - bloque de 2 días terminando en d → gap = 1 (penalty 3)
    # Días virtuales del tail extienden el bloque hacia atrás (cross-month).
    #
    # is_work[e, d] = bool var = sum(x[e, d, s] for s in ALL_WORK_SHIFTS).
    # Incluye N para que un bloque mixto M-N o N-T cuente como continuo (paridad TS).

    is_work: dict = {}
    for e_idx in range(num_emps):
        virt_days = virtual_days_by_emp.get(e_idx, [])
        all_days_e = virt_days + day_numbers
        for d in all_days_e:
            wb = model.new_bool_var(f"work_{e_idx}_{d}")
            terms = [x[e_idx, d, s] for s in ALL_WORK_SHIFTS if (e_idx, d, s) in x]
            if terms:
                model.add(wb == cp_model.LinearExpr.Sum(terms))
            else:
                model.add(wb == 0)
            is_work[e_idx, d] = wb

    for e_idx in range(num_emps):
        virt_days = virtual_days_by_emp.get(e_idx, [])
        all_days_e = virt_days + day_numbers
        n_e = len(all_days_e)
        real_start = len(virt_days)

        for pos in range(real_start, n_e):
            d = all_days_e[pos]
            prev_d      = all_days_e[pos - 1] if pos - 1 >= 0       else None
            prev_prev_d = all_days_e[pos - 2] if pos - 2 >= 0       else None
            next_d      = all_days_e[pos + 1] if pos + 1 < n_e      else None

            # 1-day block at d: rest before AND rest after AND work at d.
            #   penalty = peso × (MIN_BLOCK - 1) = 3 × 2 = 6
            b1_terms = [is_work[e_idx, d]]
            if prev_d is not None:
                b1_terms.append(1 - is_work[e_idx, prev_d])
            if next_d is not None:
                b1_terms.append(1 - is_work[e_idx, next_d])
            b1 = model.new_bool_var(f"short1_{e_idx}_{d}")
            for t in b1_terms:
                model.add(b1 <= t)
            model.add(b1 >= cp_model.LinearExpr.Sum(b1_terms) - (len(b1_terms) - 1))
            objective_terms.append(W_SHORT_WORK_BLOCK * 2 * b1)
            short_block_vars.append((b1, 2))

            # 2-day block ending at d: work at d-1 AND d, rest at d-2 (or boundary)
            # AND rest at d+1 (or boundary).  penalty = peso × 1 = 3
            if prev_d is not None:
                b2_terms = [is_work[e_idx, prev_d], is_work[e_idx, d]]
                if prev_prev_d is not None:
                    b2_terms.append(1 - is_work[e_idx, prev_prev_d])
                if next_d is not None:
                    b2_terms.append(1 - is_work[e_idx, next_d])
                b2 = model.new_bool_var(f"short2_{e_idx}_{d}")
                for t in b2_terms:
                    model.add(b2 <= t)
                model.add(b2 >= cp_model.LinearExpr.Sum(b2_terms) - (len(b2_terms) - 1))
                objective_terms.append(W_SHORT_WORK_BLOCK * 1 * b2)
                short_block_vars.append((b2, 1))

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
        # softPenaltyBreakdown incluye S1 (night_balance) y S4 (min_work_block_short).
        # S2 (isolated_L) y S3 (shift_priority) contribuyen al softPenalty total
        # pero no se desglosan individualmente.
        soft_breakdown: dict[str, int] = {}
        if night_range is not None:
            night_r = solver.value(night_range)
            soft_breakdown["night_balance"] = W_NIGHT_BALANCE * night_r
        if short_block_vars:
            short_total = sum(
                W_SHORT_WORK_BLOCK * gap * solver.value(var)
                for var, gap in short_block_vars
            )
            if short_total > 0:
                soft_breakdown["min_work_block_short"] = short_total

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
        conflicts, relaxations = _analyze_infeasibility(input, elapsed_ms)
        return SolverInfeasible(
            status="infeasible",
            conflictingConstraints=conflicts,
            suggestedRelaxations=relaxations,
        )

    else:
        return SolverError(
            status="error",
            errorCode="TIMEOUT" if status == cp_model.UNKNOWN else "INTERNAL",
            message=f"Solver termino con status {status_name} en {elapsed_ms}ms",
        )


# ────────────────────────────────────────────────────────────────
# INFEASIBILITY ANALYZER (heuristico, basado en input)
# ────────────────────────────────────────────────────────────────

_SPECIAL_REST = {"V", "B", "E", "IT", "FO", "A"}


def _analyze_infeasibility(inp: SolverInput, elapsed_ms: int):
    """
    Analiza el input para identificar causas plausibles de infeasibilidad.
    No usa sufficient_assumptions_for_infeasibility de CP-SAT (requiere refactor a
    assumptions). Heuristico: detecta desbalances obvios entre demanda y capacidad.
    Devuelve (conflictingConstraints, suggestedRelaxations).
    """
    cfg = inp.config
    num_days = len(inp.days)
    num_emps = len(inp.employees)
    conflicts = []
    relaxations = []

    if num_emps == 0 or num_days == 0:
        return (
            [{
                "constraintName": "input_empty",
                "humanExplanation": "El mes no tiene empleados o dias suficientes para generar un horario.",
            }],
            [],
        )

    # ── Capacidad agregada vs demanda ──
    # Empleados disponibles para turnos rotatorios (excluye fixedShift=P sin fixedDays — la build_solver_input ya los filtra)
    rotatorios = [e for e in inp.employees if not (e.rules.fixedShift and e.rules.fixedShift != "L")]
    num_rotatorios = max(1, len(rotatorios))

    # Celdas bloqueadas con turnos especiales (V/B/IT/...) por empleado — reducen capacidad
    locked_special_by_emp: dict[str, int] = {}
    for emp_id, day_map in inp.lockedCells.items():
        n = sum(1 for code in day_map.values() if code in _SPECIAL_REST)
        if n > 0:
            locked_special_by_emp[emp_id] = n
    total_locked_special = sum(locked_special_by_emp.values())

    demand_shifts = num_days * (cfg.minMorningStaff + cfg.minAfternoonStaff + cfg.minNightStaff)
    capacity_shifts = num_rotatorios * num_days - cfg.minMonthlyLibre * num_rotatorios - total_locked_special

    if demand_shifts > capacity_shifts:
        deficit = demand_shifts - capacity_shifts
        conflicts.append({
            "constraintName": "coverage_vs_capacity",
            "humanExplanation": (
                f"La cobertura minima diaria requiere {demand_shifts} turnos al mes "
                f"({cfg.minMorningStaff}M+{cfg.minAfternoonStaff}T+{cfg.minNightStaff}N x {num_days} dias) "
                f"pero hay capacidad para {max(0, capacity_shifts)} turnos con {num_rotatorios} empleados rotatorios. "
                f"Faltan {deficit} turnos."
            ),
        })
        # Sugerir reducir libres minimos primero (menos disruptivo) y luego cobertura
        if cfg.minMonthlyLibre > 7:
            relaxations.append({
                "constraint": "minMonthlyLibre",
                "currentValue": cfg.minMonthlyLibre,
                "proposedValue": cfg.minMonthlyLibre - 1,
                "impact": f"Libera ~{num_rotatorios} turnos al mes",
            })
        if cfg.minMorningStaff > 1:
            relaxations.append({
                "constraint": "minMorningStaff",
                "currentValue": cfg.minMorningStaff,
                "proposedValue": cfg.minMorningStaff - 1,
                "impact": f"Reduce demanda en {num_days} turnos al mes",
            })
        if cfg.minAfternoonStaff > 1:
            relaxations.append({
                "constraint": "minAfternoonStaff",
                "currentValue": cfg.minAfternoonStaff,
                "proposedValue": cfg.minAfternoonStaff - 1,
                "impact": f"Reduce demanda en {num_days} turnos al mes",
            })

    # ── Empleado individual con demasiado trabajo bloqueado ──
    # Si el manager bloqueó tantos turnos M/T/N para un empleado que ya no caben
    # los libres mínimos del mes en los días restantes, el solver no tiene salida.
    for emp_id, day_map in inp.lockedCells.items():
        n_work_locked = sum(1 for code in day_map.values() if code in {"M", "T", "N", "PI", "P"})
        remaining = num_days - n_work_locked
        if remaining < cfg.minMonthlyLibre:
            emp_name = next((e.name for e in inp.employees if e.id == emp_id), emp_id)
            conflicts.append({
                "constraintName": "employee_locked_work_overload",
                "employeeIds": [emp_id],
                "humanExplanation": (
                    f"{emp_name}: tiene {n_work_locked} turnos de trabajo bloqueados, solo quedan "
                    f"{remaining} dias disponibles pero el minimo de libres es {cfg.minMonthlyLibre}."
                ),
            })

    # ── Night block: minNightBlock demasiado alto para el mes ──
    # Heuristico: si minNightBlock > num_days / num_rotatorios -> dificil de encajar
    if cfg.minNightBlock > 0 and num_rotatorios > 0:
        slots_per_emp = num_days // num_rotatorios
        if cfg.minNightBlock > slots_per_emp:
            conflicts.append({
                "constraintName": "night_block_too_long",
                "humanExplanation": (
                    f"Bloque minimo de noches ({cfg.minNightBlock}) > dias disponibles por empleado "
                    f"(~{slots_per_emp})."
                ),
            })
            if cfg.minNightBlock > 3:
                relaxations.append({
                    "constraint": "minNightBlock",
                    "currentValue": cfg.minNightBlock,
                    "proposedValue": cfg.minNightBlock - 1,
                    "impact": "Permite bloques de noche mas cortos",
                })

    # ── Descanso minimo entre turnos ──
    if cfg.minRestHours > 24 * 2:
        conflicts.append({
            "constraintName": "rest_hours_too_high",
            "humanExplanation": (
                f"Descanso minimo de {cfg.minRestHours}h obliga a >2 dias libres entre turnos."
            ),
        })
        relaxations.append({
            "constraint": "minRestHours",
            "currentValue": cfg.minRestHours,
            "proposedValue": max(24, cfg.minRestHours - 12),
            "impact": "Reduce el gap obligatorio entre turnos",
        })

    # ── Si no detectamos nada, fallback generico ──
    if not conflicts:
        conflicts.append({
            "constraintName": "unknown",
            "humanExplanation": (
                f"No se encontro solucion factible con las constraints actuales. Tiempo: {elapsed_ms}ms. "
                "Revisa peticiones aprobadas y configuracion del mes."
            ),
        })
    if not relaxations:
        # Default conservador: libres minimos (menos disruptivo)
        if cfg.minMonthlyLibre > 7:
            relaxations.append({
                "constraint": "minMonthlyLibre",
                "currentValue": cfg.minMonthlyLibre,
                "proposedValue": cfg.minMonthlyLibre - 1,
                "impact": "Reducir libres minimos suele desbloquear la solucion",
            })

    return conflicts, relaxations
