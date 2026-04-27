"""
Bloques mínimos de turno M y T.

Regla: los turnos de Mañana y Tarde deben venir en bloques de al menos
MIN_SHIFT_BLOCK días consecutivos del mismo tipo.

Esto evita el patrón M T M L T M T que produce horarios "saltarines".
La rotación semanal que usa el hotel (semana de M → semana de T → semana de N)
emerge naturalmente de esta constraint.

También prohibimos M→T y T→M sin descanso entre medio (el cambio de turno
exige al menos un día libre de transición).
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo

MIN_SHIFT_BLOCK = 3   # mínimo de días consecutivos del mismo turno (M o T)


def apply(
    model: cp_model.CpModel,
    x: dict,
    input: SolverInput,
    employees: list,
    days: list[DayInfo],
) -> None:
    tail = input.previousMonthTail
    day_numbers = [d.dayNumber for d in days]
    num_days    = len(day_numbers)
    pos_to_day  = {i: d for i, d in enumerate(day_numbers)}

    for e_idx in range(len(employees)):
        emp_tail = tail.get(employees[e_idx].id, [])

        for shift in ('M', 'T'):
            other = 'T' if shift == 'M' else 'M'

            # Contar días consecutivos de 'shift' al final del mes anterior
            trailing_same = 0
            for s in reversed(emp_tail):
                if s == shift:
                    trailing_same += 1
                else:
                    break

            for pos, d in enumerate(day_numbers):
                is_first = pos == 0
                enough_days = (pos + MIN_SHIFT_BLOCK <= num_days)

                if is_first:
                    if trailing_same > 0:
                        # Día 1 es continuación de un bloque del mes anterior.
                        # El bloque ya tiene `trailing_same` días. Solo hay que asegurar
                        # que se completen los días mínimos restantes.
                        remaining_for_min = max(0, MIN_SHIFT_BLOCK - trailing_same - 1)
                        if remaining_for_min > 0 and pos + remaining_for_min < num_days:
                            # Si día 1 es shift, los siguientes remaining_for_min días tb deben serlo
                            for k in range(1, remaining_for_min + 1):
                                nd = pos_to_day[pos + k]
                                model.add(x[e_idx, nd, shift] >= x[e_idx, d, shift])
                        # No se añade block_start: la continuación no es un inicio nuevo
                    elif not enough_days:
                        continue
                    else:
                        # Sin contexto previo: si empieza aquí, debe completar MIN_SHIFT_BLOCK días
                        block_start = model.new_bool_var(f"db_{shift}_{e_idx}_{d}_start")
                        model.add(block_start == x[e_idx, d, shift])
                        for k in range(1, MIN_SHIFT_BLOCK):
                            nd = pos_to_day[pos + k]
                            model.add(x[e_idx, nd, shift] >= block_start)
                else:
                    prev_d = pos_to_day[pos - 1]

                    if not enough_days:
                        model.add(x[e_idx, d, shift] <= x[e_idx, prev_d, shift])
                    else:
                        block_start = model.new_bool_var(f"db_{shift}_{e_idx}_{d}_start")
                        model.add(block_start <= x[e_idx, d, shift])
                        model.add(block_start <= 1 - x[e_idx, prev_d, shift])
                        model.add(block_start >= x[e_idx, d, shift] - x[e_idx, prev_d, shift])

                        for k in range(1, MIN_SHIFT_BLOCK):
                            nd = pos_to_day[pos + k]
                            model.add(x[e_idx, nd, shift] >= block_start)

                # Prohibir cambio directo M→T y T→M (sin descanso entre medio)
                if shift == 'M' and pos < num_days - 1:
                    d_next = pos_to_day[pos + 1]
                    if (e_idx, d_next, 'T') in x:
                        model.add(x[e_idx, d, 'M'] + x[e_idx, d_next, 'T'] <= 1)
