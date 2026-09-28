# AGENTS.md — Scheduling (frontend)

> UI for the scheduling module. Business logic (validator, constraints, solver)
> lives in the backend — read `backend/services/scheduling/CLAUDE.md` when the
> task crosses the boundary, and `backend/scheduling-solver/CLAUDE.md` when it
> touches the Python solver.

## Layout

```
frontend/app/dashboard/scheduling/
   ├── layout.tsx              (auth gate: admin / group-admin only; redirects to /dashboard)
   ├── page.tsx                (entry point — wraps SchedulingClient in Suspense with skeleton)
   └── config/
       └── page.tsx            (entry point for SchedulingConfigClient)

frontend/app/components/scheduling/
   ├── SchedulingClient.tsx    (877 lines — grid orchestrator + month-level actions)
   ├── ScheduleGrid.tsx        (535 lines — interactive monthly table; cell locking visual; sticky columns)
   ├── ShiftSelector.tsx       (shift-picker popover after a cell click; bulk mode for range selection)
   ├── ValidationWarnings.tsx  (real-time errors/warnings/info banner; grouped by severity)
   ├── MonthSelector.tsx       (month navigation)
   ├── MonthInfoPanel.tsx      (side panel: approved constraints + employee rules for the month)
   ├── ScheduleStats.tsx       (month stats: coverage, libres, nights, etc.)
   ├── ShiftLegend.tsx         (inline legend of shift codes)
   ├── EmployeeTotals.tsx      (681 lines — annual totals per employee; used in Totals tab)
   ├── ManageHolidaysModal.tsx (yearly holiday management modal)
   ├── SchedulingConfigClient.tsx  (134 lines — tab container for the /config panel)
   └── config/
       ├── EmployeesTab.tsx     (scheduling employee list + active dates)
       ├── TotalsTab.tsx        (wrapper around EmployeeTotals with annual view)
       ├── GeneralConfigTab.tsx (687 lines — sliders/inputs for scheduling_config)
       ├── RulesTab.tsx         (608 lines — per-employee rules: fixedShift, fixedDays, noWeekends, shiftPriority)
       ├── RequestsTab.tsx      (704 lines — request management: pending → approved/rejected)
       ├── ShiftStatsTab.tsx    (per-shift stats across the year)
       ├── PresenciasTab.tsx    (dedicated editor for employees with fixedShift='P' and fixedDays)
       └── utils/

frontend/app/lib/scheduling/
   ├── queries.ts              (645 lines — schedulingApi: every call; schedulingKeys: React Query keys factory)
   ├── types.ts                (553 lines — all frontend DTOs; same shape as backend)
   ├── server.ts               (Server Component utilities — direct fetch to backend)
   ├── shift-styles.ts         (Tailwind classes per shift code; light + dark mode)
   ├── export-pdf.ts           (271 lines — month PDF export via jsPDF + autotable)
   └── index.ts                (barrel exports)
```

## Auth gate

`app/dashboard/scheduling/layout.tsx` is a **client component** wrapping the
entire `/dashboard/scheduling` subroute. Calls `useAuth()`, validates
`isAdminRole(user.role)`, redirects to `/dashboard` otherwise. Renders a spinner
while `loading=true`. **Recepcionistas and mantenimiento don't enter this
module.**

`useAuth()` comes from the global `AuthContext` (mounted in `DashboardLayout`).
No re-fetch; it reads from context.

## Main component — `SchedulingClient.tsx`

877 lines, marked `'use client'`. Orchestrates the monthly grid.

**Responsibilities:**

- Reads `?month=<id>` from the query string (URL is the source of truth for the
  active month).
- React Query: `schedulingApi.getMonthFull(monthId)`, `getAllShifts`,
  `validateSchedule(monthId)`, `getHistory`, `getMonthInfo`, etc.
- Manages local selection state (single cell + bulk selection via
  `BulkSelection`).
- Mutations: update assignment, bulk update, generate (solver), reset,
  publish/unpublish, delete month, manage holidays.
- Handles modals: `ManageHolidaysModal`, `ConfirmDialog` for destructive
  actions.
- Triggers PDF download (`downloadSchedulePdf` from `lib/scheduling`).
- Toast notifications via `react-hot-toast` for mutations.

**Editing flow:**

1. Click on a cell → `onCellClick` sets `selectedCell` or `bulkSelection`.
2. `ShiftSelector` (popover) appears with available shifts.
3. User picks a shift → mutation to `updateAssignment` or
   `bulkUpdateAssignments`.
4. Backend responds 409 if the cell is locked → error toast.
5. On success, invalidates `schedulingKeys.month(id)` → grid refreshes.
6. Validation runs in parallel: `schedulingKeys.monthValidation(id)` is
   invalidated at the same time and the banner updates.

**Solver generation:**

- "Generate schedule" button → calls `POST /months/:id/generate`.
- While generating, shows loading state. Effective timeout is set by the backend
  (60 s from Node, 30 s from Python).
- If the response is `infeasible`, surfaces the `conflictingConstraints` and
  `suggestedRelaxations` in the warnings banner (structured).
- If `ok`, invalidates the month → grid fills in.

## Grid — `ScheduleGrid.tsx`

Monthly table of employees × days. Critical patterns:

- **Locked cells:** assignments with `source_constraint_id != null` show a
  `<FiLock />` icon and aren't clickable; error toast if you try.
- **Sticky columns:** employee + total libres are `position: sticky; left: 0`.
  Lets you scroll horizontally without losing context.
- **Horizontal overflow:** wrapper with `overflow-x-auto` + table with
  `min-w-[Xpx]` proportional to the day count. **Pattern borrowed from the
  parking module** — when you add a new wide table to the project, replicate
  this.
- **Shift colors:** come from `lib/scheduling/shift-styles.ts` — getter
  `getShiftClasses(code)`. **Supports light + dark mode with Tailwind**
  (`dark:bg-{color}-900/30 dark:border-{color}-700 dark:text-{color}-400`).
- **Bulk selection:** click + shift selects a range per employee.
  `BulkSelection` carries the affected `cells` + `position` for the popover so
  `ShiftSelector` appears where the click landed.
- **Holiday tooltips:** days marked `isHoliday` show a tooltip with the holiday
  name.

## Config panel — `SchedulingConfigClient.tsx`

Container for 7 tabs, navigated via `?tab=<tabName>` in the query string. Each
tab is an independent client component that loads its own data:

- **`employees`** (`EmployeesTab.tsx`): Schedulable employee list + add/remove
  checkbox + start_date/end_date
- **`totals`** (`TotalsTab.tsx` (wraps `EmployeeTotals.tsx`)): Annual view of
  totals (M/T/N/L/V/B/etc.) per employee
- **`general`** (`GeneralConfigTab.tsx`): Editor for `scheduling_config`:
  min/max staff, rest hours, libre ranges, night block, etc.
- **`rules`** (`RulesTab.tsx`): Per-employee rules: fixedShift, fixedDays,
  noWeekends, shiftPriority
- **`requests`** (`RequestsTab.tsx`): Request management
  (vacations/IT/bonificables): approve / reject / edit
- **`shift-stats`** (`ShiftStatsTab.tsx`): Per-shift stats across the year
- **`presencias`** (`PresenciasTab.tsx`): Editor specifically for employees with
  `fixedShift='P'` and `fixedDays`

`'react-day-picker/style.css'` is imported in `SchedulingConfigClient.tsx`
(shared by several tabs that use DayPicker for dates).

## React Query — `lib/scheduling/queries.ts`

**`schedulingKeys` factory**: standard React Query convention with hierarchical
keys. Key pattern:

```ts
schedulingKeys.month(id) // ['scheduling', 'months', id]
schedulingKeys.monthInfo(id) // ['scheduling', 'months', id, 'info']
schedulingKeys.monthValidation(id) // ['scheduling', 'months', id, 'validation']
```

Invalidating `schedulingKeys.month(id)` cascades **to every descendant** (info,
validation). Lean on it: an assignment mutation just needs to invalidate the
parent.

**`schedulingApi`**: object with one method per resource. Uses `apiClient`
(fetch wrapper with auth/credentials). Every call returns the matching TS type
from `types.ts`.

There's a specific `downloadSchedulePdf(monthId)` wrapper that delegates to
`lib/scheduling/export-pdf.ts` to build the PDF in the browser (no backend PDF
endpoint).

## Server fetching — `lib/scheduling/server.ts`

Helpers for Server Components or Server Actions that need scheduling data. Uses
`serverFetch` (not `apiClient`) so request cookies are forwarded correctly.
**Don't use from client components.**

In practice, the module is almost entirely client-side (Suspense + React Query)
— `server.ts` is for the odd SSR or server-side export case.

## PDF export — `lib/scheduling/export-pdf.ts`

271 lines. Builds the month's schedule PDF using `jspdf` + `jspdf-autotable`.
Runs **in the browser** (no backend endpoint). Takes `SchedulingMonthFull` +
`shifts` and produces the blob for download.

If you change shift codes or colors, **also update this file** — it duplicates
the color maps locally so runtime doesn't depend on the DOM.

## Module conventions and patterns

### Date formatting → `formatLocalDate(d: Date)`

`SchedulingConfigClient.tsx` defines a module-level helper
`formatLocalDate(d: Date)` that uses `getFullYear/getMonth/getDate` directly (no
`toLocaleDateString` with ISO string parsing, **timezone-safe**). Use it instead
of `new Date(isoString).toLocaleDateString()` to avoid the classic UTC-vs-local
bug.

### DayPicker dark mode

react-day-picker v9 uses CSS variables (`--rdp-*`). The dark mode overrides live
in **`frontend/app/ui/global.css`** under `.dark .rdp-root` — don't put them in
components. If you add a new DayPicker, just import
`'react-day-picker/style.css'` and you inherit light + dark from one place.

### Mobile responsive

- Wide tables → `overflow-x-auto` on the wrapper + `min-w-[Xpx]` on the
  `<table>`.
- Page headers → `flex-wrap` so the menu collapses on mobile.
- Modals → `overflow-y-auto max-h-[90vh]` on the modal's inner container.

The **parking** module is the project's internal reference for responsive
design. When in doubt, copy that pattern.

### Server vs client components

The whole scheduling dashboard is **client**: `SchedulingClient`,
`SchedulingConfigClient` and every tab carry `'use client'`. Reason: nearly
every flow is interactive (selection, mutations, modals). The page (`page.tsx`)
is a Server Component and just wraps the rest in Suspense.

Don't mix patterns: no `useState` or React Query in `page.tsx`, no async
function components inside the clients.

### i18n

`useTranslations()` from `next-intl`. Main namespaces:

- `scheduling` — the main grid page.
- `scheduling.config` — the config panel and its tabs.

Dictionaries in `frontend/i18n/` (es + en). When you add a new key, **add it to
both languages** in the same commit.

### Shift codes

Defined exhaustively in `app/lib/scheduling/shift-styles.ts` (Tailwind color
mapping). The semantics of each code (M, T, N, P, PI, L, V, B, E, IT, FO, A, LI)
is documented in `backend/services/scheduling/CLAUDE.md` § Shift types — that's
the source of truth. If you add a new code:

1. Backend: add it to `scheduling_shifts` (DB) and to the validator / solver as
   appropriate.
2. Frontend: add the style to `shift-styles.ts` and the code to the PDF export
   if it might appear in printed output.

## UI-visible known bugs / debt

- **`setSchedulableEmployees` wipes `start_date`/`end_date`** (TODO.md): saving
  the list from `EmployeesTab` loses previously-set dates. The fix is on the
  backend but the bug is felt in the Employees tab. If you touch it, note the
  bug is still open.
- **DayPicker inside RequestsTab → iOS modal scroll**: known edge case on Safari
  mobile — the modal overflow fights the DayPicker gestures. Workaround:
  `touch-action: pan-y` on the modal body.

## Cross references

- `backend/services/scheduling/CLAUDE.md` — TS backend: validator, constraints,
  endpoints, shift type semantics, configuration tables, historical importer.
- `backend/scheduling-solver/CLAUDE.md` — Python solver: daemon, CP-SAT, hard
  constraints, soft objective.
- `frontend/app/lib/scheduling/types.ts` — DTOs shared with the backend; keep
  manually in sync when they change.
- `frontend/app/components/dashboard/parking/` — internal reference for the
  project's responsive patterns.
