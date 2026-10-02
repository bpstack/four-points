# Scheduling constraints

The catalogue of every rule the scheduling module applies: labour agreement,
operational coverage, rest, night blocks, preferences and per-employee rules.
Part of the [scheduling module](README.md); the generator that applies these
rules is described in [`solver.md`](solver.md), and why each rule is the way it
is, in [`decisions.md`](decisions.md).

- **Source of truth.** The rules live here first. The TypeScript grid validator
  (`backend/services/scheduling/`) and the Python solver
  (`backend/scheduling-solver/`) implement them separately; when they disagree
  with this document, the code is what gets fixed.
- **Changing a rule** means updating, in the same change, the validator, the
  solver and the shared test corpus that keeps both aligned (§9).
- **What it does not contain:** the numeric values each hotel configures. Those
  live in the database (`scheduling_config`, `scheduling_employee_rules`); this
  document says which rules exist and how they apply.
- **Known drift** between this catalogue and the code is marked ⚠️ where it was
  checked against the code (2026-09-28). The implementation of each rule is
  mapped in §11.

---

## 1. Shift and absence codes

Source: `scheduling_shifts` (seeded in
`backend/db-mysql/aiven/19_scheduling.sql`). The times are the official
references stored in the database; the actual agreement may vary (see §1.3).

### 1.1 Work shifts (`is_work_shift=1`)

| Code | Name               | DB hours    | Hours | Use                                  |
| ---- | ------------------ | ----------- | ----- | ------------------------------------ |
| `M`  | Morning            | 07:00-15:00 | 8     | Main rotation                        |
| `T`  | Afternoon          | 15:00-23:00 | 8     | Main rotation                        |
| `N`  | Night              | 23:00-07:00 | 8     | Rotation; always 1 per day           |
| `P`  | Presence           | 08:00-16:00 | 8     | Fixed, management staff              |
| `PI` | Intervention staff | 09:00-17:00 | 8     | Split shift / reinforcement (events) |

### 1.2 Absences (`is_work_shift=0`)

| Code | Name                | Paid | Use                                                  |
| ---- | ------------------- | ---- | ---------------------------------------------------- |
| `L`  | Day off             | Yes  | Weekly rest (numbered L1..Lnn per employee and year) |
| `V`  | Vacation            | Yes  | Approved vacation                                    |
| `B`  | Compensated holiday | Yes  | Holiday agreed in advance                            |
| `FO` | Training            | Yes  | Scheduled training                                   |
| `IT` | Long sick leave     | Yes  | Medical leave                                        |
| `E`  | Sickness            | Yes  | One-off sick day                                     |
| `A`  | Unjustified absence | No   | Absence without justification                        |

### 1.3 Spreadsheet ↔ database gaps — decisions (2026-04-25)

Codes found in the hotel's original planning spreadsheet that do **not** exist
in the database. All resolved.

| Spreadsheet | Decision                                    | Reason                                                    |
| ----------- | ------------------------------------------- | --------------------------------------------------------- |
| `BT`        | Merge into `IT`; map `BT→IT` on import      | `BT` = temporary leave; conceptually identical to `IT`    |
| `M1`        | **Drop**; map `M1→M` on import              | The system only knows `M`; time variants are not modelled |
| `PI1`       | **Drop**; one-off value tied to past events | No recurrence; does not deserve its own code              |
| `F`         | **Drop**; ignored on import                 | Spurious code; training is `FO`                           |
| `LI`        | **Drop**; one-off value                     | `L` numbering already covers the cross-month case         |
| `D`         | **Drop**                                    | Unused column                                             |

**Import rule:** any spreadsheet code not listed in §1.1/§1.2 is normalised with
this table before being inserted into `scheduling_assignments`. An import that
finds an unmapped code fails explicitly.

### 1.4 Numbered days off (`L1..Lnn`)

A running counter **per employee for the whole year**. A block of 2 consecutive
days off shares its number (e.g. `L3 L3`). Numbers can cross months (`L5` on 31
January + `L5` on 1 February = the same pair). In exceptional cases
(compensations) the numbers can be **non-consecutive**, but the hard rule of 2
consecutive rest days in a 7-day window must then be met by other pairs.

Storage: the assignment stores only `L` (or the base code). The numbering is
**derived** (rendered in the UI, not stored).

---

## 2. Hard constraints

> A violation makes the roster invalid. Solver: mandatory constraints.
> Validator: `severity: 'error'`. `source_constraint_id` locks the cell.

### H1 — Minimum daily coverage per shift

- **Rule:** every non-holiday day has at least `min_morning_staff` M,
  `min_afternoon_staff` T and `min_night_staff` N.
- **Operational invariant:** `N = 1` always (observed on 99.3% of days in the
  January–May 2026 spreadsheet).
- **Implementation:**
  `backend/services/scheduling/constraints/coverage.constraint.ts`.
- **Database source:** `scheduling_config.min_*_staff` / `max_*_staff`.

### H2 — Consecutive night blocks

- **Rule:** whoever works nights works a block of `min_night_block` to
  `max_night_block` consecutive nights (default 4–6).
- **Cross-month:** yes (canonical case of §9.5). A block can start in month N-1
  and end in month N.
- **Implementation:** `constraints/night-block.constraint.ts`.
- ⚠️ _Corrected 2026-09-28._ This entry said the validator only counted nights
  inside the month, pending the `previousMonthHistory` wiring. That wiring was
  finished on 2026-04-26 (§9.5), and `night-block.constraint.ts` reads
  `previousMonthHistory.incompleteNightBlocks`.

### H3 — Mandatory rest after nights

- **Rule:** after an `N` block, the employee cannot go straight into
  `M`/`T`/`PI` without at least 1 day off in between.
- **Cross-month:** yes. The last `N` of month N-1 limits which shifts the
  employee can work on day 1 of month N.
- **Evidence:** a single exception in 5 months of spreadsheet (treated as an
  outlier).
- **Implementation:** the solver forbids `N` followed by `M`/`T`/`PI`/`P`
  (`transitions.py`). The validator does not check it:
  `rotation-continuity.constraint.ts` was never registered by
  `schedule-validator.ts` and was removed on 2026-10-02.

### H4 — Maximum consecutive working days

- **Rule:** no more than `max_consecutive_work_days` (default 6) working days in
  a row.
- **`V` breaks the streak** for this count (labour agreement).
- **Cross-month:** yes. The streak on day 1 is prefixed with the consecutive
  days worked at the end of month N-1.
- **Implementation:** `constraints/max-consecutive-work.constraint.ts`.

### H5 — Two consecutive rest days in any sliding 7-day window

- **Rule:** every window `[d, d+6]` contains at least 2 consecutive rest days
  (`L`/`V`/`B`/`IT`/`E`/`FO`).
- **Scope:** skipped for employees with `fixedDays` + `noWeekends` (their rest
  days are fixed).
- **Cross-month:** yes. Sliding windows that start in the first 6 days of the
  month (`[1,7]`, `[2,8]`…) are evaluated with the last days of month N-1; the
  previous month can supply the `L L` pair that satisfies the window.
- **Cross-month exception (solver, 2026-05-20):** if the virtual part of the
  previous month's tail already uses so much of the window that it cannot be
  satisfied (e.g. a tail of 6 working days in a row ending on the last day of
  the month), the solver **skips** that window. Purely virtual or "doomed"
  windows are the previous month's responsibility (already validated); forcing
  them when generating the new month produces an artificial INFEASIBLE. The same
  applies to H4. See [`decisions.md`](decisions.md), entry 2026-05-20.
- ⚠️ **Known drift between validator and solver** (checked 2026-09-28): the
  validator (`consecutive-rest.constraint.ts`) implements the rule as a
  **consecutive `L,L` pair** inside the window, as specified here. The solver
  (`rest.py`) implements it as **sum(rest) ≥ 2**, without requiring them to be
  consecutive. Alignment pending.
- **H4 vs H5 contradiction (undecided):** H4 says "at most 6 consecutive working
  days", but H5 (window of 7, ≥2 rest) implies an effective maximum of 5. One
  option considered: an 8-day H5 window would match H4=6 and allow the usual
  hospitality pattern "6 working + 2 rest".
- **Implementation:**
  `services/scheduling/constraints/consecutive-rest.constraint.ts` (validator) +
  `scheduling-solver/constraints/rest.py` (solver).

### H6 — ~~Afternoon → morning without a day off~~ (moved to soft S12, then back to hard)

- **Decision 2026-04-25:** lowered from hard to **soft-high** (weight 8). See
  S12 in §3.
- **Reason:** 25 occurrences in the real spreadsheet = accepted practice with
  ~15 h of effective rest. It does not break the labour agreement (the 48 h
  minimum is a weekly rule, not a daily rule between any two shifts).
- **Afternoon → `PI` allowed** without penalty.
- ⚠️ _Corrected 2026-09-28._ The manager revised this on 2026-05-02: `T → M` on
  consecutive days with no day off **is an error (hard)**, and so is an `M ↔ T`
  change at the month boundary with no rest (see [`decisions.md`](decisions.md),
  entry 2026-05-09 "rotation continuity"). Only the solver applies it, as
  hard: `transitions.py` forbids `T → M`. S12 is therefore not a soft rule in
  practice. (`rotation-continuity.constraint.ts` emitted `severity: 'error'`
  but `schedule-validator.ts` never registered it; removed on 2026-10-02.)

### H7 — Locked cells are respected

- **Rule:** assignments with a non-null `source_constraint_id` (approved
  vacations, `IT` leave, `B` holidays, approved days off) reach the solver as
  fixed values. The solver does not change them.
- **Solver input:** `lockedCells[]` (see [`solver.md`](solver.md#input)).

### H8 — Structural employee rules

These per-employee rules are hard when `is_active=1`:

- `fixed_shift` (a fixed shift, e.g. management staff → `P`): forbids any other
  work shift (M/T/N) in the solver; only that shift or `L`.
- `no_weekends` (never Saturday or Sunday): the solver forces `L` on Saturday
  and Sunday.
- `fixed_days` (fixed weekdays, e.g. Monday–Friday with `P`): a deterministic
  weekly pattern; see §5.1.

The other per-employee rules (`shift_priority`, `max/min_shift_per_month`) are
**soft** by default (see §3).

**Implementation — validator:** `constraints/employee-rules.constraint.ts`.

**Implementation — solver:** `constraints/employee_rules.py` (`noWeekends`,
`fixedShift`). `fixedDays` is handled in TypeScript in `build-solver-input.ts`,
not in Python: the weekday/weekend pattern is pre-expanded into `lockedCells`
before the solver starts. See the note in §5.1.

---

## 3. Soft constraints

> A violation adds a penalty to the cost function, which the solver minimises.
> Validator: `severity: 'warning'`. **Weight scale: 1–10.** To be tuned with
> real feedback.

| ID  | Name                        | Description                                                                                                                                                                                                                                                    | Weight                 | Validator implementation                  |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------- |
| S1  | `shift_priority`            | Respect the employee's preferred shift, if any                                                                                                                                                                                                                 | 6                      | `employee-rules.constraint.ts`            |
| S2  | `m_t_balance`               | Without `shift_priority` and total(M+T) > 5: not 100% on a single shift                                                                                                                                                                                        | 4                      | `schedule-validator.ts` (W13)             |
| S3  | `weekend_off`               | At least one Saturday+Sunday off per month                                                                                                                                                                                                                     | 5                      | `schedule-validator.ts` (W10)             |
| S4  | `min_work_block`            | Work blocks (any M/T/N/P/PI) of at least 3 consecutive days. Detection includes N so that mixed M-N-T blocks are continuous, but 1–2-day N blocks never appear because H2 already forbids them (4–6, hard). In practice S4 only fires on mixed M/T/P/PI edges. | 3 per missing day      | `schedule-validator.ts` (V3) + `model.py` |
| S5  | `monthly_libre_range`       | Monthly days off within `[min, pref, max]` = `[9, 10, 11]`                                                                                                                                                                                                     | 3 per day out of range | `constraints/monthly-libre.constraint.ts` |
| S6  | `all_rotators_do_nights`    | Every rotating employee works at least one N block per month                                                                                                                                                                                                   | 8 (soft-high)          | `schedule-validator.ts` (W5)              |
| S7  | `max_21_shifts`             | At most 21 working shifts per month per employee                                                                                                                                                                                                               | 3                      | `schedule-validator.ts` (W6)              |
| S8  | `min_13_shifts_without_V_B` | If ≥13 shifts are expected and there is no V/B, do not go below                                                                                                                                                                                                | 3                      | `schedule-validator.ts` (W7)              |
| S9  | `weekly_max_shifts`         | At most `max_weekly_shifts` (6) shifts per week                                                                                                                                                                                                                | 3                      | `schedule-validator.ts`                   |
| S10 | `annual_libre_cap`          | At most 90 weekly days off per year (cross-month)                                                                                                                                                                                                              | 7                      | `schedule-validator.ts`                   |
| S11 | `consecutive_L_pairs`       | Prefer `L L` pairs over scattered days off                                                                                                                                                                                                                     | 2                      | _not implemented_                         |
| S12 | `T_to_M_rest`               | `T(d) → M(d+1)` with no day off = ~15 h rest. Cross-month: yes (T on the last day of N-1 → M on day 1 of N). ⚠️ Applied as hard; see H6                                                                                                                        | 8 (soft-high)          | ex-H6                                     |
| S13 | `preferred_night_block`     | N block close to `pref_night_block` (5)                                                                                                                                                                                                                        | 2                      | `constraints/night-block.constraint.ts`   |
| S14 | `balanced_rotation`         | Even spread of N among rotating employees in the month                                                                                                                                                                                                         | 5                      | _not implemented in the validator_        |

⚠️ The weights above are the catalogue's. The validator's actual weights are in
`backend/services/scheduling/soft-weights.ts`, and the solver minimises only
four terms with its own weights (§11.2); the three sets are not aligned.

---

## 4. Numeric parameters (`scheduling_config`)

Seeded in the database, with defaults hard-coded in `schedule-validator.ts`.
**Divergences found** are shown in the table (as of 2026-04-25).

| Key                         | DB seed      | Validator default | Observed in spreadsheet       | Decision                          |
| --------------------------- | ------------ | ----------------- | ----------------------------- | --------------------------------- |
| `min_morning_staff`         | 1            | 1                 | 1-4                           | OK                                |
| `pref_morning_staff`        | 2            | 2                 | 2                             | OK                                |
| `max_morning_staff`         | 2            | 3                 | up to 4 (peak days)           | **6** (decided 2026-04-25)        |
| `min_afternoon_staff`       | 1            | 1                 | 1-3                           | OK                                |
| `pref_afternoon_staff`      | 2            | 2                 | 1-2                           | OK                                |
| `max_afternoon_staff`       | 2            | 3                 | up to 3                       | OK                                |
| `min_night_staff`           | 1            | 1                 | 1                             | OK                                |
| `max_night_staff`           | 1            | 1                 | 1 (exceptionally 2 on change) | OK                                |
| `max_weekly_shifts`         | 6            | 6                 | ≤6                            | OK                                |
| `pref_weekly_shifts`        | 5            | 5                 | 5                             | OK                                |
| `min_rest_hours`            | 48           | 48                | —                             | OK                                |
| `min_night_block`           | 4            | 4                 | 4-5                           | OK                                |
| `max_night_block`           | 6            | 6                 | 5 max                         | OK (slack)                        |
| `pref_night_block`          | 5            | 5                 | 5                             | OK                                |
| `min_monthly_libre`         | 8            | 7/8               | 6-11                          | **9** (decided 2026-04-25)        |
| `pref_monthly_libre`        | _not exists_ | —                 | ~10                           | **10** (new key)                  |
| `max_monthly_libre`         | 12           | 10/12             | 11 max                        | **11** (decided 2026-04-25)       |
| `max_consecutive_work_days` | 6            | 6                 | mostly ≤6                     | OK                                |
| `min_consecutive_libre`     | 2            | 2                 | 2                             | OK                                |
| `annual_vacation_days`      | 30           | 22                | —                             | **30 calendar days** (2026-04-25) |
| `annual_holidays`           | 14           | 14                | 20 (contract)                 | **20 compensated** (2026-04-25)   |
| `annual_free_days`          | 95           | 95                | 90 (contract)                 | **90** (decided 2026-04-25)       |

### Invariant

**One parameter, one place.** When the validator and the solver use the same
parameter, both read it from `scheduling_config`. No hard-coded fallback may
differ from the seed; the inconsistent hard-coded defaults in
`schedule-validator.ts` are to be removed.

---

## 5. Per-employee rules (`scheduling_employee_rules`)

### 5.1 Current types (ENUM)

| `rule_type`           | `rule_value` format                | Kind      | Example                          | Status                                            |
| --------------------- | ---------------------------------- | --------- | -------------------------------- | ------------------------------------------------- |
| `fixed_shift`         | shift code (`P`)                   | Hard      | management staff → `P`           | In use                                            |
| `no_weekends`         | `true`/`false`                     | Hard      | management staff → `true`        | In use                                            |
| `fixed_days`          | CSV of weekdays (e.g. `1,2,3,4,5`) | Hard      | `admin` → Monday–Friday with `P` | **In use**; see note                              |
| `shift_priority`      | shift code (`T`)                   | Soft (S1) | employee prefers `T`             | In use                                            |
| `max_shift_per_month` | —                                  | Soft      | —                                | Obsolete → replaced by `shift_exclusion` requests |
| `min_shift_per_month` | `CODE:N`                           | Soft      | —                                | Not in use                                        |
| `custom`              | free text                          | —         | —                                | Escape hatch; avoid                               |

**Note on `fixed_days` (updated 2026-04-28):** a CSV of weekdays where
`1=Monday … 7=Sunday`. Example: `1,2,3,4,5` = Monday–Friday. It is always
combined with `fixed_shift`, which gives the shift for working days.
Implementation: **pre-expansion in `build-solver-input.ts`** before the solver
runs — working days → `workShift`, the rest → `L`, all injected as
`lockedCells`. Approved requests and vacations take priority over the fixed
pattern. Employees with `fixedShift=P` but no `fixed_days` are left out of the
solver (unknown pattern). The two management employees of the original hotel are
still modelled with `fixed_shift=P` + `no_weekends=true` (no `fixed_days`);
other `P` employees with fixed weekdays do use it.

**Note on `max_shift_per_month` (2026-04-25):** also out of use. The case of an
employee with no `M` from January to March 2026 is modelled as a
`shift_exclusion(M, 2026-01-01, 2026-03-31)` request, not as a rule. This avoids
two mechanisms for time-limited validity.

### 5.2 Real examples from the 2026 spreadsheet

| Employee                         | Structural rule                     | Notes                                                                                 |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| Management employee 1            | `fixed_shift=P`, `no_weekends=true` | Management                                                                            |
| Management employee 2            | `fixed_shift=P`, `no_weekends=true` | Management                                                                            |
| Rotating employee (Jan–Mar 2026) | —                                   | Modelled as a `shift_exclusion` (M) **request** from 2026-01-01 to 2026-03-31, see §7 |

### 5.3 Time-limited validity — decision 2026-04-25

`scheduling_employee_rules` stays **binary** (`is_active` boolean). Rules that
apply only for a period are modelled as **requests** in
`scheduling_employee_requests` (see §7), not in this table.

Criterion:

- This table = **permanent structural** conditions (contract, role). Changes
  only exceptionally.
- `scheduling_employee_requests` = conditions **with a start and an end date**,
  including long-lasting shift exclusions (e.g. no `M` for 3 months).

Consequence: the solver reads **both tables** when building its input.
`employee.rules` comes from `scheduling_employee_rules`; `lockedCells` and
time-limited restrictions come from `scheduling_employee_requests`.

---

## 6. Annual contract (`scheduling_employee_contracts`)

One row per employee and year. Defines the annual quota the solver should
respect in aggregate.

| Field                 | Default | Meaning                                                            |
| --------------------- | ------- | ------------------------------------------------------------------ |
| `dias_trabajo`        | 225     | Annual working days under the agreement                            |
| `horas_anuales`       | 1800    | `dias_trabajo * 8`                                                 |
| `dias_vacaciones`     | 30      | Annual vacation (`V`)                                              |
| `dias_libre_semanal`  | 90      | Annual weekly days off (`L`)                                       |
| `dias_bonificables`   | 20      | Annual compensated holidays (`B`)                                  |
| `dias_it`             | 0       | Expected sick leave (normally 0)                                   |
| `dias_laborables_ano` | 365     | Days in the year                                                   |
| `observaciones`       | —       | One-off adjustments (e.g. `2 LI ENERO`, `3 LI ABRIL // 3 LI SEPT`) |

### Arithmetic invariant

`dias_trabajo + dias_vacaciones + dias_libre_semanal + dias_bonificables + dias_it = dias_laborables_ano`
(≈ 365).

### Use by the solver

Planned: add up the year's assignments per employee and penalise deviation from
the contract. Today the solver ignores it and only looks at the current month.

---

## 7. System inputs — requests

> **What a request is:** input from the employee or the manager that fixes (or
> suggests) a specific assignment for one or more days, before the solver or a
> person fills in the rest of the roster. Unlike **employee rules** (§5), which
> describe permanent structural conditions, requests are **temporary and
> dated**: they apply to specific dates and are archived once past.
>
> **Evidence in the original spreadsheet:** the March–May sheets contain
> free-text notes such as _"[employee] off 28/29"_ or _"[employee] 4 L and 5 T/N
> and 13 L and 14 T/N"_. They lived as free text in a cell, with no table and no
> validation.

### 7.1 Request types

| Type                   | Effect                                                      | Typical origin                             | Example                    |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------ | -------------------------- |
| `shift_preference`     | Fixes a specific shift (including `L` to ask for a day off) | The employee asks for a day off or a shift | "28 L, 29 L", "29 M, 30 M" |
| `shift_exclusion`      | Forbids a shift on the days or range                        | Contract or temporary agreement            | "no M from 1/1 to 31/3"    |
| `bonificable` (`B`)    | Holiday agreed in advance                                   | Calendar + agreement                       | "B on 1/1 and 6/1"         |
| `baja_temporal` (`IT`) | Absence on medical leave                                    | Medical certificate                        | "IT all of May"            |
| `vacation` (`V`)       | Approved vacation                                           | Vacation request                           | "V from 22 to 25 January"  |

**`libre` merged into `shift_preference`:** "asking for a day off" =
`shift_preference` with `requested_value='L'`. There is no separate `libre`
type; the effect is identical.

### 7.2 Time scope

- Every request has **`date_from` and `date_to`** (equal for a single day).
- It can span months (a vacation from 28 January to 5 February is recorded once;
  the solver uses it when generating both months).
- On approval, the matching cells become **locked** (`source_constraint_id`
  points to the request) and the solver treats them as H7.

### 7.3 States and permissions

- Flow: `pending` → `approved` → (possibly) `rejected`.
- Only `approved` requests reach the solver as `lockedCells`. `pending` ones
  show in the UI as a suggestion and do not affect generation.
- **Authorship:** the manager creates the requests on behalf of the employee
  (noting them down when the employee asks) and the same manager approves them.
  There is no employee portal. Both actions (`created_by`, `approved_by`) can be
  the same user.

### 7.4 Requests vs employee rules

|                      | Requests                               | Structural rules                 |
| -------------------- | -------------------------------------- | -------------------------------- |
| Table                | `scheduling_employee_requests`         | `scheduling_employee_rules`      |
| Time scope           | Specific dates (`date_from`/`date_to`) | Permanent (while `is_active=1`)  |
| Example              | "day off on 28/3"                      | "never works Saturday or Sunday" |
| How often it changes | Monthly                                | Exceptionally                    |

### 7.5 Table `scheduling_employee_requests`

Created on 2026-04-25
(`backend/db-mysql/scripts/20260425_create_scheduling_employee_requests.sql`),
and included in `backend/db-mysql/aiven/19_scheduling.sql`. Reference DDL:

```sql
CREATE TABLE scheduling_employee_requests (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id CHAR(36) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  request_type ENUM('shift_preference','shift_exclusion','bonificable','baja_temporal','vacation') NOT NULL,
  requested_value VARCHAR(10) DEFAULT NULL COMMENT 'código turno (L, M, T, N, PI, P, etc.) cuando aplica',
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  notes VARCHAR(255) DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL COMMENT 'manager que anota la petición',
  approved_by CHAR(36) DEFAULT NULL COMMENT 'manager que aprueba (puede = created_by)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_employee_date (employee_id, date_from, date_to),
  KEY idx_status (status),
  CONSTRAINT fk_sched_req_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE
);
```

It also removes the need for `valid_from`/`valid_until` in
`scheduling_employee_rules` (see §5.3). Long time-limited rules (e.g. a 3-month
shift exclusion) are stored here as a `shift_exclusion` with a long range.

---

## 8. Observed operational coverage (spreadsheet, January–May 2026)

Real averages from the manual planning. A reference to check that the solver
produces sensible results.

### 8.1 Coverage by weekday (excluding holidays and `BT`/`IT`)

| Weekday   | M   | T   | N   | P   | PI  | Total working |
| --------- | --- | --- | --- | --- | --- | ------------- |
| Monday    | 2-3 | 1-2 | 1   | 2   | 0-1 | 6-9           |
| Tuesday   | 2-3 | 1-2 | 1   | 2   | 0-1 | 6-9           |
| Wednesday | 1-3 | 1-2 | 1   | 2   | 0-1 | 5-9           |
| Thursday  | 2-4 | 1-2 | 1   | 2   | 0-1 | 6-10          |
| Friday    | 2-3 | 1-2 | 1   | 2   | 0-1 | 6-9           |
| Saturday  | 1-3 | 1-2 | 1   | 0   | 0-1 | 3-7           |
| Sunday    | 1-3 | 1-2 | 1   | 0   | 0-1 | 3-7           |

### 8.2 Monthly days off per rotating employee

- Typical: 7–10 days off per month.
- Dominant: **consecutive pairs** (`L L`).
- Non-consecutive pairs happen, compensated by other pairs in the 7-day window.
- Blocks of 3–4 days off: around vacations or before nights.
- Single days off: only across month boundaries (`L_n` on the 31st + `L_n` on
  the 1st).

### 8.3 Consecutive N blocks

4 or 5 nights in a row. No exception in the corpus. Cross-month blocks are
valid.

---

## 9. Synchronisation invariants

1. **Two implementations kept in sync:** the validator
   (`schedule-validator.ts` + `constraints/*.ts`) and the solver
   (`backend/scheduling-solver/`) implement the same rules. A divergence is a
   bug.
2. **Shared corpus:** `backend/tests/scheduling-corpus/`. Each JSON fixture runs
   against the validator and against the solver.
3. **One parameter, one source:** numeric values live in `scheduling_config`.
   Hard-coded defaults exist only as an initial safety net, never as an
   override.
4. **Hard/soft classification is code, not data.** If it ever becomes
   configurable per hotel, a `scheduling_constraint_definitions` table with
   `enforcement ENUM('hard','soft')` would hold it.
5. **Cross-month as a cross-cutting invariant** (decided 2026-04-25). Every rule
   whose meaning depends on continuity between days is evaluated with the last
   5–7 days of the previous month, not only the days of the current month. It
   applies to:
   - **H2** night blocks (a block can start in N-1 and end in N);
   - **H3** rest after nights (the last N of N-1 limits day 1 of N);
   - **H4** maximum consecutive working days (the streak on day 1 is prefixed
     with the days worked at the end of N-1);
   - **H5** 2 consecutive days off in a 7-day window (windows crossing the month
     boundary use the context of N-1);
   - **rest between shifts** (`consecutive-rest.constraint`): rest on day 1 vs
     the last shift of N-1;
   - **rotation continuity / T→M**: only in the solver; the validator
     constraint was never registered and was removed on 2026-10-02.

   **Validator:** `PreviousMonthHistory` is wired and read by the four
   constraints (completed 2026-04-26).

   **Solver (completed 2026-04-30):** `previousMonthTail`, sent by
   `build-solver-input.ts`, becomes virtual days (-7…-1) in `model.py`. Every
   constraint iterates over `all_days = virtual_days + real_days`. Pairs of two
   virtual days add no constraints (so a manually edited previous month cannot
   make the new one INFEASIBLE).

   **Night block continuity rules (solver):**
   - `trailing_N = 0` → a new block can start freely.
   - `0 < trailing_N < minNightBlock` → incomplete block: no new block (the
     previous one must be completed). Exception: if the cells needed are locked
     (e.g. vacation), a new block is allowed.
   - `trailing_N >= minNightBlock` → completed block: a new block can start in
     the current month.
   - `trailing_N >= maxNightBlock` → day 1 forced to non-N (the block is already
     at its maximum).

---

## 10. Keeping this document alive

- New rule → add it to §2 (hard) or §3 (soft) + implement it in the validator +
  implement it in the solver + add a fixture to the corpus + record why in
  [`decisions.md`](decisions.md).
- Soft weight change → here and in the solver's cost. The validator does not
  change (it only reports a warning).
- Labour agreement change (e.g. `dias_vacaciones` from 30 to 32) → only in the
  `scheduling_employee_contracts` seed and here in §6.
- A rule that is removed → **do not delete the entry**; strike it through
  (`~~text~~`) with the date and the reason.

---

## 11. Implementation map

### 11.1 Solver: mandatory rules

Each rule lives in its own file in `backend/scheduling-solver/constraints/`:

- **Locked cells** (`locked_cells.py`): kept as they are. The solver only
  assigns `M`, `T`, `N` and `L`; every other code comes from a locked cell.
- **Coverage** (`coverage.py`): minimum and maximum staff per shift and day,
  except on holidays.
- **Rest** (`rest.py`): at least 2 rest days in any 7-day window, and a maximum
  of consecutive working days. Windows already broken by the previous month's
  tail are skipped, so they do not make the month impossible.
- **Days off** (`libres.py`): a monthly minimum and maximum of days off; special
  absences count towards rest.
- **Nights** (`night_block.py`): whoever works nights does one block of
  consecutive nights within the configured size, and at most one new block per
  month.
- **Transitions** (`transitions.py`): after a night, only another night or rest;
  no afternoon followed by a morning (only 8 hours of rest).
- **Blocks** (`day_blocks.py`): morning and afternoon shifts in blocks of at
  least 3 days.
- **Employee rules** (`employee_rules.py`): no weekends, fixed shift.

### 11.2 Solver: preferences (penalties)

Minimised together in `model.py`, each with a weight:

| Preference                                | Weight |
| ----------------------------------------- | ------ |
| Uneven nights between employees           | 10     |
| Short work block (per missing day)        | 3      |
| Isolated day off (no adjacent day off)    | 2      |
| Shift other than the employee's preferred | 1      |

### 11.3 Validator

`backend/services/scheduling/schedule-validator.ts`. It registers two rule
classes in its `ConstraintRegistry` (`CoverageConstraint` and
`EmployeeRulesConstraint`) and runs most other checks inline. There is one class
per rule in `backend/services/scheduling/constraints/` (`coverage`,
`night-block`, `consecutive-rest`, `max-consecutive-work`, `monthly-libre`,
`employee-rules`). `schedule-validator.ts` registers only `coverage` and
`employee-rules`; the other four are exercised by
`tests/scheduling/constraints.test.ts` only (checked 2026-10-02). Soft weights in
`soft-weights.ts`.
