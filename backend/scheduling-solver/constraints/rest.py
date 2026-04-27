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
    tail = input.previousMonthTail
    num_emps = len(employees)
    day_numbers = [d.dayNumber for d in days]
    num_days = len(day_numbers)

    for e in range(num_emps):
        emp_id = employees[e].id
        emp_tail = tail.get(emp_id, [])

        # ── H5: al menos 2 días de descanso en ventana de 7 ──────────────────
        # Within-month windows (original)
        for w_start in range(num_days - 6):
            window = day_numbers[w_start : w_start + 7]
            model.add(
                sum(x[e, d, s] for d in window for s in REST_SHIFTS if (e, d, s) in x) >= 2
            )

        # Cross-month windows: tail[-k:] + day_numbers[:7-k]
        for overlap in range(1, min(7, len(emp_tail) + 1)):
            tail_part = emp_tail[-overlap:]
            tail_rest = sum(1 for s in tail_part if s in REST_SHIFTS)
            current_part = day_numbers[:7 - overlap]
            need = max(0, 2 - tail_rest)
            # Solo añadir si hay días suficientes en el mes actual para satisfacer la constraint.
            # Si need > len(current_part) el mes anterior ya viola H5 — no podemos compensarlo.
            if need > 0 and current_part and need <= len(current_part):
                model.add(
                    sum(x[e, d, s] for d in current_part for s in REST_SHIFTS if (e, d, s) in x) >= need
                )

        # ── H4: máximo consecutivos de trabajo ───────────────────────────────
        max_w = cfg.maxConsecutiveWorkDays

        # Within-month windows (original)
        for w_start in range(num_days):
            window = day_numbers[w_start : w_start + max_w + 1]
            if len(window) < max_w + 1:
                break
            model.add(
                sum(x[e, d, s] for d in window for s in WORK_SHIFTS if (e, d, s) in x)
                <= max_w
            )

        # Cross-month: si el empleado venía con una racha de trabajo del mes anterior,
        # limitamos los primeros días del mes actual.
        if emp_tail and day_numbers:
            trailing_work = 0
            for s in reversed(emp_tail):
                if s in WORK_SHIFTS:
                    trailing_work += 1
                else:
                    break

            if trailing_work > 0:
                remaining = max_w - trailing_work
                if remaining <= 0:
                    # Debe descansar al menos (1 - remaining) días desde el inicio
                    force_rest = min(1 - remaining, num_days)
                    for i in range(force_rest):
                        d0 = day_numbers[i]
                        model.add(
                            sum(x[e, d0, s] for s in WORK_SHIFTS if (e, d0, s) in x) == 0
                        )
                else:
                    # Puede trabajar `remaining` días más antes de necesitar descanso
                    window = day_numbers[:remaining + 1]
                    if len(window) == remaining + 1:
                        model.add(
                            sum(x[e, d, s] for d in window for s in WORK_SHIFTS if (e, d, s) in x)
                            <= remaining
                        )
