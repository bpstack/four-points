# Backend tests

How to run them is in `docs/general/README.md` (`pnpm test` in `backend/`). Run
them from `backend/`: `auth/role-access.test.ts` reads the route files relative
to the working directory.

Three kinds live here:

- **Self-contained** (most of them): Zod schemas, middlewares and pure helpers,
  some against a real Express app on a random port. They need no `.env` and no
  database.
- **Need `SECRET_JWT_KEY`** (4 files in `auth/`: `demo-password-login`,
  `login-timing`, `role-access`, `token-service`). CI passes a dummy key.
- **Need the database** (7 files, listed in `NEEDS_DATABASE` in
  `vitest.config.ts`): they import `config/db.ts`, which needs the database
  credentials in `.env`, and run against the database `DB_ENVIRONMENT` selects
  (`local` by default). `SKIP_DB_TESTS=1` leaves them out, as CI does.

Measured on 2026-10-13 by running the suite without `.env`, with and without the
key.

Besides the per-module folders:

- `frontend/` tests dependency-free frontend helpers: the frontend has no test
  runner of its own.
- `scheduling-corpus/` holds the scheduling fixtures (`fixtures/*.json`, schema
  in `_schema.ts`) and their loader; `scheduling/corpus.test.ts` and
  `scheduling/solver-parity.test.ts` run them. See its own `README.md`.
- `fnb/fixtures/opera-revenue-sample.pdf` is a synthetic Opera report used by
  the F&B parser tests.

There is no `backend/test/` folder any more: it only fed a debug block of
`pdf-parse` v1, which the F&B parser now skips (`services/fnb/AGENTS.md`).
