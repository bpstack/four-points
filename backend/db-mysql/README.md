# `backend/db-mysql/`

Schema, migrations and seed data of `hotel_db` (MySQL 8.4).

- **What the database holds and how it works:**
  [`docs/general/database/`](../../docs/general/database/README.md).
- **Rules** — migration policy, fresh install, comparing with production,
  applying a migration, backups: [`AGENTS.md`](./AGENTS.md).
- **Tables by module and the migration log:** [`INDEX.md`](./INDEX.md).

A fresh local install is `pnpm setup:local` from `backend/`; the local MySQL
runs in Docker (see the [root README](../../README.md#run-it-locally)).
