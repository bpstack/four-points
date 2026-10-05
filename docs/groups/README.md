# Groups

Tracking of group bookings — tour buses, corporate events, travel agencies —
from the first contact to the final payment. Screens under `/dashboard/groups`.
Project overview in [`../general/README.md`](../general/README.md).

## What problem it solves

A group booking has many loose ends: a contract to sign, a rooming list to
receive, several scheduled payments, and a balance to settle after departure.
Kept in emails and spreadsheets, a deadline is easily missed. The module holds
every group with its dates, rooms, contacts and payments, tracks four status
lines in parallel, and sends in-app reminders before the important dates.

## Who uses it

- **Every role can view groups**, including `recepcionista` and `mantenimiento`
  (the latter needs it to open group notifications from the profile).
- **`admin` and `group-admin`** create and edit groups, payments,
  contacts, rooms and statuses, and send manual notifications.
- **Only `admin`** deletes a group.

The screens do not hide the editing controls by role: a user who cannot edit
still sees the buttons, and the backend answers `403`.

## What it can do

- **List** of groups with filters, plus a dashboard overview and a yearly
  timeline.
- **Group detail** in six tabs:
  - **Overview**: summary and key figures.
  - **Payments**: scheduled payments (fixed amount or a percentage of the
    total), what has been paid, a balance bar and an overdue warning.
  - **Contacts**: people for the group, one of them primary.
  - **Rooms**: how many rooms of each type (single, double bed, twin beds) and
    guests per room.
  - **Status**: the four tracks — booking confirmed, contract signed, rooming
    list (pending, requested, received) and balance (pending, requested,
    partial, paid), each with its dates.
  - **History**: every change, with the previous and new value.
- **Manual notifications** about a group, sent in-app to chosen users.
- **Automatic reminders**, generated every morning (see the rules).

Tabs and side panels are part of the URL (`?tab=`, `?panel=`, `?highlight=`), so
a link can open a group on a given tab, and the reminders link straight to the
right place.

## What data it handles

Six tables (`backend/db-mysql/aiven/10_group-tracking.sql`):

- **`hotel_groups`**: the group — name, agency, arrival and departure dates,
  status (pending, confirmed, in progress, completed, cancelled), total amount,
  currency and notes.
- **`group_contacts`**: name, email, phone and whether the contact is the
  primary one.
- **`group_rooms`**: room type, quantity and guests per room; one row per type.
- **`group_status`**: one row per group with the four status tracks and their
  dates.
- **`group_payments`**: name, order, percentage or fixed amount, amount paid,
  due date and status (pending, requested, partial, paid).
- **`group_history`**: every change — action, table and field affected, previous
  and new value, and who made it.

## What rules it follows

- **Percentage payments follow the total**: when a group's total changes, every
  payment defined as a percentage is recalculated; fixed-amount payments are
  left as they are.
- **Booking status lives in two places**: `hotel_groups.status` and
  `group_status.booking_confirmed`. Confirming the booking also sets the group
  to `confirmed`, and unconfirming it sets it back to `pending`. Other group
  statuses (in progress, completed, cancelled) do not touch the booking track.
- **One row per room type**: adding a type that already exists updates its
  quantity instead of creating a duplicate.
- **Changes are logged** in `group_history`, except deleting a group: that is
  not logged, and it deletes the group's history along with it.
- **Automatic reminders** (in-app notifications for `admin` and `group-admin`),
  generated at 07:00 Madrid time by the backend's scheduled job:
  - payments due in 15 and in 7 days, and payments already overdue;
  - rooming list not yet received, 15 and 7 days before arrival;
  - arrivals, 3 days before.
  - The configuration also lists reminders for unsigned contracts and pending
    balances, but **they are never generated**.
  - A reminder is not created twice for the same payment or group and date.
- **No emails are sent**: the module includes an email service, but nothing
  calls it. All notifications are in-app.

## How information flows

```
page.tsx (server) ─► getGroups ─► GET /api/groups
GroupsListClient · GroupDetailClient (tabs, panels) ─► lib/groups hooks (React Query)
                                                            │
                                                  /api/groups/* (Express)
                                                            │
             authenticateToken ─► canViewGroups | canManageGroups (+ isAdmin to delete)
                                                            │
       group · payment · status · room · contact · history controllers
                                                            │
                       repositories ─► MySQL · GroupHistoryService ─► group_history

Scheduled job (07:00) ─► NotificationGeneratorService ─► notifications ─► bell icon
```

1. The group list is loaded on the server and arrives ready; filters and the
   detail view fetch through React Query hooks.
2. Every edit calls its own route (payment, status track, room, contact…), the
   controller writes the change and a history entry, and the hooks refresh the
   affected data.
3. Changing the total triggers the recalculation of percentage payments in the
   same request.
4. Each morning the scheduled job looks for upcoming and overdue payments,
   pending rooming lists and upcoming arrivals, and creates the reminders.
