# AGENTS.md — Parking (frontend)

**Up:** [`frontend/AGENTS.md`](../../../AGENTS.md) — `frontend/` rules ·
[root `AGENTS.md`](../../../../AGENTS.md) — shared rules and module map.

> UI for the parking module. Backend documented at
> `backend/services/parking/AGENTS.md`. **This module is the project's internal
> reference for responsive patterns** — when in doubt about how to do a wide
> table or a mobile-friendly dashboard in another module, look here first.

## Layout

```
frontend/app/dashboard/parking/
   ├── layout.tsx                  (8 lines — wrapper)
   ├── page.tsx                    (58 lines — Server Component: SSR pre-fetch of today's dashboard)
   ├── loading.tsx                 (skeleton)
   ├── error.tsx                   (error boundary)
   ├── actions/
   │   └── getParkingDashboardStats.ts  (~100 lines — server action for SSR)
   ├── components/
   │   └── ParkingDashboardClient.tsx   (client that receives the pre-fetched stats)
   ├── bookings/
   │   ├── page.tsx                (booking list — SSR of ?page= (default 1), 50 per page)
   │   ├── new/page.tsx            (new booking form)
   │   └── [code]/page.tsx         (booking detail by booking_code)
   └── status/
       ├── layout.tsx
       ├── page.tsx
       ├── components/
       │   ├── ParkingStatusClient.tsx  (real-time orchestrator)
       │   ├── ParkingTable.tsx         (spot table per level)
       │   ├── ParkingNavigator.tsx     (level selector -2 / -3)
       │   ├── StatusPanels.tsx         (side KPI panels)
       │   └── modals/                  (5 modals: CheckIn, CheckOut, Cancel, Overdue, BaseModal)
       ├── hooks/
       │   └── useParkingStatus.ts      (React Query hook with local keys; no polling)
       └── utils/
           └── statusBadges.tsx

frontend/app/components/parking/
   ├── BookingsListClient.tsx      (1336 lines — the booking list with filters, quick
   │                                filters, pagination and search; the largest
   │                                component in the module)
   ├── BookingsListClient.tsx      → wrapped by bookings/page.tsx
   ├── ActionDropdown.tsx          (per-row booking actions)
   ├── StatusBadge.tsx             (badge for BookingStatus)
   ├── VehicleSearchModal.tsx      (autocomplete search modal)
   ├── helpers/
   │   ├── constants.ts            (enums duplicated from backend — sync rule)
   │   ├── date-formatters.ts
   │   └── index.ts
   └── bookings/
       ├── BookingDetailClient.tsx (688 lines — the detail page)
       ├── BookingHeader.tsx
       ├── EditBookingModal.tsx    (564 lines)
       ├── CheckInModal.tsx
       ├── CheckOutModal.tsx
       ├── PaymentModal.tsx
       └── InfoCard.tsx

frontend/app/lib/parking/
   ├── queries.ts                  (~320 lines — parkingApi: apiClient calls, no React Query hooks here)
   ├── types.ts                    (~360 lines — every DTO)
   ├── actions.ts                  (71 lines — additional server actions)
   └── index.ts
```

## Routes (URL → component)

- **`/dashboard/parking`**: `page.tsx` (Server, SSR stats) →
  `ParkingDashboardClient.tsx`
- **`/dashboard/parking/bookings`**: `bookings/page.tsx` (Server, SSR list) →
  `BookingsListClient.tsx`
- **`/dashboard/parking/bookings/new`**: `bookings/new/page.tsx` (create form)
- **`/dashboard/parking/bookings/:code`**: `bookings/[code]/page.tsx` →
  `BookingDetailClient.tsx`
- **`/dashboard/parking/status`**: `status/page.tsx` → `ParkingStatusClient.tsx`
  (real-time view)

**Note:** `/dashboard/parking` (root) is the **KPI/stats dashboard**. `/status`
is the **real-time occupancy view** (spot map per level). They're distinct,
complementary views.

## Three main views

### 1. Dashboard (`/dashboard/parking`)

Module entry screen. Server Component that pre-fetches the day's stats with
`getParkingDashboardStats()` and injects them as a prop to the client. Renders:

- Day KPIs (occupancy, revenue, arrivals, departures).
- Pending check-in and check-out lists.

There are no trend charts: the analytics API they would use was removed on
2026-10-02.

SSR pre-fetch is **intentional**: the first paint with no spinner is what sets
this module apart. If you add more pre-fetchable views, follow the `actions/` +
Server Component pattern.

### 2. Bookings list (`/dashboard/parking/bookings`)

`BookingsListClient.tsx` (1336 lines — the largest in the module). Features:

- **Combinable filters:** text search, status, date range, and quick filters.
  The backend supports more filters than the UI shows (spot_id, vehicle_id,
  plate_number, owner_name, booking_source).
- **Composite quick filters:** `arrivals_pending`, `arrivals_inside`,
  `arrivals_total`, `departures_pending`, `departures_completed`,
  `departures_total`. Map to pre-armed combinations of `status` + `date` for the
  user.
- **Pagination:** server-side; `page` + `limit` (50), and the response's
  `pagination: { page, limit, total, totalPages }`.
- **No React Query here:** the list keeps its data in `useState` and calls
  `parkingApi.getAllBookings()` directly.
- **`ActionDropdown`** per row with contextual actions based on the booking's
  current status.
- **New booking** via the `+ Nueva reserva` button → navigates to
  `/bookings/new`.
- **No export feature.**

### 3. Real-time status (`/dashboard/parking/status`)

**Occupancy status** view per level. Different philosophy: it's not a booking
table, it's a **spot map**.

- `ParkingNavigator` to swap between level `-2` and `-3`.
- `ParkingTable` renders each spot with its status (free / occupied / reserved /
  overdue).
- `StatusPanels` on the side with current-moment KPIs.
- `useParkingStatus` (hook — no polling/refetch interval; data refreshes on
  action).
- 5 modals: CheckIn, CheckOut, Cancel, Overdue, BaseModal.

## ⚠️ Responsive pattern — project reference

This module is the project's **internal reference** for responsive. If you need
an equivalent pattern in another module, copy it from here.

### Wide tables with horizontal scroll

```tsx
<div className="overflow-x-auto">
  <table className="min-w-[1200px] w-full">{/* ... */}</table>
</div>
```

`overflow-x-auto` on the wrapper, `min-w-[Xpx]` on the table. Width proportional
to the column count. On desktop fills the container; on mobile scrolls without
collapsing columns.

### Headers with `flex-wrap`

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <h1>...</h1>
  <div className="flex flex-wrap gap-2">{/* buttons / filters */}</div>
</div>
```

On mobile, buttons wrap to the next line without breaking the layout. Tested
with 1-6 elements in the header.

### Mobile-friendly modals

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="w-full max-w-2xl overflow-y-auto max-h-[90vh] bg-surface rounded-xl">
    {/* content */}
  </div>
</div>
```

`overflow-y-auto max-h-[90vh]` on the inner container guarantees scroll when
content is long and the viewport is short.

### Responsive grids

```tsx
<div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{/* ... */}</div>
```

1 column on mobile/tablet, 2 on XL desktop. If you need 3 panels,
`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`. **Don't use `lg:`** unless
necessary — the module is tuned specifically for the `md` and `xl` breakpoints.

## React Query — `lib/parking/queries.ts`

`parkingApi` is a flat object with one method per endpoint
(`parkingApi.getAllSpots()`, `parkingApi.getAllBookings(...)`, etc.). **No
pre-built hooks** — React Query is used in `useParkingStatus` and
`ParkingDashboardClient`; the bookings list and detail call `parkingApi`
directly.

Typical client pattern:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['parking', 'bookings', date],
  queryFn: () => parkingApi.getAllBookings({ date }),
})
```

**There's no shared `parkingKeys` factory** (unlike scheduling).
`useParkingStatus` defines its own (`statsKey`, `bookingsKey`, `overdueKey`).
This is style, not a bug — it works because the module doesn't have a complex
invalidation hierarchy. If complexity grows, consider extracting a factory
equivalent to `schedulingKeys`.

## Duplicated enums — sync rule

`frontend/app/components/parking/helpers/constants.ts` holds the frontend copy
of two backend enums:

- `BookingStatus` (5 values), with its label and badge tone (`STATUS_CONFIG`)
- Payment method (4 values, `PAYMENT_METHODS`), with its label

Booking source, spot type and level are not copied there.

**If the backend adds a value, update both sides in the same commit.** If you
leave the frontend out of sync, bookings with the new value will render with no
badge or empty label. No visible error — just silently broken UI.

## Auth

The whole `/dashboard/parking/*` subroute requires authentication + a role other
than mantenimiento. The UI does not hide it from mantenimiento (the nav link
shows for every role); the backend answers 403. No admin-only restriction —
recepcionistas use the module daily.

## Known gotchas

1. **`BookingsListClient.tsx` is 1336 lines.** Approaching split territory. If
   you're about to add non-trivial features (new filters, sorting, exports),
   consider extracting subcomponents before adding more LOC. Not urgent but on
   the radar.
2. **`EditBookingModal.tsx` is 564 lines.** Same warning, smaller scale.
3. **`booking_code` vs `id` in URLs:** public URLs use `code`, never `id`. Keep
   that invariant when adding new parametric routes.
4. **Status view ≠ dashboard.** Don't merge the two UIs: dashboard is
   aggregations, status is real-time occupancy with a spot map. If someone asks
   for "the parking status view", ask which one they mean.
5. **Status view has no polling.** `useParkingStatus` has no `refetchInterval`.
   Data refreshes when the user performs an action. If you ever add WebSocket /
   SSE for push-based invalidation, **respect the React Query invalidation
   pattern** — don't introduce parallel local state.
6. **No invoicing.** There is no parking invoice on either side: the backend
   placeholder was removed on 2026-10-02. Building it means a backend endpoint
   and the invoice list/download UI.

## Cross references

- `backend/services/parking/AGENTS.md` — full backend for the module.
- `frontend/app/components/parking/helpers/constants.ts` — frontend copy of the
  enums.
- `frontend/app/components/parking/` — module's shared components (list, badges,
  dropdowns, booking modals).
