# AGENTS.md — DB / Migrations

**Up:** [`backend/AGENTS.md`](../AGENTS.md) — `backend/` rules ·
[root `AGENTS.md`](../../AGENTS.md) — shared rules and module map.

> Single doc for the rules of `backend/db-mysql/`: the migration policy, how a
> fresh install is built, how the repo is kept equal to production, applying a
> migration and backups. The table list and the migration log are in `INDEX.md`;
> the public summary in `docs/general/database/README.md`. **Read this before
> touching any table.**

## The rule in one sentence

Every schema change goes in a new `scripts/YYYYMMDD_<description>.sql` file,
idempotent, registered in `INDEX.md`, and only after `compare-schema.sh` shows
the repo and production match.

## Layout

```
backend/db-mysql/
├── schema.sql         # Structure of the remote DB (2026-11-26), loaded by setup:local
├── catalogs.sql       # Catalog rows a fresh install needs, loaded after schema.sql
├── scripts/           # Incremental migrations, YYYYMMDD_*.sql, and the tools below
│   ├── apply-migration.sh  # Applies one migration to local or remote
│   ├── local-env.sh        # Local credentials from backend/.env, sourced by the others
│   ├── backup-local.sh     # Dumps the local DB into backup/
│   ├── compare-schema.sh   # Lists the schema differences between two local DBs
│   └── snapshot-schema.sh  # Writes schema.sql and catalogs.sql
├── aiven/             # Old baseline (2026-05-20). History: frozen, not loaded, never run
├── MASTER_INSTALL.sql # Ran aiven/ in order. History: never run
├── backup/            # DB dumps (local + remote), git-ignored; backup.ps1
├── INDEX.md           # Tables by module + incremental migration log
├── mock-data.sql      # Clears module data and loads fictitious data (keeps users and scheduling)
└── scheduling-seed.sql # Demo scheduling base: employees, contracts, months
```

`aiven/` keeps the name of the host the database had until 2026-11-16. It is not
renamed: `MASTER_INSTALL.sql` and the rollback notes of applied scripts point to
it, and those files are never edited.

## Migration policy

**Incremental-only**, Rails/Django/Flyway style, on top of a snapshot.

- **New schema change**: a new file in `scripts/YYYYMMDD_<description>.sql`,
  idempotent (see "Writing an idempotent script"), applied to the live DBs.
- **First line**: `SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;`. Without it, a
  script run from a Windows console (`cp850`) creates views and triggers with
  the wrong character set: production had two such objects until
  `20261126_fix_charset_leftovers.sql`.
- **Charset / collation**: always `utf8mb4` / `utf8mb4_0900_ai_ci`.
- **Register in `INDEX.md`**: a row in the "Migraciones incrementales" table:
  date, file, description, status per env (`✅ local · ✅ remota`,
  `⏳ pendiente`). Rows up to 2026-10-14 say `Aiven`, the remote host until
  2026-11-16; the current one was loaded from its dump, so they hold for it.
- **Never modify a committed script**: if something went wrong, create a new
  `YYYYMMDD_fix_…sql` that corrects it (ADR-021).
- **Apply order**: compare first (see "Production schema"), then local, then
  remote, with `scripts/apply-migration.sh` (see "Applying a migration"). Update
  `INDEX.md` after each.
- **`aiven/NN_*.sql` are frozen** since 2026-05-20, each with a `⚠️ FROZEN`
  header. Their headers cite `MIGRATIONS_POLICY.md`: that policy is now this
  section.

How it got here:

1. **Until 2026-05-19, hybrid**: each change was written both in
   `aiven/NN_*.sql` and in `scripts/`, and the two drifted apart whenever the
   mirror was forgotten.
2. **From 2026-05-20, incremental-only**: `aiven/` froze and every change went
   to `scripts/`. Installing meant the old baseline plus every script, and the
   result drifted from production in comments, column order and routine bodies.
   Changes from before 2026-04-25 that went straight into `aiven/` were rebuilt
   as `[RETROACTIVE]` scripts, for traceability.
3. **From 2026-11-26, snapshot** (ADR-050): `schema.sql` is the production
   structure, so a fresh install equals production by construction, and only the
   scripts dated after it run on top.

**When to change the model**: if more than one or two people change the schema
at once, or CI starts validating it, move to a tool (dbmate, Flyway, Prisma
Migrate). When scripts pile up, take a new snapshot instead (see "Fresh
install").

## Writing an idempotent script

Scripts must not fail or produce duplicate data if run twice. Patterns:

```sql
-- Adding a column
ALTER TABLE foo ADD COLUMN IF NOT EXISTS bar INT NULL;

-- Or guard with information_schema
SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'hotel_db'
    AND TABLE_NAME   = 'foo'
    AND COLUMN_NAME  = 'bar'
);
SET @sql = IF(@exists = 0, 'ALTER TABLE foo ADD COLUMN bar INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Inserting reference data
INSERT IGNORE INTO some_table (id, name) VALUES (1, 'value');

-- Creating a table
CREATE TABLE IF NOT EXISTS new_table (…);
```

Reference implementation:
`scripts/20260519_add_scheduling_employee_display_order.sql`.

## Fresh install

```bash
cd backend
pnpm setup:local          # refuses a DB that is not local or already has tables
pnpm setup:local -- --force   # drops an existing local hotel_db first
```

`scripts/setup-local.ts` creates `hotel_db`, loads `schema.sql` and
`catalogs.sql`, then only the incremental scripts dated after the snapshot
(`FIRST_SCRIPT_AFTER_SNAPSHOT`), then the departments, a local admin (`admin` /
`fourpoints-local`), `scheduling-seed.sql` and `mock-data.sql` (ADR-050).

`schema.sql` is the remote structure without rows, `DEFINER`, `AUTO_INCREMENT`
counters or `demo_snapshot_*` tables; `catalogs.sql` comes from a repo install,
never from production. Both are written by `scripts/snapshot-schema.sh`. To take
a new snapshot: dump the remote, load it without `DEFINER` into a separate DB,
run the script, review the result (the repo is public) and move the cut-off date
in `setup-local.ts`.

**Never run `MASTER_INSTALL.sql` or `aiven/NN_*.sql`**, and never against a DB
with data: they drop or duplicate rows and build the old schema.

## Production schema

The repo and the remote database must describe the same schema. On 2026-11-26 a
copy of the remote was compared with a repo install, object by object
(`scripts/compare-schema.sh`):

- **Matched**: the table, view, trigger, routine, event and column counts,
  indexes, foreign keys, `CHECK`s, view and event bodies, 8 of 10 catalogs and
  the server settings (version, `sql_mode`, time zone, `lower_case_table_names`,
  `event_scheduler`, binary log, collations).
- **Differed, and how it was solved:**
  - `parking_rates` had other prices in production. The table went away: a
    booking's price is typed by hand (`20261126_drop_parking_rates.sql`).
  - `v_bo_monthly_summary` and `trg_cashier_shift_update_daily` had been created
    from a `cp850` console in production; recreated with `utf8mb4`
    (`20261126_fix_charset_leftovers.sql`).
  - Form only — comments, column order in `users` and `scheduling_assignments`,
    comments stripped from bodies, the `ANSI` `sql_mode` of triggers and
    routines inherited from the previous host: the snapshot took production's
    version (ADR-050). None changes what the application does.
- **Result**: after a `setup:local` from the snapshot, zero differences.
- **Exception**: the `demo_snapshot_scheduling_*` tables, which the demo creates
  at runtime. `compare-schema.sh` leaves them out by default.

**Before writing a migration**, compare again; if anything differs, fix that
first:

1. Dump the remote with `backup/backup.ps1 -Target remote`.
2. Load the dump without its `DEFINER` clauses into a separate local DB.
3. `scripts/compare-schema.sh <that_db> hotel_db` against a fresh
   `pnpm setup:local -- --force`. Exit code 0 means no differences.
4. Drop the separate DB: it holds production data. Keep the output out of the
   repo.

## Applying a migration

`scripts/apply-migration.sh` runs one `scripts/YYYYMMDD_*.sql` against local or
remote. It reads the credentials from `backend/.env` (`LOCAL_DB_*` or
`REMOTE_DB_*`), passes the password through `MYSQL_PWD` so it never shows in the
command line, and verifies the remote TLS certificate with
`config/certs/ca-certificate.pem`. It refuses any other file.

```bash
cd backend/db-mysql/scripts
./apply-migration.sh local 20261004_add_messages_to_notifications_module.sql --dry-run
./apply-migration.sh local 20261004_add_messages_to_notifications_module.sql
./apply-migration.sh remote 20261004_add_messages_to_notifications_module.sql --dry-run
./apply-migration.sh remote 20261004_add_messages_to_notifications_module.sql
```

- Compare first ("Production schema") and dump the remote before applying there.
- `--dry-run` only checks the connection and prints the target; nothing runs.
- Each script prints its own result (a skip message or the new definition), so
  the output shows whether it changed anything.
- Running it twice is the idempotency check: the second run must skip.
- Then set the row's status in `INDEX.md` (`✅ local · ✅ remota`).

## Connecting to the remote database (production)

```bash
mysql -h HOST -P PORT -u USER -p --ssl-ca=../config/certs/ca-certificate.pem hotel_db
```

Host, port, user and password are the `REMOTE_DB_*` variables of `backend/.env`.
TLS required, verified against the server's CA in `ca-certificate.pem`. It is a
self-managed MySQL 8.4 (ADR-048), shared by production and preview.

## DB at a glance

- **Name:** `hotel_db`
- **Engine:** MySQL 8.4, `utf8mb4_0900_ai_ci`. Local in Docker
  (`docker-compose.yml` at the repo root), with the same version and settings as
  the remote (ADR-049).
- **In `schema.sql`:** 67 tables, 3 views, 6 triggers, 6 routines and 1 event.
  The demo also creates `demo_snapshot_scheduling_*` tables at runtime. Tables
  by module in `INDEX.md`.

### Roles

| ID  | Name            | Description         |
| --- | --------------- | ------------------- |
| 1   | `recepcionista` | Standard user       |
| 2   | `admin`         | Full admin          |
| 3   | `mantenimiento` | Maintenance staff   |
| 6   | `group-admin`   | Group administrator |

## Backups

Dumps go to `backup/` and are never committed (`.gitignore`): they hold real
data. Make them with `backup/backup.ps1` (`-Target local`, `remote` or `both`)
or `scripts/backup-local.sh`. The remote database has no scheduled backups: dump
it before a schema migration. Every script reads the credentials from
`backend/.env` (`scripts/local-env.sh` for the local ones); none may carry a
password.

## Known gotchas

1. **`aiven/` and `MASTER_INSTALL.sql` are not the schema.** They stop at
   2026-05-20 and list things the live databases never got:
   `aiven/17_notifications.sql` had `'messages'` in `notifications.module`, the
   live DB did not, and the urgent message notices failed silently until
   `20261004_add_messages_to_notifications_module.sql`. The schema is
   `schema.sql` + the `scripts/` dated after it; when in doubt, check
   `information_schema` on the target DB.
2. **Retroactive scripts.** Scripts tagged `[RETROACTIVE]` in `INDEX.md`
   document changes made by editing `aiven/NN_*.sql` before the incremental-only
   policy (pre-2026-04-25). They are idempotent no-ops against the live DBs and
   exist for traceability.
3. **`INDEX.md` is the source of truth for what's applied.** If a script is
   missing from the table, it's not tracked. Keep it up to date.
4. **No one-off data scripts.** One-time data fixers (the old
   `add-libre-number.ts` and `backfill-libre-numbers.ts`) and quick query
   scripts were removed on 2026-10-04: they carried the remote password and had
   already run. Write a new one only if it reads `backend/.env`, and drop it
   once applied.

## Cross references

- `INDEX.md` — tables by module + incremental migration log.
- [`docs/general/database/README.md`](../../docs/general/database/README.md) —
  public summary of the database.
- `docs/DECISIONS.md` — ADR-021 (applied scripts are never edited), ADR-048 (the
  remote database), ADR-049 (local in Docker) and ADR-050 (snapshot install).
