# Cashier

Daily cash control for reception: the cash drawer, card and other payments, and
vouchers, shift by shift. Screens under `/dashboard/cashier`. Project overview
in [`../general/README.md`](../general/README.md).

## What problem it solves

Reception handles cash and electronic payments across four shifts a day, and at
every handover someone has to count the drawer and explain any difference. Doing
it on paper makes errors hard to trace. The module records, for each shift, the
opening fund, the cash taken, the bills and coins counted, the electronic
payments and the vouchers, shows whether the drawer adds up, and closes the day
when every shift is closed.

## Who uses it

Every role **except `mantenimiento`**:

- **Everyone with access** sees days, shifts and vouchers.
- **`admin`, `recepcionista`, `group-admin` and `demo-admin`** start a day, fill
  in and close shifts, record payments and counts, create vouchers and close the
  day.
- **Only `admin`** reopens a shift or a day, cancels or deletes a voucher,
  deletes a shift and changes who worked a shift.
- **Reports, history and statistics** are for `admin` (and `demo-admin`).

## What it can do

- **Day view** (`/dashboard/cashier/hotel`): starting a day creates its four
  shifts — night, morning, afternoon and closing. Each shift shows:
  - who worked it;
  - the opening fund and the cash taken, with a breakdown;
  - the **count of bills and coins** in the drawer;
  - **electronic payments** by method: card, BACS, web payment, transfer and
    other;
  - **vouchers** (IOUs) taken from the drawer.
- **Closing a shift** shows the expected cash (opening fund + cash taken −
  vouchers) next to the counted cash, and the difference.
- **Closing the day** once its four shifts are closed; an admin can reopen it.
- **PDF export** of a day.
- **Reports** (`/dashboard/cashier/reports`): monthly figures, payments by
  method and voucher history.
- **History** (`/dashboard/cashier/logs`): every change to every shift, with
  filters and statistics.

## What data it handles

Nine tables (`backend/db-mysql/aiven/11_cashier.sql`), with every amount stored
as `DECIMAL(10,2)`:

- **`cashier_shifts`**: one row per shift and day — type, status (open, in
  progress, closed), opening fund, cash taken and its breakdown, totals, and who
  opened and closed it.
- **`cashier_shift_users`**: who worked each shift.
- **`cashier_denominations`**: bills and coins counted per shift.
- **`cashier_payments`** and **`payment_methods`**: electronic payments per
  shift and the five methods.
- **`cashier_vouchers`** and **`cashier_shift_vouchers`**: vouchers (pending,
  justified or cancelled) and the shift they came from.
- **`cashier_daily`**: one row per day with its status and totals by method.
- **`cashier_history`**: every change to a shift, with the previous and new
  value and who made it.

## What rules it follows

- **Four shifts per day**, created together when the day is started; starting it
  twice is rejected.
- **A day closes only when its four shifts are closed.**
- **Vouchers** start as pending and end justified or cancelled; only an admin
  cancels or deletes them. Today justifying, cancelling or editing a voucher
  fails, and so does editing a single payment or count: those queries write
  columns that the production database does not have. Saving the whole count or
  payment form works.
- **Counts and payments are saved as a whole**: saving the form replaces every
  entry of the shift in one transaction.
- **The day's totals are computed by the database**: a trigger on
  `cashier_shifts` recalculates `cashier_daily` whenever a shift changes status,
  cash or payments. Its cash total is wrong when a shift has more than one
  electronic payment: that shift's cash is added once per payment.
- **Cash figures come from the screen**: the backend stores the cash taken and
  the totals the interface sends; the expected-versus-counted comparison is
  calculated in the browser. The backend also computes a difference for the
  reports, but its formula always gives 0, so reports never show a shortfall.
- **Every change to a shift is logged** in `cashier_history`, per shift.

## How information flows

```
cashier pages (day · reports · logs) ─► lib/cashier/queries.ts (React Query) ─► apiClient
                                                                   │
                                                  /api/cashier/* (Express)
                                                                   │
        authenticateToken ─► excludeMantenimiento ─► canManageCashier | isAdmin | canViewReports
                                                                   │
                         cashier controllers ─► repositories ─► MySQL
                                                                   │
                                  trigger on cashier_shifts ─► cashier_daily totals
```

1. Opening a day loads its four shifts with their counts, payments and vouchers;
   if the day has not been started, the screen offers to start it.
2. Each form (shift data, count, payments, voucher) is saved on its own route,
   and the change is written to the history.
3. When a shift changes, the database trigger updates the day's totals.
4. Reports and history read the stored data by date range.
