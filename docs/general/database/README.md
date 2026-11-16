# Database

Summary of the database, cross-referenced with the live one on 2026-09-28. It
was hosted on Aiven until 2026-11-16 and now runs on a self-managed MySQL 8.4
(same schema and data, loaded from a dump). The source of truth for the schema
and migrations is [`backend/db-mysql/`](../../../backend/db-mysql/); this
document summarises and links to it. Project overview in
[`../README.md`](../README.md).

## What problem it solves

It stores everything the application handles —users, notices, bookings, cashier,
groups, scheduling…— in a single place, and sets how its structure is changed
without breaking existing data.

## Who uses it

- **The backend**, through a connection pool (`backend/config/db.ts`). It is the
  only one that connects: the frontend never talks to the database.
- **Whoever changes the schema**, with the scripts in
  `backend/db-mysql/scripts/`.

## What it contains

**A single shared database, `hotel_db`, on a self-managed MySQL 8.4**, with test
data; production and preview both use it. A local one can be installed with
`pnpm setup:local`. Today it has **66 tables and 3 views**.

Tables by module:

- **Core**: `users`, `roles`, `departments`.
- **Logbook** (4), **parking** (5), **groups** (5 + `hotel_groups`), **cashier**
  (8 + `payment_methods`), **conciliation** (4), **blacklist** (1),
  **maintenance** (3), **messaging** (3), **notifications** (2), **backoffice**
  (5 tables + 3 views `v_bo_*`), **scheduling** (12), **checklist** (6), **F&B**
  (2).
- **Public demo**: `demo_activity_log` (blocked attempts), `demo_reset_log`
  (daily resets and saved scheduling bases) and the `demo_snapshot_scheduling_*`
  copies the reset restores, created when an admin saves the base.

**Roles** (table `roles`): 1 `recepcionista`, 2 `admin`, 3 `mantenimiento`, 6
`group-admin`. The public demo account is an `admin` with `users.is_demo = 1`.

**Logic that lives in the database itself** (not in the code):

- **Triggers**: 5 on `parking_bookings` (they generate the booking code and
  maintain the availability calendar; see
  [`docs/parking/`](../../parking/README.md)) and 1 on `cashier_shifts`.
- **Parking functions and procedures**: 2 functions and 5 procedures. The code
  only uses `check_availability`; the rest, including the one that generates the
  calendar (`generate_availability`), is not called by anyone.
- **Event** `cleanup_old_messages`: every day it deletes messages older than 90
  days (see [`messages/`](../messages/README.md)).

## What rules it follows

- **Every schema change is a new script** in
  `backend/db-mysql/scripts/AAAAMMDD_descripcion.sql`, **idempotent** (it can be
  run twice without breaking anything) and recorded in
  `backend/db-mysql/INDEX.md`. A committed script is not edited: if it failed,
  another one is written that fixes it.
- **`aiven/` is the frozen base schema** as of 2026-05-20. The name is
  misleading: it is not "the Aiven database", but the initial installation that
  runs `MASTER_INSTALL.sql`. It is never run against a database with data. Two
  of its files fail on an empty server (a duplicate foreign key name in
  `11_cashier.sql`, a foreign key to a later table in `19_scheduling.sql`):
  `pnpm setup:local` fixes both in memory, and
  `20261005_complete_fresh_install.sql` adds what an install made by hand
  misses.
- **Character set**: `utf8mb4` with `utf8mb4_0900_ai_ci`, which does not
  distinguish case or accents when comparing texts.
- **Time**: every backend session runs in **UTC**. What the database calculates
  with `NOW()` or `CURDATE()` runs 1–2 hours behind Madrid; the backend
  calculates "today" in Madrid time on its own.
- **Encrypted connection**: TLS, checked against the CA certificates in
  `backend/config/certs/ca-certificate.pem`: the one of the current server and,
  until that service is retired, the one of Aiven. They are public certificates
  (no private key) and stay in the repository because the backend and
  `apply-migration.sh` need them.
- **Operations**: the server is managed by the owner. There are no scheduled
  backups (the data is test data and the demo regenerates its own); a dump is
  made by hand with `backend/db-mysql/backup/backup.ps1` before a schema change.

**Migration status**: the 26 recorded in `INDEX.md` were applied on Aiven (the
last two, `20261011_keep_group_history_on_delete.sql` and
`20261012_unique_invoice_supplier_number.sql`, applied and verified on
2026-10-12). `INDEX.md` has the current list; everything applied on Aiven came
over with the dump.

## How information flows

```
backend (repositories) ─► mysql2 pool ─► TLS ─► remote MySQL (hotel_db)
                                                   │
                                   triggers · procedures · daily event
```

1. The backend reads `DB_ENVIRONMENT=remote` and the `REMOTE_DB_*` variables,
   opens a pool with TLS and, on startup, tests the connection up to 3 times.
   The former names (`aiven`, `AIVEN_*`) are still accepted while the deployed
   services are switched over.
2. Repositories run parameterised queries (`?`); some writes use transactions.
3. Part of the work is done by the database alone: the parking triggers when
   inserting or changing a booking and the message cleanup event.

## What is in `backend/db-mysql/`

- **`aiven/`**: the 20 scripts of the base schema (`01`–`20`, plus `99` for
  verification). The folder keeps the name of the former host; it is the frozen
  base schema, not a description of where the database runs.
- **`scripts/`**: the incremental migrations and utilities: applying a
  migration, local backup, local database recreation and collation check. All
  read the credentials from `backend/.env`. The one-off data fixes and the quick
  query scripts were removed on 2026-10-04 (they carried the Aiven password).
- **`backup/`**: database dumps, never committed.
- **Four documents** that overlap: `CLAUDE.md`, `README.md`, `INDEX.md` and
  `MIGRATIONS_POLICY.md`. Several data they give are outdated.
  `MIGRATION_GUIDE.md` was archived on 2026-10-05 (ADR-040).
