"""
H7 — Celdas bloqueadas: assignments con source_constraint_id y
     scheduling_employee_requests aprobadas se fijan como constantes.
"""

from ortools.sat.python import cp_model
from schemas import SolverInput


def apply(
    model: cp_model.CpModel,
    x: dict,
    input: SolverInput,
    emp_idx_by_id: dict[str, int],
) -> None:
    for emp_id, day_map in input.lockedCells.items():
        e = emp_idx_by_id.get(emp_id)
        if e is None:
            continue
        for day_str, shift_code in day_map.items():
            d = int(day_str)
            if (e, d, shift_code) in x:
                # Fijar esa variable a 1 (y el resto de turnos del día a 0 implícitamente
                # por la restricción add_exactly_one)
                model.add(x[e, d, shift_code] == 1)
