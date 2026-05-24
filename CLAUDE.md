# CLAUDE.md

Full-stack hotel PMS. Next.js 14 (App Router) frontend + Express 5 backend. TypeScript throughout. pnpm workspaces.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand, React Query, NextUI, React Hook Form + Zod
- **Backend**: Express 5, TypeScript (ES modules), MySQL (local + Aiven), tsx (no build step), Vitest
- **Auth**: JWT in HttpOnly cookies — `access_token` (15 min) + `refresh_token` (7 d), same `SECRET_JWT_KEY`
- **External**: Cloudinary (images/PDFs), Nodemailer (email, optional)

## Dev Commands

```bash
# Frontend (port 3000)
cd frontend && pnpm dev          # Turbopack dev server
cd frontend && pnpm build && pnpm start

# Backend (port 4000)
cd backend && pnpm dev:local     # local MySQL
cd backend && pnpm dev:aiven     # Aiven cloud MySQL
cd backend && pnpm typecheck && pnpm test

# DB_ENVIRONMENT=local | aiven  controls which DB the backend connects to
```

## Backend Conventions

- **Imports**: always use `.js` extension even in TypeScript — `import { x } from './file.js'`
- **No build**: `tsx` runs TypeScript directly; no `tsc` or `dist/` involved
- **Auth**: JWT only. No `express-session`, no `sessions` table — that migration was planned and dropped. Never reintroduce `req.session`.
- **Layering**: `routes → controllers → services → repositories → models`. Validations (Zod) sit between controller and service.
- **Cron**: `services/cron/cron-service.ts`, started in `index.ts`
- **Errors**: global error handler in `index.ts`; module-specific codes in `config/error-codes.ts`

## Frontend Conventions

- **Server components by default** — add `'use client'` only for interactivity, hooks, or browser APIs
- **API calls**: client-side → `lib/apiClient.ts`; server-side → `lib/serverFetch.ts`. Always `credentials: 'include'`.
- **Auth state**: `AuthContext` (provides `user`, `login`, `logout`). Protected routes use `useAuthContext()`.
- **Env vars**: `NEXT_PUBLIC_API_URL` for client; non-prefixed vars only in Server Components
- **Theme**: `next-themes` — dark/light via `.dark` class on `<html>`
- **Forms**: React Hook Form + Zod schemas from `lib/schemas/`

## Auth System

- Roles: `admin`, `recepcionista`, `mantenimiento`, `group-admin`, `demo-admin` (in `roles` table)
- Middleware: `middlewares/authenticateToken.ts` → `middlewares/roleCheck.ts`
- Production cookie domain: `.four-points.stackbp.es`
- Demo user (`username: demo`) disabled since 2026-05-12 (`is_active=0`)

## DB / Migrations

- Scripts in `backend/db-mysql/`. Policy and schema overview: **`backend/db-mysql/CLAUDE.md`**
- **Never** run `MASTER_INSTALL.sql` or `aiven/NN_*.sql` against a DB with data
- New schema change → `scripts/YYYYMMDD_*.sql` (idempotent) + row in `INDEX.md`

## Commit Conventions

- **Language**: subject and body in English
- **Format**: Conventional Commits — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `build:`, `ci:`, `style:`. Optional scope: `feat(scheduling/solver): …`
- **Subject**: imperative mood, ≤ 72 chars, no trailing period
- **Body**: explain the *why*. Bullets for 3+ independent points. No vague messages (`fix bug`, `wip`)
- **Footers**: `Refs #123`, `Closes #45` and similar metadata only

## Module Index

Each entry below points to a `CLAUDE.md` with module-specific context. Open Claude from the module's directory to load only the relevant files.

| Module | CLAUDE.md location(s) |
|---|---|
| **Scheduling** (CP-SAT solver, grid UI) | `backend/services/scheduling/` · `backend/scheduling-solver/` · `frontend/app/components/scheduling/` |
| **Checklist** (daily ops checklists, JSON sync rule) | `backend/services/checklist/` |
| **Logbook** (incident log, read/unread, audit trail) | `backend/services/logbook/` |
| **Parking** (bookings lifecycle, responsive reference) | `backend/services/parking/` · `frontend/app/dashboard/parking/` |
| **Maintenance** (7-state workflow, Cloudinary images) | `frontend/app/components/maintenance/` |
| **F&B / Restaurant** (Opera PDF parser, daily revenue) | `backend/services/fnb/` |
| **Cashier** (shifts, denominations, vouchers, PDF export) | `backend/services/cashier/` · `frontend/app/components/cashier/` |
| **Group Tracking** (bookings, payments, 4-status tracks) | `backend/services/group/` · `frontend/app/components/groups/` |
| **Backoffice** (suppliers, invoices, assets, batch-pay) | `backend/services/backoffice/` |
| **Blacklist** (banned guests, Cloudinary photos, audit trail) | `backend/services/blacklist/` |
| **DB / Migrations** (policy, schema, idempotent scripts) | `backend/db-mysql/` |

## Adding a New Module

When a new module grows complex enough to warrant its own doc:

1. Create `CLAUDE.md` in the most specific relevant directory (`backend/services/<module>/` or `frontend/app/components/<module>/`). If no `services/` dir exists, create it as a documentation anchor.
2. Write it in idiomatic technical English. Make it self-contained — a reader in that directory should not need the root to understand the module.
3. Add a row to the **Module Index** table above.
4. Commit as `docs(claude): split <module> module context into module file`.
