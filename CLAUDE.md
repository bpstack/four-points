# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Four-Points** is a full-stack hotel Property Management System (PMS) built with Next.js frontend and Express backend. The system manages hotel operations including logbooks, parking, scheduling, maintenance, cashier, backoffice, and more.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
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
- **Authentication**: Cookie-based sessions with JWT
- **Validation**: Zod
- **Testing**: Vitest
- **Package Manager**: pnpm

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
- SQL scripts are in `backend/db-mysql/`
- Use `MASTER_INSTALL_LOCAL.sql` for local setup
- Use `MASTER_INSTALL_AIVEN.sql` for cloud setup

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
- Cookie-based with `express-session`
- Session data stored in MySQL `sessions` table
- Authentication middleware: `middlewares/authenticateSession.ts`
- Role-based access control via `middlewares/roleCheck.ts`
- Frontend sends `credentials: 'include'` in all fetch requests

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

4. **Session vs JWT**: The system migrated from JWT to sessions. Old JWT code exists but is not active.

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
   - Login → Backend sets `hotel_session` cookie
   - Frontend `AuthProvider` checks session on mount
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
- Frontend: `app/dashboard/logbook/`
- Backend: `controllers/logbook/`, `services/logbook/`

### Parking System
- Manages hotel parking spaces and bookings
- Multiple sub-routes: stats, bookings, analytics
- Frontend: `app/dashboard/parking/`
- Backend: Multiple route files in `routes/parking/`

### Authentication System
- Migrated from JWT to session-based auth
- Sessions stored in MySQL
- Cookie name: `hotel_session`
- Session duration: 8 hours (configurable)
- Supports role-based access (admin, receptionist, etc.)

### Maintenance System
- Tracks maintenance requests and tasks
- Status workflow: pending → in-progress → completed
- Frontend: `app/dashboard/maintenance/`

### Messaging System
- Internal messaging between staff
- Real-time notifications
- Frontend: `app/dashboard/messages/`

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
- **Key Tables**: users, logbook, parking, scheduling_months, scheduling_assignments, sessions
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
- Development mode bypass exists for auth (check `DashboardLayout` for DEV_MODE)
