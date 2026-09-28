# AGENTS.md — Scheduling Solver (Python / CP-SAT)

> Context specific to this directory. The root `CLAUDE.md` covers the scheduling
> system end-to-end (UI + backend TS + solver). This file focuses on the Python
> side: daemon, CP-SAT model, constraints, tests and deploy.

## Purpose

Solves the monthly shift assignment problem as a Constraint Programming model
(CP-SAT, Google OR-Tools). Takes a `SolverInput` JSON from the TS backend,
returns a `SolverOutput` with the `employee → day → shift` matrix or an
infeasibility diagnostic.

It has no internal state: every request is pure. The only reason it runs as a
persistent daemon rather than one-shot per request is the cost of importing
`ortools` (~2-3 s) — paying it once at boot is ~100× cheaper than paying it per
request.

## Architecture

```
daemon.py        ← persistent entry point; stdin/stdout JSON line-delimited loop
main.py          ← one-shot CLI entry point (legacy, keep for occasional debug)
schemas.py       ← Pydantic: SolverInput / SolverOutput (contract with Node)
model.py         ← Builds the CP-SAT model, applies constraints, optimizes, decodes
constraints/     ← One file per hard constraint, same signature apply(model, x, input, ...)
  coverage.py        — H1: minimum M/T/N coverage per day
  night_block.py     — H2: consecutive night blocks [min, max]
  transitions.py     — H3: forbidden transitions (N→M/T/PI/P, T→M)
  rest.py            — H4 (max consecutive work) + H5 (≥2 rest in window of 7)
  libres.py          — H6: monthly libres [min, max]
  locked_cells.py    — H7: locked cells + special shifts only in locks
  day_blocks.py      — Minimum consecutive M/T blocks, forbids M→T
  employee_rules.py  — noWeekends, fixedShift per employee
tests/
  test_corpus.py        — Walks the repo's JSON fixtures and verifies none crash; ones marked SOLVABLE must return status='ok'
  test_daemon_stress.py — Startup, valid/invalid requests, daemon recovery
  test_benchmark.py     — 30×31 stress (opt-in via --runbenchmark)
```

## Communication with Node

**Protocol (one request at a time, synchronous):**

```
stdin  → 1 line JSON (SolverInput)
stdout → 1 line JSON (SolverOutput, or {"status":"ready"} at startup)
stderr → debug logs (Node surfaces these prefixed)
```

On startup, the daemon prints `{"status":"ready"}` so `solver-client.ts` (Node)
knows `ortools` has finished importing and the process can accept requests. If
it receives EOF on stdin, it shuts down cleanly.

The Node client (`backend/services/scheduling/solver-client.ts`) handles:

- Daemon state: `idle` → `starting` → `ready` → `busy`
- Semaphore: one request at a time (CP-SAT is not thread-safe per process)
- Abort-safe: the semaphore is not released until the daemon answers
- Transparent respawn if the process dies (broken pipe → relaunch)

## CP-SAT model variables

```python
x[e, d, s] = BoolVar   # employee index e, day d, shift s
```

Base constraint: `exactly_one(x[e, d, s] for s in all_shifts_needed)` per (e,
d).

**Real days:** 1..N (N=28-31). **Virtual days:** -7..-1, only for employees with
non-empty `previousMonthTail`; the virtual cells are pre-locked from last
month's tail. Every constraint iterates over `all_days = virt_days + real_days`
so that cross-month continuity is uniform.

**Relevant shift sets in `model.py`:**

| Constant            | Members            | Use                                                                                                               |
| ------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `ASSIGNABLE_SHIFTS` | M, T, N, L         | What the solver can freely assign                                                                                 |
| `WORK_SHIFTS`       | M, T, N            | For shiftPriority and standard work metrics                                                                       |
| `ALL_WORK_SHIFTS`   | M, T, N, P, PI     | Work-block detection for S4 — includes P/PI to stay in parity with the TS validator's `isWorkShift`               |
| `_SPECIAL_REST`     | V, B, E, IT, FO, A | Special rest types (vacation, sick leave, etc.) — never assigned freely by the solver; only enter via lockedCells |
| `TAIL_LENGTH = 7`   | —                  | Days from the previous month projected as virtual                                                                 |

The `all_shifts_needed` set materialized into variables is
`ASSIGNABLE_SHIFTS ∪ (codes seen in lockedCells) ∪ (codes seen in previousMonthTail)`.
So if a month has locked vacations, V materializes; if not, no useless variable
is created.

## Hard constraints

Each file in `constraints/` exposes a function:

```python
def apply(model, x, input, employees, days, virtual_days_by_emp=None):
    ...
```

`employees` and `days` are passed for convenience (avoids re-extracting them
from `input`). `virtual_days_by_emp` is optional; constraints that need
cross-month continuity (`rest`, `night_block`, `transitions`, `day_blocks`)
iterate over `all_days_e = virt_days + day_numbers`. The ones that do not
(`coverage`, `libres`, `employee_rules`, `locked_cells`) do not.

**Fine notes per constraint:**

- **H2 night_block.** Each rotary employee does exactly **1 block** of
  `minNightBlock..maxNightBlock` consecutive nights per month. Rules based on
  `trailing_N` (consecutive nights carried over from the previous month):
  - `trailing_N == 0`: can start a new block freely.
  - `0 < trailing_N < minNightBlock`: incomplete block from last month;
    **forbidden to start a new block** (must finish the previous one at the
    start of the month). **Exception**: if the cells needed to complete the
    minimum are locked (e.g. vacation at the start of the month), the
    restriction is lifted and a new block can start later.
  - `trailing_N >= minNightBlock`: block already complete; can start a new one
    this month.
  - `trailing_N >= maxNightBlock`: day 1 forced to **not-N** (block at maximum).

- **H5 rest (window of 7 with ≥2 rests) and H4 (max consec work).** Iterate over
  `all_days_e`. **Documented cross-month gotcha (2026-05-20):** if the virtual
  tail of the previous month already violates the constraint mathematically
  (e.g. 6 shifts in a row at last month's close), the window is unsatisfiable
  and would produce an artificial INFEASIBLE when generating the new month.
  `rest.py` **explicitly skips** these "doomed" windows — validating the
  previous month is the previous month's responsibility. Full reasoning in
  `SCHEDULING-DECISIONS-LOG.md` (entry 2026-05-20). Outstanding debt: the TS
  validator does not apply this same exemption yet → potential drift. See
  `SCHEDULING-CONSTRAINTS.md §H5`.

- **H6 libres.** The monthly minimum is reduced by the number of locked
  special-rest days (V/B/E/IT/FO/A) the employee already has.

- **H7 locked_cells.** Skip negative keys (virtual days are already locked in
  `model.py` when the tail variables are created). Special shifts
  (V/B/IT/E/FO/A) appear only where there is a locked cell; the solver never
  assigns them freely to other employees.

- **day_blocks.** Minimum consecutive M and T blocks (`day_block_min` from
  config). Forbids the M→T transition without a libre in between.

- **employee_rules.** `noWeekends` forces L on Saturday/Sunday for the affected
  employee. `fixedShift ∈ {M,T,N}` forbids other work shifts (only the fixed one
  or L). `fixedDays` **is NOT applied here** — it's pre-expanded in
  `build-solver-input.ts` and arrives as `lockedCells`. Employees with
  `fixedShift='P'` and no `fixedDays` are **excluded from the solver entirely**
  (unknown pattern).

## Objective function (soft)

Weights in `model.py`:

```python
W_NIGHT_BALANCE    = 10   # S1
W_ISOLATED_L       = 2    # S2
W_SHIFT_PRIORITY   = 1    # S3
W_SHORT_WORK_BLOCK = 3    # S4 (per missing day; 1-day → ×2, 2-day → ×1)
```

| ID     | What it penalizes                                                 | How it's measured                                                      | Breakdown in `softPenaltyBreakdown` |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| **S1** | Night imbalance across rotary employees                           | `range(total_N)` = max - min over `nightsHistory + nights this month`  | Yes: key `night_balance`            |
| **S2** | "Isolated" L (no L adjacent on the previous or next day)          | Boolean indicator `iso[e,d]` per candidate L cell                      | No (contributes to total)           |
| **S3** | Work day on a shift different from the employee's `shiftPriority` | Direct sum of `x[e, d, s]` with `s != priority`                        | No (contributes to total)           |
| **S4** | Short work block (1-2 consecutive days when the minimum is 3)     | Indicators `short1` (×2) and `short2` (×1); includes virtual tail days | Yes: key `min_work_block_short`     |

S2/S3 contribute to the `softPenalty` total but are not broken down individually
— a conscious decision because they aren't actionable on their own. If at some
point one needs to be audited, replicate the S1/S4 pattern (accumulator `*_vars`
and post-solve readout).

## Infeasibility analyzer

`_analyze_infeasibility(input, elapsed_ms)` in `model.py` runs when CP-SAT
returns `INFEASIBLE`. It's **heuristic**, it does not use
`sufficient_assumptions_for_infeasibility` (that would require refactoring to an
assumption-vars model).

It detects:

1. **Coverage vs capacity:** aggregate demand (`min*Staff × num_days`) vs
   capacity
   (`rotary employees × days - minimum libres - locked special shifts`).
2. **Over-locked individual employee:** too many M/T/N in lockedCells → minimum
   libres no longer fit.
3. **Night block too long:** `minNightBlock > num_days / num_rotarios`.
4. **Absurd rest hours:** `minRestHours > 48`.

Returns `(conflictingConstraints, suggestedRelaxations)`. Default suggestions:
lower `minMonthlyLibre` before lowering coverage (less disruptive). If nothing
matches, generic fallback.

When an INFEASIBLE appears in production that the analyzer can't diagnose,
**don't blindly patch here**: use `debug-sept.js` (see below) to inspect the
real `SolverInput`, identify the pattern, and then extend the analyzer with a
new branch. One correct, specific message beats a thousand generic ones.

## Local setup

```bash
cd backend/scheduling-solver
python -m venv venv                       # create venv
venv/Scripts/pip install ortools pydantic pytest    # Windows
# venv/bin/pip install ortools pydantic pytest      # Linux/Mac
```

The venv lives here and is `.gitignore`d. On Render (deploy), the build command
recreates the venv — see `TODO.md` § "Deploy en Render" if you need to touch the
deploy.

`requirements.txt` and `pyproject.toml` are alternative sources of truth; in
practice we use the inline pins above for local dev.

## Tests

| Suite                             | Command                                                                   | Approx time | Coverage                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------- | ----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python corpus                     | `venv/Scripts/python -m pytest tests/test_corpus.py`                      |        ~5 s | Repo fixtures (`backend/tests/scheduling-corpus/fixtures/`) — all must parse and SOLVABLE ones must return status='ok'                                   |
| Daemon stress                     | `venv/Scripts/python -m pytest tests/test_daemon_stress.py`               |        ~5 s | Startup, invalid JSON, invalid schema, recovery after error                                                                                              |
| Benchmark                         | `venv/Scripts/python -m pytest tests/test_benchmark.py --runbenchmark`    |    ~30-60 s | 30 employees × 31 days — perf check, opt-in                                                                                                              |
| **Parity (lives on the TS side)** | from `backend/`: `pnpm vitest run tests/scheduling/solver-parity.test.ts` |        ~5 s | Solver output → TS validator → 0 hard errors. Detects drift between Python and TS logic. **The most worthwhile test to run when touching a constraint.** |

`SOLVABLE_FIXTURES` in `tests/test_corpus.py` and `PARITY_FIXTURES` in the TS
test are the two lists to keep in sync when you add a solver-reachable fixture.

## Adding a new constraint (Python side)

> Full cross-language guide (TS validator + Python solver + fixtures) lives in
> the root `CLAUDE.md`, § "Adding a new constraint". This section covers only
> the Python side.

1. Create `constraints/<name>.py` with the standard signature
   `apply(model, x, input, employees, days, virtual_days_by_emp=None)`. Look at
   `coverage.py` for a simple template, `rest.py` for a cross-month template,
   `night_block.py` for a trailing template.

2. **Hard:** use `model.add(...)` to assert the rule. **Soft:** introduce
   indicator BoolVars and add weighted terms to `objective_terms` in `solve()`.
   Reference pattern for soft with cross-month: the S4 implementation
   (`W_SHORT_WORK_BLOCK`) in `model.py`.

3. Import and call `apply()` from `model.solve()` after the existing
   constraints. Order does not matter for correctness (CP-SAT is declarative),
   but grouping related rules together improves readability.

4. If it contributes to `softPenalty`, expose it in `softPenaltyBreakdown` with
   the **same key** used by `soft-weights.ts` on the TS side. Key parity is what
   lets the stats dashboard compare.

5. Run in this order:

```bash
venv/Scripts/python -m pytest tests/test_corpus.py    # no crashes
cd .. && pnpm vitest run tests/scheduling/solver-parity.test.ts   # 0 hard errors post-solve
```

If parity fails, the solver and the TS validator disagree: check what
`SCHEDULING-CONSTRAINTS.md` says (the source of truth) and fix the side that
drifts.

6. Document the decision in `SCHEDULING-DECISIONS-LOG.md` (date, rule,
   hard/soft, weight if applicable).

## Debug helpers (live in `backend/`, not here)

Three Node helpers connect directly to the local DB to inspect state without
spinning up the full server:

- `backend/debug-compare.js` — lists months in the DB with their state.
- `backend/debug-month.js` — dumps all assignments for a month (edit ID inside).
- `backend/debug-sept.js` — full debug dump for a hardcoded month: employees,
  locked cells, the `SolverInput` JSON that would be sent, and the solver
  output. **Useful when production returns INFEASIBLE and you want to reproduce
  locally exactly what was sent.**

Typical use: edit the `monthId` inside the script and `node debug-sept.js`.

## Cross references

- `SCHEDULING-CONSTRAINTS.md` (repo root) — textual specification of the rules.
  Source of truth when code and constraints disagree.
- `SCHEDULING-DECISIONS-LOG.md` (repo root) — decision log (why each constraint
  is hard/soft, why the weights, what was tried and discarded).
- `SCHEDULING-SOLVER-PLAN.md` (repo root) — original solver plan. Historical,
  not updated; the code is the current truth.
- `backend/services/scheduling/build-solver-input.ts` — the TS side that
  assembles `SolverInput`. Any new field here needs its counterpart there.
- `backend/services/scheduling/solver-client.ts` — daemon process management,
  semaphore, respawn.
