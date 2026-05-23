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
- **Authentication**: JWT in HttpOnly cookies (access 15 min + refresh 7 d)
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
- **Política vigente (desde 2026-05-20):** solo incrementales. `aiven/NN_*.sql` está **congelado** como snapshot del install base. Todo cambio nuevo va a `backend/db-mysql/scripts/AAAAMMDD_*.sql` (idempotentes). Detalle completo en `MIGRATIONS_POLICY.md`.
- Initial install: `MASTER_INSTALL.sql` (sólo contra BD vacía — no usar contra BDs con datos).
- Reconstrucción desde cero = `MASTER_INSTALL.sql` + todos los `scripts/*.sql` en orden cronológico.

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

Gestiona horarios mensuales del personal con edición manual celda a celda + validación en tiempo real, y generación automática vía solver CP-SAT (Python). Es el módulo más complejo del proyecto; su documentación está dividida en archivos modulares:

- **`backend/services/scheduling/CLAUDE.md`** — backend TS: conceptos del módulo (month states, cell locking, constraint flow, retroactive), validator, constraints TS, soft-weights, build-solver-input, solver-client, controllers, endpoints, shift types, configuration tables, importador histórico, **guía completa cross-lenguaje para añadir una constraint nueva**.
- **`backend/scheduling-solver/CLAUDE.md`** — solver Python CP-SAT: daemon, modelo, hard constraints, función objetivo soft (S1-S4), cross-month con días virtuales, infeasibility analyzer, setup local, tests, debug helpers.
- **`frontend/app/components/scheduling/CLAUDE.md`** — UI del grid, modales de config, auth gate (admin-only), React Query, shift styles, PDF export, patrones responsive, gotchas de DayPicker + i18n.

Cuando trabajes en este módulo, abre Claude desde el directorio más específico posible para que cargue solo el contexto relevante; los conceptos globales del módulo viven en el `CLAUDE.md` del backend TS.

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

### Checklist System

Checklists operacionales diarios (mañana / tarde / night audit). Definición de steps en JSONs duplicados en `backend/content/checklist/tasks/` y `frontend/content/checklist/tasks/` (regla de sync crítica). Backend tracking de estado en DB + cron de reset diario y purga semanal del event log. **Documentación completa en `backend/services/checklist/CLAUDE.md`** (arquitectura, lifecycle del run, regla de sync, endpoints, gotchas, frontend).

### Logbook System

Libro de incidencias operativas del hotel: entradas con importancia, comentarios, read/unread per user, solve/reopen, soft delete con recovery, audit log completo en `logbook_history` + `logbook_comments_history`. Solo el autor edita/borra sus propias entradas (no hay admin override). **Documentación completa en `backend/services/logbook/CLAUDE.md`** (tablas, endpoints, mapeo importance ES↔EN, hook `useLogbooks`, gotchas).

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
- **Key Tables**: users, logbook, parking, scheduling_months, scheduling_assignments, scheduling_solver_runs, scheduling_employee_requests, checklist_runs, demo_activity_log
- **Migrations**: solo incrementales. `aiven/NN_*.sql` congelado desde 2026-05-20. Todo cambio nuevo en `backend/db-mysql/scripts/AAAAMMDD_*.sql` (idempotentes). Política en `MIGRATIONS_POLICY.md`. **NUNCA** ejecutar `MASTER_INSTALL.sql` ni `aiven/NN_*.sql` contra una BD con datos. **NUNCA** editar archivos en `aiven/`. Registrar cada migración nueva en `backend/db-mysql/INDEX.md`.
- **Backups**: Store in `backend/db-mysql/backup/`

## External Services

- **Cloudinary**: Image upload and storage
- **Nodemailer**: Email notifications (configured but optional)

## Development Workflow

1. Start backend: `cd backend && pnpm dev:local`
2. Start frontend: `cd frontend && pnpm dev`
3. Access app at `http://localhost:3000`
4. API available at `http://localhost:4000`

## Commit conventions

- **Language:** subject and body in **English**. UI strings, Spanish identifiers and file paths may remain in their original language inside the body when necessary.
- **Format:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `build:`, `ci:`, `style:`). Optional scope: `feat(scheduling/solver): ...`.
- **Subject:** imperative mood, ≤ 72 characters, no trailing period.
- **Body:** explain the *why*, not the *what*. Use bullets when there are 3+ independent points. Reference files/functions only when the diff doesn't make them obvious. Avoid vague messages (`fix bug`, `update code`, `wip`).
- **Footers:** reserve for issue references (`Refs #123`, `Closes #45`) and similar metadata.

## Notes

- The system uses Spanish for UI and some code comments
- Development mode bypass exists for auth (check `DashboardLayout` for DEV_MODE)
