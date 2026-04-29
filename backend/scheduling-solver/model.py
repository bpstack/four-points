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

        return SolverSuccess(
            status="ok",
            matrix=matrix,
            stats=SolverStats(
                solveTimeMs=elapsed_ms,
                hardConstraintsSatisfied=True,
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
