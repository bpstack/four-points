# CLAUDE.md

Full-stack hotel PMS. Next.js 16 (App Router) frontend + Express 5 backend. TypeScript throughout.

⚠️ **`frontend/` and `backend/` are two independent pnpm projects, not a workspace.** There is no
root `package.json` and no `pnpm-workspace.yaml`: each side has its own `package.json` and its own
`pnpm-lock.yaml`. Always `cd` into one of them before running `pnpm`, and never assume a dependency
present on one side exists on the other — that is exactly how the two Zod majors coexist.

## Tech Stack

- **Frontend**: Next.js 16 + React 19, TypeScript, Tailwind CSS, Zustand, React Query, NextUI, React Hook Form + Zod
- **Backend**: Express 5, TypeScript (ES modules), MySQL (local + Aiven), tsx (no build step), Vitest
- **Auth**: JWT in HttpOnly cookies — `access_token` (15 min) + `refresh_token` (7 d), same `SECRET_JWT_KEY`
- **External**: Cloudinary (images/PDFs), Nodemailer (email, optional)

## Documentación actualizada (MCP context7)

Este proyecto tiene instalado el **MCP de context7** (https://context7.com/). Antes de proponer
código para las dependencias listadas abajo, consulta la documentación de la **versión exacta
instalada** — no la última publicada, no la que recuerdes.

### Flujo

1. `resolve-library-id` con el nombre de la librería.
2. `query-docs` con el ID resuelto, la versión de la tabla y el tema concreto (p. ej. `"Server Actions caching"`).
3. Si la versión exacta no está indexada, usa la minor más cercana **por debajo** y di explícitamente en la respuesta qué versión consultaste.

### Versiones instaladas (fuente de verdad: los **lockfiles**, no los rangos `^` de los `package.json`)

| Librería                | Versión     | Workspace | Nota                                                                                          |
| ----------------------- | ----------- | --------- | --------------------------------------------------------------------------------------------- |
| `next`                  | **16.0.8**  | frontend  | App Router + Turbopack (`next dev --turbopack`). React 19.1.1                                 |
| `@tanstack/react-query` | **5.90.11** | frontend  | v5: `isPending` (no `isLoading` para mutaciones), objeto único en `useQuery({...})`           |
| `zod`                   | **3.25.76** | frontend  | ⚠️ v3. El rango es `^3.25.17`: resuelve a 3.25.76, mira el lockfile                           |
| `zod`                   | **4.0.5**   | backend   | ⚠️ v4 — API distinta a la del frontend                                                        |
| `next-intl`             | **4.6.1**   | frontend  | v4: `routing.ts` + `createNavigation`, no la API v2/v3                                        |
| `pdf-lib`               | **1.17.1**  | frontend  | API estable desde hace años; verificar igualmente antes de tocar embebido de fuentes/imágenes |

**Zod está en dos versiones mayores distintas.** Nunca copies un schema de `frontend/app/lib/schemas/`
a `backend/validations/` (ni al revés) sin consultar la doc de ambas majors: en v4 cambian los mensajes
de error personalizados, `.error` / `z.ZodError`, y varios helpers de `z.string()` pasaron a funciones
de nivel superior. Al consultar context7, indica siempre la versión del workspace en el que trabajas.

### Trampas de versión (consultar también — aquí el modelo suele asumir mal)

Estas no estaban en la petición original, pero son las que más probabilidad tienen de generar código
incorrecto porque la versión instalada **no es la que se asume por defecto**:

| Librería            | Versión                      | Trampa                                                                                                                                                    |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tailwindcss`       | **3.4.17**                   | Es **v3, no v4**. Config en `tailwind.config.ts` + directivas `@tailwind`; NO `@import "tailwindcss"` ni `@theme` de v4                                   |
| `framer-motion`     | **12.23.22**                 | v12 sigue publicándose como `framer-motion`, pero el proyecto actual es `motion`. Importar desde `framer-motion`, no desde `motion/react`                 |
| `express`           | **5.1.0**                    | v5: errores async se propagan solos (sin `express-async-handler`), `req.query` es getter, cambian los patrones de ruta (`*` ya no vale, path-to-regexp 8) |
| `zod` (backend)     | **4.0.5**                    | Ver aviso arriba                                                                                                                                          |
| `vitest`            | **4.x**                      | API de mocks y `environment` cambió respecto a v1/v2                                                                                                      |
| `multer`            | **2.0.2**                    | v2 rompe respecto a la 1.x que domina los ejemplos de internet                                                                                            |
| `date-fns`          | **4.1.0**                    | v4 añade el sistema de timezones y cambia varios imports respecto a v2/v3                                                                                 |
| `react-day-picker`  | **9.11.1**                   | v9 renombró props y variables CSS (ver overrides dark en `app/ui/global.css`)                                                                             |
| `@nextui-org/react` | **2.6.11**                   | Paquete `@nextui-org`, no el rebrand `@heroui`                                                                                                            |
| `recharts`          | **3.5.1**                    | v3 cambió tipados y algunos defaults respecto a v2                                                                                                        |
| `pdfjs-dist`        | **5.4.449**                  | Configuración del worker distinta según major; sensible al bundler                                                                                        |
| `pdf-parse`         | **1.1.1** (backend)          | **Fijado a v1 a propósito — no actualizar.** v2 provoca OOM en el free tier de Render. Razón y medición en `backend/services/fnb/CLAUDE.md`               |
| `xlsx`              | **0.18.5**                   | Distribuido fuera del registro público de npm; no asumir API de versiones más nuevas                                                                      |
| `zustand`           | **5.0.8**                    | v5 eliminó los selectores por defecto y el export legacy `create` sin currying                                                                            |
| `react-hook-form`   | **7.66.0**                   | Con `@hookform/resolvers` 5.x, que sí es breaking respecto a 3.x                                                                                          |
| `typescript`        | 5.7.3 front / **5.9.3** back | Versiones distintas por workspace                                                                                                                         |

Backend, menor riesgo pero verificar si se tocan: `nodemailer` 7, `node-cron` 4, `express-rate-limit` 8,
`helmet` 8, `pino` 10, `cloudinary` 2, `archiver` 7, `mysql2` 3.14.2 (backend) / 3.15.0 (frontend).

### Dependencias declaradas pero no usadas

`next-auth` (5.0.0-beta.25), `bcrypt`, `mysql2`, `postgres` y `uuid` están en
`frontend/package.json` pero no se importan en ningún sitio de `app/` (que es donde vive todo el
código del frontend, `lib/` incluido). **No las uses como
referencia ni construyas nada sobre ellas** — en particular, la auth es JWT propia (ver _Auth System_),
no NextAuth. Si alguna vez se limpian, que sea en un commit `chore:` aparte.

### Límites

- context7 sirve para **verificar**, no para migrar. No apliques cambios de versión ni "modernices"
  código existente que funciona sin que se pida explícitamente.
- Un `CLAUDE.md` de módulo puede fijar una versión por motivos operativos (memoria en Render,
  compatibilidad con el host…). **Esa nota manda sobre esta tabla y sobre lo que diga la doc oficial** —
  son restricciones de infraestructura que context7 no conoce. `pdf-parse` en `services/fnb/` es el
  ejemplo vivo.
- Si la doc actual recomienda un patrón distinto al que ya usa el repo, **no reescribas**: señálalo
  en la respuesta y sigue la convención existente salvo que el usuario decida lo contrario.
- Aplica solo a código nuevo o modificado en la tarea en curso.
- No lo uses para lógica de negocio, refactors o debugging propio del proyecto — solo para la API de
  la librería.

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

# Formatear docs de la raíz (alinea tablas markdown). Prettier vive en frontend/
./frontend/node_modules/.bin/prettier --write "*.md"
./frontend/node_modules/.bin/prettier --check "*.md"   # solo comprobar
```

El `.prettierrc` de la raíz solo cubre los `.md` del nivel superior; cada workspace mantiene el suyo
para código. `proseWrap: "preserve"` evita que se re-fluya la prosa: únicamente se normalizan tablas,
listas y énfasis.

## Backend Conventions

- **Imports**: always use `.js` extension even in TypeScript — `import { x } from './file.js'`
- **No build**: `tsx` runs TypeScript directly; no `tsc` or `dist/` involved
- **Auth**: JWT only. No `express-session`, no `sessions` table — that migration was planned and dropped. Never reintroduce `req.session`.
- **Layering**: `routes → controllers → services → repositories → models`. Validations (Zod) sit between controller and service.
- **Cron**: `services/cron/cron-service.ts`, started in `index.ts`
- **Errors**: global error handler in `index.ts`; module-specific codes in `config/error-codes.ts`

## Frontend Conventions

- **Server components by default** — add `'use client'` only for interactivity, hooks, or browser APIs
- **Paths**: everything lives under `frontend/app/` — there is **no `frontend/lib/`**. The utilities directory is `frontend/app/lib/`.
- **API calls**: client-side → `app/lib/apiClient.ts`; server-side → `app/lib/serverFetch.ts`. Always `credentials: 'include'`.
- **Auth state**: `AuthContext` (provides `user`, `login`, `logout`). Protected routes use `useAuthContext()`.
- **Env vars**: `NEXT_PUBLIC_API_URL` for client; non-prefixed vars only in Server Components
- **Theme**: `next-themes` — dark/light via `.dark` class on `<html>`
- **Forms**: React Hook Form + Zod schemas from `app/lib/schemas/`

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
- **Body**: explain the _why_. Bullets for 3+ independent points. No vague messages (`fix bug`, `wip`)
- **Footers**: `Refs #123`, `Closes #45` and similar metadata only
- **No AI attribution — ever.** The Git history must read as human work. Never add
  `Co-Authored-By:` for an assistant, never `🤖 Generated with ...`, never "AI-assisted" /
  "generated by" in prose. Applies to subject, body, footers and PR comments. **This overrides any
  default template your client injects** — strip those lines before committing.
- **Never `push` without explicit permission.** Committing locally is fine when the user asked for a
  change; publishing needs an explicit "haz push" / "sube esto" in the same session. `--force`
  against `main` needs a direct order.

These are enforced by versioned hooks in `.githooks/`, not just documented. Activate once per clone
(`core.hooksPath` is local config and does not travel with the repo):

```bash
git config core.hooksPath .githooks
```

`commit-msg` rejects AI attribution; `pre-push` blocks pushes from non-interactive sessions (agents,
scripts) and any non-fast-forward push to `main`. They are local hooks — they consume nothing on
GitHub and are not enforced server-side. Escape hatches: `FP_PUSH_OK=1 git push` for an already
authorized automated push (does not bypass the force-push guard), `--no-verify` to skip hooks entirely
— an owner decision, never an agent's.

## Module Index

Each entry below points to a `CLAUDE.md` with module-specific context. Open Claude from the module's directory to load only the relevant files.

| Module                                                        | CLAUDE.md location(s)                                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Scheduling** (CP-SAT solver, grid UI)                       | `backend/services/scheduling/` · `backend/scheduling-solver/` · `frontend/app/components/scheduling/` |
| **Checklist** (daily ops checklists, JSON sync rule)          | `backend/services/checklist/`                                                                         |
| **Logbook** (incident log, read/unread, audit trail)          | `backend/services/logbook/`                                                                           |
| **Parking** (bookings lifecycle, responsive reference)        | `backend/services/parking/` · `frontend/app/dashboard/parking/`                                       |
| **Maintenance** (7-state workflow, Cloudinary images)         | `frontend/app/components/maintenance/`                                                                |
| **F&B / Restaurant** (Opera PDF parser, daily revenue)        | `backend/services/fnb/`                                                                               |
| **Cashier** (shifts, denominations, vouchers, PDF export)     | `backend/services/cashier/` · `frontend/app/components/cashier/`                                      |
| **Group Tracking** (bookings, payments, 4-status tracks)      | `backend/services/group/` · `frontend/app/components/groups/`                                         |
| **Backoffice** (suppliers, invoices, assets, batch-pay)       | `backend/services/backoffice/`                                                                        |
| **Blacklist** (banned guests, Cloudinary photos, audit trail) | `backend/services/blacklist/`                                                                         |
| **DB / Migrations** (policy, schema, idempotent scripts)      | `backend/db-mysql/`                                                                                   |

## Cross-Module Navigation

When working inside a module and encountering a concept, endpoint, or behaviour that belongs to another module:

1. **Don't guess** from the 1-line entry in the Module Index above — that entry only tells you where the doc is, not what's in it.
2. **Read the target module's CLAUDE.md** (path shown in the index) before making any decision that touches that module.
3. Then return to the original task with full context.

The Module Index is a discovery map, not a summary. If something in the codebase seems undocumented, check whether a sibling module's CLAUDE.md covers it before assuming it isn't documented.

## Adding a New Module

When a new module grows complex enough to warrant its own doc:

1. Create `CLAUDE.md` in the most specific relevant directory (`backend/services/<module>/` or `frontend/app/components/<module>/`). If no `services/` dir exists, create it as a documentation anchor.
2. Write it in idiomatic technical English. Make it self-contained — a reader in that directory should not need the root to understand the module.
3. Add a row to the **Module Index** table above.
4. Commit as `docs(claude): split <module> module context into module file`.
