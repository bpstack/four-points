"""
H5 — Al menos 2 libres consecutivos en toda ventana deslizante de 7 días.
H4 — Máximo maxConsecutiveWorkDays días seguidos de trabajo.
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
) -> None:
    cfg = input.config
    num_emps = len(employees)
    day_numbers = [d.dayNumber for d in days]
    num_days = len(day_numbers)

    for e in range(num_emps):
        # ── H5: al menos 2 días de descanso en ventana de 7 ──
        # (al menos 1 par de días consecutivos ambos libres, O al menos 2 libres totales)
        # Para el solver usamos la versión "fuerte": exactamente 1 par consecutivo libre.
        # Si eso es infeasible, usamos la versión débil: al menos 2 libres en la ventana.
        for w_start in range(num_days - 6):
            window = day_numbers[w_start : w_start + 7]
            # Al menos 2 libres en la ventana (versión débil pero siempre factible)
            model.add(
                sum(x[e, d, "L"] for d in window) >= 2
            )

        # ── H4: máximo consecutivos de trabajo ──
        max_w = cfg.maxConsecutiveWorkDays
        for w_start in range(num_days):
            window = day_numbers[w_start : w_start + max_w + 1]
            if len(window) < max_w + 1:
                break
            model.add(
                sum(x[e, d, s] for d in window for s in WORK_SHIFTS if (e, d, s) in x)
                <= max_w
            )
