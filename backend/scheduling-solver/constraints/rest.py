"""
H5 — Al menos 2 libres en toda ventana deslizante de 7 días.
H4 — Máximo maxConsecutiveWorkDays días seguidos de trabajo.

Con días virtuales (cross-month):
  all_days = virtual_days + real_days.
  Las ventanas que solapan virtual→real se manejan de forma uniforme.
  No hay código cross-month especial; la continuidad sale sola.
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo

WORK_SHIFTS = {"M", "T", "N", "PI", "P"}
REST_SHIFTS  = {"L", "V", "B", "E", "IT", "FO", "A"}


def apply(
    model: cp_model.CpModel,
    x: dict,
    input: SolverInput,
    employees: list,
    days: list[DayInfo],
    virtual_days_by_emp: dict[int, list[int]] = None,
) -> None:
    if virtual_days_by_emp is None:
        virtual_days_by_emp = {}

    cfg       = input.config
    real_days = [d.dayNumber for d in days]

    for e in range(len(employees)):
        virt_days = virtual_days_by_emp.get(e, [])
        all_days  = virt_days + real_days
        n_all     = len(all_days)

        # H5: ≥ 2 libres en toda ventana de 7 días
        for w_start in range(n_all - 6):
            window = all_days[w_start : w_start + 7]
            model.add(
                sum(x[e, d, s] for d in window for s in REST_SHIFTS if (e, d, s) in x) >= 2
            )

        # H4: máximo días consecutivos de trabajo
        max_w = cfg.maxConsecutiveWorkDays
        for w_start in range(n_all):
            window = all_days[w_start : w_start + max_w + 1]
            if len(window) < max_w + 1:
                break
            model.add(
                sum(x[e, d, s] for d in window for s in WORK_SHIFTS if (e, d, s) in x) <= max_w
            )
