"""
H3 + transiciones prohibidas entre turnos.

Reglas HARD:
  - Tras N: el día siguiente debe ser N (continuar bloque) o descanso.
    No puede ser M, T, PI ni P directamente después de una noche.
  - T → M: tarde (23:00) + mañana (07:00) = 8h descanso → prohibido.

Con días virtuales (cross-month):
  all_days = virtual_days + real_days.
  Las transiciones virtual→real se manejan igual que within-month.
  No hay código cross-month especial; la continuidad sale sola.
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo


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

    real_days = [d.dayNumber for d in days]

    for e_idx in range(len(employees)):
        virt_days = virtual_days_by_emp.get(e_idx, [])
        all_days  = virt_days + real_days

        for pos in range(len(all_days) - 1):
            d      = all_days[pos]
            d_next = all_days[pos + 1]

            # H3: N → M/T/PI/P prohibido
            if (e_idx, d, 'N') in x:
                for forbidden in ['M', 'T', 'PI', 'P']:
                    if (e_idx, d_next, forbidden) in x:
                        model.add(x[e_idx, d_next, forbidden] + x[e_idx, d, 'N'] <= 1)

            # T → M prohibido (descanso insuficiente)
            if (e_idx, d, 'T') in x and (e_idx, d_next, 'M') in x:
                model.add(x[e_idx, d, 'T'] + x[e_idx, d_next, 'M'] <= 1)
