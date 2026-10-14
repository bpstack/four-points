# AGENTS.md — DB / Migrations

**Up:** [`backend/AGENTS.md`](../AGENTS.md) — `backend/` rules ·
[root `AGENTS.md`](../../AGENTS.md) — shared rules and module map.

> Single doc for `backend/db-mysql/`. Covers the migration policy, the frozen
> baseline, how to write a new incremental script, and how to reconstruct the
> schema from scratch. **Read this before touching any table.**

## The rule in one sentence

Every schema change goes in a new `scripts/YYYYMMDD_<description>.sql` file,
idempotent, registered in `INDEX.md`. Nothing else.

## Layout

```
backend/db-mysql/
├── aiven/             # FROZEN baseline snapshot (2026-05-20). Never edit.
│   ├── 01_create_database.sql … 20_checklist.sql
│   └── 99_verification.sql
├── scripts/           # Incremental migrations — the single source of truth
│   ├── 20251220_add_backoffice.sql
│   ├── 20251222_add_user_avatar_columns.sql
│   ├── … (chronological order)
│   ├── apply-migration.sh  # Applies one migration to local or Aiven
│   ├── local-env.sh        # Local credentials from backend/.env, sourced by the others
│   ├── backup-local.sh     # Dumps the local DB into backup/
│   ├── check-collation.sh  # Shows the local DB collation
│   └── recreate-local.sh   # ⚠️ Drops the local DB and runs MASTER_INSTALL.sql only
├── backup/            # DB dumps (local + Aiven), git-ignored; backup.ps1
├── MASTER_INSTALL.sql # Runs all aiven/ files in order. Empty DB only.
├── MIGRATIONS_POLICY.md
├── INDEX.md           # Full table index + incremental migration log
├── mock-data.sql      # Clears module data and loads fictitious data (keeps users and scheduling)
└── scheduling-seed.sql # Demo scheduling base: employees, contracts, months
```

`recreate-local.sh` predates `pnpm setup:local` and does less: no baseline
fixes, no incremental scripts, no admin. Use `pnpm setup:local` instead.

## Migration policy (since 2026-05-20)

**Incremental-only.** Rails/Django/Flyway style.

- **`aiven/NN_*.sql` are frozen**: Snapshot of install base at 2026-05-20. Each
  file has a `⚠️ FROZEN` header. **Never edit.**
- **New schema change**: New file in `scripts/YYYYMMDD_<description>.sql`.
  Idempotent. Applied to live DB.
- **Register in `INDEX.md`**: Add a row to the "Migraciones incrementales"
  table: date, file, description, status per env (`✅ local · ✅ Aiven`,
  `⏳ pendiente`).
- **Never modify a committed script**: If something went wrong, create a new
  `YYYYMMDD_fix_…sql` that corrects it.
- **Apply order**: Local first, then Aiven, with `scripts/apply-migration.sh`
  (see "Applying a migration"). Update `INDEX.md` status after each.
- **Charset / collation**: Always `utf8mb4` / `utf8mb4_0900_ai_ci`.

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

## Reconstruct from scratch

```bash
cd backend
pnpm setup:local          # refuses a DB that is not local or already has tables
pnpm setup:local -- --force   # drops an existing local hotel_db first
```

`scripts/setup-local.ts` runs `MASTER_INSTALL.sql`, then only the incremental
scripts from `20260521` on (the earlier ones are already in the baseline), then
the departments, a local admin (`admin` / `fourpoints-local`),
`scheduling-seed.sql` and `mock-data.sql`. Running `MASTER_INSTALL.sql` by hand
fails: the frozen baseline has a duplicated key name in `cashier_history` and
creates `scheduling_assignments` before the table it references. The script
patches both in memory; `20261005_complete_fresh_install.sql` creates what the
baseline leaves out.

Idempotency guarantees applying all scripts twice leaves the DB intact.

**Never run `MASTER_INSTALL.sql` or `aiven/NN_*.sql` against a DB that already
has data.** They will overwrite or duplicate rows.

## Applying a migration

`scripts/apply-migration.sh` runs one `scripts/YYYYMMDD_*.sql` against local or
Aiven. It reads the credentials from `backend/.env` (`LOCAL_DB_*`, or
`AIVEN_DB_*` and `AIVEN_PASSWORD`), passes the password through `MYSQL_PWD` so
it never shows in the command line, and verifies Aiven's TLS certificate with
`config/certs/ca-certificate.pem`. It refuses any other file.

```bash
cd backend/db-mysql/scripts
./apply-migration.sh local 20261004_add_messages_to_notifications_module.sql --dry-run
./apply-migration.sh local 20261004_add_messages_to_notifications_module.sql
./apply-migration.sh aiven 20261004_add_messages_to_notifications_module.sql --dry-run
./apply-migration.sh aiven 20261004_add_messages_to_notifications_module.sql
```

- `--dry-run` only checks the connection and prints the target; nothing runs.
- Each script prints its own result (a skip message or the new definition), so
  the output shows whether it changed anything.
- Running it twice is the idempotency check: the second run must skip.
- Then set the row's status in `INDEX.md` (`✅ local · ✅ Aiven`).

## Connecting to Aiven (production)

```bash
mysql -h HOST -P PORT -u USER -p --ssl-ca=../config/certs/ca-certificate.pem hotel_db
```

Host, port, user and password are the `AIVEN_DB_*` and `AIVEN_PASSWORD`
variables of `backend/.env`. SSL required.

## DB at a glance

- **Name:** `hotel_db`
- **Engine:** MySQL 8.0+ (`utf8mb4_0900_ai_ci`)
- **67 tables + 3 views** declared between the baseline and `scripts/`, across
  core, logbook, parking, conciliation, groups, cashier, blacklist, maintenance,
  messages, notifications, backoffice, scheduling, checklist, F&B and demo. The
  demo also creates `demo_snapshot_scheduling_*` tables at runtime.
- Full table list in `INDEX.md`.

### Roles

| ID  | Name            | Description         |
| --- | --------------- | ------------------- |
| 1   | `recepcionista` | Standard user       |
| 2   | `admin`         | Full admin          |
| 3   | `mantenimiento` | Maintenance staff   |
| 6   | `group-admin`   | Group administrator |

## Backups

Dumps go to `backup/` and are never committed (`.gitignore`): they hold real
data. Make them with `backup/backup.ps1` (local and Aiven) or
`scripts/backup-local.sh`. Every script reads the credentials from
`backend/.env` (`scripts/local-env.sh` for the local ones); none may carry a
password.

## Known gotchas

1. **`MASTER_INSTALL.sql` is out of date.** It reflects the schema as of
   2026-05-20, not today. For the current schema, you need baseline + all
   `scripts/` in order.
2. **Retroactive scripts.** Scripts tagged `[RETROACTIVE]` in `INDEX.md`
   document schema changes that were made by directly editing `aiven/NN_*.sql`
   before the incremental-only policy existed (pre-2026-04-25). They are
   idempotent no-ops against the current live DB — they exist purely for
   traceability.
3. **`INDEX.md` is the source of truth for what's applied.** If a script is
   missing from the table, it's not tracked. Keep it up to date.
4. **No one-off data scripts.** One-time data fixers (the old
   `add-libre-number.ts` and `backfill-libre-numbers.ts`) and quick query
   scripts were removed on 2026-10-04: they carried the Aiven password and had
   already run. Write a new one only if it reads `backend/.env`, and drop it
   once applied.
5. **The frozen baseline is not the live schema.** `aiven/NN_*.sql` may list
   things the live databases never got: `aiven/17_notifications.sql` had
   `'messages'` in `notifications.module`, Aiven did not, and the urgent message
   notices failed silently until
   `20261004_add_messages_to_notifications_module.sql`. Before relying on a
   column, check `information_schema` on the target DB.

## Cross references

- `MIGRATIONS_POLICY.md` — full policy rationale and when to change the model.
- `INDEX.md` — module-by-module table list + full incremental migration log.
- Fresh install: `pnpm setup:local` (`scripts/setup-local.ts`), never
  `MASTER_INSTALL.sql` by hand.
