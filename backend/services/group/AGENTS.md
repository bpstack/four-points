# AGENTS.md — Group Tracking (backend)

**Up:** [`backend/AGENTS.md`](../../AGENTS.md) — `backend/` rules ·
[root `AGENTS.md`](../../../AGENTS.md) — shared rules and module map.

> Backend doc for the group tracking module. Covers the data model, lifecycle,
> payment calculator, services, role boundaries, and all endpoints. For the
> React UI see `frontend/app/components/groups/AGENTS.md`.

## What it does

Tracks hotel group bookings end-to-end: a group (bus tour, corporate event,
travel agency reservation) is created with arrival/departure dates, total
amount, and a list of room types requested. Throughout its lifecycle, staff
update four parallel status tracks — booking confirmation, contract, rooming
list, and balance — as well as a list of scheduled payments (each with a
percentage and due date) and a list of assigned rooms. All mutations are audited
in `group_history`, which outlives the group: since
`20261011_keep_group_history_on_delete.sql` deleting a group keeps its history.
There is no email sending: `email-service.ts` and `nodemailer` were removed on
2026-10-02; group notifications are in-app only.

## DB tables

- **`hotel_groups`**: master record: name, agency, dates, total amount, pax
  count, status, notes
- **`group_contacts`**: contacts for the group (name, role, phone, email). One
  can be primary.
- **`group_rooms`**: room type allocations: single / double_bed / twin_beds +
  count + notes
- **`group_status`**: one row per group tracking 4 status fields: booking,
  contract, rooming, balance
- **`group_payments`**: scheduled payments: amount, percentage, due date,
  status, method
- **`group_history`**: audit log of all mutations with `table_affected`,
  `old_value`/`new_value` JSON. No foreign key to `hotel_groups` any more

**Known design debt:** `hotel_groups.status` (`GroupStatus` enum) and
`group_status.booking_confirmed` both represent booking-level status — they are
kept in sync by the application code but are logically duplicated.
`GroupDetailClient.tsx` has a TODO comment describing the planned unification.
Until resolved, any code that updates booking status must update **both**
fields.

## Enums (models/group/index.ts)

```
GroupStatus:   pending | confirmed | in_progress | completed | cancelled
RoomType:      single | double_bed | twin_beds
RoomingStatus: pending | requested | received
BalanceStatus: pending | requested | partial | paid
PaymentStatus: pending | requested | partial | paid
HistoryAction: created | updated | deleted | status_changed | payment_updated
```

## Backend layout

```
backend/controllers/group/
├── group-controller.ts           (336 lines — group CRUD, dashboard, timeline)
├── group-payment-controller.ts   (522 lines — payment CRUD, status/amount patches, calculator)
├── group-status-controller.ts    (305 lines — 4 status tracks: booking/contract/rooming/balance)
├── group-room-controller.ts      (291 lines — room CRUD + upsert pattern)
├── group-contact-controller.ts   (321 lines — contact CRUD + primary contact query)
└── group-history-controller.ts   (53 lines — history query only)

backend/repositories/group/
├── group-repository.ts           (360 lines — getAll with filters, getById with status join)
├── group-payment-repository.ts   (279 lines — includes recalculateAmounts for % payments)
├── group-status-repository.ts    (206 lines)
├── group-room-repository.ts      (112 lines)
├── group-contact-repository.ts   (112 lines)
└── group-history-repository.ts   (79 lines)

backend/services/group/
├── payment-calculator-service.ts  — recalculate payment amounts when group total changes; balance
├── payment-rules.ts               — coherence rules for a payment (2026-10-11)
└── group-history-service.ts       — helpers to log CRUD history with old/new JSON

backend/routes/group/group-routes.ts   (176 lines)
backend/models/group/index.ts          (all types + enums)
```

## Services

### PaymentCalculatorService

When a group's `total_amount` changes, all payments with a `percentage` defined
need their `amount` recalculated: `amount = round(total * percentage / 100, 2)`.
`PaymentCalculatorService.recalculatePayments(groupId, newTotal)` is called from
`group-controller.ts` when `PUT /:id` changes `total_amount`.
`calculateBalance(groupId)` feeds the group detail and the payment list.

Payments with `percentage = null` are fixed-amount and are not touched by the
recalculation.

### GroupHistoryService

Wraps `GroupHistoryRepository.create()` with typed helper methods
(`logGroupCreated`, `logGroupUpdated`, etc.) that build the
`old_value`/`new_value` JSON and set `table_affected` automatically. All
controllers should use this service rather than calling the repository directly.

### Payment rules (`payment-rules.ts`)

Decided on 2026-10-11: what was paid never exceeds what is owed, marking a
payment paid by hand fills in what was paid, the status follows the amounts
(`statusFor`, `reconcilePayment`; `requested` stays until money arrives), and
the percentages of a group's payments add up to 100 at most
(`checkPercentages`). A broken rule throws `PaymentRuleError` with the
`ERROR_CODES` entry to answer with.

### Manual notifications

`POST /:id/notifications` goes to
`NotificationController.createManualNotification` (the notifications module): it
stores an in-app notification. No email.

## Role boundaries

- **Read groups, rooms, payments, status, history**: all authenticated
  (`canViewGroups` — includes `mantenimiento`); the history leaves out
  `group_contacts` entries for `mantenimiento`
- **Read contacts** (`/contacts`, `/contacts/primary`): `admin`,
  `recepcionista`, `group-admin` (`canViewGroupContacts`)
- **Create/update groups, contacts, rooms, payments, status**: `admin`,
  `group-admin` (`canManageGroups`)
- **Delete group**: `admin` only (`canManageGroups` + `isAdmin`)

`mantenimiento` can **view** groups (needed for notification access from the
profile page) but not their contacts, and cannot create or modify anything
(decided 2026-10-12).

⚠️ **Gap:** `GET /api/groups/:id` still returns the group's `contacts` (email,
phone) to every `canViewGroups` role, `mantenimiento` included, so it bypasses
`canViewGroupContacts` (checked 2026-10-13).

## Endpoints summary

- **GET** `/api/groups/dashboard/overview` — canViewGroups · Dashboard stats
- **GET** `/api/groups/dashboard/timeline` — canViewGroups · Timeline view
- **GET** `/api/groups` — canViewGroups · List with filters (status, arrival and
  departure ranges, agency, sort, limit/offset)
- **GET** `/api/groups/:id` — canViewGroups · Group detail (status + contacts +
  rooms + payments + rooms summary + balance; see the gap above)
- **POST** `/api/groups` — canManageGroups · Create group
- **PUT** `/api/groups/:id` — canManageGroups · Update group (triggers payment
  recalculation if total changes)
- **DELETE** `/api/groups/:id` — canManageGroups + isAdmin · Delete group
  (cascades to the sub-tables; `group_history` is kept)
- **GET** `/api/groups/payments/upcoming` — canViewGroups · Upcoming payments
  across all groups
- **GET** `/api/groups/payments/overdue` — canViewGroups · Overdue payments
- **GET** `/api/groups/:id/payments` — canViewGroups · Payments for a group
- **POST** `/api/groups/:id/payments` — canManageGroups · Create payment
- **PUT** `/api/groups/:id/payments/:paymentId` — canManageGroups · Update
  payment
- **PATCH** `/api/groups/:id/payments/:paymentId/status` — canManageGroups ·
  Update payment status
- **PATCH** `/api/groups/:id/payments/:paymentId/amount-paid` — canManageGroups
  · Record partial payment
- **DELETE** `/api/groups/:id/payments/:paymentId` — canManageGroups · Delete
  payment
- **GET** `/api/groups/:id/status` — canViewGroups · All 4 status tracks
- **PUT** `/api/groups/:id/status/booking` — canManageGroups · Update booking
  status
- **PUT** `/api/groups/:id/status/contract` — canManageGroups · Update contract
  status
- **PUT** `/api/groups/:id/status/rooming` — canManageGroups · Update rooming
  status
- **PUT** `/api/groups/:id/status/balance` — canManageGroups · Update balance
  status
- **GET** `/api/groups/:id/rooms` — canViewGroups · Room allocations
- **POST** `/api/groups/:id/rooms` — canManageGroups · Create or upsert room
- **PUT** `/api/groups/:id/rooms/:roomId` — canManageGroups · Update room
- **DELETE** `/api/groups/:id/rooms/:roomId` — canManageGroups · Delete room
- **GET** `/api/groups/:id/contacts` — canViewGroupContacts · Contact list
- **GET** `/api/groups/:id/contacts/primary` — canViewGroupContacts · Primary
  contact
- **POST** `/api/groups/:id/contacts` — canManageGroups · Create contact
- **PUT** `/api/groups/:id/contacts/:contactId` — canManageGroups · Update
  contact
- **DELETE** `/api/groups/:id/contacts/:contactId` — canManageGroups · Delete
  contact
- **GET** `/api/groups/:id/history` — canViewGroups · Audit history
- **GET** `/api/groups/:id/notifications` — canViewGroups · Notifications for
  group
- **POST** `/api/groups/:id/notifications` — canManageGroups · Create manual
  notification

## Known gotchas

1. **Status duplication.** `hotel_groups.status` and
   `group_status.booking_confirmed` must be kept in sync. The repositories do it
   both ways: `GroupStatusRepository` updates `hotel_groups` when the booking
   track changes, and `GroupRepository.update` syncs `booking_confirmed` when
   the group status changes. If you add new status-mutation paths, replicate the
   update to both fields until the schema is unified.
2. **Payment recalculation on total change.** `PUT /:id` calls
   `PaymentCalculatorService.recalculatePayments()` if `total_amount` changes.
   Only payments with a non-null `percentage` are recalculated — fixed-amount
   payments are left untouched.
3. **Room upsert pattern.** `GroupRoomController.createOrUpdateRoom()` uses an
   upsert (`INSERT … ON DUPLICATE KEY UPDATE`) keyed on `(group_id, room_type)`.
   Calling it with a room type that already exists updates the count and notes
   rather than creating a duplicate.
4. **Payment coherence lives in `payment-rules.ts`.** A new payment path must go
   through it, or paid amounts and statuses drift apart again.
5. **`/payments/upcoming` and `/payments/overdue` are global routes.** They are
   declared after `GET /:id`, which is safe only because `/:id` matches a single
   segment. Do not add a one-segment global route (`/upcoming`) after `/:id`:
   Express would read it as an ID.
6. **`group-admin` role.** This role is specific to the groups module. It can
   manage groups, contacts, rooms, payments, and status but cannot delete groups
   (admin only) and cannot access other modules' management functions.

## Cross references

- `backend/models/group/index.ts` — all TypeScript types and enums.
- `backend/middlewares/roleCheck.ts` → `canManageGroups` (admin, group-admin),
  `canViewGroups` (adds recepcionista and mantenimiento) and
  `canViewGroupContacts` (admin, recepcionista, group-admin).
- `backend/db-mysql/aiven/10_group-tracking.sql` — frozen schema baseline (6
  tables).
- `frontend/app/components/groups/AGENTS.md` — UI, tab navigation, panels, React
  Query.
