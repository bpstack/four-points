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

    # Tail por empleado (para detectar valores virtuales lockeados)
    tails_by_emp_idx: dict[int, list[str]] = {}
    for e_idx, emp in enumerate(employees):
        raw_tail = input.previousMonthTail.get(emp.id, [])
        if raw_tail:
            tail   = list(raw_tail[-7:])
            padded = ['L'] * (7 - len(tail)) + tail
            tails_by_emp_idx[e_idx] = padded

    for e in range(len(employees)):
        virt_days = virtual_days_by_emp.get(e, [])
        all_days  = virt_days + real_days
        n_all     = len(all_days)
        tail_padded = tails_by_emp_idx.get(e, [])
        # Map virt day → known shift code (locked from previous month)
        virt_value: dict[int, str] = {}
        for k, d_virt in enumerate(virt_days):
            if k < len(tail_padded):
                virt_value[d_virt] = tail_padded[k]

        # H5: ≥ 2 libres en toda ventana de 7 días
        # Saltamos ventanas puramente virtuales (mes anterior ya validado).
        # Saltamos también ventanas donde los días virtuales lockeados (work shifts)
        # consumen tanta capacidad que es imposible alcanzar 2 rest aunque todos los
        # días reales restantes sean L. Esto evita INFEASIBLE cuando el tail importado
        # tiene 6 días seguidos de trabajo terminando justo en el último día del mes.
        for w_start in range(n_all - 6):
            window = all_days[w_start : w_start + 7]
            if all(d < 0 for d in window):
                continue
            virt_in_win    = [d for d in window if d < 0]
            real_in_win    = [d for d in window if d >= 0]
            virt_rest_cnt  = sum(1 for d in virt_in_win if virt_value.get(d) in REST_SHIFTS)
            max_attainable = virt_rest_cnt + len(real_in_win)
            if max_attainable < 2:
                continue   # window doomed by previous month — skip (prev month's responsibility)
            model.add(
                sum(x[e, d, s] for d in window for s in REST_SHIFTS if (e, d, s) in x) >= 2
            )

        # H4: máximo días consecutivos de trabajo
        # Mismo razonamiento: saltamos ventanas donde el tail virtual lockeado
        # YA excede el max por sí solo (no se puede deshacer desde días reales).
        max_w = cfg.maxConsecutiveWorkDays
        for w_start in range(n_all):
            window = all_days[w_start : w_start + max_w + 1]
            if len(window) < max_w + 1:
                break
            if all(d < 0 for d in window):
                continue
            virt_in_win    = [d for d in window if d < 0]
            virt_work_cnt  = sum(1 for d in virt_in_win if virt_value.get(d) in WORK_SHIFTS)
            if virt_work_cnt > max_w:
                continue   # already exceeded by previous month — skip
            model.add(
                sum(x[e, d, s] for d in window for s in WORK_SHIFTS if (e, d, s) in x) <= max_w
            )
