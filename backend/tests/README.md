# Backend tests

How to run them is in `docs/general/README.md` (`pnpm test` in `backend/`).

Two kinds live here:

- **Self-contained** (most of them): Zod schemas, middlewares and pure
  helpers, some against a real Express app on a random port. They need no
  `.env` and no database.
- **Need `.env`** (8 files: `auth/`, `checklist/checklist.test.ts`, `fnb/`,
  `scheduling/corpus.test.ts`, `scheduling/employee-requests-repository.test.ts`,
  `scheduling/solver-parity.test.ts`): they load `SECRET_JWT_KEY` or
  `config/db.ts`, and those using the database run against the configured one
  (today the shared Aiven database). Without `.env` the file fails to load.
