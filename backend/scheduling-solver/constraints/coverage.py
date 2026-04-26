"""H1 — Cobertura mínima y máxima de personal por turno y día."""

from ortools.sat.python import cp_model
from schemas import SolverInput, DayInfo


WEEKEND = {"S", "D"}


def apply(
    model: cp_model.CpModel,
    x: dict,                    # (emp_idx, day_number, shift_code) → BoolVar
    input: SolverInput,
    employees: list,
    days: list[DayInfo],
) -> None:
    cfg = input.config
    num_emps = len(employees)

    for day in days:
        d = day.dayNumber

        # Festivos: sin restricción de cobertura mínima
        if day.isHoliday:
            continue

        # --- Mínimos hard ---
        if cfg.minMorningStaff > 0:
            model.add(
                sum(x[e, d, "M"] for e in range(num_emps)) >= cfg.minMorningStaff
            )
        if cfg.minAfternoonStaff > 0:
            model.add(
                sum(x[e, d, "T"] for e in range(num_emps)) >= cfg.minAfternoonStaff
            )
        if cfg.minNightStaff > 0:
            model.add(
                sum(x[e, d, "N"] for e in range(num_emps)) >= cfg.minNightStaff
            )

        # --- Máximos hard ---
        if cfg.maxMorningStaff > 0:
            model.add(
                sum(x[e, d, "M"] for e in range(num_emps)) <= cfg.maxMorningStaff
            )
        if cfg.maxAfternoonStaff > 0:
            model.add(
                sum(x[e, d, "T"] for e in range(num_emps)) <= cfg.maxAfternoonStaff
            )
        if cfg.maxNightStaff > 0:
            model.add(
                sum(x[e, d, "N"] for e in range(num_emps)) <= cfg.maxNightStaff
            )
