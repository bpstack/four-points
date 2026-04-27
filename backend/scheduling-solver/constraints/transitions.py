"""
H3 + transiciones prohibidas entre turnos.

Reglas HARD:
  - Tras N: el siguiente día debe ser N (continuar bloque) o descanso (L/V/B/E/IT/FO/A).
    No se puede ir a M, T, ni PI directamente después de una noche.
  - T → M: tarde (23:00) seguida de mañana (07:00) = 8h de descanso → prohibido.
    El día siguiente a T debe ser L/V/B/... o T o N. No puede ser M.

Estas transiciones producen horarios físicamente imposibles o muy perjudiciales
para la salud del trabajador.
"""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo

WORK_SHIFTS = {'M', 'T', 'N', 'PI', 'P'}
REST_SHIFTS  = {'L', 'V', 'B', 'E', 'IT', 'FO', 'A'}


def apply(
    model: cp_model.CpModel,
    x: dict,
    input: SolverInput,
    employees: list,
    days: list[DayInfo],
) -> None:
    tail = input.previousMonthTail
    day_numbers = [d.dayNumber for d in days]
    num_days = len(day_numbers)

    for e_idx in range(len(employees)):
        # ── Cross-month: transición último día del mes anterior → día 1 ──────
        emp_tail = tail.get(employees[e_idx].id, [])
        if emp_tail and day_numbers:
            last_shift = emp_tail[-1]
            day1 = day_numbers[0]

            # H3: tras N no puede venir M/T/PI/P
            if last_shift == 'N':
                for forbidden in ['M', 'T', 'PI', 'P']:
                    if (e_idx, day1, forbidden) in x:
                        model.add(x[e_idx, day1, forbidden] == 0)

            # T→M cross-month: tarde seguida de mañana = 8h descanso → prohibido
            if last_shift == 'T':
                if (e_idx, day1, 'M') in x:
                    model.add(x[e_idx, day1, 'M'] == 0)

        # ── Within-month transitions ──────────────────────────────────────────
        for pos in range(num_days - 1):
            d      = day_numbers[pos]
            d_next = day_numbers[pos + 1]

            # ── H3: después de N solo puede ir N o descanso ──────────
            # Si hoy es N y mañana NO es N → mañana debe ser descanso
            # Equivalente: si hoy es N → mañana no puede ser M, T, PI, P
            for forbidden in ['M', 'T', 'PI', 'P']:
                if (e_idx, d_next, forbidden) not in x:
                    continue
                # x[e, d, N] = 1 implica x[e, d_next, forbidden] = 0
                model.add(
                    x[e_idx, d_next, forbidden] + x[e_idx, d, 'N'] <= 1
                )

            # ── T → M prohibido: tarde seguida de mañana ─────────────
            if (e_idx, d_next, 'M') in x and (e_idx, d, 'T') in x:
                model.add(
                    x[e_idx, d, 'T'] + x[e_idx, d_next, 'M'] <= 1
                )
