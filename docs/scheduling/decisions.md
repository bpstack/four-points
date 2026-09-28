# Scheduling decisions log

Why the scheduling module and its solver are built the way they are: the design
conversations and fixes that led to the current rules, in date order. Part of
the [scheduling module](README.md); the rules themselves are in
[`constraints.md`](constraints.md) and the generator in
[`solver.md`](solver.md).

- **Append-only.** Earlier entries are not edited or rewritten; a new decision
  gets a new entry at the end, and one that revises an older one says so.
- **Historical context, not the current state.** An entry describes what was
  true on its date. For the current rules, read `constraints.md`.
- **Translated** from the original Spanish on 2026-09-28. The first entry, a raw
  design conversation, was condensed to its reasoning; the rest are translated
  as they were. Staff names from the hotel's planning spreadsheet were replaced
  by roles. Short italic notes such as _(Revised on …)_ were added in
  translation to link a decision to the later entry that changed it. Mentions of
  the original solver plan and of the project's backlog point to internal
  documents that are not published.

---

## 2026-04-22 — Initial decision: from an LLM to a solver in layers

**Context.** The first automatic generator asked an LLM to fill in the month.
With 7 employees × 28 days and ~10 active rules, it left 30+ errors and 20+
warnings per iteration and did not converge, at roughly $0.10–$1 per generation.

**Why a solver.** Building a roster that respects hard rules (minimum coverage,
rest between shifts, consecutive blocks, monthly days off) is literally a
constraint satisfaction problem, a field with decades of research behind it.
Using an LLM for it is the wrong tool. A well-modelled solver gives:

- a mathematical guarantee: if a valid roster exists it finds it, and if not it
  says which constraints are incompatible;
- determinism and reproducibility (same input, same output), so it can be
  debugged;
- no per-generation cost;
- scalability to larger hotels, where an LLM degrades;
- explainability: "this roster meets rules X, Y and Z and optimises A".

**Weak points considered.**

1. **The Node ecosystem is weak for solvers.** The good ones (Google OR-Tools
   CP-SAT, MiniZinc, Choco) live in Python, Java or C++. Options: a Python
   service called from Node, local search / simulated annealing in TypeScript
   using the existing validator as the cost function, or native OR-Tools
   bindings with a painful setup.
2. **Soft constraints are awkward in pure solvers.** Preferences ("weekend off
   but not every week", "roughly balanced M/T", "variety") must be encoded as
   weighted penalties and tuned by hand.
3. **Business rule changes** mean rewriting the model and its tests, instead of
   adding a line to a prompt.

**Target architecture, in layers.**

```
Layer 1: SOLVER (hard constraints)
  OR-Tools CP-SAT in Python
  In: employees, rules, locked cells · Out: a valid roster, or UNSAT + cause
        ↓
Layer 2: OPTIMISER (soft constraints)
  Weighted cost function over the preferences
        ↓
Layer 3: LLM (human interface) — optional, later
  Natural-language rules → structured constraints
  Explaining the roster · suggesting relaxations when UNSAT
```

**Owner's answers.** 7 employees today, but aiming at larger hotels; a separate
service is acceptable if it costs nothing; the LLM is a nice-to-have; staff
rosters are the only scheduling problem in the PMS. The LLM layer was clarified
to mean product features (natural-language rules, explanations, relaxation
suggestions), not help with the code, and was set aside until the core is solid.

**Decisions.**

1. **Solver: OR-Tools CP-SAT**, not home-made local search, because of the
   target size.
2. **Invoked as a CLI subprocess** (Node spawns Python, JSON over stdin/stdout)
   rather than an HTTP service: no extra infrastructure, and a ~200 ms start-up
   is irrelevant for one generation per month. It can move to HTTP later without
   touching the solver logic. _(Revised on 2026-04-30: persistent daemon.)_
3. **Source of truth:** the database holds the **values** (minimum staff, rest
   hours…). The **logic** is implemented twice — the TypeScript validator for
   real-time feedback while editing, the Python solver for generation — and kept
   aligned by a shared corpus of "this input → this expected result" cases run
   against both. Calling the solver on every edit would remove the duplication
   but add unacceptable latency.
4. **Hard vs soft:** everything in the labour agreement is hard (rest, minimum
   days off, coverage); preferences and balance are soft (preferred shift,
   spread weekends, avoid too many M or T). Classified rule by rule.

**Phases.**

- **Phase 0 — foundations:** refactor the validator to return a cost
  (`{ hardViolations, softPenalty }`) and not just booleans; catalogue the
  existing rules as hard or soft with tentative weights (product work, with the
  manager and the agreement); build a regression corpus; freeze the LLM code.
- **Phase 1:** a CP-SAT proof of concept (coverage + rest, one month, 7
  employees); the CLI protocol (input and output JSON); Node → Python
  integration from `POST /months/:id/generate`.
- **Phase 2 onwards:** model the remaining rules, add weighted soft constraints,
  explain infeasibility, optional LLM layer.

**Next step.** Phase 0, step 1: write the constraints catalogue by reading the
validator (`schedule-validator.ts` and `constraints/*.ts`) and the database
configuration, marking each rule hard or soft with a tentative weight, and
leaving unimplemented agreement rules as explicit to-dos. Ambiguous cases (e.g.
is a preferred shift hard or soft?) to be validated with the manager.

---

## 2026-04-24 — Revision: delete the LLM code instead of archiving it behind a feature flag

### Context

The original plan (Phase 0, step 4) said:

> "Archive the current LLM generator behind `FEATURE_AI_GENERATOR=false` in
> `.env`. The endpoints answer 410 Gone with an explanatory message. **No code
> is deleted.**"

The idea was to keep the LLM code as a reference while the solver was built, and
remove it at the end (Phase 3, step 3) once the solver was in production.

### Actual state when this session started

Reviewing the `feature/ai-schedule-generator` branch before starting Phase 0
showed that:

- The branch had **no commits** on top of `main`. The whole LLM attempt lived in
  the uncommitted working tree.
- Files involved: `backend/services/scheduling/ai-generator.ts` (~1100 lines),
  `backend/services/scheduling/ai-prompt.ts` (~375 lines),
  `frontend/app/components/scheduling/AIGenerateModal.tsx` (~150 lines), the
  `POST /months/:id/generate-ai` endpoint in `scheduling-controller.ts`, its
  route, the `deleteNonLockedAssignmentsByMonth` repository helper, frontend
  queries/types/i18n, and the `@anthropic-ai/sdk@0.90.0` + `groq-sdk@0.9.1`
  dependencies in `package.json`.

### Reasoning

Archiving behind a flag only makes sense when code already on `main` might be in
use by some client or environment. Not the case here: zero commits, zero
deployments, zero users. "Archiving behind a flag" would have meant:

1. Keeping 1500 lines of dead code on `main` for no value.
2. Two heavy SDKs (`@anthropic-ai/sdk`, `groq-sdk`) in `package.json` that
   nobody uses.
3. Mental overhead for anyone opening the repo and seeing `/generate-ai` — "does
   this run? can I call it?".

Genuinely reusable code for the solver: ~80 lines out of ~1500 (the controller
pattern, `deleteNonLockedAssignmentsByMonth` and the modal shell), all
rewritable in under an hour when Phase 1 arrives. The rest (multi-provider LLM,
prompts, iteration loop, token tracking, parsers) is fully disposable, because
CP-SAT works in another paradigm (CLI subprocess, JSON over stdin/stdout,
one-shot, no per-call cost).

### Decision

**Delete the LLM code before the branch's first commit.** Specifically:

1. `git restore` of the 12 modified files in the working tree.
2. `rm` of the 3 untracked files (`ai-generator.ts`, `ai-prompt.ts`,
   `AIGenerateModal.tsx`).
3. `pnpm install` in the backend to purge the SDKs from `node_modules` (the
   lockfile was already clean after the restore).
4. The `feature/ai-schedule-generator` branch stays: it becomes the thread of
   the migration to the solver. The name is still valid: CP-SAT is symbolic AI
   (constraint programming), not an LLM, but still "AI" in the broad sense.

### Consequences for the plan

- Phase 0, step 4: rewritten; no longer pending work, the deletion is done.
- Phase 3, step 3 ("Remove the `generate-ai` endpoint and its code"): removed,
  no longer applies.
- Phase 0 and Phase 3 exit criteria that referred to deleting the generator:
  marked as met.
- The constraints catalogue: unchanged, still pending as Phase 0, step 1.

### Reference to the deleted code

The deleted code is in no commit of the repository. If the approach is ever
needed (e.g. for the future LLM layer), this entry is its memory:

- **System prompt:** an iterative generator–critic approach with up to 5 rounds,
  the validator's feedback injected at each round, and a tool definition so the
  LLM returned the structured matrix.
- **Multi-provider:** Anthropic (Opus 4.7) by default, Groq (Llama 3.3 70B) as a
  cheap fallback, OpenAI-compatible for any other provider.
- **Seeder:** a `seedBasicCoverage()` function pre-filled minimum coverage
  before asking the LLM to "finish" the month, to reduce hallucinations.
- **Empirical result:** with 7 employees × 28 days and ~10 active rules, the LLM
  left 30+ errors and 20+ warnings per iteration. It did not converge. Cost
  ~$0.10–$1 per generation with Opus.

That result is what motivated the move to the solver. It is recorded so that a
future "what if we use an LLM for X?" has the data point that a pure LLM does
not solve the CSP.

### Next action

First commit of the branch: only the `.gitignore` change (the three planning
documents were private by an earlier decision and do not go into the repo). Then
Phase 0, step 1 starts: writing the constraints catalogue from the current
validator.

---

## 2026-04-25 — Phase 0, step 1: analysis of the planning spreadsheet and first catalogue

First draft of the constraints catalogue, fed by two sources: (1) the current
code (`schedule-validator.ts`, `constraints/*.ts`, the `19_scheduling.sql`
seed), (2) an `openpyxl` analysis of the hotel's real planning spreadsheet for
2026 (5 filled months: January–May).

### Spreadsheet findings that shaped the catalogue

- A stable core team of 9 people, plus occasional reinforcements (3 in
  January–February, 2 in February–May).
- Codes not in the database: `BT`, `M1`, `PI1`, `F`, `LI`, `D`. All resolved as
  "drop" or "map to an existing code" (§1.3 of the catalogue).
- Observed invariants: `N=1` per day (99.3%), N blocks of 4–5 consecutive nights
  (cross-month), mandatory rest after N (a single exception in 5 months),
  consecutive day-off pairs dominant with compensated exceptions.
- `T→M` with no day off: 25 occurrences in the corpus → cannot be a hard
  constraint. Lowered to soft S12 with weight 8.
- The two management employees: a perfect weekly pattern of 5×P + 2×L with
  `no_weekends=true` and `fixed_shift=P`. Confirms the current structural rules.
- The spreadsheet shows requests as free text ("[employee] off 28/29",
  "[employee] 4 L and 5 T/N and 13 L and 14 T/N"). No table for them in the
  database → blocking gap for Phase 1.

### Decisions taken (checked with the manager, 2026-04-25)

1. **Codes to drop/map on import:** `BT→IT`, `M1→M`, `PI1→drop`, `F→drop`,
   `LI→drop`, `D→drop`. Any code not listed in §1.1/§1.2 of the catalogue =
   explicit import error.
2. **Time-limited validity of rules:** **no** `valid_from`/`valid_until` on
   `scheduling_employee_rules`. Time-limited rules are modelled as long-range
   `shift_exclusion` requests in the new `scheduling_employee_requests` table.
   Canonical case: a rotating employee with no `M` from 2026-01-01 to
   2026-03-31.
3. **`scheduling_employee_requests` table:** the only new table required before
   the Phase 1 solver. DDL in §7.5 of the catalogue. ENUM types:
   `shift_preference`, `shift_exclusion`, `bonificable`, `baja_temporal`,
   `vacation`. `libre` is merged into `shift_preference` with
   `requested_value='L'`.
4. **Request authorship:** the manager creates and approves them (no employee
   portal yet). `created_by` can equal `approved_by`.
5. **H6 T→M:** downgraded to soft-high (S12, weight 8). T→PI allowed with no
   penalty. Only N→anything without a day off stays hard (H3).
6. **Soft weight scale:** 1–10 (previously a tentative 1–5). Applied to the 14
   soft rules S1–S14.
7. **Unified numeric parameters:** `min_monthly_libre=9`,
   `pref_monthly_libre=10` (new key), `max_monthly_libre=11`,
   `annual_vacation_days=30` calendar days, `annual_holidays=20` compensated,
   `annual_free_days=90`. Removes the inconsistent hard-coded defaults in
   `schedule-validator.ts`.
8. **Rules still to implement:** S11 (`consecutive_L_pairs`) and S14
   (`balanced_rotation` — even spread of N).
9. **Corpus available for tests:** only the 5 filled months of 2026; 2024/2025
   are not accessible. The fixture corpus will have less seasonal coverage than
   ideal; accepted.

### Additional decisions, 2026-04-25 (closing open points)

- `max_morning_staff` = **6**. The default goes from 2 to 6. Allows high-season
  Thursdays/Fridays without false warnings, and leaves room for larger hotels.
- `fixed_days`: **not in use**. The two management employees (the only ones with
  a fixed Monday–Friday pattern) are already modelled with `fixed_shift=P` +
  `no_weekends=true` and do not need `fixed_days`. The rest of the team rotates.
  The CSV semantics of `rule_value` stay undefined until the first real case
  needs them. _(Revised on 2026-04-28: `fixed_days` defined and in use.)_
- `max_shift_per_month`: also **not in use**. The case that seemed to need it (a
  rotating employee with no `M` from January to March 2026) is modelled as a
  ranged `shift_exclusion` request → §7 of the catalogue. Avoids two mechanisms
  for time-limited validity.

---

## 2026-04-25 — Cross-month raised to a cross-cutting invariant

While designing the fixture corpus (Phase 0, step 3) it became clear that the
cross-month note that lived only in H2 (night blocks) was not enough: any rule
of time continuity breaks at the month boundary unless it is given the previous
month's context.

### Rules affected

Besides H2, cross-month applies to:

- **H3 — rest after nights:** a final `N` in month N-1 limits day 1 of month N.
- **H4 — maximum consecutive days:** the streak on day 1 is prefixed with the
  days worked at the end of N-1.
- **H5 — 2 consecutive days off in a 7-day window:** sliding windows that start
  in the first 6 days of the month read the context of N-1.
- **Rest between shifts** (`consecutive-rest.constraint`): rest on day 1 vs the
  last shift of N-1.
- **Rotation continuity / S12 T→M:** `T` on the last day of N-1 → `M` on day 1
  of N also triggers the penalty.

### Why not only in H2

The asymmetry was artificial: operations (manager + agreement) reason as "last
month this person had 3 nights at the end → this month cannot start with M", and
the same for working streaks and days off. Documenting cross-month only in H2
left the rest of the behaviour unspecified, and the corpus's cross-month
fixtures (F11–F13) would have tested behaviour the spec did not promise —
breaking §9.1 ("validator and solver implement the same rules; divergence =
bug": for that to mean anything, the rules must be written first, not inferred
from the corpus).

### Changes to the catalogue

1. New invariant §9.5, "Cross-month as a cross-cutting invariant", listing the 6
   affected rules and the mechanism (`PreviousMonthHistory`, already typed in
   `services/scheduling/types/index.ts`).
2. H2: the "⚠ current bug" note becomes a reference to step B.0 of the plan
   (pending implementation, not a separate bug).
3. H3, H4, H5 get an explicit "**Cross-month:** yes" line with its meaning.
4. S12 (T→M) gets a cross-month note in the §3 table.

### Implementation state

The `PreviousMonthHistory` shape exists but `ScheduleValidator` always sets it
to `null`. Finishing the wiring is planned as **step B.0** (the validator
refactor for `softPenalty`, before computing weights). The repository will need
a `getPreviousMonthHistory(year, month, employeeIds)` helper in
`repositories/scheduling/scheduling-repository.ts` to feed it in production.

### Consequence for Phase 0

Step 1 (a "complete" catalogue) is now **really closed**. Step 3 (corpus, step C
of the plan) can start with no risk of fixtures dictating an unwritten spec.
Step 2 (validator refactor, step B of the plan) takes in the cross-month wiring
as sub-step B.0.

---

## 2026-04-25 — Step 3 (corpus) closed: validator findings

The 25-fixture corpus was built (`backend/tests/scheduling-corpus/`). Suite
green: 20 passed + 5 todo. Three findings about the validator came up while
building it, recorded before moving to step 2 (step B of the plan).

### Bug fix applied: `coverage.constraint.ts` — `||` → `??`

File `backend/services/scheduling/constraints/coverage.constraint.ts`, lines
25–30. Changed `config.minMorningStaff || 1` → `config.minMorningStaff ?? 1`
(and the same for every `min/max *Staff`).

**Why:** `||` collapses `0` to its default. Passing `minNightStaff: 0`
(disabling night coverage) was read as `minNightStaff: 1` → any fixture that
wanted to isolate another constraint with coverage disabled produced false
coverage errors. `??` only applies the default when the value is
`null`/`undefined`, which is the correct semantics.

**Corpus finding:** F02 (perfect month) did not converge until this fix. It is
the only production code change from step C; the rest are tests and data.

### Gap found: `EmployeeRulesConstraint` is not in the `ConstraintRegistry`

`backend/services/scheduling/constraints/employee-rules.constraint.ts` exists
and is well written, but **`ScheduleValidator.validate()` does not call it**. It
only registers `CoverageConstraint` and the logic embedded in
`runFinalValidation`.

Consequence for the corpus: F20 (`no_weekends`) and F21 (`fixedShift`) produce
no violation with the current validator → marked `todo: true`, like the three
cross-month ones.

**Not fixed here.** The natural fix is to extend the constraint registry within
the step B refactor (new sub-step **B.4-bis**). Full list of `todo` fixtures
waiting for step B:

- F11, F12, F13 → cross-month, waiting for B.0
- F20, F21 → employee rules, waiting for B.4-bis

### Fixtures with coverage disabled (minor debt)

F02, F08, F22 and F23 use `noCoverageConfig` (every `min*Staff: 0`,
`max*Staff: 99`). F02 was redescribed as "no violations with coverage disabled"
(not a strict "perfect month"). F22/F23 show that `V`/`B` count as a day off,
but not that a locked cell respects minimum coverage when it is on. Accepted
debt: it does not block step B, and "locked cell vs minimum coverage" will be
exercised naturally when the solver (Phase 1) runs the corpus with real
coverage.

### Follow-up updates

- Step B: new sub-step **B.4-bis**, "register `EmployeeRulesConstraint` in the
  `ConstraintRegistry`".
- F08 rewritten to really test the `T → L → M` transition (its original purpose;
  the first draft only repeated Pattern E with no T-M transition).

---

## 2026-04-25 — Step B completed: softPenalty, registry and severity bumps

### Changes

**B.0 – `previousMonthHistory` wired into `ScheduleValidator`.** New optional
9th constructor parameter. `createContextFromAssignments()` passes it to the
`GeneratorContext`. The cross-month fixtures (F11–F13) stay `todo: true` until
the 4 constraints read the field.

**B.1–B.4 – softPenalty infrastructure.**

- `soft-weights.ts` — a single weight catalogue (`SOFT_WEIGHTS`) used by the
  constraints and the validator.
- `ConstraintResult` extended with `softPenalty?: number` and
  `softPenaltyBreakdown?: Record<string, number>`.
- `BaseConstraint.softWarn()` — a helper that computes
  `SOFT_WEIGHTS[key] × units` and emits a `warning` without affecting
  `satisfied`.
- `CoverageConstraint` — soft violations when `count < pref` (kept apart from
  the hard ones, so `satisfied` still means minimum/maximum only).
- `ConstraintRegistry.checkAll()` — adds up the `softPenalty` of every result.
- `ValidationResult` extended with `softPenalty: number` and
  `softPenaltyBreakdown: Record<string, number>`.
- `runFinalValidation()` — adds `SOFT_WEIGHTS.weekend_off_missing` for each
  employee with no Saturday+Sunday off (W10).

**B.4-bis – `EmployeeRulesConstraint` registered in the validator.**
`ScheduleValidator.validate()` builds a `ConstraintRegistry` with
`CoverageConstraint` + `EmployeeRulesConstraint`. F20 and F21 stop being `todo`.

### Severity decision: `noWeekends` and `fixedShift` go from `warn` to `error`

**Change:** in `employee-rules.constraint.ts`, RULE 1 (`fixedShift`) and RULE 2
(`noWeekends`) emitted `warning`; they now emit `error`.

**Reason:** in the catalogue both are hard constraints approved by the manager:
giving someone a shift other than their fixed one, or making them work a weekend
when they have `noWeekends: true`, is a violation that **invalidates the month**
(`isValid: false`). As warnings they were silent in the validator and let wrong
rosters through. The other employee rules (`maxShiftPerMonth`,
`minShiftPerMonth`, `shiftPriority`, `fixedDays`) stay as warnings.

**Corpus impact:** F20 and F21 have `expected.isValid: false`, now correct.

### `noCoverageConfig` adjusted in the fixtures

`noCoverageConfig()` now also sets `prefMorningStaff: 0` and
`prefAfternoonStaff: 0`. Reason: fixtures using this config isolate constraints
unrelated to coverage; accumulating `pref_morning_staff_below` in their
`softPenaltyBreakdown` was noise that hid what was being measured.

**Consequence:** F18 and F19 have smaller, cleaner `softPenalty` values (only
`weekend_off_missing`). F19 renamed to `F19-pattern-e-no-weekend-off`, since the
previous name ("weekend-off-met") was wrong — Pattern E never has
Saturday+Sunday off.

---

## 2026-04-26 — Step B appendix: cross-month closed + more soft weights

### Cross-month read by the 4 constraints

The previous entry noted that the `previousMonthHistory` wiring only reached the
`GeneratorContext` and that the constraints did not read it yet. **Resolved:**

- `consecutive-rest.constraint.ts` — reads `previousMonthHistory.lastShifts` and
  prefixes the rest check on day 1 with the last shift of N-1.
- `night-block.constraint.ts` — reads
  `previousMonthHistory.incompleteNightBlocks` and adds those nights to the
  current month's block before checking `min/maxNightBlock`. Blocks that start
  on day 1 of N as a continuation are valid by definition.
- `rotation-continuity.constraint.ts` — reads
  `previousMonthHistory.lastShiftType` and emits the `rotation_continuity_break`
  penalty on an M↔T jump between the last day of N-1 and day 1 of N with no
  transition.
- `max-consecutive-work.constraint.ts` — reads `previousMonthHistory.lastShifts`
  and prefixes the streak on day 1 with the consecutive days worked at the end
  of N-1.

Result: F11/F12/F13 stop being `todo: true`. The corpus suite passes **62/62**
with nothing pending.

### B.4 extended: 5 more soft weights wired

On top of the earlier ones (`pref_morning_staff_below`,
`pref_afternoon_staff_below`, `weekend_off_missing`), these now emit
softPenalty:

| Weight                      | Source                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| `libre_below_pref`          | `monthly-libre.constraint.ts` when days off > min but < pref       |
| `libre_above_pref`          | `monthly-libre.constraint.ts` when days off < max but > pref       |
| `pref_night_block_size_off` | `night-block.constraint.ts` when the block ∈ [min, max] but ≠ pref |
| `rotation_continuity_break` | `rotation-continuity.constraint.ts` (including cross-month)        |

Total: 7 of the catalogue's 11 weights are emitted today.

### Deferred weights (4 of 11)

These stay in `soft-weights.ts` with a `@deferred` tag giving the reason:

- `pref_weekly_shifts_off` — S2; needs a `WeeklyShiftsConstraint`.
- `weekend_imbalance` — no numbered S rule; needs a team-wide computation.
- `shift_variety_low` — W13 emits a warning but no penalty; wire it when
  promoted to soft.
- `request_preference_unmet` — depends on `scheduling_employee_requests` (step A
  of the plan).

### Fixtures: 25/25 with softPenalty

Every fixture includes `expected.softPenalty` and
`expected.softPenaltyBreakdown`. Spot checks: F11=5 (cross-month with no weekend
off), F13=4 (`rotation_continuity_break`), F14=0 (days off below `min` is hard,
not soft), F25=10 (several violations).

### Phase 0 state

Step B officially closed. Only step A (the `scheduling_employee_requests` SQL
migration) remains before Phase 1.

---

## 2026-04-25 — Step A: `scheduling_employee_requests` table created locally

### What was done

- `backend/db-mysql/scripts/20260425_create_scheduling_employee_requests.sql` —
  an idempotent migration script (`CREATE TABLE IF NOT EXISTS`). Columns and
  foreign keys as in §7.5 of the catalogue.
- Table applied to the **local** database (`hotel_db`, local MySQL). Foreign key
  to `users(id)` checked — `users.id` is `CHAR(36)` locally.
- `backend/models/scheduling/employee-request.ts` — TypeScript types
  (`SchedulingRequestType`, `SchedulingRequestStatus`,
  `SchedulingEmployeeRequestRow`), exported from `models/scheduling/index.ts`.
- `backend/repositories/scheduling/employee-requests-repository.ts` —
  `findByMonth` and `findApprovedForSolver`. Deliberately minimal; full CRUD is
  Phase 1.
- `backend/validations/scheduling/employee-request.ts` — Zod schemas
  (`createEmployeeRequestSchema`, `requestTypeSchema`, `requestStatusSchema`).
- `backend/tests/scheduling/employee-requests-repository.test.ts` — an
  integration test that checks the table exists and that `findByMonth` retrieves
  rows by date range. Skips cleanly if no database is available.
- `backend/db-mysql/INDEX.md` — new "Incremental migrations" section with the
  migration's entry.

### Why only local for now

Production uses Aiven (cloud MySQL). The new table has to be validated locally
(integration tests, UI tests, use in Phase 1) before going to production. Aiven
is updated before the merge to `main` or the production deploy, not before.

### Decision: `MASTER_INSTALL.sql` is not touched here

`MASTER_INSTALL.sql` is the Aiven installer (its header and final message say
so). Changing it without updating the real Aiven environment would make the
script and the production database diverge. The right moment is the Aiven
migration: add the `CREATE TABLE` to `aiven/19_scheduling.sql` (or a new
`aiven/20_scheduling_requests.sql`) and the `SOURCE` line to
`MASTER_INSTALL.sql`.

### State

- ✅ Local: table exists, tests green (64/64).
- ⏳ Aiven: deferred until fully validated locally.
- ⏳ `MASTER_INSTALL.sql`: deferred together with Aiven.

**Phase 0 complete. Phase 1 (MVP Python CP-SAT solver) can start.**

---

## 2026-04-28 — Cross-month in the CP-SAT solver

### Context

The solver received a `SolverInput` with no information about the previous
month. Every continuity rule (H2–H5, day blocks) assumed day 1 was the start of
a new block, ignoring the last days of the previous month. As a result, night
blocks could start on the last day of one month and end on the first of the next
without being counted correctly, and an employee with 6 working days in a row at
the end of a month could start the new one without rest.

### Changes

**Schema / TypeScript:**

- `backend/scheduling-solver/schemas.py` — new field
  `previousMonthTail: dict[str, list[str]] = {}` in `SolverInput`: a dict
  `employeeId → shift codes of the last N days of the previous month, in ascending order`.
- `backend/services/scheduling/types/solver.ts` — new
  `previousMonthTail?: Record<string, string[]>` with equivalent JSDoc.
- `backend/services/scheduling/build-solver-input.ts` — calls
  `repo.getPreviousMonthEndAssignments(year, month, 7)` (already in the
  repository), converts it to `Record<string, string[]>` grouped by `employeeId`
  in ascending order, and includes it in the result.

**Note:** `getPreviousMonthEndAssignments` only returns data from `published`
months. If the previous month is a `draft`, the tail is empty and the solver
works as before (no cross-month). This is considered correct — the current month
should not depend on a draft of the previous one. _(Revised on 2026-04-30:
drafts are used too.)_

**Python constraints (`backend/scheduling-solver/constraints/`):**

- **`transitions.py` (H3):** if the tail's last shift is `N`, forbids M/T/PI/P
  on day 1 of the new month. If it is `T`, forbids M on day 1.
- **`rest.py` (H4 + H5):**
  - H4 cross-month: counts the consecutive working days at the end of the tail
    (`trailing_work`). If `trailing_work >= maxConsecutiveWorkDays`, forces L on
    day 1. Otherwise, applies a max-work window over the first `remaining+1`
    days.
  - H5 cross-month: for each `overlap` in `range(1, min(7, len(tail)+1))`,
    computes how many days off of the tail fall inside the combined 7-day window
    (tail + new month). If days off are missing, adds
    `sum(L in current_part) >= need`. **Critical guard:** only adds it if
    `need ≤ len(current_part)` — prevents impossible constraints when the need
    exceeds the available part of the month.
- **`night_block.py` (H2):** detects consecutive nights at the end of the tail
  (`trailing_N`). If any, day 1 continues the previous block (not a new start);
  applies the remaining minimum and the maximum according to how many nights
  have already passed.
- **`day_blocks.py` (M/T shifts):** detects a trailing run of the same shift at
  the end of the tail. If it continues, it adjusts the remaining minimum of the
  block (instead of requiring a full 3-day block from day 1).

### Bug found and fixed while testing

Without the guard, the H5 cross-month constraint could be impossible. Example:
`overlap=6`, tail=["M","M","N","N","N","N"] → `tail_rest=0`, `need=2`, but
`current_part=[day1]` has a single element. `sum(L for [day1]) >= 2` is
impossible (a binary variable, maximum 1). Fix:
`if need > 0 and current_part and need <= len(current_part):`.

### Behaviour with "aggressive" tails

Tests showed that a tail where every employee ends the month with 5–6 working
days in a row (not enough days off) produces `infeasible`. This is **correct**:
it means the previous month would have broken H5 (which should never happen with
months generated by the same solver). With realistic tails (days off properly
spread), the result is always `feasible`.

### Tests run

- January (no tail, 7 employees): `ok` ~200 ms
- February (no tail, 7 employees): `ok` ~206 ms
- February (realistic tail with days off properly spread): `ok` ~226 ms
- February (aggressive tail with no days off): `infeasible` — expected and
  correct

---

## 2026-04-29 — Cross-month refactor: locked virtual days

### Context

The previous implementation (2026-04-28) used ad-hoc cross-month logic inside
each constraint. Each file read `emp_tail` on its own and computed its own
`trailing_X`. The result:

- Duplicated, fragile code in `night_block.py`, `transitions.py`, `rest.py`,
  `day_blocks.py`.
- The H2 constraint (night blocks) could not detect cross-month window sizes
  correctly.
- Any new constraint in Phase 2 would need its own cross-month code.

### Decision: virtual days as CP-SAT variables

Boolean variables for days `-7..-1` are added per employee directly to the
CP-SAT model, locked from `previousMonthTail`. The constraints iterate uniformly
over `all_days = virt_days + real_days`, removing all the ad-hoc cross-month
code.

### Changes

**`model.py`:**

- Constant `TAIL_LENGTH = 7`.
- After creating variables for the real days: for each employee with a tail,
  creates `x[e, d_virt, s]` for `d_virt ∈ [-7..-1]`, adds `add_exactly_one`, and
  locks it to the known tail shift (padded with `L` if the tail has fewer than 7
  days).
- Computes `virtual_days_by_emp: dict[int, list[int]]` and passes it to the
  constraints that need it.
- Includes the virtual days in the output `matrix` (for debugging): negative
  keys such as `"-7"`, `"-1"`. The TypeScript controller already ignores them
  (`dayMap.get(negative) = undefined → skip`).
- Adds the tail's shifts to `all_shifts_needed` so special shifts in the tail
  (V, B, etc.) exist as variables on real days.

**`locked_cells.py`:**

- Step 2 (forbid special shifts on unlocked cells): added `if d < 0: continue`.
  **Critical**: without this guard, the constraints
  `x[e, d_virt, special_shift] == 0` clash with `x[e, d_virt, known_shift] == 1`
  (set in `model.py`) → immediate INFEASIBLE.

**`transitions.py`:**

- Removed the special cross-month block (last tail shift → day 1).
- Now iterates over consecutive pairs of `all_days`: the virtual→real transition
  comes out naturally.

**`rest.py`:**

- Removed the `for overlap in range(...)` loops of H5 and the `trailing_work` of
  H4.
- Now iterates the H5 and H4 windows directly over `all_days`. Windows that
  overlap virtual→real detect work-density problems automatically.

**`night_block.py`:**

- max_block: sliding window over `all_days` (detects N blocks that started in
  the previous month).
- "1 new block per month": `block_starts` created only for real days (`d ≥ 1`),
  `sum(block_starts) <= 1`.
- Cross-month continuation: **conditional** (old behaviour). If
  `trailing_N < min_block`: IF day 1 = N, complete the remaining days; day 1 is
  NOT forced.
- `not_can_complete_block` restored for real days: blocks always complete within
  the month. A solver-generated roster never produces an incomplete trailing N.

**`day_blocks.py`:**

- Removed the virtual `trailing_same` code (which forced real days from
  `block_starts` on virtual days → INFEASIBLE when the tail had patterns like
  `M,M,L,...`).
- M/T continuation: `trailing_same` computed from the tail data, with
  conditional enforcement for day 1 (as in the original code).
- `not_can_complete_block` restored for real days.
- M→T prohibition: now applies over `all_days` (including virtual→real).

### Critical bug found while testing

When creating `block_start` variables for virtual days in `day_blocks.py` and
`night_block.py`, the min_block enforcement loop:

```
for k in range(1, MIN_SHIFT_BLOCK):
    nd = all_days[pos + k]
    model.add(x[e, nd, shift] >= bs)
```

tried to force following virtual days that could be locked to a different shift.
Example: tail `M,M,L,L,N,N,N` → block_start M on `-7` → forces `-5` to M, but
`-5` is locked to L → INFEASIBLE.

**Fix:** `if nd < 0: continue` in the enforcement loops. The previous month
already validated its block structure.

**Second bug:** N continuation from virtual days used `bs = 1` (a locked
block_start) to force real days unconditionally. This clashed with H5 when the
tail ended in a dense working pattern. Fix: conditional continuation (if day 1 =
N, complete; day 1 is not forced).

### N vs M/T for cross-month continuation

M/T blocks always complete within the month (3 days, easy to fit). N blocks also
complete within the month (solver-generated). Cross-month continuation only
covers a manually edited roster that ends with an incomplete block, and then it
is **conditional** for both kinds: if day 1 continues the same shift, the
remaining days are forced.

### Tests run

- January (no tail): `ok` ~220 ms
- February (no tail): `ok` ~200 ms
- trailing_N=3, conditional (e5): `ok`, day 1 = N (the solver chose to continue
  the block)
- trailing_N=4, complete (e1): `ok`, day 1 = N or L (the solver chooses whether
  to extend)
- January→February→March chain with real tails: all 3 months `ok`, each employee
  with 1 N block, 4–6 N, 9–11 L
- Aggressive tail (nobody rested): `infeasible` — correct

---

## 2026-04-30 — Fix: previous month's tail available from drafts

### Problem

When generating months in sequence (e.g. January → February → March), if the
previous month was a `draft`, `getPreviousMonthEndAssignments` returned `[]` —
the solver got an empty tail, no virtual days were created and every cross-month
constraint was off. Result: M→T, T→M, N→M/T violations at the month boundary.

Example observed: a rotating employee ends January with 5×M in a row and starts
February with 5×T — a direct M→T transition forbidden by `day_blocks.py`, but
ignored because January's tail never reached February's solver.

### Cause

In `scheduling-repository.ts`:

```typescript
if (prevMonthRecord.status !== 'published') {
    return []   // empty tail → no virtual days → no cross-month constraints
}
```

The "published months only" restriction was designed for stability: if the
previous month changes, the current one could become inconsistent. In practice,
though, the real flow is to generate several draft months in sequence before
publishing any. The restriction made that impossible.

### Solution

Remove the published-only guard. The function now accepts the previous month in
any state (`published` or `draft`). If the previous month is changed and
regenerated, the current month is simply regenerated too.

### Consequence

The log now prints `Using draft month 2026-1 for continuity` instead of skipping
the tail. The solver gets the last 7 days of the previous month whatever its
state, and the cross-month constraints activate correctly.

### Next step

With cross-month now working (both the Python solver and the repository tail),
the natural next step is the **soft objective function**: the solver currently
returns the first feasible solution without optimising. The objective should
minimise imbalances (spread nights between employees, prefer consecutive days
off, etc.).

---

## 2026-04-30 — Decision: a persistent Python daemon instead of one process per request

### Context

The initial integration used `child_process.spawn` per request: each
`POST /generate` started a new Python process, passed the input through stdin
and read the output from stdout. It worked in development until a
Windows-specific performance problem appeared.

### Problem

On Windows with Windows Defender active, importing OR-Tools makes Defender scan
every DLL in the library. On a cold start this can take between 1 and 20
minutes. With one process per request:

- The first generation could spend 20+ minutes just importing, making the 90 s
  timeout meaningless.
- Several concurrent requests (the user clicking more than once) started several
  Python processes at once, all competing for CPU during the Defender scan, so
  all of them failed.
- The result was an empty stdout, which the controller read as "invalid JSON".

On Linux/production the start-up is 2–3 seconds per request (no Defender) — not
critical, but not ideal either.

### Decision

Move to a **persistent Python daemon**: a single Python process that starts with
the Node server, imports OR-Tools once, and handles every request through a
newline-delimited JSON protocol over stdin/stdout. The process lives
indefinitely; if it dies unexpectedly, the TypeScript client notices and
restarts it on the next request.

Components:

- `scheduling-solver/daemon.py` — the persistent process
- `services/scheduling/solver-client.ts` — daemon management (idle / starting /
  ready states, semaphore, abort-safe)
- `index.ts` — calls `warmupSolver()` when the server starts, so the daemon is
  warm before the first request

The internal protocol (newline-delimited JSON over stdin/stdout) is unchanged
from the original design. Only the process lifecycle changes.

### Abort-safe

A non-obvious edge case: if the client aborts a request (navigates away), the
semaphore in `solver-client.ts` is NOT released until the daemon answers. This
prevents the next request from receiving the aborted request's answer
(stdin/stdout desynchronisation). A timeout kills the daemon for a clean restart
instead of just rejecting the promise.

---

## 2026-04-30 — Fix: night_block trailing_N >= minNightBlock blocked a new block

### Context

The Phase 1 fix ("sum(block_starts) == 0 when trailing_N > 0") was too strict.
Its purpose was to stop an employee doing two night blocks in the same month
(the one continued from the previous month + a new one). But it applied to EVERY
trailing_N > 0, including `trailing_N >= minNightBlock` (block already
complete).

### Observable problem

An employee who ended May with 4–6 consecutive nights (a complete block,
`trailing_N >= 4`) could not do any night block in June. In practice, whoever
"had the nights" in May could never have them in June.

### Fix

`sum(block_starts) == 0` only applies when `0 < trailing_N < minNightBlock` (an
incomplete block from the previous month that must be completed). For
`trailing_N >= minNightBlock` (a complete block), the employee can start a new
block in the next month.

### Additional case: a blocking vacation

Related case: `0 < trailing_N < minNightBlock` and the cells needed to complete
the block are locked (e.g. vacation at the start of the month). The solver was
INFEASIBLE because it could neither complete the block (V cells) nor start a new
one (sum == 0). Fix: if continuation is physically impossible because of locked
cells, the restriction is lifted and a new block is allowed.

Both fixes are in `constraints/night_block.py` and covered by the corpus (52
tests).

---

## 2026-05-09 — S4 `min_work_block`: soft, not hard

### Context

An earlier analysis (with MiMo V2.5 Pro) suggested implementing
`min_work_block.py` as a hard constraint in the solver, for parity with the
validator, which emitted `severity: 'error'` for 1–2-day work blocks. F11 and
F30 were excluded from the parity test because of this divergence.

### Discussion

In the catalogue (§3), S4 had been classified as **soft with weight 3** since
Phase 0 (2026-04-25). The validator had been emitting `error` for months by
mistake — inconsistent with the catalogue, not an informed decision.

Reasoning for keeping it soft (manager, 2026-05-09): when the hard constraints
(minimum coverage, H5 7-day window, night_block) corner the solver into a
scenario where the only feasible roster has a short block, it should **produce
the roster and pay the penalty**, not return INFEASIBLE. "Aim for a minimum of
3, accept 2 if there is no other option" is the catalogue's original intent.

Nights stay hard: `night_block.py` enforces blocks of 4–6 consecutive nights. S4
detection does include N in `is_work` (parity with the validator's
`isWorkShift`: an M-N-N-N-N-T pattern is one continuous 6-day block, not
isolated fragments), but since `night_block.py` already forbids loose 1–2-night
blocks, in practice S4 only penalises short M/T/P/PI configurations.

### Changes

- **`soft-weights.ts`:** added `min_work_block_short: 3` with docs.
- **`schedule-validator.ts`:** `createError` → `createWarning` for short blocks.
  Accumulates `softPenalty += weight × (MIN_WORK_BLOCK - block.count)` with a
  breakdown in `softPenaltyBreakdown.min_work_block_short`. Cross-month skip
  when the tail completes the minimum (unchanged).
- **`scheduling-solver/model.py`:** S4 added to the objective. Variables
  `is_work[e,d]` (bool, sum of work shifts). Reified indicators `short1_*` and
  `short2_*` (1-day block → penalty 6, 2-day block → penalty 3). The tail's
  virtual days extend the block backwards (cross-month) with no extra code.
  Breakdown reported in `stats.softPenaltyBreakdown.min_work_block_short`.
- **`solver-parity.test.ts`:** F11 and F30 re-included (22 → 24 fixtures).
- **28 fixtures updated:** `expected.softPenalty` + breakdown recomputed;
  `severity: error` matchers for short blocks → `warning`. Applied with a
  one-off helper script (deleted after use).
- **Catalogue §3 S4:** the description clarifies "isolated 1–2-day M/T/P/PI;
  nights do not apply — H2 already fixes them as hard".

### Test state

- TypeScript corpus: 51/51 ✅
- TypeScript solver-parity: 24/24 ✅
- Python corpus + daemon: 103/103 ✅

---

## 2026-05-09 — Synthetic 30×31 benchmark + viability for a large hotel

### Context

Phase 2 exit criterion: "30 employees × 31 days solved in < 30 s". Pending since
Phase 1. A parallel question from the manager: is the system viable for a
30-person hotel?

### Implementation

- `scheduling-solver/tests/test_benchmark.py` — a directly runnable script
  (without pytest) + a pytest test behind the `--runbenchmark` flag (skipped by
  default).
- Synthetic input: 30 rotating employees, January 2026 (31 days, day 1 =
  Thursday), no tail, no lockedCells.
- Config scaled for a mid-size hotel: `minM=8/prefM=12/maxM=15`,
  `minT=5/prefT=7/maxT=10`, `minN=1/maxN=2`. Other values standard.

### Results

| Timeout       | CP-SAT status | Real time | softPenalty |
| ------------- | ------------- | --------- | ----------- |
| 5 s balanced  | FEASIBLE      | 5.5 s     | 40          |
| 10 s balanced | FEASIBLE      | 10.5 s    | 40          |
| 15 s balanced | FEASIBLE      | 15.6 s    | 40          |
| 30 s fast     | FEASIBLE      | 30.6 s    | 40          |
| 60 s balanced | FEASIBLE      | 60.6 s    | 40          |

**Findings:**

1. It finds a feasible solution (every hard constraint met, 930 cells) in **< 5
   s**. Meets the exit criterion.
2. **It never reaches OPTIMAL** within the timeouts tried: softPenalty=40 (=
   `night_balance × W=10`, `night_range=4`), stuck, no improvement with more
   time. CP-SAT uses the whole budget without proving optimality.
3. The range of 4 comes from the problem itself: 31 nights × 1–2 staff = 31–62 N
   shifts; blocks of 4–6 nights → ~6–12 employees work nights and the rest none
   → a structural range of ~4–5 without `nightsHistory`.

### Bugs found during the benchmark

**`fixedShift=P` without `fixedDays` causes INFEASIBLE in Python.** The first
attempt included 4 managers with `fixedShift=P, noWeekends=true` and no
`fixedDays`. The solver's `employee_rules.py` forbids them M/T/N → only L →
clashes with `maxMonthlyLibre=11`. It does not happen in production because
`build-solver-input.ts` excludes these employees before calling the solver
(documented in the agent instructions: employees with `fixedShift=P` but no
`fixed_days` are excluded from the solver entirely). Possible improvement: add
the same filter in Python as a guard, or return an explicit error instead of a
silent INFEASIBLE.

### Viability for a 30-person hotel

**Viable at engine level.** The solver copes with the mathematical size. The
gaps are product gaps, not algorithmic ones:

| Item                                      | State       | Blocks 30 employees?                                                                                                                         |
| ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-SAT solver scales to 30×31             | ✅          | No                                                                                                                                           |
| Hard constraints met                      | ✅          | No                                                                                                                                           |
| Cross-month, locked cells, employee rules | ✅          | No                                                                                                                                           |
| OPTIMAL convergence                       | ⚠️          | No — the first feasible roster is usable                                                                                                     |
| Tuned soft weights                        | ⚠️          | No — the manager edits                                                                                                                       |
| Segmentation by role/department           | ❌          | **Yes.** 30 employees in a real hotel belong to departments (front desk, housekeeping, kitchen). Today they all compete for the same shifts. |
| Configurable `min/max staff` coverage     | ✅          | No (lives in `scheduling_config`)                                                                                                            |
| UI scales to a 30×31 grid (930 cells)     | ⚠️          | Untested; will likely need extra ergonomics                                                                                                  |
| Multi-hotel                               | ❌ Deferred | No, for a single large hotel                                                                                                                 |

### Conclusion

**For a 30-person hotel with 1 department:** viable today. The solver solves,
the roster is feasible, the manager can edit.

**For a 30-person hotel with several departments:** role segmentation is missing
— a real product gap, not an engine gap. It means adding `role_id` to employees
and to the coverage config, and modelling coverage per role in the solver. Not
trivial but bounded.

**Immediate recommendation:** accept Phase 2, item 6 (benchmark) as closed.
Weight tuning (Phase 2, item 4) and the rotation continuity spec (item 2) block
the full close of Phase 2.

---

## 2026-05-09 — Soft weight tuning: deferred to production

### Context

Phase 2, item 4 asks to tune the S1–S4 weights with real manager feedback after
2–3 months of production use. Current weights (`model.py`):

- `W_NIGHT_BALANCE = 10` (S1)
- `W_ISOLATED_L = 2` (S2)
- `W_SHIFT_PRIORITY = 1` (S3)
- `W_SHORT_WORK_BLOCK = 3` (S4)

_(These S1–S4 are the solver's own numbering of its four objective terms, not
the catalogue's S1–S14.)_

### Why not tune now

The weights set the trade-off between competing goals. The 2026-05-09 benchmark
shows `night_balance` dominating completely (40 points, range=4) — but with no
comparable "real" roster, there is no way to know whether that dominance is
desirable.

Tuning without data produces intuition-based adjustments the manager will
reject. Better: production → 2–3 months → the manager marks rosters "odd / ok /
perfect" → adjust weights on evidence.

### Action now: telemetry

**Pending (not urgent):** store `softPenaltyBreakdown` per run in a
`scheduling_solver_runs` table (Phase 3, step 1). After 2–3 months of use, that
data plus the manager's feedback allow evidence-based tuning.

### State

Phase 2, item 4 is **blocked by product** (not by code). Marked "deferred"
rather than "pending" — the code is ready; real use is missing.

---

## 2026-05-09 — Phase 2, item 2 (rotation continuity): already closed in practice

### Context

The original Phase 2 plan included:

> 2. Rotation continuity — guide the **M→T→N** pattern using
>    `previousMonthTail`. **Spec pending with the manager**.

The initial reading: implement as soft a preference for a predictable rotation
(week of M → week of T → week of N → repeat).

### Spec with the manager (2026-05-02)

The manager clarified: **there is no predefined M→T→N pattern**. Rotating
employees can move freely between M/T/N as long as the hard constraints hold.
The only real rotation continuity rule is:

- T→M directly with no rest = ERROR (hard)
- An M↔T change at the month boundary with no rest = ERROR (hard)

_(This revises the 2026-04-25 decision that had lowered T→M to soft, S12.)_

### Implementation

Already in place:

- TypeScript: `rotation-continuity.constraint.ts` (severity error + softPenalty
  `rotation_continuity_break`, weight 4, for cross-month)
- Python solver: `transitions.py` forbids consecutive T→M over `all_days`
  (including virtual→real, cross-month).
- Corpus fixtures F12 and F13 cover the cross-month cases.

### Conclusion

No "rotation continuity" work is left. What first looked like a soft pattern
preference was redefined as a specific hard error (T→M without rest), already
implemented on both sides.

Phase 2, item 2 is marked closed.

---

## 2026-05-09 — Agent documentation (Phase 3, step 4) + Phase 2 closed conceptually + Phase 3 reopened

### Documentation added to the agent instructions

Two long sections were added to the "Scheduling System" block of the agent
instructions (then `CLAUDE.md`, now `AGENTS.md`):

1. **"Running the solver locally"** — explains the persistent Python daemon, the
   states of `solver-client.ts` (idle / starting / ready / busy), the initial
   setup (venv + ortools + pydantic + pytest), the warm-up when the backend
   starts, how a generation is triggered from the UI, and the four test suites
   (TypeScript corpus, TypeScript parity, Python corpus, Python daemon stress).
   Includes a table with the three debug scripts (`debug-compare.js`,
   `debug-month.js`, `debug-sept.js`) that connect to the local database without
   starting the server.
2. **"Adding a new constraint"** — a six-step guide for new rules:
   - Step 1: classify hard/soft in the constraints catalogue (reminder: the spec
     is the source of truth, not the code).
   - Step 2: implement it in TypeScript extending `BaseConstraint`, register it
     in the `ConstraintRegistry`, use `softWarn` for soft rules.
   - Step 3: implement it in Python with the standard signature
     `apply(model, x, input, employees, days, virtual_days_by_emp=None)`,
     iterating over `all_days = virt_days + real_days` for cross-month, reifying
     booleans for soft rules, adding to `objective_terms`.
   - Step 4: add a fixture to the corpus, registering it in `SOLVABLE_FIXTURES`
     and `PARITY_FIXTURES` where applicable.
   - Step 5: run the four suites green.
   - Step 6: record it in this decisions log.

   The section points at S4 (added 2026-05-09) as a clean example of a soft
   constraint with cross-month, and at `coverage.py` / `rest.py` as templates.

Phase 3, step 4 (minimal agent documentation) is closed.

### Phase 2 → closed in code

After the 2026-05-09 work (S4 soft, F11/F30 re-included, 30×31 benchmark ✅,
rotation continuity confirmed closed, tuning deferred to production), Phase 2 is
closed at code level. The only unchecked criterion is weight tuning, which
depends on production use and is explicitly **deferred**, not pending.

### Phase 3 → in progress

Two steps remain open:

1. **`scheduling_solver_runs` logging** — a new table + persistence after
   `runSolver()` with stats + the original matrix. Needs an SQL migration
   (local + Aiven) and a hook in `schedule-generate.controller.ts`.
2. **Infeasibility UX** — a frontend that renders `conflictingConstraints` +
   `suggestedRelaxations` when the solver returns `status: 'infeasible'`. The
   solver already emits both fields, but the suggestion engine is hard-coded (in
   the infeasible branch of `model.py`) and should be improved alongside.

### The manager's question on the scope of "infeasibility UX"

The manager asked whether the infeasibility UX includes a "manager edits →
system learns" feedback loop. Clarification recorded in the plan:

- **Infeasibility UX** triggers when the solver mathematically finds NO solution
  under the current constraints. Its job is to tell the manager what to relax so
  a solution exists again (e.g. "not enough employees available on the 15th;
  reduce minMorningStaff to 4 or unlock a vacation"). It has nothing to do with
  the quality of good/bad rosters.
- **The manual-edit feedback loop** is what the manager describes: the
  solver-generated roster is stored, the manager edits it after generation, and
  the differences signal improvements. A separate item (noted under "After Phase
  3"), built on `scheduling_solver_runs` once it holds history. Planned steps:
  store the pre-edit matrix, diff it with the final matrix, find recurring
  patterns ("the solver puts M, the manager changes it to T on Mondays"), adjust
  soft weights with that data. Not ML — human analysis of logs. An automated/ML
  part would come later with the LLM layer or warm-starting from history.

Both share `scheduling_solver_runs` but are different flows. The difference is
recorded so they are not mixed in Phase 3's scope.

### Feedback loop refinement (manager, 2026-05-09): only the published matrix counts

After the loop was described, the manager added an important restriction: the
feedback that counts is **only the matrix that gets published**, not the edits
made in draft.

Reason: in `draft` the manager experiments — tries combinations, undoes,
iterates, reviews with the team. Diffing every intermediate edit produces noise
and false patterns (e.g. a tentative edit the manager discards must not count as
a "preference"). The clean signal is the `draft → published` transition: at that
moment the manager is stating "this is the roster the team will work — it
reflects my final judgement".

Design implications:

1. The `solver_matrix` column in `scheduling_solver_runs` stores the matrix
   exactly as the solver generated it, before any edit.
2. A `published_matrix` column (or related table) is needed, filled **only**
   when the month moves to `published`, snapshotting the final matrix from
   `scheduling_assignments` at that moment.
3. Feedback diffs are computed on `published_matrix - solver_matrix`.
   Intermediate draft edits exist in the database (in `scheduling_assignments`)
   but are not stored as feedback history — neither duplicated nor tracked
   separately.
4. If a month never reaches `published` (discarded, regenerated from scratch,
   etc.), no feedback entry is produced for it. That is correct: if it was not
   published, the manager did not state anything final.

This rule is written down explicitly because it changes the scope of future
work: the feedback hook does not go in `PATCH /assignments/:id` (cell-by-cell
editing) but in the publish endpoint (`POST /months/:id/publish` or similar).

---

## 2026-05-20 — H4/H5 cross-month: skip "doomed" windows of the previous tail

**Context.** When generating June 2026 with historical data imported from the
spreadsheet (January–May published), the solver returned INFEASIBLE
reproducibly. Diagnosis:

- A rotating employee ended May with 6 consecutive `M` shifts (days 26–31).
- The Python solver builds 7 "virtual days" from the previous month's tail
  (`-7..-1`), locked to their real values.
- H5 (≥2 rest in a 7-day window) was applied to the window `[-6..-1, 1]` = 6
  locked virtual M + real day 1. The maximum rest capacity of that window is 1
  (only day 1 can be a day off); the constraint needs ≥ 2 → mathematically
  unsatisfiable → INFEASIBLE.
- The same pattern applies to H4 (max 6 consecutive working days) if the tail
  brings more work than allowed.

**Decision.** In `scheduling-solver/constraints/rest.py`, before adding the
H4/H5 constraint for a window, check whether the virtual part of the tail
already uses so much capacity that the window cannot be satisfied even if every
real day contributes the most it can. If so, **skip** the window. Reasons:

- Windows made only of virtual days are the previous month's responsibility
  (already validated when it was published).
- Mixed virtual+real windows where the tail has already broken the constraint
  are also the previous month's responsibility — they cannot be repaired from
  the new month.
- Forcing them produces an artificial INFEASIBLE on real historical data (an
  existing spreadsheet) that cannot be edited retroactively.
- The constraint still applies fully to windows inside the current month.

**Alternatives considered.**

1. _Change H5 to an 8-day window._ Solves the problem and matches H4=6 (the "6
   working + 2 rest" pattern typical of hospitality). But it changes the
   constraint's meaning **inside the month**, not only at the edges. Pending.
2. _Make the manager fix the previous month's "dirty" tail._ Rejected:
   historical data is immutable; the manager should not rewrite May every time
   June is generated.
3. _Keep INFEASIBLE._ Rejected: the system could not generate any month after
   one with 6+ consecutive working days, which legitimately exist in real data.

**Accepted trade-off.** "Doomed" cross-month windows are not validated when
generating the current month. H4/H5 consistency inside the current month stays
strict. Validating the previous month is that month's own responsibility (when
it is published).

**Test impact.**

- F31 (`trailing-n-at-max`) moved from `INFEASIBLE_FIXTURES` to
  `SOLVABLE_FIXTURES`. Its "infeasibility" was an artefact of the bug, not a
  real constraint: trailing_N=6 + a new configuration → a valid roster is
  possible.
- New fixture F52 (`cross-month-6-consecutive-work-tail`) locks the fix with the
  real case: tail = `L,M,M,M,M,M,M`, the roster must be solvable, days 1 and 2
  forced to L by H4 + H5.

**Implementation drift found.** On the way it turned out that the documented H5
spec says "**2 CONSECUTIVE rest days** in 7 days" (the agreement rule: you need
an L,L pair). The validator (`consecutive-rest.constraint.ts`) matches the spec.
The Python solver (`rest.py`) implements it as **sum(rest) ≥ 2** (it does not
require them to be consecutive). A historical drift since the start of the
Python work. Alignment pending.
