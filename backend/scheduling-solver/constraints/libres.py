"""
H6 — Libres mensuales: mínimo minMonthlyLibre, máximo maxMonthlyLibre.
Solo para empleados rotatorios (sin fixedDays).
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo

# Días de ausencia especial que ya cuentan como "descanso" fuera de la rotación.
# Reducen el mínimo de libres rotatorios exigido al solver.
_SPECIAL_REST = {"V", "B", "E", "IT", "FO", "A"}


def apply(
    model: cp_model.CpModel,
    x: dict,
    input: SolverInput,
    employees: list,
    days: list[DayInfo],
) -> None:
    cfg = input.config
    day_numbers = [d.dayNumber for d in days]

    for e_idx, emp in enumerate(employees):
        if emp.rules.fixedDays:
            continue  # empleado con días fijos, no aplica

        libres = sum(x[e_idx, d, "L"] for d in day_numbers if (e_idx, d, "L") in x)

        # Días ya bloqueados como ausencia especial (vacaciones, bajas, etc.)
        # Cada uno de esos días ya es un día de no-trabajo, por lo que reducen
        # el número de libres rotatorios (L) que el solver necesita asignar.
        emp_locked = input.lockedCells.get(emp.id, {})
        locked_special_rest = sum(1 for s in emp_locked.values() if s in _SPECIAL_REST)

        effective_min = max(0, cfg.minMonthlyLibre - locked_special_rest)
        if effective_min > 0:
            model.add(libres >= effective_min)
        if cfg.maxMonthlyLibre > 0:
            model.add(libres <= cfg.maxMonthlyLibre)
