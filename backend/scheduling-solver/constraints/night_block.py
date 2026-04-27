"""
H2 — Bloques de noche consecutivos.

Regla: quien hace noches, hace un bloque de min_night_block..max_night_block
noches seguidas. No puede haber noches sueltas ni bloques demasiado cortos o largos.

Implementación CP-SAT:
  1. max_night_block → ventana deslizante: sum(N en window) <= maxNightBlock
  2. min_night_block → si empieza un bloque en día d (N en d pero no en d-1),
     los días d+1..d+minNightBlock-1 también deben ser N.
  3. Sin noches al final del mes si no caben min días (a menos que vengan de mes anterior).

Cross-month: si previousMonthHistory indica noches incompletas al inicio del mes,
el bloque ya empezó → relajamos el requisito de mínimo al comienzo.
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
    tail = input.previousMonthTail
    min_block = cfg.minNightBlock if cfg.minNightBlock else 4
    max_block = cfg.maxNightBlock if cfg.maxNightBlock else 6

    day_numbers = [d.dayNumber for d in days]
    num_days = len(day_numbers)
    pos_to_day = {i: d for i, d in enumerate(day_numbers)}

    for e_idx in range(len(employees)):
        emp_tail = tail.get(employees[e_idx].id, [])

        # Contar noches consecutivas al final del mes anterior
        trailing_N = 0
        for s in reversed(emp_tail):
            if s == 'N':
                trailing_N += 1
            else:
                break

        # ── 0. Solo UN bloque de noche NUEVO por empleado al mes ───────────
        # Si trailing_N > 0, el día 1 es continuación del mes anterior → bs=0.
        # El bloque ya "empezó" en el mes anterior; no cuenta como nuevo inicio.
        all_block_starts = []

        for pos2, d2 in enumerate(day_numbers):
            bs = model.new_bool_var(f"ns_max1_{e_idx}_{d2}")
            if pos2 == 0:
                if trailing_N > 0:
                    # Continuación cross-month: día 1 no es inicio de bloque nuevo
                    model.add(bs == 0)
                else:
                    model.add(bs == x[e_idx, d2, 'N'])
            else:
                prev_d2 = day_numbers[pos2 - 1]
                model.add(bs <= x[e_idx, d2, 'N'])
                model.add(bs <= 1 - x[e_idx, prev_d2, 'N'])
                model.add(bs >= x[e_idx, d2, 'N'] - x[e_idx, prev_d2, 'N'])
            all_block_starts.append(bs)

        model.add(sum(all_block_starts) <= 1)

        # ── 1. Máximo de noches consecutivas (within-month) ─────────────────
        for pos in range(num_days - max_block):
            window = [pos_to_day[p] for p in range(pos, pos + max_block + 1)]
            model.add(sum(x[e_idx, d, 'N'] for d in window) <= max_block)

        # ── 1b. Máximo cross-month: ventanas que incluyen días del mes anterior ─
        # Para cada solapamiento k con la cola del mes anterior,
        # la ventana tiene k días de cola + (max_block+1-k) días del mes actual.
        for k in range(1, min(max_block + 1, len(emp_tail) + 1)):
            prev_N = sum(1 for s in emp_tail[-k:] if s == 'N')
            curr_window_len = max_block + 1 - k
            if curr_window_len <= 0:
                break
            curr_window = day_numbers[:curr_window_len]
            if len(curr_window) < curr_window_len:
                break
            allowed = max(0, max_block - prev_N)
            model.add(sum(x[e_idx, d, 'N'] for d in curr_window) <= allowed)

        # ── 2. Mínimo de noches por bloque ──────────────────────────────────
        for pos, d in enumerate(day_numbers):
            is_first_day = pos == 0

            if is_first_day:
                if trailing_N > 0:
                    # Continuación de un bloque cross-month.
                    # El bloque tiene ya trailing_N noches del mes anterior.
                    if trailing_N >= max_block:
                        # Ya alcanzó el máximo: día 1 no puede ser N
                        # (el cross-month max de arriba también lo fuerza, pero ser explícito)
                        if (e_idx, d, 'N') in x:
                            model.add(x[e_idx, d, 'N'] == 0)
                    elif trailing_N >= min_block:
                        # Bloque ya completo: si día 1 es N, es extensión válida.
                        # No se requieren días mínimos adicionales aquí.
                        pass
                    else:
                        # Bloque incompleto: si día 1 es N, deben completarse
                        # los días que faltan para llegar a min_block en total.
                        remaining_for_min = min_block - trailing_N - 1  # -1: día 1 ya cuenta
                        if remaining_for_min > 0:
                            for k in range(1, remaining_for_min + 1):
                                if pos + k < num_days:
                                    next_d = pos_to_day[pos + k]
                                    model.add(x[e_idx, next_d, 'N'] >= x[e_idx, d, 'N'])
                else:
                    # Sin contexto previo: si hay N en día 1, deben seguir min_block días
                    if pos + min_block <= num_days:
                        block_start = model.new_bool_var(f"ns_{e_idx}_{d}")
                        model.add(block_start == x[e_idx, d, 'N'])
                        for k in range(1, min_block):
                            next_d = pos_to_day[pos + k]
                            model.add(x[e_idx, next_d, 'N'] >= block_start)
            else:
                prev_d = pos_to_day[pos - 1]
                can_complete_block = (pos + min_block <= num_days)

                if not can_complete_block:
                    # No quedan días suficientes para un bloque mínimo nuevo.
                    model.add(x[e_idx, d, 'N'] <= x[e_idx, prev_d, 'N'])
                else:
                    block_start = model.new_bool_var(f"ns_{e_idx}_{d}")
                    model.add(block_start <= x[e_idx, d, 'N'])
                    model.add(block_start <= 1 - x[e_idx, prev_d, 'N'])
                    model.add(block_start >= x[e_idx, d, 'N'] - x[e_idx, prev_d, 'N'])
                    for k in range(1, min_block):
                        next_d = pos_to_day[pos + k]
                        model.add(x[e_idx, next_d, 'N'] >= block_start)
