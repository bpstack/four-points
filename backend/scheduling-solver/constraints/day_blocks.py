"""
Bloques mínimos de turno M y T.

Regla: los turnos M y T deben venir en bloques de al menos MIN_SHIFT_BLOCK días
consecutivos del mismo tipo. Evita patrones "saltarines" y favorece la rotación semanal.

También se prohíbe el cambio directo M→T sin descanso entre medio
(T→M ya lo gestiona transitions.py).

Cross-month (días virtuales):
  Los bloques M/T siempre completan dentro de su mes (el mes anterior no dejará
  un bloque parcial intencionalmente). El enforcement de continuación es CONDICIONAL
  para M/T: si el día 1 sigue el mismo turno que el tail, se fuerzan los días
  restantes para completar el mínimo, pero el día 1 en sí no se fuerza.

  Esto contrasta con los bloques N, que sí son forzados (night_block.py).

  La prohibición M→T sí aplica a todo all_days (incluyendo virtual→real).
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo

MIN_SHIFT_BLOCK = 3
_TAIL_LENGTH    = 7


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
    num_real  = len(real_days)

    for e_idx in range(len(employees)):
        virt_days  = virtual_days_by_emp.get(e_idx, [])
        all_days   = virt_days + real_days
        n_all      = len(all_days)
        real_start = len(virt_days)           # índice de day 1 en all_days

        for shift in ('M', 'T'):
            # Trailing count del mes anterior (para day 1 de continuación)
            raw_tail = input.previousMonthTail.get(employees[e_idx].id, [])
            if raw_tail:
                tail    = list(raw_tail[-_TAIL_LENGTH:])
                padded  = ['L'] * (_TAIL_LENGTH - len(tail)) + tail
                trailing_same = 0
                for s in reversed(padded):
                    if s == shift:
                        trailing_same += 1
                    else:
                        break
            else:
                trailing_same = 0

            # Enforcement solo en días REALES; días virtuales no se tocan
            for real_pos in range(num_real):
                d       = real_days[real_pos]
                all_pos = real_start + real_pos
                # "enough" se calcula sobre días reales restantes (no all_days)
                enough  = (real_pos + MIN_SHIFT_BLOCK <= num_real)

                if real_pos == 0:                        # Primer día real
                    if trailing_same > 0:
                        # Continuación del mes anterior: enforcement CONDICIONAL.
                        # No se fuerza day 1=shift; pero SI day 1=shift, se completan
                        # los días que faltan para llegar a MIN_SHIFT_BLOCK.
                        remaining = max(0, MIN_SHIFT_BLOCK - trailing_same - 1)
                        if remaining > 0:
                            for k in range(1, remaining + 1):
                                if real_pos + k < num_real:
                                    nd = real_days[real_pos + k]
                                    if (e_idx, nd, shift) in x:
                                        model.add(x[e_idx, nd, shift] >= x[e_idx, d, shift])
                    elif not enough:
                        continue
                    elif (e_idx, d, shift) not in x:
                        continue
                    else:
                        bs = model.new_bool_var(f"db_{shift}_{e_idx}_{d}")
                        model.add(bs == x[e_idx, d, shift])
                        for k in range(1, MIN_SHIFT_BLOCK):
                            nd = real_days[real_pos + k]
                            if (e_idx, nd, shift) in x:
                                model.add(x[e_idx, nd, shift] >= bs)

                else:                                    # Días reales 2+
                    # prev_d: día anterior en all_days (puede ser virtual -1 para day 2)
                    prev_d = all_days[all_pos - 1]

                    if not enough:
                        # Restaurar restricción original: no puede empezar un bloque nuevo
                        # si no quedan días suficientes para completarlo.
                        if (e_idx, prev_d, shift) in x and (e_idx, d, shift) in x:
                            model.add(x[e_idx, d, shift] <= x[e_idx, prev_d, shift])
                    elif (e_idx, d, shift) not in x or (e_idx, prev_d, shift) not in x:
                        pass
                    else:
                        bs = model.new_bool_var(f"db_{shift}_{e_idx}_{d}")
                        model.add(bs <= x[e_idx, d, shift])
                        model.add(bs <= 1 - x[e_idx, prev_d, shift])
                        model.add(bs >= x[e_idx, d, shift] - x[e_idx, prev_d, shift])
                        for k in range(1, MIN_SHIFT_BLOCK):
                            nd = real_days[real_pos + k]
                            if (e_idx, nd, shift) in x:
                                model.add(x[e_idx, nd, shift] >= bs)

        # M → T directo prohibido — aplica sobre all_days (incluye virtual→real)
        for pos in range(n_all - 1):
            d      = all_days[pos]
            d_next = all_days[pos + 1]
            if (e_idx, d, 'M') in x and (e_idx, d_next, 'T') in x:
                model.add(x[e_idx, d, 'M'] + x[e_idx, d_next, 'T'] <= 1)
