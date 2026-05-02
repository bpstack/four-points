"""
test_corpus.py — Corpus de fixtures del scheduler contra el solver Python.

Objetivo (SCHEDULING-SOLVER-PLAN.md Fase 1):
  - Ningún fixture produce status='error' (sin crashes internos).
  - Fixtures con parámetros claramente resolubles → status='ok'.

Ejecución:
  cd backend/scheduling-solver
  venv/Scripts/python -m pytest tests/test_corpus.py -v
"""

import json
from pathlib import Path
import pytest

from model import solve
from schemas import SolverInput, SchedulingConfig, SolverOptions

CORPUS_PATH = (
    Path(__file__).parent.parent.parent / "tests" / "scheduling-corpus" / "fixtures"
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_fixture(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def fixture_to_solver_input(data: dict) -> SolverInput:
    """Convierte un corpus fixture al formato SolverInput del solver Python."""
    inp = data["input"]

    # lockedCells: {empId: [dayNums]} + assignments → {empId: {dayNum_str: shiftCode}}
    locked_cells: dict[str, dict[str, str]] = {}
    fixture_locked: dict = inp.get("lockedCells") or {}
    fixture_assignments: dict = inp.get("assignments") or {}
    for emp_id, day_nums in fixture_locked.items():
        locked_cells[emp_id] = {}
        for day_num in day_nums:
            emp_assign = fixture_assignments.get(emp_id, {})
            shift = emp_assign.get(str(day_num)) or emp_assign.get(day_num)
            if shift:
                locked_cells[emp_id][str(day_num)] = shift

    # previousMonthTail: history.lastShifts[empId] → [shiftCode, ...]
    prev_tail: dict[str, list[str]] = {}
    prev_history = inp.get("previousMonthHistory")
    if prev_history:
        for emp_id, shifts in (prev_history.get("lastShifts") or {}).items():
            prev_tail[emp_id] = [s["shiftCode"] for s in shifts]

    # Config — pydantic v2 ignora campos extra silenciosamente
    config = SchedulingConfig.model_validate(inp.get("config") or {})

    return SolverInput.model_validate({
        "monthId": inp["monthId"],
        "year": inp["year"],
        "month": inp["month"],
        "employees": inp["employees"],
        "days": inp["days"],
        "lockedCells": locked_cells,
        "previousMonthTail": prev_tail,
        "config": config.model_dump(),
        "options": {"timeoutSeconds": 30, "optimizationLevel": "fast", "seed": 42},
    })


def all_fixture_paths() -> list[Path]:
    return sorted(CORPUS_PATH.glob("F*.json"))


# ── Test 1: ningún fixture produce error interno ──────────────────────────────

@pytest.mark.parametrize("fixture_path", all_fixture_paths(), ids=lambda p: p.stem)
def test_solver_no_crash(fixture_path: Path):
    """El solver debe devolver 'ok' o 'infeasible', nunca 'error'."""
    data = load_fixture(fixture_path)
    solver_input = fixture_to_solver_input(data)
    result = solve(solver_input)
    assert result.status in ("ok", "infeasible"), (
        f"Solver crashed: status={result.status} | "
        f"message={getattr(result, 'message', 'n/a')}"
    )


# ── Test 2: fixtures resolubles devuelven status='ok' ─────────────────────────

# Fixtures donde el solver DEBE encontrar solución.
# Criterio: cobertura desactivada (minM=minT=minN=0) y sin reglas de empleado
# que hagan el problema inherentemente imposible.
SOLVABLE_FIXTURES = {
    # Válidos (isValid=true) — el solver debería replicar la solución o encontrar otra
    "F02-perfect-month",
    "F08-rest-hours-tight-but-ok",
    "F10-night-block-correct",
    "F11-cross-month-night-block-completed",
    "F19-pattern-e-no-weekend-off",
    "F22-locked-vacation-respected",
    "F23-locked-cell-still-counts",
    "F24-29feb-leap-year",
    # Inválidos en el validador (por violación en el schedule existente),
    # pero el solver puede generar un schedule DISTINTO sin esa violación.
    "F07-rest-hours-violation",     # violación solo en el schedule del fixture
    "F09-night-block-too-short",    # el solver generará bloques correctos de N
    "F12-cross-month-rest-hours",   # la violación es de T→M cross-month; solver evita T→M
    "F14-libre-below-min",          # el solver respeta minMonthlyLibre
    "F15-libre-above-max",          # el solver respeta maxMonthlyLibre
    "F16-consecutive-work-violation",  # el solver respeta maxConsecutiveWorkDays
    "F17-small-work-block",         # el solver respeta minConsecutiveWork
    "F18-weekend-off-missing",      # soft constraint; el solver puede elegir no satisfacerla
    "F20-employee-no-weekends",     # el solver fuerza L en S/D para noWeekends=true
    "F21-employee-fixed-shift",     # el solver fuerza fixedShift correctamente
    "F25-fully-broken-month",       # el solver genera schedule válido desde cero
    # Nuevos fixtures F26-F51
    "F26-vacation-at-start",
    "F27-vacation-at-end",
    "F28-holiday-mid-month",
    "F29-simultaneous-vacations",
    "F30-trailing-n-incomplete-with-vacation",
    "F32-trailing-n-complete-can-start-new",
    "F33-short-month-28days",
    "F34-short-month-29feb-leap",
    "F35-night-block-min-3",
    "F36-libre-below-min",
    "F37-libre-above-max",
    "F38-libres-grouped-vs-isolated",
    "F39-locked-bonificable-counts",
    "F40-mixed-rest-days-boundary",
    "F41-prev-month-draft-no-tail",
    "F42-consecutive-unpublished-months",
    "F44-n-to-l-cross-month",
    "F45-completed-block-new-allowed",
    "F46-no-weekends-with-vacation-saturday",
    "F47-fixed-shift-presencia-only",
    "F48-fixed-shift-with-fixed-days",
    "F49-presencia-only-no-fixed-days",
    "F50-multiple-employees-with-rules",
    # F43 (T→M cross-month) es INVÁLIDO — el solver debe evitar esta transición
}

# Fixtures que el solver DEBE rechazar (parámetros físicamente imposibles).
# Sirven para verificar que el solver detecta correctamente la infactibilidad.
INFEASIBLE_FIXTURES = {
    "F31-trailing-n-at-max",          # EMP_01 con trailing_N=6 (=maxBlock) + nuevo bloque obligatorio = 12+ N's
    "F51-coverage-minimums-active",   # 3 empleados, cobertura requiere 5 staff/día
}

@pytest.mark.parametrize(
    "fixture_path",
    [p for p in all_fixture_paths() if p.stem in SOLVABLE_FIXTURES],
    ids=lambda p: p.stem,
)
def test_solver_finds_solution(fixture_path: Path):
    """Para fixtures con parámetros resolubles el solver debe devolver status='ok'."""
    data = load_fixture(fixture_path)
    solver_input = fixture_to_solver_input(data)
    result = solve(solver_input)

    conflicts = ""
    if result.status == "infeasible":
        conflicts = " | conflictos: " + str(getattr(result, "conflictingConstraints", []))

    assert result.status == "ok", (
        f"Expected 'ok' pero solver devolvió '{result.status}'{conflicts}"
    )


# ── Test 3: fixtures infactibles devuelven status='infeasible' ────────────────

@pytest.mark.parametrize(
    "fixture_path",
    [p for p in all_fixture_paths() if p.stem in INFEASIBLE_FIXTURES],
    ids=lambda p: p.stem,
)
def test_solver_detects_infeasibility(fixture_path: Path):
    """Para fixtures con parámetros imposibles el solver debe devolver status='infeasible'."""
    data = load_fixture(fixture_path)
    solver_input = fixture_to_solver_input(data)
    result = solve(solver_input)
    assert result.status == "infeasible", (
        f"Expected 'infeasible' pero solver devolvió '{result.status}'"
    )
