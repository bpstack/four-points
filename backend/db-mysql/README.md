# `backend/db-mysql/`

Everything about the database `hotel_db` (MySQL 8.4): how a fresh install is
built, how the schema changes, and the tools around it. This file says what each
thing is **for**; the rules are in [`AGENTS.md`](./AGENTS.md).

- **What the database holds and how it works:**
  [`docs/general/database/`](../../docs/general/database/README.md).
- **Tables by module and the migration log:** [`INDEX.md`](./INDEX.md).
- **A fresh local install** is `pnpm setup:local` from `backend/`; the local
  MySQL runs in Docker (see the [root README](../../README.md#run-it-locally)).

## What a fresh install loads

`pnpm setup:local` runs these, in this order:

- **`schema.sql`**: the structure of the production database (tables, views,
  triggers, routines, the event) as of 2026-11-26, with no rows. A fresh install
  starts from it, so it equals production by construction. Written by
  `scripts/snapshot-schema.sh`; never edited by hand.
- **`catalogs.sql`**: the fixed rows the application needs to work (roles,
  shifts, payment methods, parking spots, categories). Without them the screens
  would have nothing to show. Written by the same script, from a repo install,
  never from production.
- **`scripts/`, only the ones dated after the snapshot**: changes made since
  `schema.sql` was taken (none yet).
- **`scheduling-seed.sql`**: the demo's scheduling base (employees, contracts,
  months). Regenerated with `pnpm seed:scheduling:export`.
- **`mock-data.sql`**: fictitious data for the other modules, with dates
  relative to today, so no screen is empty. It **clears** the module data first:
  it is for local and the demo reset, never for a real database.

The local admin (`admin` / `fourpoints-local`) and the departments are created
by `setup-local.ts` itself.

## How the schema changes

- **`scripts/YYYYMMDD_*.sql`**: one migration per change, idempotent, applied to
  local and then to the remote database. The ones dated up to 2026-11-26 are
  already inside `schema.sql`: they are history and a fresh install does not run
  them. They are never edited (ADR-021).
- **`scripts/apply-migration.sh`**: applies one migration to local or remote
  (`--dry-run` first).
- **`scripts/compare-schema.sh`**: lists the differences between two databases.
  Run it before every migration to confirm local and production still match.
- **`scripts/snapshot-schema.sh`**: writes `schema.sql` and `catalogs.sql`
  again, when the scripts pile up and a new snapshot is worth taking.
- **`scripts/backup-local.sh`**: dumps the local database into `backup/` (the
  Bash twin of `backup/backup.ps1`, for Ubuntu).
- **`scripts/local-env.sh`**: reads the local credentials from `backend/.env`;
  the other scripts source it. It holds no password.
- **`INDEX.md`**: the log of which migration was applied where. If a script is
  not there, it is not tracked.

## Dumps

- **`backup/`**: database dumps, never committed (they hold data). Only
  `backup.ps1` is versioned: `-Target local`, `remote` or `both`. The remote
  database has no scheduled backups, so dump it before a schema migration.

## History, not used

- **`_archive/aiven/`**: the base schema of 2026-05-20, named after the host the
  database had until 2026-11-16. A fresh install no longer loads it and it is
  never run: it would drop tables. It stays because some applied scripts cite it
  in their rollback notes, and those scripts are never edited.
