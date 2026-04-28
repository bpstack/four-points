"""
employee_rules.py — Reglas hard de empleado.
  - noWeekends: no trabaja S/D → fuerza L esos días (si no bloqueado).
  - fixedShift: solo puede asignarse ese turno (o L/rest) → prohíbe otros work shifts.
"""

from schemas import SolverInput

WORK_SHIFTS  = {"M", "T", "N"}
WEEKEND_DAYS = {"S", "D"}


def apply(model, x, input_data: SolverInput, employees, days):
    for e_idx, emp in enumerate(employees):
        rules  = emp.rules
        locked = input_data.lockedCells.get(emp.id, {})

        for d_info in days:
            d = d_info.dayNumber
            if str(d) in locked:
                continue  # locked_cells ya fijó esta celda

            # noWeekends: forzar L en sábado y domingo
            if rules.noWeekends and d_info.dayOfWeek in WEEKEND_DAYS:
                model.add(x[e_idx, d, "L"] == 1)
                continue  # fixedShift no aplica si ya está forzado a L

            # fixedShift: prohibir work shifts distintos al fijo
            # Solo aplica si fixedShift es un turno asignable (M/T/N); P/PI se ignoran por ahora.
            if rules.fixedShift and rules.fixedShift in WORK_SHIFTS:
                for s in WORK_SHIFTS - {rules.fixedShift}:
                    model.add(x[e_idx, d, s] == 0)
