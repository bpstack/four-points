# Four-Points — Backend

REST API in Express 5 + TypeScript over MySQL 8, with the scheduling solver
(Python + OR-Tools) as a child process. To install and run the whole project,
see the [root README](../README.md).

## Layout

| Folder                                                  | What it holds                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `routes/`, `controllers/`, `services/`, `repositories/` | One folder per module                                                  |
| `middlewares/`                                          | Auth, roles, demo restrictions, rate limits, uploads                   |
| `config/`                                               | Database, CORS, logger, environment                                    |
| `db-mysql/`                                             | Schema, migrations and seeds ([policy](db-mysql/MIGRATIONS_POLICY.md)) |
| `scheduling-solver/`                                    | Python CP-SAT solver                                                   |
| `scripts/`                                              | `setup:local`, demo user, scheduling seed export                       |
| `tests/`                                                | Vitest suites ([notes](tests/README.md))                               |

## Commands

| Command                                              | Does                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm setup:local`                                   | Builds a local `hotel_db` with fictitious data and the local admin |
| `pnpm dev:local`                                     | API on :4000 against the local database                            |
| `pnpm test`                                          | Unit and integration tests                                         |
| `pnpm test:corpus`                                   | Solver corpus (needs the Python venv)                              |
| `pnpm typecheck` · `pnpm lint` · `pnpm format:check` | What CI runs                                                       |

Each module has an `AGENTS.md` under `services/` with its rules; the product
documentation lives in [`docs/`](../docs/general/README.md).
