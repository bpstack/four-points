"""
H2 — Bloques de noche consecutivos.

Reglas:
  - Quien hace noches hace exactamente 1 bloque de min_block..max_block noches seguidas.
  - Máximo 1 bloque NUEVO que empiece en días reales (d ≥ 1) por mes.
  - Un bloque que empieza en días virtuales (tail del mes anterior) y se prolonga
    en el mes actual NO cuenta como bloque nuevo del mes.
  - Los bloques siempre completan su mínimo dentro del mes: si no quedan días
    suficientes para un nuevo bloque, no puede empezar.

Continuación cross-month (condicional):
  Si trailing_N > 0 (el mes anterior terminó en noches):
    - trailing_N >= max_block → día 1 NO puede ser N (bloque ya al máximo).
    - trailing_N >= min_block → bloque completo, día 1 puede opcionalmente extender.
    - 0 < trailing_N < min_block → SI el día 1 es N, se fuerzan los días restantes
      para completar el mínimo. Pero el día 1 NO se fuerza (condicional).

  Nota: el solver nunca genera bloques parciales intencionalmente
  (not-can-complete restaurado para días reales). Los tails con trailing_N < min_block
  serían excepcionales (e.g. schedules manuales editados).

Constraints sobre all_days:
  - Máximo de noches consecutivas: ventana deslizante sobre all_days (incluye
    días virtuales para detectar bloques que empezaron en el mes anterior).
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo

_TAIL_LENGTH = 7


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
    min_block = cfg.minNightBlock or 4
    max_block = cfg.maxNightBlock or 6

    real_days = [d.dayNumber for d in days]
    num_real  = len(real_days)

    for e_idx in range(len(employees)):
        virt_days  = virtual_days_by_emp.get(e_idx, [])
        all_days   = virt_days + real_days
        n_all      = len(all_days)
        real_start = len(virt_days)            # índice de day 1 en all_days

        # Trailing N del mes anterior
        raw_tail = input.previousMonthTail.get(employees[e_idx].id, [])
        if raw_tail:
            tail    = list(raw_tail[-_TAIL_LENGTH:])
            padded  = ['L'] * (_TAIL_LENGTH - len(tail)) + tail
            trailing_N = 0
            for s in reversed(padded):
                if s == 'N':
                    trailing_N += 1
                else:
                    break
        else:
            trailing_N = 0

        # ── Máximo de noches consecutivas (ventana sobre all_days) ───────────
        for pos in range(n_all - max_block):
            window = [all_days[p] for p in range(pos, pos + max_block + 1)]
            model.add(
                sum(x[e_idx, d, 'N'] for d in window if (e_idx, d, 'N') in x) <= max_block
            )

        # ── Bloque-start indicators (solo para días REALES) ───────────────────
        # Se usan para "máximo 1 nuevo bloque por mes" y para el mínimo.
        # Los días virtuales no generan indicadores: su validez fue
        # responsabilidad del mes anterior.
        block_starts: dict[int, object] = {}
        for real_pos in range(num_real):
            d       = real_days[real_pos]
            all_pos = real_start + real_pos

            bs = model.new_bool_var(f"ns_{e_idx}_{d}")
            if (e_idx, d, 'N') not in x:
                model.add(bs == 0)
            elif real_pos == 0:
                if trailing_N > 0:
                    # Continuación del mes anterior: NO es nuevo bloque
                    model.add(bs == 0)
                else:
                    # Sin contexto previo: es nuevo bloque si hay N aquí
                    model.add(bs == x[e_idx, d, 'N'])
            else:
                prev_d = all_days[all_pos - 1]
                if (e_idx, prev_d, 'N') not in x:
                    model.add(bs == x[e_idx, d, 'N'])
                else:
                    model.add(bs <= x[e_idx, d, 'N'])
                    model.add(bs <= 1 - x[e_idx, prev_d, 'N'])
                    model.add(bs >= x[e_idx, d, 'N'] - x[e_idx, prev_d, 'N'])
            block_starts[real_pos] = bs

        # ── Máximo 1 bloque NUEVO en días reales ─────────────────────────────
        model.add(sum(block_starts.values()) <= 1)

        # ── Continuación cross-month (condicional) ────────────────────────────
        # SI el día 1 es N, se completan los días restantes para llegar a min_block.
        # El día 1 NO se fuerza (diferencia fundamental con bloques que empiezan
        # en días reales, donde block_start sí fuerza el mínimo).
        if trailing_N > 0 and real_days:
            day1 = real_days[0]
            if trailing_N >= max_block:
                # Bloque ya al máximo: día 1 no puede ser N
                if (e_idx, day1, 'N') in x:
                    model.add(x[e_idx, day1, 'N'] == 0)
            elif trailing_N < min_block:
                # Bloque incompleto: SI día 1 = N, completar mínimo
                remaining = min_block - trailing_N - 1   # -1: día 1 ya cuenta
                for k in range(1, remaining + 1):
                    if k < num_real:
                        nd = real_days[k]
                        if (e_idx, nd, 'N') in x:
                            model.add(x[e_idx, nd, 'N'] >= x[e_idx, day1, 'N'])
            # elif trailing_N >= min_block: bloque completo, sin restricción extra

        # ── Mínimo de noches por bloque NUEVO en días reales ─────────────────
        for real_pos in range(num_real):
            d       = real_days[real_pos]
            bs      = block_starts[real_pos]
            # Solo si hay suficientes días reales restantes para completar el bloque.
            # Si no hay suficientes, no puede empezar un nuevo bloque aquí.
            can_complete = (real_pos + min_block <= num_real)

            if can_complete:
                for k in range(1, min_block):
                    nd = real_days[real_pos + k]
                    if (e_idx, nd, 'N') in x:
                        model.add(x[e_idx, nd, 'N'] >= bs)
            else:
                # Restaurar restricción original: no puede empezar bloque nuevo
                # si no quedan días suficientes para completarlo.
                if real_pos > 0:
                    prev_d = all_days[real_start + real_pos - 1]
                    if (e_idx, prev_d, 'N') in x and (e_idx, d, 'N') in x:
                        model.add(x[e_idx, d, 'N'] <= x[e_idx, prev_d, 'N'])
                elif trailing_N == 0:
                    # Primer día real, sin trailing: no puede iniciar bloque
                    if (e_idx, d, 'N') in x:
                        model.add(x[e_idx, d, 'N'] == 0)
