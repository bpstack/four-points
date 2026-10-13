# AGENTS.md — Cashier (frontend)

**Up:** [`frontend/AGENTS.md`](../../../AGENTS.md) — `frontend/` rules ·
[root `AGENTS.md`](../../../../AGENTS.md) — shared rules and module map.

> Frontend doc for the cashier module. Covers the route structure, Zustand
> store, React Query hooks, component roles, and the PDF export. For the data
> model, enums, endpoints, and role rules see
> `backend/services/cashier/AGENTS.md`.

## Route structure

```
app/dashboard/cashier/
├── page.tsx                # Cashier dashboard — overview cards (useDashboardOverview)
├── error.tsx               # Error boundary
├── hotel/
│   ├── layout.tsx          # Hotel view layout (date nav + day sidebar, Zustand)
│   └── page.tsx            # Main cashier view — day + 4 shifts
├── logs/
│   └── page.tsx            # History / audit log view
└── reports/
    └── page.tsx            # Monthly reports + voucher history (admin only)
```

## State — Zustand (`useCashierStore`)

All cashier UI state lives in `frontend/app/stores/useCashierStore.ts`. The
store is the single source of navigation truth for the cashier views.

Key slices:

- **`useSelectedDate()`** (`string` (YYYY-MM-DD)): Active date in the hotel view
- **`useActiveTab()`** (`ShiftType`): Which shift tab is open
  (night/morning/afternoon/closing)
- **`useActiveModal()`** (`ModalType | null`): Which modal is open
  (initializeDay, closeDay, reopenDay, closeShift)
- **`useLogsFilters()`**: Filters of the logs view (action, user, limit, offset)
- **`useReportsDate()`**: Active month in the reports view
- **`useReportsTab()`** (`summary | payments | vouchers`): Active tab in the
  reports view
- **`useChartViewMode()`** (`pie | bar`): Payment chart display mode

Exported selectors are fine-grained (`useSelectedDate`, `useActiveTab`, etc.) to
avoid unnecessary re-renders — always use the selector, not
`useCashierStore(s => s)`.

## Component map

```
dashboard/cashier/hotel/page.tsx        ← orchestrator (Zustand + React Query)
├── CashierCalendarNav                  ← date picker bar (← / → + calendar)
├── DaySummarySidebar (layout/)         ← right sidebar: day totals, status, close button
├── UninitializedDayState               ← shown when no shifts exist for the date
│   └── triggers InitializeDayModal
├── ShiftTabs                           ← tab switcher (night/morning/afternoon/closing)
└── ShiftCard                           ← per-shift detail card (479 lines)
    ├── DenominationForm                ← denomination breakdown (bill/coin grid)
    ├── PaymentForm                     ← payment by method
    ├── VoucherList                     ← vouchers attached to this shift
    ├── CreateVoucherModal              ← create income/expense voucher
    ├── CloseShiftModal                 ← confirm + notes before closing shift
    └── ShiftUsersManager               ← add/remove secondary users (admin)

Modals at page level (controlled by Zustand activeModal):
├── InitializeDayModal                  ← create 4 shifts, pick users
├── CloseDayModal                       ← confirm day close (348 lines)
└── ReopenDayModal                      ← admin reopen

dashboard/cashier/logs/page.tsx
├── LogsSummarySidebar (layout/)        ← date range + quick stats
├── HistoryFilters                      ← filter by user, shift type, action
└── HistoryTable                        ← paginated audit log (277 lines)

dashboard/cashier/reports/page.tsx
├── ReportsSummarySidebar (layout/)     ← month picker + totals
├── MonthlyReport                       ← monthly breakdown by day (301 lines)
├── PaymentChart                        ← pie/bar chart of payments by method (278 lines)
└── VouchersHistory                     ← full voucher history table (271 lines)
```

## React Query — lib/cashier/queries.ts

All data fetching and mutations go through named hooks in
`frontend/app/lib/cashier/queries.ts`. Key ones:

- **`useDailyDetails(date)`**: Full day with 4 shifts — main data source for
  hotel/page.tsx
- **`useShiftDetails(id)`**: Single shift with denominations + payments +
  vouchers
- **`useUpdateShift()`**: Mutation for updating shift fields
- **`useCloseShift()`**: Mutation for closing a shift
- **`useReopenShift()`**: Mutation for reopening (admin)
- **`useInitializeDay()`**: Mutation that creates the 4 shifts
- **`useCloseDay()` / `useReopenDay()`**: Day-level close/reopen
- **`useUpdateDenominations()`**: Bulk replace denomination list (PUT)
- **`useUpdatePayments()`**: Bulk replace payment list (PUT)
- **`useUpdateShiftUsers()`**: Replace a shift's users (admin)
- **`useCreateVoucher()`**: Create voucher on a shift
- **`useJustifyVoucher()`**: Mark voucher as justified
- **`useDashboardOverview()`**: Cashier dashboard data (`/dashboard/cashier`)
- **`useMonthlyReport(year, month)`**: Monthly aggregate
- **`useVouchersHistory()`**, **`useHistoryLogs()`**, **`useHistoryStats()`**:
  Reports and logs views
- **`useUsers()`**: User list for the shift pickers

Cache keys follow the pattern in `cashierKeys`: `['cashier', 'daily', date]`,
`['cashier', 'shift', id]`, `['cashier', 'vouchers']`… (`users` is
`['users', 'all']`). Mutations invalidate the relevant keys after success.

## PDF export — `lib/cashier/exportDailyPdf.ts`

Client-side PDF generation using `pdf-lib` (no server involved). Called only
from `DaySummarySidebar`.

The function `exportDailyToPdf(daily, selectedDate, labels, shiftType?)` takes:

- `daily` — the `CashierDaily` object, with its `shifts`
- `selectedDate` — `YYYY-MM-DD`, also used in the file name
- `labels` — i18n strings injected from the caller (keeps the exporter
  i18n-agnostic)
- `shiftType` — the shift to export; the sidebar passes the active tab

Generates a page for that shift plus a day-summary page, then downloads it
itself (`cashier-<date>-<shift>.pdf`); it returns nothing.

**Important:** the labels object is large (`ExportLabels`, declared in
`exportDailyPdf.ts`). When calling it, pass the full labels object — missing
keys produce `undefined` text in the PDF silently.

## i18n

Namespace: `cashier`. Used throughout with `useTranslations('cashier')`.
Dictionary at `frontend/messages/<locale>/cashier.json`.

## Known gotchas

1. **`ShiftCard` is 479 lines.** It owns denomination editing, payment editing,
   voucher listing, shift close, and shift reopen all in one component. If
   adding non-trivial behaviour here, consider extracting a subcomponent first.
2. **`CloseDayModal` is 348 lines** — a full day summary render before closing.
   The PDF labels are built inline in `DaySummarySidebar` with
   `useTranslations`.
3. **Zustand modal control vs local state.** Day-level modals (initializeDay,
   closeDay, reopenDay) are controlled via the store's `activeModal`.
   Shift-level modals (`showCloseShiftModal`, `showCreateVoucherModal`) use
   local `useState` inside `ShiftCard`. Don't move shift-modal state to the
   store — it would couple every shift to global re-renders.
4. **Date format.** The store and all API calls use `YYYY-MM-DD`.
   `CashierCalendarNav` formats dates before setting `selectedDate` via
   `setSelectedDate`. Do not pass `Date` objects to the store — convert first.
5. **Reports, logs and the dashboard are admin-gated on the backend.**
   `/reports`, `/logs` and the `/dashboard/cashier` overview read endpoints
   behind `canViewReports` (`admin`). The frontend doesn't gate those routes —
   the sidenav shows all four links and the API answers 403. Add a frontend
   guard if needed.

## Cross references

- `backend/services/cashier/AGENTS.md` — data model, enums, endpoints, role
  middleware.
- `frontend/app/stores/useCashierStore.ts` — full Zustand store.
- `frontend/app/lib/cashier/queries.ts` — all React Query hooks.
- `frontend/app/lib/cashier/exportDailyPdf.ts` — PDF export (690 lines, the
  largest lib file).
- `frontend/app/lib/cashier/types.ts` — TypeScript types mirroring backend
  models.
