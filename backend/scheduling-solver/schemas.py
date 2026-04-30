"""
schemas.py — Contratos de input/output entre Node y el solver Python.
Corresponde a SCHEDULING-SOLVER-PLAN.md §3.1-§3.2.
"""

from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, field_validator


# ──────────────────────────────────────────────────────────────
# INPUT
# ──────────────────────────────────────────────────────────────

class EmployeeRules(BaseModel):
    fixedShift: str | None = None       # 'M','T','N','P','PI' — turno único
    noWeekends: bool = False            # no trabaja sábado ni domingo
    shiftPriority: str | None = None    # turno preferido (soft)
    fixedDays: list[int] = []           # días del mes en que trabaja (fijo semanal)
    maxShiftPerMonth: dict[str, int] = {}
    minShiftPerMonth: dict[str, int] = {}


class Employee(BaseModel):
    id: str
    name: str
    rules: EmployeeRules = EmployeeRules()


class DayInfo(BaseModel):
    dayNumber: int          # 1-31
    dayOfWeek: str          # 'L','M','X','J','V','S','D'
    weekNumber: int
    isHoliday: bool = False


class SchedulingConfig(BaseModel):
    minMorningStaff: int = 1
    prefMorningStaff: int = 2
    maxMorningStaff: int = 6
    minAfternoonStaff: int = 1
    prefAfternoonStaff: int = 2
    maxAfternoonStaff: int = 6
    minNightStaff: int = 1
    maxNightStaff: int = 1
    maxWeeklyShifts: int = 6
    prefWeeklyShifts: int = 5
    minRestHours: int = 48
    minNightBlock: int = 4
    maxNightBlock: int = 6
    prefNightBlock: int = 5
    minMonthlyLibre: int = 9
    maxMonthlyLibre: int = 11
    maxConsecutiveWorkDays: int = 6


class SolverOptions(BaseModel):
    timeoutSeconds: int = 30
    optimizationLevel: Literal["fast", "balanced", "thorough"] = "fast"
    seed: int | None = None


class SolverInput(BaseModel):
    monthId: int
    year: int
    month: int                              # 1-12
    employees: list[Employee]
    days: list[DayInfo]
    # employeeId → dayNumber → shiftCode  (celdas bloqueadas: vacaciones aprobadas, etc.)
    lockedCells: dict[str, dict[str, str]] = {}
    # employeeId → lista de shifts de los últimos N días del mes anterior (orden cronológico ASC)
    # Usado para continuidad cross-month (bloques de noche, descanso, trabajo consecutivo).
    previousMonthTail: dict[str, list[str]] = {}
    # employeeId → total de noches (N) acumuladas en meses publicados anteriores.
    # Alimenta el objetivo soft de balanceo de noches entre empleados.
    nightsHistory: dict[str, int] = {}
    config: SchedulingConfig = SchedulingConfig()
    options: SolverOptions = SolverOptions()

    @field_validator("employees")
    @classmethod
    def at_least_one_employee(cls, v: list[Employee]) -> list[Employee]:
        if not v:
            raise ValueError("Se necesita al menos 1 empleado")
        return v

    @field_validator("days")
    @classmethod
    def at_least_one_day(cls, v: list[DayInfo]) -> list[DayInfo]:
        if not v:
            raise ValueError("Se necesita al menos 1 día")
        return v


# ──────────────────────────────────────────────────────────────
# OUTPUT
# ──────────────────────────────────────────────────────────────

class SolverStats(BaseModel):
    solveTimeMs: int
    hardConstraintsSatisfied: bool
    softPenalty: int = 0
    softPenaltyBreakdown: dict[str, int] = {}
    status: str                             # 'OPTIMAL','FEASIBLE','INFEASIBLE','UNKNOWN'


class SolverSuccess(BaseModel):
    status: Literal["ok"]
    # employeeId → dayNumber (string) → shiftCode
    matrix: dict[str, dict[str, str]]
    stats: SolverStats


class ConflictingConstraint(BaseModel):
    constraintName: str
    employeeIds: list[str] = []
    dayNumbers: list[int] = []
    humanExplanation: str


class SuggestedRelaxation(BaseModel):
    constraint: str
    currentValue: int
    proposedValue: int
    impact: str


class SolverInfeasible(BaseModel):
    status: Literal["infeasible"]
    conflictingConstraints: list[ConflictingConstraint]
    suggestedRelaxations: list[SuggestedRelaxation]


class SolverError(BaseModel):
    status: Literal["error"]
    errorCode: Literal["INVALID_INPUT", "TIMEOUT", "INTERNAL"]
    message: str
    details: dict | None = None


SolverOutput = SolverSuccess | SolverInfeasible | SolverError
