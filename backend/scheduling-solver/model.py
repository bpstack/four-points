"""
model.py — Construye y resuelve el modelo CP-SAT para un mes de scheduling.

Constraints activas:
  H1 — Cobertura mínima M/T/N por día
  H2 — Bloque de noches: mínimo/máximo consecutivos, 1 bloque por mes, cross-month
  H3 — Transiciones prohibidas: N→M/T/PI/P, T→M (insuficiente descanso), cross-month
  H4 — Máximo días consecutivos de trabajo, cross-month
  H5 — ≥2 descansos en ventana de 7 días (cuenta V/B/IT/E/FO/A), cross-month
  H6 — Libres mensuales [min, max] (min reducido por ausencias bloqueadas)
  H7 — Celdas bloqueadas fijadas; turnos especiales (V/B/IT/…) prohibidos fuera de bloqueos
  day_blocks — Bloques mínimos de turno M/T, cross-month
  employee_rules — noWeekends (fuerza L en S/D), fixedShift (prohíbe otros work shifts)

Pendiente:
  - Continuidad de rotación en solver
  - Función objetivo para optimización soft (actualmente: primera solución factible)

Nota: fixedDays se resuelve antes del solver — build-solver-input.ts inyecta el patrón L-V/S-D
como lockedCells, por lo que el solver lo ve como celdas ya fijadas (H7).
"""

import time
from ortools.sat.python import cp_model

from schemas import SolverInput, SolverOutput, SolverSuccess, SolverInfeasible, SolverError, SolverStats
from constraints import coverage, rest, locked_cells, libres, night_block, transitions, day_blocks, employee_rules


# Todos los códigos de turno que el solver puede asignar
# L = libre rotatorio. V/B/E/IT/FO solo llegan como lockedCells.
ASSIGNABLE_SHIFTS = ["M", "T", "N", "L"]
WORK_SHIFTS       = {"M", "T", "N"}


def solve(input: SolverInput) -> SolverOutput:
    t0 = time.time()

    employees = input.employees
    days      = input.days
    cfg       = input.config

    num_emps = len(employees)
    day_numbers = [d.dayNumber for d in days]

    # Índice inverso emp_id → índice
    emp_idx_by_id = {emp.id: i for i, emp in enumerate(employees)}

    # ── Expandir lockedCells para incluir todos los shifts posibles ──
    # Los días bloqueados pueden tener turnos que no están en ASSIGNABLE_SHIFTS (V, B, E, etc.)
    all_shifts_needed = set(ASSIGNABLE_SHIFTS)
    for day_map in input.lockedCells.values():
        all_shifts_needed.update(day_map.values())

    model = cp_model.CpModel()

    # ──────────────────────────────────────────────────────
    # Variables: x[e, d, shift] = 1 si emp e trabaja shift el día d
    # ──────────────────────────────────────────────────────
    x: dict = {}
    for e in range(num_emps):
        for d in day_numbers:
            for s in all_shifts_needed:
                x[e, d, s] = model.new_bool_var(f"x_{e}_{d}_{s}")

    # ── Base: exactamente 1 turno por empleado por día ──
    for e in range(num_emps):
        for d in day_numbers:
            model.add_exactly_one(x[e, d, s] for s in all_shifts_needed)

    # ──────────────────────────────────────────────────────
    # Aplicar constraints
    # ──────────────────────────────────────────────────────

    locked_cells.apply(model, x, input, emp_idx_by_id)         # H7 primero (fija variables)
    coverage.apply(model, x, input, employees, days)            # H1
    rest.apply(model, x, input, employees, days)                # H4 + H5
    libres.apply(model, x, input, employees, days)              # H6
    night_block.apply(model, x, input, employees, days)         # H2 + solo 1 bloque N/mes
    transitions.apply(model, x, input, employees, days)         # H3 + T→M prohibido
    day_blocks.apply(model, x, input, employees, days)          # bloques mínimos M/T + M→T prohibido
    employee_rules.apply(model, x, input, employees, days)      # noWeekends, fixedShift

    # ──────────────────────────────────────────────────────
    # Resolver
    # ──────────────────────────────────────────────────────

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(input.options.timeoutSeconds)
    solver.parameters.log_search_progress = False
    if input.options.seed is not None:
        solver.parameters.random_seed = input.options.seed

    status = solver.solve(model)
    elapsed_ms = int((time.time() - t0) * 1000)
    status_name = solver.status_name(status)

    # ──────────────────────────────────────────────────────
    # Construir output
    # ──────────────────────────────────────────────────────

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        matrix: dict[str, dict[str, str]] = {}
        for e_idx, emp in enumerate(employees):
            matrix[emp.id] = {}
            for d in day_numbers:
                for s in all_shifts_needed:
                    if solver.value(x[e_idx, d, s]):
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
        # En Fase 1 devolvemos conflicto genérico.
        # Fase 2 usará sufficient_assumptions_for_infeasibility para ser específico.
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
        # TIMEOUT u otro
        return SolverError(
            status="error",
            errorCode="TIMEOUT" if status == cp_model.UNKNOWN else "INTERNAL",
            message=f"Solver termino con status {status_name} en {elapsed_ms}ms",
        )
