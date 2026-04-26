"""
H6 — Libres mensuales: mínimo minMonthlyLibre, máximo maxMonthlyLibre.
Solo para empleados rotatorios (sin fixedDays).
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo


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

        if cfg.minMonthlyLibre > 0:
            model.add(libres >= cfg.minMonthlyLibre)
        if cfg.maxMonthlyLibre > 0:
            model.add(libres <= cfg.maxMonthlyLibre)
