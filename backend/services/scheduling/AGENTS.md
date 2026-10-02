# AGENTS.md — Scheduling (TS backend)

> Context for the backend TS piece of the scheduling module: validator, TS
> constraints, registry, soft weights, solver-input builder, Python daemon
> client, controllers and repository. The Python solver has its own file at
> `backend/scheduling-solver/CLAUDE.md` — read that alongside this one when the
> task crosses the boundary.

## What the module does

Manages monthly staff schedules through **manual cell-by-cell editing with
real-time validation**, plus optional **auto-generation** via a CP-SAT solver
(Python).

**Month states:** `draft` (editable, validation surfaces warnings) ↔
`published` (read-only for staff).

**Cell locking.** Assignments with `source_constraint_id` are **locked**: they
come from approvals (vacations, IT, etc.) and can't be overwritten from the UI
or by the solver. Locking is the mechanism that lets the solver and manual
editing coexist: the solver respects locked cells, the manager can pre-assign
anything, and the validator distinguishes "user" cells from "system" cells.

**Constraint flow.** Manager creates a constraint (e.g. vacation) → admin
approves → the matching shift gets written as an assignment **with
`source_constraint_id`** (locked). If rejected, nothing happens to the grid. If
an approved constraint is deleted, its derived assignments get unlocked /
removed.

**Retroactive constraints.** Admins can add constraints for past dates (e.g. log
an IT absence after the fact). This is by design — the module doesn't assume
past months are immutable until they go `published`.

**Auto-generation.** The CP-SAT solver generates a full month respecting every
hard constraint, locked cells and employee rules. Triggered from the UI on a
`draft` month. The output is applied to `scheduling_assignments` inside a
transaction.

## Backend layout

```
routes/scheduling/scheduling-routes.ts
   ↓
controllers/scheduling/
   ├── scheduling-controller.ts        (~2000 lines — CRUD for months, days, assignments,
   │                                    constraints, employee rules, contracts, totals)
   └── schedule-generate.controller.ts (~200 lines — orchestrates generation: build input,
                                        invoke solver, write matrix, persist run log)
   ↓
services/scheduling/
   ├── schedule-validator.ts           (~1000 lines — validates an existing month; uses
   │                                    constraints/ + per-employee logic in runFinalValidation)
   ├── build-solver-input.ts           (builds SolverInput from DB; lockedCells from 3 sources)
   ├── solver-client.ts                (manages the Python daemon: state machine + semaphore)
   ├── soft-weights.ts                 (soft-catalog numeric weights, kept in sync with Python)
   ├── constraints/
   │   ├── base-constraint.ts          (abstract class with warn/softWarn/failure/success helpers)
   │   ├── registry.ts                 (ConstraintRegistry: register, getEnabled, checkAll)
   │   ├── coverage.constraint.ts      (H1: minimum M/T/N coverage per day)
   │   ├── consecutive-rest.constraint.ts  (H5: ≥2 rest in window of 7)
   │   ├── max-consecutive-work.constraint.ts  (H4: max consecutive work days)
   │   ├── monthly-libre.constraint.ts (H6: monthly libres [min, max])
   │   ├── night-block.constraint.ts   (H2: night blocks [min, max])
   │   └── employee-rules.constraint.ts (noWeekends, fixedShift, fixedDays)
   ├── utils/
   │   ├── matrix.ts                   (isWorkShift, isLibreShift, getEmployeeShiftCounts...)
   │   └── day-helpers.ts              (getWeeksInMonth, areConsecutive)
   └── types/                          (Employee, DayInfo, GeneratorContext, ScheduleMatrix, etc.)
   ↓
repositories/scheduling/
   ├── scheduling-repository.ts        (~2000 lines — all module persistence)
   └── employee-requests-repository.ts (approved requests for the solver)
```

**Important:** the validator and the solver are **two parallel systems** with
the same spec but distinct implementations. The validator runs in TS over an
existing matrix and returns warnings/errors; the solver runs in Python and
builds the matrix from scratch. The shared textual spec lives in
`docs/scheduling/constraints.md` and is the source of truth when the two
disagree.

## Validator (`schedule-validator.ts`)

Takes a month (employee × day × shift matrix) and returns:

```ts
interface ValidationResult {
  isValid: boolean
  errors: GenerationWarning[]
  warnings: GenerationWarning[]
  softPenalty: number
  softPenaltyBreakdown: Record<string, number>
  stats: { totalErrors; totalWarnings; byType }
}
```

**Internal structure:**

1. **Constructor:** receives `monthId`, `year`, `month`, config, shifts, days,
   employees, assignments, `previousMonthHistory`. Builds the
   `GeneratorContext`.
2. **`validate()`:** instantiates a `ConstraintRegistry`, registers the relevant
   constraints (`CoverageConstraint`, `EmployeeRulesConstraint`, etc.), runs
   `checkAll(context)` → aggregates violations and soft penalties.
3. **`runFinalValidation()`:** per-employee logic that doesn't fit a discrete
   constraint (accumulated libre counts, weekend-off missing, M/T variety,
   etc.). Emits warnings directly with `severity: 'error'` or `'warning'` and
   accumulates soft penalty with the same convention
   `softPenaltyBreakdown[key] += ...`.

**Decision:** some rules live inside `runFinalValidation` because they need
**per-employee accumulated state** that would be costly (or ugly) to thread
through the `BaseConstraint` API. This isn't tech debt, it's pragmatism — if the
inline section grows past reasonable size, promote it to a constraint with
extended context.

`isValid = errors.length === 0`. Soft penalty is independent: a validation can
be valid (no hard errors) and still have a high penalty.

## TS constraints (`constraints/`)

Each constraint extends `BaseConstraint`:

```ts
abstract class BaseConstraint {
  abstract readonly name: string
  abstract readonly priority: number   // higher = checked first
  enabled: boolean = true
  abstract check(context: GeneratorContext): ConstraintResult

  // inherited helpers:
  protected warn(message, { type, severity: 'error'|'warning', day, employeeId })
  protected softWarn(weightKey: SoftWeightKey, units: number, message, ...)
  protected success() / failure(violations)
}
```

**`warn` vs `softWarn`:**

- `warn` with `severity: 'error'` → hard violation (kills isValid).
- `warn` with `severity: 'warning'` → UI warning with no numeric cost.
- `softWarn(weightKey, units, ...)` → automatically: emits warning + adds
  `SOFT_WEIGHTS[weightKey] * units` to `softPenalty` and
  `softPenaltyBreakdown[weightKey]`.

To add a new constraint to the validator, see § "Adding a new constraint" below.

## Soft weights (`soft-weights.ts`)

Numeric table with the soft-catalog weights. **Source of truth for weights:**
this file. The textual spec is in `docs/scheduling/constraints.md §3`. The same
weights are mirrored in `model.py` on the Python solver so both sides produce
comparable numbers.

**JSDoc `@emitter` convention:** every weight carries an `@emitter <path>` tag
pointing at the file that currently emits that soft penalty. If you add a new
soft weight, declare `@emitter` pointing at your constraint. If a weight is
declared but no file emits it yet, mark it `@deferred <reason>` — this is how we
reserve a key without implementing it yet (S2 weekly_shifts_off,
weekend_imbalance, shift_variety_low, request_preference_unmet are in this state
as of 2026-05-23).

The keys returned by the TS validator's `softPenaltyBreakdown` must **match
exactly** the keys returned by the Python solver's `stats.softPenaltyBreakdown`.
That naming parity is what lets the stats dashboard compare solver output with
the post-solve validator readout.

## `build-solver-input.ts`

Builds the `SolverInput` JSON from the DB. The critical bit is how it assembles
**lockedCells**, which come from **3 sources** in this priority order:

1. **Assignments with `source_constraint_id`** — approvals already written to
   `scheduling_assignments`.
2. **Approved requests** (`scheduling_employee_requests` with
   `status='approved'`) — expanded across their date range. `shift_code` comes
   from `requested_value` or is mapped from `request_type` (vacation→V,
   bonificable→B, baja_temporal→IT). `shift_preference` and `shift_exclusion`
   are handled differently and don't enter as locked. **They don't overwrite**
   what source 1 already wrote.
3. **`fixedDays` patterns** — employees with a `fixed_days` rule (e.g.
   "1,2,3,4,5" = Mon-Fri). For each day of the month, injected as locked:
   `workShift` (= `fixedShift` or 'P' by default) if `dayOfWeek ∈ fixedDays`,
   `L` otherwise. **They don't overwrite** sources 1 or 2 — vacation / approved
   request beats fixedDays.

**`DOW_TO_NUM` mapping** (for fixedDays): L=1, M=2, X=3, J=4, V=5, S=6, D=7.

**Excluded employees:** anyone with `fixedShift === 'P'` and **no** `fixedDays`
is filtered out of the solver (unknown manual pattern — the solver wouldn't know
when to assign them P). They do participate if they have fixedDays because that
pattern is deterministic.

**Other input fields:**

- `employees`: loaded via `getSchedulableEmployeesForMonth(year, month)` —
  filters by `start_date`/`end_date` from `scheduling_employees`. Employees off
  the roster or not yet hired don't enter the solver.
- `days`: with `isHoliday` from `scheduling_days`.
- `previousMonthTail`: last 7 days of assignments from the previous month (draft
  or published — `getPreviousMonthEndAssignments` reads both).
- `nightsHistory`: nights accumulated in previous published months; feeds S1 in
  the solver.
- `config`: dumps every field from `scheduling_config` with sane fallbacks.

Any new field on the Python side (`schemas.py`) needs its counterpart here. If
you add a config parameter, make sure the fallback here matches the default in
the Python schema.

## `solver-client.ts`

Wraps the persistent Python daemon. Details on the daemon side in
`backend/scheduling-solver/CLAUDE.md`; here's what matters on the Node side.

**State machine:**

```
idle → starting → ready → busy → ready → busy → ...
                    ↑          ↓
                    └──────────┘
                  (per-request semaphore)
```

**Guarantees:**

- **Semaphore**: one request at a time. CP-SAT isn't thread-safe per process, so
  we serialize.
- **Abort-safe**: if the HTTP client disconnects (`req.on('close')`), the
  `AbortSignal` doesn't release the semaphore until the daemon answers — avoids
  desync between Node and the Python process.
- **Transparent respawn**: if the daemon dies (broken pipe), the next request
  relaunches it.
- **Long startup timeout (30 min)**: the first time on Windows with Defender
  active, importing OR-Tools can take up to 20 minutes. On Linux/Mac, seconds.
- **Solve timeout**: 60 s. The solver's internal timeout is 30 s
  (`SolverOptions.timeoutSeconds`); we leave headroom.

**Warmup:** `index.ts` calls `warmupSolver()` at boot → spins up the daemon in
the background while Express finishes coming online. By the time the first
generation arrives, the daemon is `ready`.

## Controllers

**`scheduling-controller.ts`** (~2000 lines): massive CRUD for every resource in
the module. Split into `// ──── Config ────`, `// ──── Months ────`, etc.
Exports named functions that `routes/scheduling/scheduling-routes.ts` wires
together.

**`schedule-generate.controller.ts`** (~200 lines): does **one thing** —
orchestrate generation. Flow:

1. Validate that the month exists, is `draft`, has generated days, has
   employees.
2. `buildSolverInput()` → SolverInput JSON.
3. `runSolver(input, abortSignal)` → SolverOutput.
4. If `status === 'ok'`: apply `matrix` to `scheduling_assignments` **inside a
   transaction** (negative keys — virtual days — are ignored).
5. If `status === 'infeasible'`: return 422 with `conflictingConstraints` and
   `suggestedRelaxations`.
6. If `status === 'error'`: return 500 with the `errorCode`.
7. Persist the full run in `scheduling_solver_runs` (input + output + stats +
   time).

**Run log persistence is non-fatal:** if the insert into
`scheduling_solver_runs` fails, the response to the user is still OK. Internal
logging via `logger.error`.

## Repository

`scheduling-repository.ts` is huge (~2000 lines) and groups all module
persistence: config, shifts, months, days, assignments, constraints, employee
rules, schedulable employees with `start_date`/`end_date`, contracts, annual
totals, holidays, solver run logs, history.

When you touch this file:

- Almost every function takes `monthId` or `year/month` — they're per-month, not
  global.
- Assignments with `source_constraint_id !== null` are locked: respect that
  invariant in any bulk update query.
- `getSchedulableEmployeesForMonth(year, month)` applies `start_date`/`end_date`
  filtering. For raw employee lists (Totals tab, etc.) use
  `getAllEmployeesWithStatus`.
- `getPreviousMonthEndAssignments(year, month, N)` reads the previous month even
  when it's still `draft` — this is intentional so that Jan→Feb→Mar chains work
  without having to publish month by month.

**Known bug (TODO.md):** `setSchedulableEmployees` does mass `DELETE` + `INSERT`
and loses `start_date`/`end_date` in the process. Proposed fix: selective diff
(only DELETE rows that leave, INSERT rows that arrive). See `TODO.md` § "Bug:
setSchedulableEmployees".

## Main endpoints

- `GET /months/:id` — Full month data (days, assignments, constraints, stats)
- `GET /months/:id/info` — Approved constraints + employee rules for the side
  panel
- `POST /months/:id/generate` — Run CP-SAT solver, apply matrix to assignments
- `POST /months/:id/reset` — Wipe all assignments, re-seed from approved
  constraints
- `POST /months/:id/unpublish` — Back to draft (controlled transition)
- `PATCH /assignments/:id` — Update single cell (409 if locked)
- `POST /assignments/bulk` — Bulk update; respects locks
- `POST /constraints/:id/approve` — Approve/reject + auto-sync assignments
- `GET /employee-rules` — Rules list in camelCase for the panel
- `PUT /scheduling/employees` — Set schedulable employees list (⚠️ see bug
  above)

Full routing in `routes/scheduling/scheduling-routes.ts` with
`authenticateToken` + `isAdmin` / `excludeMantenimiento` per endpoint.

## Shift types

**Work shifts:**

- `M` — Morning
- `T` — Afternoon
- `N` — Night
- `PI` — Internal Support
- `P` — Presencia (requires `fixedShift=P` + `fixedDays` or it gets excluded
  from the solver)

**Off / special states:**

- `L` — Libre (regular monthly off)
- `V` — Vacation (approved — locked)
- `B` — Bonificable (compensated holiday — locked)
- `E` — Sick day (eventual, point-in-time — locked)
- `IT` — Incapacidad Temporal (extended sick leave — locked)
- `FO` — Day Off (compensatory off — locked)
- `A` — Unjustified absence (locked, usually entered after the fact)
- `LI` — Libre Disposición (extra free day outside the weekly rotation — locked)

Helpers to classify shifts: `services/scheduling/utils/matrix.ts` exports
`isWorkShift`, `isLibreShift`, `getEmployeeShiftCounts`. **`isWorkShift`
includes N, P, PI** — remember when counting work blocks (parity with
`ALL_WORK_SHIFTS` on the Python solver).

## Configuration tables

**`scheduling_config`** — global KV parameters (min/max staff per shift, rest
hours, libre ranges, night block mins, etc.). Loaded via `getConfigMap()`.
Edited from the UI at `/dashboard/scheduling/config` → "General" tab.

**`scheduling_employee_rules`** — per-employee rules: `fixed_shift`,
`no_weekends`, `shift_priority`, `fixed_days`. One row per (employee_id,
rule_type). `is_active=1` for active rules; history is preserved with
`is_active=0`. Loaded via `getAllEmployeeRules()` (camelCase) or
`getEmployeeRulesByEmployee(id)`.

**`scheduling_employees`** — which employees are part of the hotel's scheduling.
Includes `start_date` / `end_date`: both NULL = unrestricted; with dates = the
employee only shows up in months within the range. Editable from _Totals_ →
_Período activo en horarios_.

**`scheduling_employee_requests`** — employee requests: vacations, IT,
preferences. States `pending` / `approved` / `rejected`. Only approved ones
enter the solver via `findApprovedForSolver(year, month)`.

**`scheduling_solver_runs`** — log of every generation: input, output, status,
time, conflicts, soft penalty breakdown. Useful to debug INFEASIBLE in
production by replaying the exact input.

## Adding a new constraint (full cross-language guide)

> This is the single-source guide for adding a new rule to the system. Three
> places to touch: TS validator, Python solver, fixture corpus. Skipping any of
> them creates drift that the parity test will eventually catch, but slowly.

### Step 1 — Decide hard vs soft and document it

Open `docs/scheduling/constraints.md`.

- **Hard:** a violation invalidates the month. Add to §2 with ID `H<n>`.
- **Soft:** a violation is acceptable but penalized. Add to §3 with ID `S<n>`, a
  tentative weight 1-10, and explain _why_ that weight relative to the others.
  The weight gets tuned with manager feedback; what matters here is the relative
  ordering.

If the rule depends on cross-month continuity, also list it in §9.5 (cross-month
invariant) so a future reader knows to wire `previousMonthHistory` (TS) /
`previousMonthTail` (Python).

### Step 2 — Implement in the TS validator

Create `backend/services/scheduling/constraints/<rule-name>.constraint.ts`
extending `BaseConstraint`. It receives `GeneratorContext` with `matrix`,
`employees`, `days`, `config`, `previousMonthHistory` (null on the first
historical month).

- Hard rules → `this.warn(message, { severity: 'error', ... })`.
- Soft rules → `this.softWarn(weightKey, units, message, ...)` — automatically
  picks the weight from `SOFT_WEIGHTS[weightKey]` and accumulates
  `softPenalty` + `softPenaltyBreakdown`.

If you add a new soft weight:

1. Declare it in `services/scheduling/soft-weights.ts`.
2. JSDoc tag `@emitter constraints/<your-rule>.constraint.ts` pointing at the
   emitting file.
3. If you're not emitting it yet, mark `@deferred <reason>`.

Register the constraint in `schedule-validator.ts` inside the
`ConstraintRegistry` block of `validate()`, alongside `CoverageConstraint` /
`EmployeeRulesConstraint`. **Exception:** if the rule needs accumulated
per-employee state (libre counts, weekend off check, M/T variety…), inline it in
`runFinalValidation()` following the existing pattern — don't force the
`BaseConstraint` API.

### Step 3 — Implement in the Python solver

→ Full detail in `backend/scheduling-solver/CLAUDE.md` § "Adding a new
constraint (Python side)". Summary:

1. Create `backend/scheduling-solver/constraints/<rule_name>.py` with signature
   `apply(model, x, input, employees, days, virtual_days_by_emp=None)`.
2. Hard: `model.add(...)`. Soft: indicator BoolVars + weighted terms in
   `objective_terms` in `solve()`.
3. Import and call `apply()` from `model.solve()`. Order doesn't matter.
4. If it contributes to `softPenalty`, expose it in `softPenaltyBreakdown` with
   the **same key** as `soft-weights.ts`.

### Step 4 — Add a fixture to the corpus

Create `backend/tests/scheduling-corpus/fixtures/F<nn>-<descriptive-name>.json`
following `_schema.ts`. Three sections:

1. `input` — month, employees, days, config, lockedCells, previousMonthHistory,
   **fully-formed matrix**. The matrix should exercise the rule: for hard,
   include a schedule that breaks it; for soft, include one where the penalty is
   hand-calculable.
2. `expected.isValid` — `true` if the matrix has no hard errors, `false` if it
   does.
3. `expected.violations` — matchers (type, severity, employeeId, day) the
   validator must emit. Plus `expected.softPenalty` and
   `expected.softPenaltyBreakdown` for soft contributions.

If the fixture is solver-reachable (the matrix could come from the solver), add
its ID to:

- `SOLVABLE_FIXTURES` in `backend/scheduling-solver/tests/test_corpus.py`
- `PARITY_FIXTURES` in `backend/tests/scheduling/solver-parity.test.ts`

Fixtures with `minMorningStaff: 0` (coverage disabled) are usually safe
additions to both lists.

### Step 5 — Run the four suites

```bash
cd backend
pnpm vitest run tests/scheduling/corpus.test.ts          # TS validator vs fixtures
pnpm vitest run tests/scheduling/solver-parity.test.ts   # solver → TS validator (0 hard errors)
cd scheduling-solver
venv/Scripts/python -m pytest tests/test_corpus.py       # Python solver doesn't crash
venv/Scripts/python -m pytest tests/test_daemon_stress.py  # daemon stress
```

All green. If parity fails, the validator and solver disagree: fix the side that
drifts from `docs/scheduling/constraints.md` (the spec is truth, the code
isn't).

### Step 6 — Document the decision

Append to `docs/scheduling/decisions.md`: date, rule, hard/soft, weight if
applicable, reasoning. This is the audit trail that lets a future agent (or you,
six months later) understand why the constraint exists without spelunking the
git log.

## Historical Excel importer

`backend/scripts/import-planning-2026.ts` (tsx + xlsx) loads
`PLANNING 2026.xlsx` (January-May) into `scheduling_months` / `scheduling_days`
/ `scheduling_assignments` in _draft_ state. Idempotent per month. Explicit
employee allowlist (excludes other-department staff). Code mapping
`L1..L9 → L+libre_number`, `PI1 → FO`, `BT → IT`. Usage:

```bash
pnpm exec cross-env DB_ENVIRONMENT=aiven tsx --env-file=.env scripts/import-planning-2026.ts [Enero|...|all]
```

Useful when setting up a clean DB or replicating historical state for
integration tests.

## Cross-month gotcha (H4/H5) — outstanding debt

The Python solver applies H4 (max consecutive work) and H5 (≥2 rest in window
of 7) over `all_days = virtual_days + real_days`. If the virtual tail of the
previous month already breaks the constraint mathematically (e.g. 6 M shifts in
a row at last month's close), the window is unsatisfiable and would produce an
artificial INFEASIBLE. `rest.py` **skips** these "doomed" windows.

**Debt:** the TS validator does NOT apply the same exemption yet. Possible
drift: a month generated by the solver may surface spurious warnings when
re-validated by the TS validator. When it bites, replicate the cross-month skip
logic in `consecutive-rest.constraint.ts` and
`max-consecutive-work.constraint.ts`. See `docs/scheduling/decisions.md` (entry
2026-05-20) and `docs/scheduling/constraints.md §H5`.

## Cross references

- `backend/scheduling-solver/CLAUDE.md` — the Python solver (daemon, CP-SAT
  model, constraints, tests).
- `docs/scheduling/constraints.md` — full textual specification. Source of
  truth.
- `docs/scheduling/decisions.md` — decision log (why hard/soft, why the weights,
  what was tried).
- `SCHEDULING-SOLVER-PLAN.md` (root) — original plan. Historical.
- `TODO.md` (root) — known module bugs (setSchedulableEmployees, H5 cross-month
  debt, etc.).
- `frontend/app/components/scheduling/CLAUDE.md` — the UI side of the module.
