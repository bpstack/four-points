"""
poc.py — PoC CP-SAT: 7 empleados rotatorios x 31 días (Enero 2026)

Constraints implementadas:
  H1 - Cobertura mínima: ≥1 M, ≥1 T, ≥1 N por día (no festivo)
  H4 - Máximo 6 días consecutivos de trabajo
  H5 - ≥2 libres consecutivos en toda ventana de 7 días
  H6 - Mínimo 9 libres al mes por empleado

Objetivo: validar que OR-tools CP-SAT resuelve 7×31 en < 5s.
"""

import time
from ortools.sat.python import cp_model

# ──────────────────────────────────────────────
# DATOS
# ──────────────────────────────────────────────

EMPLOYEES = ["Andrés", "Sara", "Lucía", "Hugo", "Elena", "Irene", "Pablo"]
DAYS = list(range(1, 32))          # 1..31  (enero 2026)
NUM_DAYS = 31

# Turnos de trabajo
WORK_SHIFTS = ["M", "T", "N"]
# Turno libre
REST = "L"
ALL_SHIFTS = WORK_SHIFTS + [REST]

# Índices
SHIFT_IDX = {s: i for i, s in enumerate(ALL_SHIFTS)}
M, T, N, L = SHIFT_IDX["M"], SHIFT_IDX["T"], SHIFT_IDX["N"], SHIFT_IDX["L"]

# Enero 2026: día 1 = Jueves
# 0=L,1=M,2=X,3=J,4=V,5=S,6=D
DOW_JAN2026 = [(3 + d) % 7 for d in range(31)]  # día 1 es Jueves (índice 3)

# Festivos enero 2026 en Andalucía: día 1 (Año Nuevo), día 6 (Reyes)
HOLIDAYS = {1, 6}

# Configuración (de scheduling_config en DB)
MIN_MORNING = 1
MIN_AFTERNOON = 1
MIN_NIGHT = 1
MAX_CONSECUTIVE_WORK = 6
MIN_MONTHLY_LIBRE = 9
MIN_NIGHT_BLOCK = 4
MAX_NIGHT_BLOCK = 6

# ──────────────────────────────────────────────
# MODELO
# ──────────────────────────────────────────────

def solve():
    model = cp_model.CpModel()

    # x[e, d, s] = 1 si empleado e trabaja turno s el día d
    x = {}
    for e_idx, emp in enumerate(EMPLOYEES):
        for d in DAYS:
            for s_idx, shift in enumerate(ALL_SHIFTS):
                x[e_idx, d, s_idx] = model.new_bool_var(f"x_{emp}_{d}_{shift}")

    # ── Restricción base: exactamente 1 turno por empleado por día ──
    for e_idx in range(len(EMPLOYEES)):
        for d in DAYS:
            model.add_exactly_one(x[e_idx, d, s] for s in range(len(ALL_SHIFTS)))

    # ── H1: Cobertura mínima por día (saltar festivos) ──
    for d in DAYS:
        if d in HOLIDAYS:
            continue
        model.add(sum(x[e, d, M] for e in range(len(EMPLOYEES))) >= MIN_MORNING)
        model.add(sum(x[e, d, T] for e in range(len(EMPLOYEES))) >= MIN_AFTERNOON)
        model.add(sum(x[e, d, N] for e in range(len(EMPLOYEES))) >= MIN_NIGHT)

    # ── H4: Máximo días consecutivos de trabajo ──
    for e in range(len(EMPLOYEES)):
        for start in DAYS:
            window_end = min(start + MAX_CONSECUTIVE_WORK, NUM_DAYS + 1)
            window = list(range(start, window_end))
            if len(window) == MAX_CONSECUTIVE_WORK + 1:
                # No puede trabajar los MAX+1 días seguidos
                model.add(
                    sum(x[e, d, s] for d in window for s in [M, T, N])
                    <= MAX_CONSECUTIVE_WORK
                )

    # ── H5: ≥2 libres consecutivos en toda ventana de 7 días ──
    for e in range(len(EMPLOYEES)):
        for start in DAYS:
            end = start + 6
            if end > NUM_DAYS:
                break
            window = list(range(start, end + 1))
            # Al menos 1 par consecutivo de libres dentro de la ventana
            consecutive_pairs = []
            for i in range(len(window) - 1):
                d1, d2 = window[i], window[i + 1]
                pair = model.new_bool_var(f"pair_{e}_{d1}_{d2}")
                model.add(x[e, d1, L] + x[e, d2, L] >= 2).only_enforce_if(pair)
                model.add(x[e, d1, L] + x[e, d2, L] <= 1).only_enforce_if(pair.negated())
                consecutive_pairs.append(pair)
            model.add(sum(consecutive_pairs) >= 1)

    # ── H6: Mínimo 9 libres al mes ──
    for e in range(len(EMPLOYEES)):
        model.add(sum(x[e, d, L] for d in DAYS) >= MIN_MONTHLY_LIBRE)

    # ── H2: Bloques de noche consecutivos (min 4, max 6) ──
    for e in range(len(EMPLOYEES)):
        # Max: ninguna ventana de max+1 días puede tener más de max noches
        for start in range(1, NUM_DAYS - MAX_NIGHT_BLOCK + 1):
            window = list(range(start, start + MAX_NIGHT_BLOCK + 1))
            model.add(sum(x[e, d, N] for d in window) <= MAX_NIGHT_BLOCK)

        # Min: si empieza un bloque (N en d pero no en d-1), exigir MIN_NIGHT_BLOCK días seguidos
        for d in DAYS:
            pos = d - 1  # posición 0-based
            if d + MIN_NIGHT_BLOCK - 1 > NUM_DAYS:
                # No caben min días → si no viene de bloque anterior, no puede ser N
                if d > 1:
                    model.add(x[e, d, N] <= x[e, d - 1, N])
            else:
                if d == 1:
                    block_start = model.new_bool_var(f"ns_{e}_{d}")
                    model.add(block_start == x[e, d, N])
                    for k in range(1, MIN_NIGHT_BLOCK):
                        model.add(x[e, d + k, N] >= block_start)
                else:
                    block_start = model.new_bool_var(f"ns_{e}_{d}")
                    model.add(block_start <= x[e, d, N])
                    model.add(block_start <= 1 - x[e, d - 1, N])
                    model.add(block_start >= x[e, d, N] - x[e, d - 1, N])
                    for k in range(1, MIN_NIGHT_BLOCK):
                        model.add(x[e, d + k, N] >= block_start)

    # ──────────────────────────────────────────
    # RESOLVER
    # ──────────────────────────────────────────

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    solver.parameters.log_search_progress = False

    t0 = time.time()
    status = solver.solve(model)
    elapsed = time.time() - t0

    # ──────────────────────────────────────────
    # RESULTADO
    # ──────────────────────────────────────────

    status_name = solver.status_name(status)
    print(f"Status: {status_name}  |  Tiempo: {elapsed:.3f}s")

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        print()
        header = "         " + "".join(f"{d:>3}" for d in DAYS)
        print(header)
        for e_idx, emp in enumerate(EMPLOYEES):
            row = []
            for d in DAYS:
                for s_idx, shift in enumerate(ALL_SHIFTS):
                    if solver.value(x[e_idx, d, s_idx]):
                        row.append(shift[0])  # primera letra
            libres = row.count("L")
            trabajo = sum(1 for c in row if c != "L")
            print(f"{emp:<9}" + "".join(f"{c:>3}" for c in row) + f"   (L={libres} W={trabajo})")

        # Verificar cobertura
        print()
        print("Cobertura (M/T/N por día):")
        fails = 0
        for d in DAYS:
            if d in HOLIDAYS:
                continue
            m_cnt = sum(
                1 for e in range(len(EMPLOYEES))
                if solver.value(x[e, d, M])
            )
            t_cnt = sum(
                1 for e in range(len(EMPLOYEES))
                if solver.value(x[e, d, T])
            )
            n_cnt = sum(
                1 for e in range(len(EMPLOYEES))
                if solver.value(x[e, d, N])
            )
            if m_cnt < MIN_MORNING or t_cnt < MIN_AFTERNOON or n_cnt < MIN_NIGHT:
                print(f"  ❌ Día {d}: M={m_cnt} T={t_cnt} N={n_cnt}")
                fails += 1
        if fails == 0:
            print("  OK - Todos los dias cubiertos")
    else:
        print("INFEASIBLE - No se encontro solucion")


if __name__ == "__main__":
    solve()
