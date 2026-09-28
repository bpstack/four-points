# Scheduling

Monthly staff rosters for the front desk: who works which shift on each day of
the month. Screens under `/dashboard/scheduling`. The automatic generator has
its own document: [`solver.md`](solver.md); the rules, their catalogue:
[`constraints.md`](constraints.md). Project overview in
[`../general/README.md`](../general/README.md).

## What problem it solves

Building a month's roster by hand means juggling coverage for every shift, rest
rules, night blocks, holidays, vacations and each person's contract, and a
single change can break several rules at once. The module gives a grid that
checks every rule as it is edited, and a mathematical solver (CP-SAT) that can
build a whole month from scratch respecting all the mandatory rules, so the
manager starts from a valid roster instead of a blank one.

## Who uses it

Almost everything is for **`admin`** only. The exceptions, open to every role
except `mantenimiento`, are viewing months and configuration, validating a
month, and creating, editing or deleting constraints (vacations, sick leave,
absences…). In the interface, only an `admin` approves constraints.

## What it can do

- **Monthly grid**: one row per employee and one column per day, with a shift
  code in each cell. Cells can be edited one by one or in bulk; the month is
  validated on the fly and warnings are shown next to the grid.
- **Month states**: `draft` (editable) and `published` (read-only). A published
  month can be taken back to draft.
- **Automatic generation**: fills every free cell of a draft month with the
  solver; if the rules cannot all be met, it explains which ones collide.
- **Reset**: clears a month and keeps only the cells that come from approved
  constraints.
- **Constraints**: vacations, sick leave, training and other absences, which
  once approved become **locked** cells that neither the grid nor the solver can
  overwrite.
- **Holidays** per day, and **PDF export** of the month.
- **Configuration** (`/dashboard/scheduling/config`), in seven tabs: employees
  in the roster (with their active period and order), general parameters,
  presence staff, requests, per-employee rules, shift statistics, and annual
  totals against each contract.

**Shift codes**: work shifts `M` (morning), `T` (afternoon), `N` (night), `P`
(presence) and `PI` (intervention staff); days off `L` (regular day off) and
`LI` (extra free day); and absences `V` (vacation), `B` (compensated holiday),
`FO` (training), `IT` (long sick leave), `E` (sickness) and `A` (unjustified
absence).

## What data it handles

Twelve tables (`backend/db-mysql/aiven/19_scheduling.sql` plus migrations in
`backend/db-mysql/scripts/`):

- **`scheduling_months`**, **`scheduling_days`** and
  **`scheduling_assignments`**: the months, their days (with holidays) and the
  shift of each employee on each day. An assignment with `source_constraint_id`
  is locked.
- **`scheduling_shifts`**: the shift catalogue above.
- **`scheduling_employees`**: who is part of the roster, with an optional start
  and end date and a display order.
- **`scheduling_employee_rules`**: per-employee rules — fixed shift, no
  weekends, fixed weekdays, preferred shift.
- **`scheduling_constraints`** and **`scheduling_employee_requests`**: absences
  and requests, with their approval status.
- **`scheduling_employee_contracts`**: each employee's yearly terms — working
  days, annual hours, vacation days, weekly days off, compensated days and sick
  leave.
- **`scheduling_config`**: global parameters (staff per shift, day-off ranges,
  night block sizes…).
- **`scheduling_history`**: changes to the grid.
- **`scheduling_solver_runs`**: every generation, with its full input and
  output, so a failed run can be replayed.

## What rules it follows

The full catalogue is in [`constraints.md`](constraints.md), and why each rule
is the way it is, in [`decisions.md`](decisions.md).

- **Mandatory rules** invalidate the month when broken (coverage, rest, night
  blocks, transitions between shifts, each employee's own rules).
- **Preferences** add a penalty instead of invalidating the month (for example,
  uneven nights between employees or isolated days off). A month can be valid
  and still have a high penalty.
- **Locked cells always win**: an approved constraint beats any rule or pattern,
  and generation never rewrites its cells. Cells that come from fixed weekdays
  or approved requests are respected by the solver as locked, but generation
  does not write them back to the grid, so they are left empty.
- **Months are linked**: the last 7 days of the previous month (draft or
  published) are taken into account, so rules like rest windows and night blocks
  hold across the change of month.
- **Grid validator and solver are two separate implementations** of the same
  rules (TypeScript and Python), kept aligned by a shared test corpus.

## How information flows

```
SchedulingClient (grid) · SchedulingConfigClient (tabs) ─► lib/scheduling ─► apiClient
                                                                  │
                                              /api/scheduling/* (Express)
                                                                  │
                authenticateToken ─► excludeMantenimiento ─► isAdmin (most routes)
                                                                  │
         scheduling-controller ─► schedule-validator (TypeScript rules) ─► repository ─► MySQL
         schedule-generate.controller ─► build-solver-input ─► solver-client ─► Python daemon
```

1. Opening a month loads its days, assignments, locked cells and rules; each
   edit is saved and the month is validated again.
2. Approving a constraint writes its locked cells into the grid.
3. Generating a month builds the solver input from the database, sends it to the
   Python process and, if a roster is found, replaces every unlocked cell of the
   month in one transaction. Every run is logged in `scheduling_solver_runs`.
4. Publishing freezes the month; the next month reads its last days as history.
