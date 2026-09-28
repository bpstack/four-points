# AGENTS.md

This file provides guidance to agent CLIs — **OpenCode** and Codex — when working with code in this
repository. Claude Code reads `CLAUDE.md` instead; both files must stay in sync on shared policy
(Context7 usage, DB migrations, commit conventions).

## Project Overview

**Four-Points** is a full-stack hotel Property Management System (PMS) built with Next.js frontend and Express backend. The system manages hotel operations including logbooks, parking, scheduling, maintenance, cashier, backoffice, and more.

## Tech Stack

### Frontend

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand, React Query (@tanstack/react-query)
- **UI Components**: NextUI, Headless UI, Heroicons
- **Form Handling**: React Hook Form + Zod validation
- **Package Manager**: pnpm

### Backend

- **Framework**: Express 5.1.0
- **Language**: TypeScript (ES modules, `type: "module"`)
- **Database**: MySQL (local + Aiven cloud)
- **Runtime**: tsx (no build step needed)
- **Authentication**: JWT in HttpOnly cookies (access 15 min + refresh 7 d)
- **Validation**: Zod
- **Testing**: Vitest
- **Package Manager**: pnpm

## Documentación actualizada (Context7 MCP)

Este repositorio asume que el MCP de **Context7** está registrado a nivel de usuario en el cliente
(no es una dependencia del proyecto y no aparece en ningún `package.json`). Estas reglas son la
contraparte de la sección homónima de `CLAUDE.md`: **la política es la misma, cambia solo el cliente.**

Comprobar que está disponible antes de confiar en él:

```bash
opencode mcp list     # debe mostrar context7 → Connected
```

Si no aparece, añadirlo a `~/.config/opencode/opencode.json` (config de usuario, no del proyecto):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}" }
    }
  }
}
```

La API key se lee de la variable de entorno `CONTEXT7_API_KEY` — nunca literal en el archivo. Si el
MCP no está disponible en la máquina actual, **dilo explícitamente en la respuesta** y sigue adelante
con el conocimiento propio; no finjas haber consultado documentación.

### Cuándo usarlo

Activación **reactiva y acotada**: solo al escribir o modificar código que toque una de las librerías
de abajo. Nunca como barrido ("revisa todo el proyecto contra la doc actual") — eso genera refactors
en cascada no pedidos.

Flujo: `resolve-library-id` → `query-docs` con el ID, **la versión de la tabla** y el tema concreto.
Si esa versión exacta no está indexada, usa la minor más cercana por debajo y di cuál consultaste.

### Versiones instaladas (fuente de verdad: los **lockfiles**, no los rangos `^` de los `package.json`)

| Librería                | Versión                      | Workspace | Nota                                                                                                                                                               |
| ----------------------- | ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `next`                  | **16.0.8**                   | frontend  | App Router + Turbopack. React 19.1.1                                                                                                                               |
| `@tanstack/react-query` | **5.90.11**                  | frontend  | v5: `isPending`, objeto único en `useQuery({...})`                                                                                                                 |
| `zod`                   | **3.25.76**                  | frontend  | ⚠️ v3. El rango es `^3.25.17`: resuelve a 3.25.76, mira el lockfile                                                                                                |
| `zod`                   | **4.0.5**                    | backend   | ⚠️ v4 — API distinta a la del frontend                                                                                                                             |
| `next-intl`             | **4.6.1**                    | frontend  | v4: `routing.ts` + `createNavigation`                                                                                                                              |
| `pdf-lib`               | **1.17.1**                   | frontend  | Verificar antes de tocar embebido de fuentes/imágenes                                                                                                              |
| `cloudinary`            | **2.8.0**                    | backend   | SDK v2, API distinta a la v1 de la mayoría de ejemplos                                                                                                             |
| `tailwindcss`           | **3.4.17**                   | frontend  | **v3, no v4** — nada de `@import "tailwindcss"` ni `@theme`                                                                                                        |
| `express`               | **5.1.0**                    | backend   | v5: async errors automáticos, path-to-regexp 8, `req.query` getter                                                                                                 |
| `zustand`               | **5.0.8**                    | frontend  | v5 sin selectores por defecto                                                                                                                                      |
| `react-hook-form`       | **7.66.0**                   | frontend  | Con `@hookform/resolvers` 5.x (breaking vs 3.x)                                                                                                                    |
| `react-day-picker`      | **9.11.1**                   | frontend  | v9 renombró props y variables CSS                                                                                                                                  |
| `multer`                | **2.0.2**                    | backend   | v2 rompe respecto a la 1.x de los ejemplos habituales                                                                                                              |
| `pdf-parse`             | **1.1.1**                    | backend   | **Fijado a v1 a propósito — no actualizar** (v2 → OOM en Render). Ver `backend/services/fnb/CLAUDE.md`                                                             |
| `vitest`                | **4.0.16**                   | backend   | API de mocks y `environment` distinta a v1/v2                                                                                                                      |
| `framer-motion`         | **12.23.22**                 | frontend  | ⚠️ v12 se sigue publicando como `framer-motion`, pero el paquete actual del proyecto upstream es `motion`. Importa de `framer-motion`, **nunca** de `motion/react` |
| `date-fns`              | **4.1.0**                    | frontend  | v4 añade el sistema de timezones y cambia varios imports respecto a v2/v3                                                                                          |
| `@nextui-org/react`     | **2.6.11**                   | frontend  | Paquete `@nextui-org`, **no** el rebrand `@heroui`                                                                                                                 |
| `recharts`              | **3.5.1**                    | frontend  | v3 cambió tipados y algunos defaults respecto a v2                                                                                                                 |
| `pdfjs-dist`            | **5.4.449**                  | frontend  | Configuración del worker distinta según major; sensible al bundler                                                                                                 |
| `xlsx`                  | **0.18.5**                   | frontend  | Distribuido fuera del registro público de npm; no asumir API de versiones más nuevas                                                                               |
| `typescript`            | 5.7.3 front / **5.9.3** back | ambos     | Versiones distintas por proyecto                                                                                                                                   |

Menor riesgo, pero verificar si se tocan: `nodemailer` 7.0.10, `node-cron` 4.2.1, `express-rate-limit`
8.2.1, `helmet` 8.1.0, `pino` 10.3.1, `archiver` 7.0.1, `mysql2` 3.14.2 (backend) / 3.15.0 (frontend).

**Zod está en dos majors distintas.** Nunca copies un schema entre `frontend/app/lib/schemas/` y
`backend/validations/` sin consultar la doc de ambas: en v4 cambian los mensajes de error
personalizados, `z.ZodError` y varios helpers de `z.string()`. Indica siempre el workspace al consultar.

Dependencias declaradas pero **sin uso real** en `frontend/`: `next-auth` (5.0.0-beta.25), `bcrypt`,
`mysql2`, `postgres`, `uuid`. No construyas nada sobre ellas — la auth es JWT propia, no NextAuth.

### Límites

- Context7 sirve para **verificar**, no para migrar. No actualices versiones ni "modernices" código
  existente que funciona sin petición explícita.
- Un `CLAUDE.md` de módulo puede fijar una versión por motivos operativos (memoria en Render,
  compatibilidad con el host…). **Esa nota manda sobre esta tabla y sobre la doc oficial** — son
  restricciones de infraestructura que Context7 no conoce. `pdf-parse` en `services/fnb/` es el
  ejemplo vivo.
- Si detectas una API deprecada en código ya existente, **señálalo en la respuesta pero no lo cambies**.
- Si la doc actual recomienda un patrón distinto al del repo, sigue la convención del repo y menciona
  la discrepancia.
- No aplica a lógica de negocio, refactors internos ni debugging propio del proyecto — solo a la API
  de la librería.

## Common Commands

### Frontend (`/frontend`)

```bash
pnpm dev              # Start Next.js dev server with Turbopack (port 3000)
pnpm build            # Build production bundle
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
```

### Backend (`/backend`)

```bash
pnpm dev              # Start backend with tsx watch (port 4000)
pnpm dev:local        # Use local MySQL database
pnpm dev:aiven        # Use Aiven cloud database
pnpm start            # Start backend without watch
pnpm typecheck        # Run TypeScript type checking
pnpm test             # Run all tests with Vitest
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report
```

### Database

- SQL scripts are in `backend/db-mysql/`. Policy and schema overview: `backend/db-mysql/CLAUDE.md`
- ⚠️ **Never** run `MASTER_INSTALL*.sql` or `aiven/NN_*.sql` against a database that already holds
  data — both local and Aiven are populated. These are first-install scripts only.
- Any schema change goes in a new idempotent `backend/db-mysql/scripts/YYYYMMDD_*.sql`, plus a row in
  the "Migraciones incrementales" table of `backend/db-mysql/INDEX.md`.

## Convenciones de commits y push

Reglas de **obligado cumplimiento**. Están además forzadas por hooks en `.githooks/` (ver abajo):
si un mensaje las incumple, el commit se rechaza — no es una recomendación.

- **Idioma: inglés.** Subject y body, y también el cuerpo de las PRs (`gh pr create`). Nombres propios,
  identificadores y rutas técnicas pueden quedar en su idioma original.
- **Formato: Conventional Commits** — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`,
  `perf:`, `build:`, `ci:`, `style:`. Scope opcional: `feat(scheduling/solver): …`
- **Subject** en imperativo, ≤ 72 caracteres, sin punto final.
- **Body**: explica el _porqué_, no el _qué_ (eso ya lo cuenta el diff). Bullets cuando haya 3+ puntos
  independientes. Nada de mensajes vagos (`fix bug`, `update code`, `wip`).
- **Sin rastro de IA.** El historial debe leerse como trabajo humano. **Nunca** `Co-Authored-By:` de un
  asistente, **nunca** footers tipo `🤖 Generated with ...`, ni "AI-assisted", "generated by", ni
  emojis de bot. Aplica a subject, body, footers y comentarios de PR. Si tu plantilla por defecto los
  añade, elimínalos antes de commitear.
- **Footers**: solo metadatos reales (`Refs #123`, `Closes #45`).
- **Nunca `push` sin permiso explícito.** Crear commits en local está bien si el usuario pidió
  implementar o arreglar algo. Publicarlos requiere un "haz push" / "sube esto" del propietario en la
  misma sesión. Los commits locales se acumulan hasta entonces. `--force` contra `main` requiere orden
  directa.

### Formato de Markdown

Prettier con la config de la raíz (`.prettierrc`): tablas GitHub-flavored alineadas, `proseWrap:
preserve` (no se re-fluye la prosa) y `embeddedLanguageFormatting: off` (**no** se reformatea el código
dentro de los bloques ` ``` ` — respeta el estilo original de los ejemplos).

**Tablas solo para celdas cortas.** Prettier alinea las tablas pero no puede partir una celda, así
que una frase larga ensancha toda la tabla y el editor la descuadra. Si alguna fila supera las 100
columnas (`printWidth`) o una celda lleva más de una frase, usa una lista
(`- **clave**: descripción`) en lugar de una tabla. Vale para cualquier `.md` del repo (`docs/`
incluido) al crear una tabla o tocar una existente; las antiguas se corrigen cuando se editan.

```bash
./frontend/node_modules/.bin/prettier --write "*.md"
```

### Hooks de Git (activar una vez por clon)

Los hooks viven en `.githooks/` y **están versionados**, pero Git no los activa solo: `core.hooksPath`
es config local, así que hay que ejecutarlo una vez en cada máquina donde se clone el repo.

```bash
git config core.hooksPath .githooks
```

| Hook         | Qué hace                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `commit-msg` | Rechaza el commit si el mensaje contiene atribución de IA (`Co-Authored-By: Claude`, `Generated with`, `🤖`, `AI-assisted`…)       |
| `pre-push`   | Bloquea el push en sesiones **no interactivas** (agentes, scripts) y rechaza cualquier push no fast-forward contra `main`/`master` |

Notas:

- Son hooks **locales**: no consumen nada de GitHub (no son Actions) y no se aplican en el servidor.
- Push automatizado ya autorizado por el usuario: `FP_PUSH_OK=1 git push`. Esa variable **no** puentea
  la protección de force-push sobre `main`.
- `--no-verify` salta los hooks. Usarlo es una decisión consciente del propietario, nunca de un agente.

## Security

**L3** — estimated on 2026-09-28: hay login y cuentas de usuario, datos personales (usuarios,
lista negra de huéspedes con fotos, caja) y backend propio; el nivel L3 lo declara el propietario
como objetivo (`docs/DECISIONS.md` ADR-017), no es el estado actual.
**Re-estimate when:** Aiven pase a guardar datos reales de huéspedes o personal.

**Areas:**

- Authentication, Session, JWT tokens → `backend/controllers/auth/`, `backend/services/auth/`,
  `backend/middlewares/authenticateToken.ts`, `frontend/app/lib/auth/`, `frontend/proxy.ts`
- Authorization → `backend/middlewares/roleCheck.ts`, `backend/middlewares/demoRestriction.ts`
- API, Validation / errors → `backend/routes/`, `backend/controllers/`, `backend/validations/`,
  `backend/index.ts`
- File upload → rutas con multer en `backend/routes/`: `auth`, `backoffice`, `blacklist`,
  `checklist`, `fnb`, `maintenance`
- Data protection / privacy → `blacklist`, `cashier`, usuarios (`backend/repositories/auth/`)
- Configuration / DevOps → `backend/config/`, `frontend/vercel.json`, `frontend/next.config.ts`,
  `.env*`
- Logging / monitoring → `backend/config/logger.ts`
- Frontend → `frontend/app/`

## Architecture

### Backend Architecture

The backend follows a layered architecture pattern:

```
index.ts → routes → controllers → services → repositories → models
                         ↓
                    validations (Zod)
```

**Key Patterns:**

- **ES Modules**: All files use `.js` extensions in imports despite being TypeScript
- **Modular Services**: Each domain (auth, logbook, parking, scheduling, etc.) has its own:
  - `controllers/` - HTTP request handling
  - `services/` - Business logic
  - `repositories/` - Database access
  - `routes/` - Express route definitions
  - `validations/` - Zod schemas
  - `models/` - TypeScript types/interfaces

**Database Access:**

- Two MySQL configurations: local and Aiven (cloud)
- Environment variable `DB_ENVIRONMENT` controls which DB to use
- Connection pool managed in `config/config.ts`

**Authentication System:**

- JWT (`jsonwebtoken`) signed with `SECRET_JWT_KEY`. Access token 15 min, refresh 7 d (same secret).
- Both tokens travel in **HttpOnly cookies** (`access_token`, `refresh_token`); `Authorization: Bearer` is accepted as fallback.
- In production cookies are scoped to `.four-points.stackbp.es` (`controllers/auth/auth-controllers.ts:31`).
- Authentication middleware: `middlewares/authenticateToken.ts` (verifies JWT, then delegates to `demoRestriction`).
- Role-based access control via `middlewares/roleCheck.ts`.
- Frontend sends `credentials: 'include'` in all fetch requests.
- **No `express-session`, no MySQL `sessions` table, no `authenticateSession.ts`.** Older docs referenced a planned JWT→sessions migration that was never implemented; the system is and stays JWT.

**CORS Configuration:**

- Allows `localhost:3000`, Vercel domains, and production domains
- Dynamic origin validation with Vercel preview pattern matching
- Credentials enabled for cookie transmission

### Frontend Architecture

The frontend uses Next.js App Router with server and client components:

**Directory Structure:**

```
app/
├── (auth)/          # Auth routes (login)
├── dashboard/       # Protected dashboard routes
│   ├── logbooks/
│   ├── parking/
│   ├── scheduling/
│   └── ...
├── components/      # Reusable UI components
├── lib/            # Utilities, API clients, types
│   ├── apiClient.ts        # Client-side API wrapper
│   ├── serverFetch.ts      # Server-side API wrapper
│   ├── auth/               # Auth utilities
│   ├── schemas/            # Zod validation schemas
│   └── [domain]/           # Domain-specific utilities
├── stores/         # Zustand stores
└── ui/             # Design system components
```

**Key Patterns:**

- **Server vs Client Components**: By default components are server components. Use `'use client'` directive when:
  - Component has interactivity (onClick, onChange, etc.)
  - Component uses React hooks (useState, useEffect, etc.)
  - Component accesses browser APIs
- **Data Fetching**: Use React Query for client-side data fetching, server actions for mutations
- **API Communication**:
  - Client-side: `apiClient.ts` (wraps fetch with auth)
  - Server-side: `serverFetch.ts` (for Server Components/Actions)
- **Authentication**:
  - Global `AuthContext` provides `user`, `login`, `logout`, `isAuthenticated`
  - Protected routes use `useAuthContext()` hook
  - Dashboard layout handles auth redirect logic

**Font System:**

- Fonts configured in `app/ui/fonts-design/`
- Change active font in `fonts.helper.ts` (ACTIVE_FONTS variable)
- Apply via Tailwind classes: `font-sans`, `font-display`

### Scheduling System (Complex Feature)

The scheduling module manages monthly staff schedules through **manual cell-by-cell editing** with **real-time validation**, with optional **automatic generation** via a CP-SAT solver.

**Core Concepts:**

- **Month states**: `draft` (editable) ↔ `published` (locked for staff view)
- **Cell locking**: Assignments with `source_constraint_id` are locked (seeded from approved constraints)
- **Constraint flow**: Create constraint → Approve → assignments auto-synced (shift applied + cell locked)
- **Retroactive constraints**: Admins can add constraints for past dates (e.g., sick days retroactively)
- **Auto-generation**: CP-SAT solver (`scheduling-solver/`) generates a full month respecting all hard constraints and locked cells

**Backend Components:**

- **Validator**: `services/scheduling/schedule-validator.ts` - Validates the full schedule on demand
- **Constraints (validator)**: `services/scheduling/constraints/` - Validation rules:
  - `consecutive-rest.constraint.ts` - Min rest hours between shifts
  - `monthly-libre.constraint.ts` - Min/max free days per month
  - `rotation-continuity.constraint.ts` - Rotation pattern rules
  - `employee-rules.constraint.ts` - Per-employee rules (fixed shift, no weekends, etc.)
- **Solver**: `scheduling-solver/` - Python CP-SAT solver (Google OR-Tools)
  - `daemon.py` - Proceso Python persistente; importa OR-Tools una vez al arrancar. Acepta peticiones JSON por stdin (newline-delimited), responde por stdout. Evita el coste de arranque por petición.
  - `model.py` - Builds and solves the CP-SAT model; incluye función objetivo soft (S1 balanceo noches, S2 libres sueltos, S3 preferencia turno)
  - `constraints/` - Hard constraint modules (coverage, rest, night_block, transitions, day_blocks, libres, locked_cells, employee_rules)
  - `schemas.py` - Pydantic input/output contracts (SolverInput / SolverOutput)
  - `tests/test_corpus.py` - Tests Python: ningún fixture crashea, fixtures resolubles dan status='ok'
  - `tests/test_daemon_stress.py` - Tests del daemon: arranque, requests válidas/inválidas, recuperación
- **Solver client**: `services/scheduling/solver-client.ts` - Gestiona el daemon Python: estado (idle/starting/ready), semáforo (peticiones secuenciales), abort-safe, warm-up al arrancar
- **Solver input builder**: `services/scheduling/build-solver-input.ts` - Fetches DB data, builds SolverInput JSON (locked cells, cross-month tail, employee rules, fixedDays pre-expansion, minNightBlock/maxNightBlock del config)

**Key Endpoints:**

- `GET /months/:id` - Full month data (days, assignments, constraints, stats)
- `GET /months/:id/info` - Approved constraints + employee rules panel data
- `POST /months/:id/generate` - Invoke CP-SAT solver, apply result to assignments
- `POST /months/:id/reset` - Wipe all assignments, re-seed from approved constraints
- `PATCH /assignments/:id` - Update single cell (returns 409 if cell is locked)
- `POST /assignments/bulk` - Bulk update assignments
- `POST /constraints/:id/approve` - Approve/reject + auto-sync affected assignments

**Solver rules (CP-SAT):**

- Approved requests (vacation V, bonificable B, baja_temporal IT) become locked cells — the solver respects them and never freely assigns special codes (V/B/IT/E/FO/A) to other employees
- Cross-month continuity: last 7 days of the previous month (draft or published) feed into the solver as virtual days (indices -7…-1), bloqueados desde el tail. Todos los constraints iteran sobre all_days = virtual_days + real_days de forma uniforme.
- Monthly libre minimum is reduced by the count of locked special-rest days per employee (V/B/E/IT/FO/A)
- **Night block rules (night_block.py)**:
  - Each employee who does nights does exactly 1 block of minNightBlock..maxNightBlock consecutive nights per month
  - `trailing_N = 0` → puede empezar bloque nuevo normalmente
  - `0 < trailing_N < minNightBlock` → bloque incompleto del mes anterior; prohibido iniciar bloque nuevo (debe completarlo al inicio del mes). **Excepción**: si las celdas necesarias para completar el mínimo están bloqueadas (ej: vacación), se levanta la restricción y puede iniciar bloque nuevo más adelante
  - `trailing_N >= minNightBlock` → bloque ya completado; puede iniciar bloque nuevo en el mes actual
  - `trailing_N >= maxNightBlock` → día 1 forzado a no-N (bloque en máximo)
- **Función objetivo soft** (minimiza suma ponderada):
  - S1 (W=10): balanceo de noches — minimiza rango(max-min) de noches acumuladas por empleado usando `nightsHistory` del repo
  - S2 (W=2): penaliza L aislado (sin L adyacente el día anterior o siguiente)
  - S3 (W=1): penaliza turnos distintos al `shiftPriority` del empleado
- `noWeekends` rule: solver forces L on Saturday/Sunday for the affected employee
- `fixedShift` rule: solver prohibits other work shifts (M/T/N) for the employee; only their fixed shift or L is allowed
- `fixedDays` rule: handled in `build-solver-input.ts` — the L-V/S-D pattern is pre-expanded and injected as lockedCells before the solver runs (approved requests/vacations take priority over fixedDays). Employees with `fixedShift=P` but no `fixedDays` are excluded from the solver entirely (unknown pattern).
- **Config**: todos los parámetros de `scheduling_config` (incluidos `minNightBlock`, `maxNightBlock`, `prefNightBlock`) se envían al solver desde `build-solver-input.ts`; Python usa sus valores de schema como fallback si falta alguno

**Shift Types:**

- Work shifts: M (Morning), T (Afternoon), N (Night), PI (Internal Support), P (Presencia)
- Off states: L (Free), V (Vacation), B (Bonificable/Holiday), E (Sick day), IT (Temp Disability), FO (Day Off), A (Unjustified absence)

**Frontend Components:**

- `SchedulingClient.tsx` - Main orchestrator
- `ScheduleGrid.tsx` - Interactive monthly grid (locked cells visually distinct)
- `MonthInfoPanel.tsx` - Shows approved constraints + employee rules
- `ValidationWarnings.tsx` - Real-time validation feedback (errors/warnings/info)
- `SchedulingConfigClient.tsx` - Config UI (employees, shifts, rules, requests tabs)
- PDF export in `lib/scheduling/export-pdf.ts`

**Configuration:**

- Schedule parameters (min/max staff per shift, rest hours, libre ranges) stored in `scheduling_config` table
- Employee-specific rules in `scheduling_employee_rules` table

#### Running the solver locally

The solver is a persistent Python daemon that the Node backend launches on startup and keeps alive for the entire server lifetime. Each generation request is one line of JSON sent over stdin; the response comes back as one line of JSON on stdout. OR-Tools is imported only once when the daemon starts, so subsequent generations are fast.

**One-time setup:**

```bash
cd backend/scheduling-solver
python -m venv venv                    # create local venv
venv/Scripts/pip install ortools pydantic pytest   # Windows
# venv/bin/pip install ortools pydantic pytest     # Linux/Mac
```

The venv lives under `backend/scheduling-solver/venv/` and is gitignored. On Render (production deploy), the build command needs to recreate it — see `TODO.md` "Deploy en Render".

**Day-to-day workflow:**

```bash
cd backend
pnpm dev:local              # backend + daemon Python launch automatically
```

When the backend boots, `services/scheduling/solver-client.ts` spawns `scheduling-solver/daemon.py` and calls `warmupSolver()` from `index.ts` so OR-Tools imports while the server is starting up. By the time the first request arrives, the daemon is ready (state `ready`).

The daemon's lifecycle states are managed in `solver-client.ts`:

- `idle` — not yet spawned
- `starting` — process spawned, waiting for "READY" handshake on stdout
- `ready` — accepting requests
- `busy` — currently solving a request (semaphore enforces sequential processing)

If the daemon dies unexpectedly (Python crash, OR-Tools error), the next call will detect the broken pipe and respawn it transparently.

**Triggering a generation from the UI:**

1. Open `http://localhost:3000/dashboard/scheduling`.
2. Pick a month in `draft` state (or create one via the month picker).
3. Click the "Generar horario" button. Frontend calls `POST /months/:id/generate`, which invokes `solver-client.ts → runSolver(input)`.
4. The solver returns either `{status: 'ok', matrix, stats}` or `{status: 'infeasible', conflictingConstraints, suggestedRelaxations}`. The controller in `controllers/scheduling/schedule-generate.controller.ts` applies the matrix to `scheduling_assignments` inside a transaction.

**Testing the solver in isolation (no Node):**

The Python solver has its own pytest suite that runs the entire fixture corpus directly through `model.solve()`. Use this when iterating on a constraint to skip the Node round-trip:

```bash
cd backend/scheduling-solver
venv/Scripts/python -m pytest tests/                # full Python suite (~15s, 103 tests)
venv/Scripts/python -m pytest tests/test_corpus.py  # only the corpus
venv/Scripts/python -m pytest tests/test_benchmark.py --runbenchmark   # 30×31 stress test
```

For the parity test that runs the Python solver against the TS validator (the actual cross-language sync check), use vitest from the backend root:

```bash
cd backend
pnpm vitest run tests/scheduling/solver-parity.test.ts   # ~5s
pnpm vitest run tests/scheduling/corpus.test.ts          # ~1s, no Python
```

**Debugging a specific month:**

There are three Node helpers in `backend/` (not in tests/) that connect directly to the local DB and inspect state without running the full server:

- `debug-compare.js` — list months in DB with their state.
- `debug-month.js` — print all assignments for a given month ID.
- `debug-sept.js` — full debug dump for a hardcoded month: employees, locked cells, the SolverInput JSON that would be sent, and the solver output.

Edit the month ID inside the script and run with `node debug-sept.js`. Useful when the solver returns `infeasible` in production and you want to inspect exactly what got sent to it.

#### Adding a new constraint

The system maintains the same rule logic in three places: the TS validator (real-time editing feedback), the Python solver (generation), and the JSON corpus (regression tests). Skipping any of them creates drift, which the parity test will eventually catch but slowly. The order below is the cheapest path to a closed loop.

**Step 1 — Decide hard vs soft and document it.**

Open `SCHEDULING-CONSTRAINTS.md`. If the rule is hard (a violation invalidates the schedule), add it to §2 with an `H` ID. If it is soft (a violation is acceptable but penalised), add it to §3 with an `S` ID, choose a tentative weight in the 1-10 range, and explain _why_ that weight relative to the others. The weight will be tuned in production; the relative ordering is what matters here.

If the rule depends on continuity across the month boundary, also list it in §9.5 (cross-month invariant) so future readers know to wire `previousMonthHistory` into it.

**Step 2 — Implement in the TS validator.**

Create `backend/services/scheduling/constraints/<rule-name>.constraint.ts` extending `BaseConstraint`. The constraint receives a `GeneratorContext` with `matrix`, `employees`, `days`, `config`, and `previousMonthHistory` (null on the first month). For hard rules, push entries through `this.warn(message, {severity: 'error', ...})`. For soft rules, use `this.softWarn(weightKey, units, message, ...)` which automatically pulls the weight from `soft-weights.ts` and accumulates `softPenalty` and `softPenaltyBreakdown`.

If you added a new soft weight, declare it in `services/scheduling/soft-weights.ts` with a JSDoc tag `@emitter` pointing to the constraint file. Constraints emit warnings with `severity: 'error'` for hard violations and `severity: 'warning'` for soft penalties. The split is: `validate()` returns `isValid: errors.length === 0`, plus a separate `softPenalty` total.

Register the constraint in `schedule-validator.ts`, inside the `ConstraintRegistry` block of `validate()`, alongside `CoverageConstraint` and `EmployeeRulesConstraint`. If your rule fits more naturally inside the per-employee loop of `runFinalValidation` (because it needs cumulative state per employee, like libre counts), inline it there instead.

**Step 3 — Implement in the Python solver.**

Create `backend/scheduling-solver/constraints/<rule_name>.py` exposing an `apply(model, x, input, employees, days, virtual_days_by_emp=None)` function. The signature matches every other constraint in that directory (cross-reference `coverage.py` or `rest.py` for templates).

The CP-SAT model variables are `x[employee_index, day_number, shift_code]` — boolean. For days inside the month, `day_number` ranges 1..N. For cross-month context, virtual days `-7..-1` are pre-blocked from `previousMonthTail` in `model.py`. To make a constraint cross-month aware, iterate over `all_days = virt_days + real_days` instead of just `day_numbers`. Several constraints (rest, transitions, day_blocks) already follow this pattern.

Hard constraints use `model.add(...)` to assert the rule. Soft constraints introduce reified boolean indicator variables (e.g. "is this day a violation?") and add weighted terms to `objective_terms` inside `solve()`. The S4 implementation in `model.py` (search for `W_SHORT_WORK_BLOCK`) is a clean reference for soft constraints with cross-month behaviour.

Wire your constraint into `model.solve()` by importing it and calling `apply()` after the existing constraints. Constraint order does not matter for correctness (CP-SAT is declarative), but grouping related rules together keeps the file readable.

If the constraint contributes to `softPenalty`, also accumulate its breakdown for the output. The pattern is to keep a list of `(indicator_var, weight)` tuples while building the model and read back `solver.value(var)` after `solver.solve()` to populate `stats.softPenaltyBreakdown[<key>]` — same key string as in `soft-weights.ts`.

**Step 4 — Add a fixture to the corpus.**

Create `backend/tests/scheduling-corpus/fixtures/Fnn-<descriptive-name>.json` following the schema in `_schema.ts`. The fixture has three sections:

1. `input` — month, employees, days, config, lockedCells, previousMonthHistory, and a fully-formed `assignments` matrix. The matrix should exercise the rule: for a hard violation, include a schedule that breaks it. For a soft test, include a schedule where the rule's penalty is calculable manually.
2. `expected.isValid` — true if the schedule has no hard errors, false otherwise.
3. `expected.violations` — list of matchers (type, severity, employeeId, day) that the validator must emit. Plus `expected.softPenalty` and `expected.softPenaltyBreakdown` for soft contributions.

If the fixture is intended to also pass through the Python solver (i.e. the schedule is solver-reachable), add its ID to `SOLVABLE_FIXTURES` in `scheduling-solver/tests/test_corpus.py` and to `PARITY_FIXTURES` in `tests/scheduling/solver-parity.test.ts`. Coverage-disabled fixtures (`minMorningStaff: 0`, etc.) are usually safe additions to both lists.

**Step 5 — Run the four test suites.**

```bash
cd backend
pnpm vitest run tests/scheduling/corpus.test.ts          # TS validator vs fixtures
pnpm vitest run tests/scheduling/solver-parity.test.ts   # Solver output → TS validator (no hard errors)
cd scheduling-solver
venv/Scripts/python -m pytest tests/test_corpus.py       # Python solver no crashes
```

All four must be green. If parity fails, the validator and solver disagree somewhere; if `test_corpus.py` errors, the Python constraint has a bug; if `corpus.test.ts` fails, the TS validator does. The error message points at the divergence — fix the side that disagrees with the spec in `SCHEDULING-CONSTRAINTS.md` (the spec is the source of truth, not the code).

**Step 6 — Document the decision.**

Append a brief entry to `SCHEDULING-DECISIONS-LOG.md` with the date, the rule, why it's hard or soft, and the chosen weight if applicable. This is the audit trail that lets a future agent (or you, six months later) understand why a constraint exists without spelunking through git history.

## Important Development Notes

### Backend Notes

1. **Import Extensions**: Always use `.js` extension in imports despite TypeScript:

   ```typescript
   import { something } from './file.js'  // Correct
   import { something } from './file'     // Wrong
   ```

2. **No Build Step**: Backend uses `tsx` directly, no compilation needed

3. **Environment Files**:
   - `.env` for backend configuration
   - Two database modes: `DB_ENVIRONMENT=local` or `DB_ENVIRONMENT=aiven`

4. **Auth is JWT** (HttpOnly cookies). The repo briefly contained plans to switch to `express-session`; those plans were dropped. Do not reintroduce `req.session` or look for a `sessions` table — it does not exist.

5. **Cron Jobs**: `services/cron/cron-service.ts` runs scheduled tasks, started in `index.ts`

6. **Error Handling**: Global error handler in `index.ts` catches all unhandled errors

7. **Testing**: Tests use Vitest and are located in `tests/` directory

### Frontend Notes

1. **Server Component First**: Default to server components, only add `'use client'` when needed

2. **Data Fetching**:
   - Server Components: Use `serverFetch` or direct fetch
   - Client Components: Use React Query with `apiClient`
   - Always include `credentials: 'include'` in fetch options

3. **Authentication Flow**:
   - Login → Backend sets `access_token` and `refresh_token` HttpOnly cookies
   - Frontend `AuthProvider` calls `GET /api/auth/me` on mount; on 401 it retries via `POST /api/auth/refresh-token`
   - `useAuthContext()` provides auth state globally

4. **Environment Variables**:
   - Client-accessible: `NEXT_PUBLIC_API_URL`
   - Server-only: Can use non-prefixed vars in Server Components

5. **Proxy vs Direct**: Frontend calls backend directly at `localhost:4000`, no Next.js API routes proxy

6. **Theme System**: Uses `next-themes` for dark/light mode switching

7. **Form Validation**: Use React Hook Form + Zod schemas from `lib/schemas/`

### Common Pitfalls to Avoid

1. **Don't mix server and client patterns**: Can't use `useState` in server components or `async` component functions in client components

2. **Don't forget credentials**: All API calls must include `credentials: 'include'` for auth cookies

3. **Don't modify code without permission**: Always ask before making code changes

4. **Database changes**: Coordinate SQL migrations between local and Aiven databases

5. **Module resolution**: Backend imports must use `.js` extension even for `.ts` files

## Module-Specific Guidance

### Logbook System

- Tracks hotel operational notes and tasks
- Supports read/unread status (stored in `logbook_history` table)
- Has comment system for entries
- Frontend: `app/dashboard/logbooks/` (plural)
- Backend: `controllers/logbook/`, `services/logbook/` (singular — el plural es solo la ruta del frontend)

### Parking System

- Manages hotel parking spaces and bookings
- Multiple sub-routes: stats, bookings, analytics
- Frontend: `app/dashboard/parking/`
- Backend: Multiple route files in `routes/parking/`

### Authentication System

- JWT (`jsonwebtoken`), signed with `SECRET_JWT_KEY`. Tokens are stateless (no DB lookup per request).
- Cookies: `access_token` (15 min) and `refresh_token` (7 d), both HttpOnly + SameSite=lax.
- Production cookie domain: `.four-points.stackbp.es`.
- Roles defined in `roles` table (admin, recepcionista, mantenimiento, group-admin, demo-admin). Enforcement in `middlewares/roleCheck.ts`.
- Demo user (`username: demo`) is **disabled** (`is_active=0`) since 2026-05-12. See `aiven/15_demo_user.sql` for context.

### Maintenance System

- Tracks maintenance requests and tasks
- Status workflow: pending → in-progress → completed
- Frontend: `app/dashboard/maintenance/`

### Messaging System

- Internal messaging between staff
- Real-time notifications
- ⚠️ **There is no `app/dashboard/messages/` route.** The UI is a panel inside the profile page:
  `app/components/profile/MessagesPanel.tsx`, with hooks and queries in `app/lib/messaging/`
- Backend: `controllers/messages/`, `repositories/messages/`, `routes/messages/messages-routes.ts`

## Code Search Commands

For searching code in Windows PowerShell:

```powershell
# Search in TypeScript/JavaScript files
Get-ChildItem -Recurse -Include *.ts,*.tsx -Path app | Select-String "pattern"

# Exclude node_modules and dist
Get-ChildItem -Recurse -Include *.js,*.ts -Exclude node_modules,dist | Select-String "pattern"
```

## Database Information

- **Database Name**: `hotel_db`
- **Key Tables**: users, logbook, parking, scheduling_months, scheduling_assignments, scheduling_solver_runs, scheduling_employee_requests, checklist_runs, demo_activity_log
- **Migrations**: Manual SQL scripts in `backend/db-mysql/`
- **Backups**: Store in `backend/db-mysql/backup/`

## External Services

- **Cloudinary**: Image upload and storage
- **Nodemailer**: Email notifications (configured but optional)

## Development Workflow

1. Start backend: `cd backend && pnpm dev:local`
2. Start frontend: `cd frontend && pnpm dev`
3. Access app at `http://localhost:3000`
4. API available at `http://localhost:4000`

## Notes

- The system uses Spanish for UI and some code comments
- ⚠️ **There is no dev-mode auth bypass.** Older docs mentioned a `DEV_MODE` flag in a
  `DashboardLayout` component: neither the flag nor that component exists anywhere in the repo.
  Auth is enforced in every environment by `app/dashboard/layout.tsx`, which calls `useAuth()` and
  redirects when there is no user. Do not write code that assumes it can be skipped locally.
