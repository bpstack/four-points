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
    min_block = cfg.minNightBlock if cfg.minNightBlock else 4
    max_block = cfg.maxNightBlock if cfg.maxNightBlock else 6

    day_numbers = [d.dayNumber for d in days]
    num_days = len(day_numbers)
    # Mapa posición → número de día
    pos_to_day = {i: d for i, d in enumerate(day_numbers)}
    # Mapa número de día → posición
    day_to_pos = {d: i for i, d in enumerate(day_numbers)}

    for e_idx in range(len(employees)):
        # ── 0. Solo UN bloque de noche por empleado al mes ─────────
        # Recogemos todas las variables "inicio de bloque" y limitamos a ≤1
        all_block_starts = []

        for pos2, d2 in enumerate(day_numbers):
            if pos2 == 0:
                bs = model.new_bool_var(f"ns_max1_{e_idx}_{d2}")
                model.add(bs == x[e_idx, d2, 'N'])
                all_block_starts.append(bs)
            else:
                prev_d2 = day_numbers[pos2 - 1]
                bs = model.new_bool_var(f"ns_max1_{e_idx}_{d2}")
                model.add(bs <= x[e_idx, d2, 'N'])
                model.add(bs <= 1 - x[e_idx, prev_d2, 'N'])
                model.add(bs >= x[e_idx, d2, 'N'] - x[e_idx, prev_d2, 'N'])
                all_block_starts.append(bs)

        model.add(sum(all_block_starts) <= 1)

        # ── 1. Máximo de noches consecutivas ────────────────────────
        # Ninguna ventana de (max_block+1) días puede tener más de max_block noches
        for pos in range(num_days - max_block):
            window = [pos_to_day[p] for p in range(pos, pos + max_block + 1)]
            model.add(
                sum(x[e_idx, d, 'N'] for d in window) <= max_block
            )

        # ── 2. Mínimo de noches por bloque ──────────────────────────
        # Para cada día d donde puede empezar un bloque nuevo:
        #   un bloque empieza si x[e,d,N]=1 Y (d es el primer día O x[e,d-1,N]=0)
        for pos, d in enumerate(day_numbers):
            is_first_day = pos == 0

            if is_first_day:
                # Si hay noches desde el día 1, o bien vienen de cross-month (relajar)
                # o son un bloque nuevo que debe completar min_block días
                # Para MVP: si hay noche el día 1 sin contexto previo, exigimos min_block días
                if pos + min_block <= num_days:
                    # Si hay N en día 1, debe haber N en los siguientes min_block-1 días
                    # (esto se expresa como: si x[e,d1,N]=1 → x[e,d2..dN,N]=1)
                    # En CP-SAT lo modelamos con la variable auxiliar de inicio de bloque
                    block_start = model.new_bool_var(f"ns_{e_idx}_{d}")
                    model.add(block_start == x[e_idx, d, 'N'])
                    for k in range(1, min_block):
                        next_d = pos_to_day[pos + k]
                        model.add(x[e_idx, next_d, 'N'] >= block_start)
            else:
                prev_d = pos_to_day[pos - 1]

                # ¿Suficientes días hasta el final para completar un bloque mínimo?
                can_complete_block = (pos + min_block <= num_days)

                if not can_complete_block:
                    # No quedan suficientes días para empezar un bloque mínimo.
                    # Si no viene de un bloque anterior, no puede haber N aquí.
                    model.add(x[e_idx, d, 'N'] <= x[e_idx, prev_d, 'N'])
                else:
                    # block_start[e,d] = 1 iff x[e,d,N]=1 AND x[e,prev_d,N]=0
                    block_start = model.new_bool_var(f"ns_{e_idx}_{d}")

                    # block_start solo puede ser 1 si hay N
                    model.add(block_start <= x[e_idx, d, 'N'])
                    # block_start solo puede ser 1 si el día anterior NO es N
                    model.add(block_start <= 1 - x[e_idx, prev_d, 'N'])
                    # Si hay N y el anterior no es N, block_start debe ser 1
                    model.add(block_start >= x[e_idx, d, 'N'] - x[e_idx, prev_d, 'N'])

                    # Si block_start=1, los siguientes min_block-1 días también deben ser N
                    for k in range(1, min_block):
                        next_d = pos_to_day[pos + k]
                        model.add(x[e_idx, next_d, 'N'] >= block_start)
