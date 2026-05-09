"""
test_benchmark.py — Benchmark sintético: 30 empleados × 31 días.

Criterio de cierre Fase 2 (SCHEDULING-SOLVER-PLAN.md):
  - 30 empleados × 31 días resueltos en < 30 segundos con horario factible.
  - Validación: no hard errors en validator (delegada a tests/scheduling/ TS, aquí
    sólo medimos status/tiempo del solver).

Skip-by-default: el benchmark añade ~5-30s al test run. Para correrlo:
  venv/Scripts/python -m pytest tests/test_benchmark.py -v --runbenchmark

Ejecución directa (sin pytest):
  venv/Scripts/python tests/test_benchmark.py
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from model import solve
from schemas import (
    DayInfo, Employee, EmployeeRules, SchedulingConfig,
    SolverInput, SolverOptions,
)


# ── Generación del input sintético ────────────────────────────────────────────

def _build_days_jan_2026() -> list[DayInfo]:
    """Enero 2026 — 31 días. Día 1 = Jueves (J)."""
    # 2026-01-01 fue jueves
    dows = ["J", "V", "S", "D", "L", "M", "X"]
    days: list[DayInfo] = []
    dow_idx = 0
    week = 1
    for d in range(1, 32):
        dow = dows[dow_idx % 7]
        days.append(DayInfo(
            dayNumber=d,
            dayOfWeek=dow,
            weekNumber=week,
            isHoliday=(d == 1 or d == 6),  # Año nuevo + Reyes
        ))
        dow_idx += 1
        if dow == "D":
            week += 1
    return days


def _build_employees_30() -> list[Employee]:
    """30 empleados rotatorios.

    Nota: omitimos mgrs con fixedShift=P porque en producción `build-solver-input.ts`
    (TS) los excluye antes de enviar al solver — Python no replica esa exclusión y
    forzaría infeasible (P no asignable → solo L → choca con maxMonthlyLibre).
    Para benchmark de carga puramente algorítmica, 30 rotatorios refleja el load real
    del solver (los fixed-P salen filtrados arriba).
    """
    emps: list[Employee] = []
    for i in range(1, 31):
        emps.append(Employee(
            id=f"E{i:08d}-0000-0000-0000-000000000000",
            name=f"ROT_{i:02d}",
            rules=EmployeeRules(),
        ))
    return emps


def _build_config() -> SchedulingConfig:
    """Config para hotel mediano (~30 emps).
    Cobertura escalada: M=5-8, T=3-5, N=1-2, plus presencia P (cubierta por mgrs).
    """
    # Cobertura escalada para 30 emps. Mínimos suben para garantizar staffing
    # en horas punta; máximos suben porque 30 × ≥20 días trabajo = ≥600 slots
    # mensuales — el max diario debe sumar ≥20 para que el problema sea factible.
    return SchedulingConfig(
        minMorningStaff=8,
        prefMorningStaff=12,
        maxMorningStaff=15,
        minAfternoonStaff=5,
        prefAfternoonStaff=7,
        maxAfternoonStaff=10,
        minNightStaff=1,
        maxNightStaff=2,
        maxWeeklyShifts=6,
        prefWeeklyShifts=5,
        minRestHours=48,
        minNightBlock=4,
        maxNightBlock=6,
        prefNightBlock=5,
        minMonthlyLibre=9,
        maxMonthlyLibre=11,
        prefMonthlyLibre=10,
        maxConsecutiveWorkDays=6,
    )


def build_synthetic_input(timeout_s: int = 30, level: str = "balanced") -> SolverInput:
    return SolverInput(
        monthId=99001,
        year=2026,
        month=1,
        employees=_build_employees_30(),
        days=_build_days_jan_2026(),
        lockedCells={},
        previousMonthTail={},
        nightsHistory={},
        config=_build_config(),
        options=SolverOptions(timeoutSeconds=timeout_s, optimizationLevel=level, seed=42),
    )


# ── Test pytest (skip-by-default) ─────────────────────────────────────────────

def pytest_addoption(parser):  # noqa: D401 — pytest hook
    parser.addoption(
        "--runbenchmark", action="store_true", default=False,
        help="Run synthetic 30×31 benchmark",
    )


@pytest.fixture
def runbenchmark(request):
    return request.config.getoption("--runbenchmark", default=False)


def test_benchmark_30x31(runbenchmark):
    if not runbenchmark:
        pytest.skip("Use --runbenchmark to run this test")

    inp = build_synthetic_input(timeout_s=30, level="balanced")
    t0 = time.time()
    result = solve(inp)
    elapsed_ms = int((time.time() - t0) * 1000)

    print(f"\n[benchmark] 30×31 status={result.status} elapsed={elapsed_ms}ms")
    if result.status == "ok":
        print(f"[benchmark] solveTimeMs={result.stats.solveTimeMs} "
              f"softPenalty={result.stats.softPenalty} "
              f"breakdown={result.stats.softPenaltyBreakdown}")
    elif result.status == "infeasible":
        print(f"[benchmark] INFEASIBLE: {result.conflictingConstraints[0].humanExplanation}")
    else:
        print(f"[benchmark] ERROR: {result.message}")

    assert result.status == "ok", f"Expected ok, got {result.status}"
    assert elapsed_ms < 30_000, f"Solver took {elapsed_ms}ms > 30000ms target"


# ── Ejecución directa (CLI) ───────────────────────────────────────────────────

if __name__ == "__main__":
    inp = build_synthetic_input(timeout_s=30, level="balanced")
    print(f"Input: {len(inp.employees)} empleados × {len(inp.days)} días")
    print(f"Config: minM={inp.config.minMorningStaff}/maxM={inp.config.maxMorningStaff} "
          f"minT={inp.config.minAfternoonStaff}/maxT={inp.config.maxAfternoonStaff} "
          f"minN={inp.config.minNightStaff}/maxN={inp.config.maxNightStaff}")
    print(f"Empleados: {sum(1 for e in inp.employees if e.rules.fixedShift)} fixed-P, "
          f"{sum(1 for e in inp.employees if not e.rules.fixedShift)} rotatorios")

    print("\nResolviendo...")
    t0 = time.time()
    result = solve(inp)
    elapsed_ms = int((time.time() - t0) * 1000)

    print(f"\n=== RESULTADO ===")
    print(f"status:    {result.status}")
    print(f"elapsed:   {elapsed_ms}ms (target <30000ms)")

    if result.status == "ok":
        print(f"solveTime: {result.stats.solveTimeMs}ms")
        print(f"cp_status: {result.stats.status}")
        print(f"softPenalty: {result.stats.softPenalty}")
        print(f"breakdown: {result.stats.softPenaltyBreakdown}")
        print(f"\nMatriz: {sum(len(d) for d in result.matrix.values())} celdas asignadas")
    elif result.status == "infeasible":
        print(f"INFEASIBLE — primer conflict: {result.conflictingConstraints[0].humanExplanation}")
    else:
        print(f"ERROR: {result.message}")
