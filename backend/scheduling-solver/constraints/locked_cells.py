"""
H7 — Celdas bloqueadas: assignments con source_constraint_id y
     scheduling_employee_requests aprobadas se fijan como constantes.
"""

from ortools.sat.python import cp_model
from schemas import SolverInput

# Turnos que el solver puede asignar libremente.
# Cualquier código fuera de esta lista (V, B, IT, E, FO, A, ...) solo puede
# aparecer en celdas explícitamente bloqueadas — nunca por decisión del solver.
_BASE_SHIFTS = {"M", "T", "N", "L"}


def apply(
    model: cp_model.CpModel,
    x: dict,
    input: SolverInput,
    emp_idx_by_id: dict[str, int],
) -> None:
    # Paso 1: fijar cada celda bloqueada a su turno correspondiente.
    # Registramos (e_idx, day) → shift para el paso 2.
    locked_by_emp_day: dict[tuple[int, int], str] = {}

    for emp_id, day_map in input.lockedCells.items():
        e = emp_idx_by_id.get(emp_id)
        if e is None:
            continue
        for day_str, shift_code in day_map.items():
            d = int(day_str)
            locked_by_emp_day[(e, d)] = shift_code
            if (e, d, shift_code) in x:
                model.add(x[e, d, shift_code] == 1)

    # Paso 2: prohibir turnos especiales (V, B, IT, E, FO, A, ...) en cualquier
    # combinación (empleado, día) que NO esté explícitamente bloqueada.
    # Sin esto el solver los usaría libremente para cuadrar otras constraints.
    for (e, d, s) in x:
        if s in _BASE_SHIFTS:
            continue
        if locked_by_emp_day.get((e, d)) != s:
            model.add(x[e, d, s] == 0)
