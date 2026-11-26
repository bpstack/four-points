# Database

Summary of the database, cross-referenced with the live one on 2026-11-26: a
fresh install from the repository and a copy of production have the same schema.
It runs on a self-managed MySQL 8.4. The source of truth for the schema and
migrations is [`backend/db-mysql/`](../../../backend/db-mysql/); this document
summarises and links to it. Project overview in [`../README.md`](../README.md).

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
data; production and preview both use it. For development, a local one runs in
Docker with the same version and settings, installed with `pnpm setup:local`.
Today it has **67 tables and 3 views**.

Tables by module (the full list is in `backend/db-mysql/INDEX.md`):

- **Core**: `users`, `roles`, `departments`.
- **Logbook** (4), **parking** (4), **groups** (5 + `hotel_groups`), **cashier**
  (8 + `payment_methods`), **conciliation** (4), **blacklist** (1),
  **maintenance** (3), **messaging** (3), **notifications** (2), **backoffice**
  (5 tables + 3 views `v_bo_*`), **scheduling** (12), **checklist** (6), **F&B**
  (2).
- **Scheduled jobs**: `cron_job_runs` keeps each job to one run per period.
- **Public demo**: `demo_activity_log` (blocked attempts), `demo_reset_log`
  (daily resets and saved scheduling bases) and the `demo_snapshot_scheduling_*`
  copies the reset restores, created when an admin saves the base.

**Roles** (table `roles`): 1 `recepcionista`, 2 `admin`, 3 `mantenimiento`, 6
`group-admin`. The public demo account is an `admin` with `users.is_demo = 1`.

**Logic that lives in the database itself** (not in the code):

- **Triggers**: 5 on `parking_bookings` (they generate the booking code and
  maintain the availability calendar; see
  [`docs/parking/`](../../parking/README.md)) and 1 on `cashier_shifts`.
- **Parking functions and procedures**: 2 functions and 4 procedures. The code
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
- **A fresh install starts from a snapshot of production**: `schema.sql` (the
  remote structure, without rows) and `catalogs.sql` (the catalog rows, taken
  from the repo), then only the scripts dated after the snapshot.
- **Before every migration**, `compare-schema.sh` between a repo install and a
  copy of the remote must show no differences; if it does, that is fixed first.
  It is what keeps the repository equal to production.
- **Character set**: `utf8mb4` with `utf8mb4_0900_ai_ci`, which does not
  distinguish case or accents when comparing texts.
- **Time**: every backend session runs in **UTC**. What the database calculates
  with `NOW()` or `CURDATE()` runs 1–2 hours behind Madrid; the backend
  calculates "today" in Madrid time on its own.
- **Encrypted connection**: TLS, checked against the server's CA certificate in
  `backend/config/certs/ca-certificate.pem`. It is public (no private key) and
  stays in the repository because the backend and `apply-migration.sh` need it.
- **Operations**: the server is managed by the owner. There are no scheduled
  backups (the data is test data and the demo regenerates its own); a dump is
  made by hand with `backend/db-mysql/backup/backup.ps1` before a schema change.

**Migration status**: `backend/db-mysql/INDEX.md` lists every migration and
where it was applied.

## How information flows

```
backend (repositories) ─► mysql2 pool ─► TLS ─► remote MySQL (hotel_db)
                                                   │
                                   triggers · procedures · daily event
```

1. The backend reads `DB_ENVIRONMENT=remote` and the `REMOTE_DB_*` variables,
   opens a pool with TLS and, on startup, tests the connection up to 3 times.
2. Repositories run parameterised queries (`?`); some writes use transactions.
3. Part of the work is done by the database alone: the parking triggers when
   inserting or changing a booking and the message cleanup event.

## What is in `backend/db-mysql/`

- **`schema.sql`** and **`catalogs.sql`**: the snapshot a fresh install loads.
- **`scripts/`**: the incremental migrations and the tools: applying a
  migration, comparing two schemas, taking a new snapshot, local backup and
  collation check. All read the credentials from `backend/.env`.
- **`aiven/`** and **`MASTER_INSTALL.sql`**: the old base schema of 2026-05-20,
  named after the former host. Kept as history; never run.
- **`backup/`**: database dumps, never committed.
- **Two documents**: `AGENTS.md` (the rules: migrations, fresh install,
  comparing with production, backups) and `INDEX.md` (tables by module and the
  migration log). `README.md` points to them and to this summary.
