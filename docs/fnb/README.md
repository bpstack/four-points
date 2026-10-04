# F&B (Restaurant)

Daily food & beverage revenue tracking, sourced from Opera PDF reports. Screen:
`/dashboard/restaurant`. Project overview in
[`../general/README.md`](../general/README.md).

## What problem it solves

Opera (the hotel's PMS) produces a daily revenue report for the restaurant, but
it is a PDF, not a queryable record. The module ingests that PDF, extracts the
revenue per category (breakfast, lunch, dinner, each split into components), and
turns it into a monthly calendar with totals and charts. When no PDF exists for
a day — a private event, an external group — the same categories can be entered
by hand instead.

**Only the Daily Revenue feature is real.** The screen also shows Inventory,
Orders and Stats tabs, but they are UI-only mockups with no backend and no
database table behind them: hardcoded placeholder data, built ahead of a second
phase (product inventory, supplier orders) that has not started.

## Who uses it

Every role **except `mantenimiento`**: `admin`, `recepcionista`, `group-admin`
and `demo-admin`. There are no admin-only actions — any of these roles can
upload a PDF, edit a day by hand, or delete a day's revenue, of any date. This
is deliberate for now (ADR-032).

## What it can do

- **Upload the Opera PDF** for a day; the backend parses it and stores one row
  per tracked category code.
- **Manual entry**: type the amount for each category directly, for days with no
  Opera PDF.
- **Monthly view**: one row per day of the month, every category as a column,
  with breakfast/lunch/dinner/F&B totals computed from them.
- **Daily view**: the entries for a specific day, or a date range.
- **Delete a day**: removes every category row stored for that date.
- **List of active categories**, used to drive the upload/manual-entry forms.

## What data it handles

Two tables (`backend/db-mysql/aiven/*`):

- **`fnb_category`**: the 7 tracked Opera codes, each with a name, a group
  (`breakfast`/`lunch`/`dinner`) and a display order. Live data: 7 rows, e.g.
  `21110` → "Breakfast Buffet Included".
- **`fnb_daily_revenue`**: one row per day and category code, with its amount.
  This is real, actively growing production data — 439 rows in Aiven as of
  2026-09-28, covering 2026-02-28 through 2026-05-21.

Category codes are hardcoded in the backend (`CATEGORY_CODES` in
`fnb.repository.ts`) as fixed Opera codes mapped to 7 stable columns; they are
specific to this hotel's Opera configuration.

## What rules it follows

- **The PDF's date comes from its filter line** (`Date DD/MM/YY`), never from
  its printed header, which runs a day ahead of the hotel's date. If that line
  is missing, the upload is rejected rather than guessing.
- **A PDF with no tracked category codes is rejected**, not silently accepted as
  an empty day.
- **An upload or a manual entry replaces same-day, same-category rows** (upsert
  by date + category code), so re-uploading a corrected PDF overwrites the
  previous amounts.
- **Totals are computed in SQL, then rounded in application code** to two
  decimals, to avoid floating-point drift from repeated addition.
- **Every day of the requested month is returned**, even with no revenue at all:
  missing days come back as zero rather than being left out.
- **The parser assumes Opera's current PDF layout.** It is tuned to that exact
  format and is not resilient to a format change from Opera's side.

## How information flows

```
DailyRevenueTab (upload · manual entry · monthly/daily views)
                      │
        lib/fnb (apiClient)
                      │
              /api/fnb/* (Express)
                      │
   authenticateToken ─► canAccessFnb
                      │
     controller ─► pdf-parser.service (PDF only) ─► repository ─► MySQL
```

1. Uploading a PDF sends it in memory (never written to disk) to a parser that
   extracts the date, one amount per tracked category code, and a grand total
   used only to sanity-check the read.
2. Manual entry skips the parser and goes straight to the same upsert as the PDF
   path, so both paths write identically shaped rows.
3. The monthly and daily views, and category deletion, read and write the table
   directly; there is no separate read model.
4. The Inventory, Orders and Stats tabs render entirely from data hardcoded in
   the frontend — no request reaches the backend for them.
