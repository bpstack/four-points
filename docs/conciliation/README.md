# Conciliation

Daily reconciliation of the room count between Reception and Housekeeping.
Screen: `/dashboard/conciliation`. Project overview in
[`../general/README.md`](../general/README.md).

## What problem it solves

Reception bills rooms and Housekeeping cleans rooms, and the two counts for the
same day rarely match on their own: a no-show is billed but not cleaned, a room
out of service gets cleaned later and would otherwise be counted twice. Each day
the front desk reconciles the two totals with a short list of adjustments, so
the difference between what was billed and what was cleaned is explained, not
just noticed. A month can only be closed once every one of its days has been
reconciled and closed.

## Who uses it

Every role **except `mantenimiento`**. Anyone with access creates and edits a
day's reconciliation and closes it. **Only `admin`** deletes a day's
reconciliation or closes a month.

## What it can do

- **One reconciliation per day**, created for a date with every adjustment
  reason pre-loaded at zero, ready to fill in.
- **Two lists of adjustments** per day:
  - **Reception**: base billed rooms, no-shows, room changes, gratuities, or
    another reason with a note.
  - **Housekeeping**: rooms cleaned, do-not-disturb, an out-of-service room that
    got cleaned, rooms pending cleaned or pending to clean, or another reason.
  - Each adjustment has a value and adds to or subtracts from its side's total;
    whether it adds or subtracts is decided by its reason, not typed by hand.
- **Recalculate totals** for a day from its current adjustments.
- **General notes** for the day.
- **Day status**: `draft`, `confirmed` or `closed`. Only `closed` has an effect
  — it locks the day. `confirmed` behaves the same as `draft`.
- **Monthly summary**: totals for the month, which days are missing, and whether
  the month can be closed.
- **Close the month**, only once every day of the month exists and is closed.

## What data it handles

Four tables (`backend/db-mysql/aiven/09_conciliation.sql`):

- **`conciliation_summary`**: one row per day — the reception and housekeeping
  totals, their difference (calculated by the database), notes, status and soft
  delete.
- **`conciliation_reception`** and **`conciliation_housekeeping`**: the
  adjustment rows for that day, each with its reason, direction (add or
  subtract), value, an optional room number and notes.
- **`conciliation_monthly_summary`**: one row per month, with its own status and
  who closed it.

## What rules it follows

- **A day's totals are the sum of its adjustments**: for each side, values
  marked "add" are summed and values marked "subtract" are taken away; the
  difference between the two totals is a generated database column.
- **The direction of each reason is fixed in the backend**, not chosen by the
  user: for reception, only "no-show" subtracts; for housekeeping, every reason
  adds today.
- **A closed day cannot be edited** — not its adjustments, not its totals —
  except by an `admin`. `confirmed` is not a locking state.
- **A month closes only when every one of its days exists and is closed.**
  Missing or still-open days block it and are listed by day number.
- **Deleting a day's reconciliation is only for `admin`.**

## How information flows

```
ConciliationClient (form + table) ─► lib/conciliation/queries.ts ─► apiClient
                                                   │
                                /api/conciliations/* (Express)
                                                   │
              authenticateToken ─► excludeMantenimiento ─► isAdmin (delete, monthly close)
                                                   │
    conciliation controller ─► repository ─► MySQL (summary + adjustments, one transaction)
```

1. Opening a day loads its reconciliation, creating it with every reason at zero
   if it does not exist yet.
2. Editing the form saves every adjustment row together and recalculates the
   day's totals inside one transaction.
3. Closing a day locks it; the monthly view then counts it towards a closeable
   month.
4. Closing the month checks every day first and only proceeds if none are
   missing or still open.
