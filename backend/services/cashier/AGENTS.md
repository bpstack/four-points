# AGENTS.md — Cashier (backend)

> Backend doc for the cashier module. Covers the data model, shift/day
> lifecycle, role boundaries, and all endpoints. For the React UI see
> `frontend/app/components/cashier/CLAUDE.md`.

## What it does

Daily cash management for hotel reception. A **day** is divided into four fixed
shifts (night → morning → afternoon → closing). Each shift tracks: who worked
it, the denomination breakdown of physical cash counted, electronic payments by
method, and any vouchers (income/expense promissory notes). When all four shifts
are closed, the day can be closed. Reports aggregate data across days and
periods.

## DB tables

- **`payment_methods`**: Reference table for payment types (cash, card, BACS,
  web, transfer, other)
- **`cashier_shifts`**: One row per shift per day. Holds `shift_type`, `status`,
  `initial_fund`, `opened_by`, `closed_by`.
- **`cashier_shift_users`**: Many-to-many: which users worked each shift
  (primary + secondary).
- **`cashier_daily`**: One row per calendar day. Aggregates totals via a MySQL
  trigger on `cashier_shifts`.
- **`cashier_denominations`**: Bill/coin denomination breakdown per shift
  (counted physical cash).
- **`cashier_payments`**: Payment entries per shift grouped by method
  (electronic).
- **`cashier_vouchers`**: Vouchers (vales) — income or expense, lifecycle:
  `pending → justified / cancelled`.
- **`cashier_shift_vouchers`**: Many-to-many: which vouchers belong to which
  shift.
- **`cashier_history`**: Audit log of every mutation on a shift (created,
  updated, status_changed, voucher_created, etc.)

**Trigger:** `trg_cashier_shift_update_daily` on `cashier_shifts` — after a
shift UPDATE that changes `status`, `income` or `payments_total`, recomputes
the `cashier_daily` totals of that date. ⚠️ It is wrong: it sums `income` over
`cashier_shifts LEFT JOIN cashier_payments`, so each shift's cash counts once
per electronic payment and `total_cash` is inflated (2026-01-05 in Aiven:
4000,00 € stored, 2200,00 € real). `cashier-daily-repository.ts` and
`cashier-shift-repository.ts` also compute totals of their own. See
`docs/TODO.md`.

## Enums (models/cashier/index.ts)

```
ShiftType:   night | morning | afternoon | closing
ShiftStatus: open | in_progress | closed | audited
DailyStatus: open | closed
VoucherStatus: pending | justified | cancelled   (type, not enum)
HistoryAction: created | updated | deleted | status_changed | adjustment |
               voucher_created | voucher_repaid | daily_closed | daily_reopened
```

## Backend layout

```
backend/controllers/cashier/
├── cashier-daily-controller.ts       (369 lines — day init, close, reopen, summary, monthly)
├── cashier-shift-controller.ts       (267 lines — shift CRUD, close, reopen, users)
├── cashier-voucher-controller.ts     (272 lines — voucher CRUD, justify, cancel)
├── cashier-payment-controller.ts     (135 lines — payment CRUD + bulk replace)
├── cashier-denomination-controller.ts (123 lines — denomination CRUD + bulk replace)
├── cashier-report-controller.ts      (396 lines — dashboard, daily, period, voucher history, shifts summary)
└── cashier-history-controller.ts     (301 lines — history log, stats, by-shift, recent)

backend/repositories/cashier/
├── cashier-shift-repository.ts       (687 lines — heaviest; filtered list, close logic)
├── cashier-daily-repository.ts       (472 lines — getDetailsByDate, upsert, summary, monthly)
├── cashier-voucher-repository.ts     (448 lines)
├── cashier-history-repository.ts     (215 lines)
├── cashier-payment-repository.ts     (207 lines — includes replaceAll bulk)
├── cashier-denomination-repository.ts (150 lines — includes replaceAll bulk)
└── cashier-shift-user-repository.ts  (176 lines)

backend/routes/cashier/cashier-routes.ts   (412 lines)
backend/validations/cashier/cashier-validation.ts (202 lines — Zod)
backend/models/cashier/index.ts            (all types + enums)
```

**Note:** There is no `services/cashier/` layer — controllers call repositories
directly. This directory exists solely as a documentation anchor.

## Shift and day lifecycle

```
Day initialize → 4 shifts created (night, morning, afternoon, closing) each as ShiftStatus.OPEN
Each shift:  open → in_progress → closed   (→ audited, future)
Day close:   requires all 4 shifts to be closed (checked via dailyDetail.can_close)
Day reopen:  admin only — sets DailyStatus back to OPEN
```

`initializeDay` creates exactly 4 shifts in order (NIGHT, MORNING, AFTERNOON,
CLOSING) and logs each creation to `cashier_history`. Calling it a second time
returns `CASHIER_DAY_ALREADY_INITIALIZED` or `CASHIER_SHIFTS_ALREADY_EXIST`.

`closeDay` checks `dailyDetail.can_close` (a computed boolean from the
repository) before proceeding. If any shift is still open, the close is
rejected.

## Payments — bulk replace pattern

Payments and denominations both support a **bulk replace** endpoint
(`PUT /shifts/:shiftId/payments` and `PUT /shifts/:shiftId/denominations`). This
deletes all existing entries for the shift and inserts the new array atomically.
The frontend uses this when the cashier saves the denomination form or the
payment form — a single `PUT` with the full updated list, not a series of
patches.

## Role boundaries

- **Read daily, shifts, vouchers** — all authenticated (excl. `mantenimiento`)
- **Create/update/close shifts, payments, denominations, vouchers** — `admin`,
  `recepcionista`, `group-admin`, `demo-admin` (`canManageCashier`)
- **Reopen shifts or days, delete any resource** — `admin` only (`isAdmin`)
- **Reports, history, stats** — `admin`, `demo-admin` (`canViewReports`)

`mantenimiento` role is excluded at the router level (`excludeMantenimiento`).

## Endpoints summary

- **GET** `/api/cashier/daily/:date` — all · Full day with 4 shifts
- **POST** `/api/cashier/daily/:date/initialize` — canManageCashier · Create the
  4 shifts
- **PATCH** `/api/cashier/daily/:date/close` — canManageCashier · Close the day
- **PATCH** `/api/cashier/daily/:date/reopen` — isAdmin · Reopen closed day
- **GET** `/api/cashier/daily/:date/summary` — all · Day summary
- **GET** `/api/cashier/daily` — all · Paginated list of days
- **GET** `/api/cashier/reports/monthly/:year/:month` — canViewReports · Monthly
  aggregate
- **GET** `/api/cashier/shifts` — all · Filtered list
- **GET** `/api/cashier/shifts/:id` — all · Shift detail + denominations +
  payments + vouchers
- **PATCH** `/api/cashier/shifts/:id` — canManageCashier · Update shift
- **PATCH** `/api/cashier/shifts/:id/close` — canManageCashier · Close shift
- **PATCH** `/api/cashier/shifts/:id/reopen` — isAdmin · Reopen shift
- **PUT** `/api/cashier/shifts/:id/users` — isAdmin · Replace shift users
- **DELETE** `/api/cashier/shifts/:id` — isAdmin · Delete (only if open)
- **GET** `/api/cashier/shifts/:id/history` — all · Shift audit log
- **GET/POST** `/api/cashier/shifts/:shiftId/payments` — all / canManageCashier
  · List / create payment
- **PUT** `/api/cashier/shifts/:shiftId/payments` — canManageCashier · Bulk
  replace payments
- **GET/POST** `/api/cashier/shifts/:shiftId/denominations` — all /
  canManageCashier · List / create denomination
- **PUT** `/api/cashier/shifts/:shiftId/denominations` — canManageCashier · Bulk
  replace denominations
- **GET/POST** `/api/cashier/vouchers` — all / canManageCashier · List /
  (implicit via shift)
- **POST** `/api/cashier/shifts/:shiftId/vouchers` — canManageCashier · Create
  voucher on shift
- **PATCH** `/api/cashier/vouchers/:id` — canManageCashier · Update voucher
- **PATCH** `/api/cashier/vouchers/:id/justify` — canManageCashier · Mark as
  justified
- **PATCH** `/api/cashier/vouchers/:id/cancel` — isAdmin · Cancel voucher
- **DELETE** `/api/cashier/vouchers/:id` — isAdmin · Delete (only if pending)
- **GET** `/api/cashier/reports/dashboard` — canViewReports · Today's dashboard
  overview
- **GET** `/api/cashier/reports/daily/:date` — canViewReports · Full day report
- **GET** `/api/cashier/reports/period` — canViewReports · Period breakdown
- **GET** `/api/cashier/reports/vouchers-history` — canViewReports · All
  vouchers history
- **GET** `/api/cashier/reports/shifts-summary` — canViewReports · Shifts
  grouped by type
- **GET** `/api/cashier/history` — canViewReports · Full history with filters
- **GET** `/api/cashier/history/stats` — canViewReports · History stats
- **GET** `/api/cashier/history/shift/:shiftId` — canViewReports · History for
  one shift
- **GET** `/api/cashier/history/recent` — canViewReports · Recent activity

## Known gotchas

1. **Daily totals are not reliable yet.** The trigger
   `trg_cashier_shift_update_daily` inflates `total_cash` (see above) and two
   repository functions compute totals too. Until that is fixed, check all
   three when a daily total looks wrong.
2. **`can_close` is a computed field.** `getDetailsByDate` in the daily
   repository computes whether all 4 shifts are closed and injects
   `can_close: boolean` into the response. The controller trusts this field — it
   does not re-query.
3. **Voucher lifecycle:** A voucher created in a shift starts as `pending`. It
   can be `justified` (money recovered / documented) or `cancelled` (annulled).
   Once cancelled, it cannot be unjustified. Only `admin` can cancel or delete
   vouchers.
4. **Payments `replaceAll` deletes first.** The bulk replace does a `DELETE`
   then `INSERT`. If the frontend sends an empty array, all payments for the
   shift are wiped. This is intentional (the cashier cleared the form).
5. **History is not per-day, it's per-shift.** Every history entry has a
   `shift_id`. To get the full audit of a day, query history for each of the
   day's 4 shift IDs.

## Cross references

- `backend/models/cashier/index.ts` — all TypeScript types and enums.
- `backend/middlewares/roleCheck.ts:106` — `canManageCashier` definition.
- `backend/middlewares/roleCheck.ts:128` — `canViewReports` definition.
- `backend/db-mysql/aiven/11_cashier.sql` — frozen schema baseline.
- `frontend/app/components/cashier/CLAUDE.md` — UI, PDF export, React Query.
