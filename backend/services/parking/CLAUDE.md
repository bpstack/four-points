# CLAUDE.md — Parking (backend)

> Backend for the hotel parking module: bookings, vehicles, spots, stats and analytics. The UI has its own file at `frontend/app/dashboard/parking/CLAUDE.md`. This doc covers the HTTP contract, booking logic, states and server-side gotchas.

## What it does

Manages the hotel's parking spots (two levels `-2` and `-3`), their types, bookings, vehicles, and check-in/check-out. Also serves the real-time status dashboard, historical stats and trend analytics.

## Layout

```
backend/services/parking/
   └── invoicePdfService.ts        (136 lines — entirely commented out: future PDF
                                    invoicing with local or S3 storage. NOT active.)

backend/controllers/parking/
   ├── parking.controller.ts        (457 lines — spots + vehicles CRUD + search)
   ├── bookings.controller.ts       (843 lines — the core: list, create, edit,
   │                                  check-in, check-out, cancel, no-show, overdue)
   ├── stats.controller.ts          (629 lines — dashboard stats with single-date
   │                                  vs range modes)
   └── analytics.controller.ts      (379 lines — trends, comparisons, recommendations)

backend/repositories/parking/
   ├── parking.repository.ts        (328 lines — spots, vehicles, invoice metadata)
   ├── bookings.repository.ts       (1102 lines — bookings with joins; the densest one)
   └── stats.repository.ts          (718 lines — aggregations for stats/analytics)

backend/routes/parking/
   ├── parking.routes.ts            (46 lines — /spots, /vehicles)
   ├── bookings.routes.ts           (159 lines — /bookings, /bookings/:code, /overdue)
   ├── stats.routes.ts              (74 lines — /stats, /stats/pending-checkins, /stats/pending-checkouts)
   └── analytics.routes.ts          (101 lines — /stats/analytics/trends, etc.)
```

## DB tables

| Table | Purpose |
|---|---|
| `parking_spots` | Physical spots: number, level_code (-2/-3), spot_type, availability |
| `parking_vehicles` | Registered vehicles (plate, owner, type). Shared across bookings |
| `parking_bookings` | Bookings: spot, vehicle, expected dates, actual dates, status, source, payment, total |
| `parking_invoices` | Associated invoices (future — PDF generation is off) |
| `parking_rates` | Rates per spot type / period (used for `total_amount` computation) |

**`booking_code`:** bookings are publicly identified by a `booking_code` (short string, e.g. `BK-0042`) in addition to the numeric `id`. Detail routes use `:code`, not `:id`. Important because the frontend never exposes `id` to the user.

## States and enums (backend ↔ frontend sync)

The following values are duplicated in `frontend/app/components/parking/helpers/constants.ts`. If you add one, **update both sides**.

### Booking status

| Status | Meaning |
|---|---|
| `reserved` | Booking created, waiting for arrival |
| `checked_in` | Vehicle arrived, using the spot |
| `completed` | Vehicle left correctly |
| `canceled` | Booking canceled (slot not used) |
| `no_show` | Customer didn't show up on expected date |

### Booking source

`direct`, `booking_com`, `expedia`, `airbnb`, `agency_other`.

### Payment method

`cash`, `card`, `transfer`, `agency`.

### Spot types

`normal`, `ancha`, `mas_ancha`, `esquina`, `accesible`, `estrecha_bicis`. **Drive the rate calculation** via `parking_rates`.

### Levels

`-2` and `-3` (single-digit signed strings). Hardcoded in the domain; adding a level would mean a migration plus UI/query changes.

## Main flow — booking lifecycle

```
CREATE BOOKING                      EDIT
   ↓                                 ↓
{ status: 'reserved' }              (any field while the booking isn't closed;
   ↓                                 some fields like spot_id retrigger
   ↓                                 availability re-validation)
CHECK-IN                             
   ↓ (POST /bookings/:code/checkin)
{ status: 'checked_in', actual_checkin = NOW() }
   ↓
CHECK-OUT
   ↓ (POST /bookings/:code/checkout, recompute final total if it differs)
{ status: 'completed', actual_checkout = NOW(), payment_method, ... }

ALTERNATIVES:
   reserved → canceled  (POST /bookings/:code/cancel)
   reserved → no_show   (cron or manual)
```

**`total_amount` calculation:** done on create and can be recomputed at check-out if actual dates differ. Uses the rate from `parking_rates` for the `spot_type`. The day count treats whole days: arriving on the 25th at 23:00 and leaving on the 26th at 10:00 counts as **2 calendar days**, not 0.5. See `_calculateBookingDays()` in `bookings.repository.ts`.

**Availability:** before creating or moving a booking, the system verifies the spot isn't occupied in the `[expected_checkin, expected_checkout)` range. Overlaps return 409.

## Stats and analytics

### `/stats` — three modes

`GET /api/parking/stats` operates in **3 modes** depending on query params:

1. **No params** → today's stats + occupancy + pending checkins/checkouts + availability.
2. **`?date=YYYY-MM-DD`** → same fields for a specific day (past or future).
3. **`?startDate=...&endDate=...`** → **consolidated** stats + occupancy (averages, max, min) for the range. **Doesn't include** pending checkins/checkouts/availability (those only apply to a single day).

Documented inline in `stats.routes.ts` with use cases. If the UI changes, read those comments — they're well-maintained.

### `/stats/analytics/trends`

Trends across the last N days (default 7). Returns average occupancy per level, peak, min, trend direction (`increasing` / `declining` / `stable`) and auto-generated recommendations. Useful for spotting underused levels or recurring peaks.

## Endpoints

| Method and route | Purpose |
|---|---|
| **Spots & Vehicles (`/api/parking`)** | |
| `GET /spots` | List of spots |
| `GET /spots/available` | Available spots right now |
| `GET /vehicles` / `POST /vehicles` | Search / create vehicle |
| `GET /vehicles/search` | Autocomplete search |
| `PUT /vehicles/:id` | Edit vehicle |
| `DELETE /vehicles/:id` | Delete (admin-only via `isAdmin`) |
| **Bookings (`/api/parking/bookings`)** | |
| `GET /` | List (filters: status, date, spot_id, vehicle_id, plate_number, owner_name, booking_source) |
| `POST /` | Create booking |
| `GET /:code` | Detail by booking_code |
| `PUT /:code` | Edit booking |
| `POST /:code/checkin` | Mark actual entry |
| `POST /:code/checkout` | Mark exit + payment |
| `POST /:code/cancel` | Cancel |
| `POST /:code/no-show` | No-show |
| `GET /overdue/list` | Bookings with `expected_checkout` past and still `checked_in` |
| **Stats (`/api/parking/stats`)** | |
| `GET /` | Dashboard stats (3 modes: today / day / range) |
| `GET /pending-checkins` | Bookings expected to arrive today (or `?date=...`) |
| `GET /pending-checkouts` | Bookings expected to leave today |
| **Analytics (`/api/parking/stats/analytics`)** | |
| `GET /trends` | Occupancy trends across the last N days |

The whole subroute sits behind `authenticateToken` + `excludeMantenimiento`. Mantenimiento doesn't enter. Some specific mutations require `isAdmin` (e.g. `DELETE /vehicles/:id`).

**Route ordering convention:** specific routes (`/overdue/list`) go **before** the parametric ones (`/:code`) so Express doesn't capture them wrong. Keep that order when modifying.

## Module patterns

### Class-based controllers

Unlike the rest of the backend (free-standing exported functions), `bookings.controller.ts`, `stats.controller.ts` and `analytics.controller.ts` export as **classes with static methods** (`ParkingBookingsController.getBookings`, etc.). This is inherited from the first scaffold of the module. **Not a bug and not urgent debt**: it works, it's internally consistent. If you add a new controller here, follow the class pattern to keep internal coherence.

### Date handling

Backend dates use `getTodayMadrid()` from `config/date-utils.js` for local hotel dates (important for "today" in stats — the hotel runs on Madrid time, not UTC). Booking dates are stored as MySQL `DATETIME` in Madrid local time.

### Filters and pagination

`GET /bookings` accepts multiple combinable filters (AND). Pagination via `limit` + `offset`, returns `PaginationInfo` with `total`, `page`, `totalPages`. Coordinated with the frontend grid that paginates them.

## PDF invoicing — **inactive**

`invoicePdfService.ts` is **fully commented out**. It was the placeholder for invoicing with dual storage (local or S3 depending on `STORAGE.TYPE`). If at some point it gets activated, uncomment and:

1. Install `pdfkit` and `aws-sdk` (or replace with an external service).
2. Define `STORAGE.TYPE` in `config.ts` (`'local'` or `'s3'`).
3. Configure AWS region + credentials if S3.
4. Wire `parking_invoices` to the check-out path.

Not a priority. If the client doesn't ask for it, don't activate it.

## Known gotchas

1. **`booking_code` vs `id`:** public URLs use `code`, DB keys use `id`. Don't confuse them — the frontend should never see `id`.
2. **Calendar-day pricing:** arrival at 23:00 + departure at 10:00 = 2 days. Not 0.5. If you ever switch to hours, you have to touch `_calculateBookingDays()` and every test that depends on calendar-day behavior.
3. **3 modes of `/stats`:** document well before extending. Adding a 4th mode without a clear reason complicates the consumer.
4. **Route ordering:** `/overdue/list` before `/:code`. If you reorder, validate with curl.
5. **Madrid time hardcoded:** everything assumes Madrid time. Multi-tenant across different timezones would need a refactor (not on the near horizon).
6. **Frontend ↔ backend enum duplication:** the list lives in `helpers/constants.ts` on the frontend. Keep them in sync.

## Cross references

- `frontend/app/dashboard/parking/CLAUDE.md` — the module's UI side.
- `frontend/app/components/parking/helpers/constants.ts` — the frontend copy of the enums.
- `backend/models/parking/index.ts` — every TS type for the module.
