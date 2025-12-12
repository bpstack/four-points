# Four Points Hotel Logbook

README profesional para la plataforma **Four Points Hotel Logbook**: API REST de gestión hotelera (logbook, usuarios, parking, caja, grupos y conciliación) construida con **Node.js + Express + MySQL**, autenticación **JWT con access + refresh token**, control de roles y clientes web en Next.js.

---
## Índice
- [Descripción general](#descripción-general)
- [Tecnologías usadas](#tecnologías-usadas)
- [Diagrama del flujo de autenticación](#diagrama-del-flujo-de-autenticación)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Árbol de carpetas](#árbol-de-carpetas)
- [Variables de entorno](#variables-de-entorno)
- [Instalación paso a paso](#instalación-paso-a-paso)
- [Uso de la API](#uso-de-la-api)
- [Endpoints principales](#endpoints-principales)
- [Control de roles](#control-de-roles)
- [Ejemplos de solicitudes y respuestas](#ejemplos-de-solicitudes-y-respuestas)
- [Notas de seguridad](#notas-de-seguridad)
- [Mejoras futuras](#mejoras-futuras)
- [Créditos](#créditos)

---
## Descripción general
API REST para operaciones hoteleras:
- **Auth**: login, registro, refresh, logout, sesión actual.
- **Usuarios**: CRUD protegido por roles gerenciales.
- **Logbook**: crear, leer, marcar como leído, resolver, historial, comentarios y borrado por autor.
- **Parking**: plazas, vehículos, reservas con códigos públicos, estadísticas y analíticas.
- **Conciliación**: conciliaciones diarias y resúmenes mensuales.
- **Caja (Cashier)**: turnos, vales, pagos, denominaciones, reportes e historial.
- **Grupos**: timeline, pagos, estados, habitaciones, contactos y notificaciones asociadas.
- **Notificaciones y departamentos**: soporte a flujos internos.

Incluye control de roles (General Manager, Front Office Manager, Recepcionist) y cookies de sesión con JWT.

---
## Tecnologías usadas
- **Backend**: Node.js (ESM), Express 5, MySQL2 (pool async), JWT, bcrypt, cookie-parser, cors, dotenv, zod, dayjs.
- **Seguridad**: JWT (access 15m, refresh 8h), cookies HttpOnly, middlewares de autenticación y roles.
- **Frontend**: Next.js 15, React 19, NextAuth (en beta), TailwindCSS, TanStack Query, Zustand, Heroicons, NextUI.
- **Utilidades**: nodemailer, axios, passport/passport-jwt (legacy), TypeScript vía tsx/tsc.
- **Base de datos**: scripts SQL en `backend/db-mysql` (tablas core, logbook, parking, conciliación, caja, grupos).

---
## Diagrama del flujo de autenticación
```
Cliente → POST /api/auth/login (user+pass)
        ↳ genera access_token (15m) + refresh_token (8h) en cookies HttpOnly

Rutas protegidas → middleware authenticateToken
        ↳ lee cookie access_token (o Bearer), verifica JWT, inyecta req.user

Access expiró → POST /api/auth/refresh-token
        ↳ valida refresh_token, emite par nuevo de tokens + cookies

Logout → POST /api/auth/logout (protegido)
        ↳ limpia cookies access_token y refresh_token
```

---
## Arquitectura del proyecto
- **`index.js`**: arranque de Express, CORS, JSON, cookies y montaje de rutas.
- **`config/`**: configuración de puerto/JWT (`config.js`), conexión MySQL (`db.ts`), utilidades de fecha.
- **`middlewares/`**: `authenticateToken` (JWT en cookie/header) y `roleCheck` (isAdmin, isOwnerOrAdmin, etc.).
- **`routes/`**: módulos por dominio (auth, users, logbook, parking, cashier, conciliation, group, notifications, departments).
- **`controllers/`**: lógica por recurso; orquesta validaciones (Zod) y repositorios.
- **`repositories/`**: acceso a datos MySQL (consultas y operaciones CRUD especializadas).
- **`services/`**: helpers de negocio (tokens, historiales, notificaciones, PDFs, etc.).
- **`validations/`**: esquemas Zod/JS para payloads de entrada.
- **Frontend (`frontend/`)**: app Next.js con stores Zustand, componentes UI y capa de llamadas a la API.

---
## Árbol de carpetas
Resumen de alto nivel (backend y frontend):
```
backend/
  index.js
  config/ (db.ts, config.js, date-utils.js, certs/)
  controllers/ (auth, logbook, parking, cashier, conciliation, group, notifications, departments)
  middlewares/ (authenticateToken.js, roleCheck.js, conciliation.middleware.ts)
  routes/ (auth, logbook, parking, cashier, conciliation, group, notifications, departments)
  repositories/ (auth, logbook, parking, cashier, conciliation, group, notifications, departments)
  services/ (tokenService.js, logbookHistory-service.js, notification-generator-service.ts, invoicePdfService.js, etc.)
  validations/ (auth, logbook, parking, cashier, group)
  db-mysql/ (scripts SQL completos y guías)
  package.json, tsconfig.json, .env.example
frontend/
  app/ (rutas Next.js, libs, stores, ui, dashboard)
  public/ (assets)
  docs/ (PRODUCTION_AUTH_SETUP.md)
  package.json, tailwind.config.ts, .env.example
```

---
## Variables de entorno
### Backend (`backend/.env.example`)
| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto HTTP del API (por defecto 4000). |
| `NODE_ENV` | `development` o `production`. |
| `SECRET_JWT_KEY` | Clave para firmar JWT (obligatoria). |
| `SALT_ROUNDS` | Rondas de bcrypt (default 10). |
| `LOCAL_DB_HOST` | Host MySQL local. |
| `LOCAL_DB_PORT` | Puerto MySQL local (3306). |
| `LOCAL_DB_USER` | Usuario MySQL local. |
| `LOCAL_DB_PASSWORD` | Password MySQL local. |
| `LOCAL_DB_NAME` | Base de datos local. |
| `AIVEN_DB_HOST` | Host MySQL en Aiven. |
| `AIVEN_DB_PORT` | Puerto MySQL Aiven. |
| `AIVEN_DB_USER` | Usuario MySQL Aiven. |
| `AIVEN_PASSWORD` | Password MySQL Aiven. |
| `AIVEN_DB_NAME` | Base de datos Aiven. |
| `DB_ENVIRONMENT` | `local` o `aiven` (selecciona preset de conexión). |
| `SESSION_SECRET` | (para migración a express-session, si se habilita). |

### Frontend (`frontend/.env.example`)
| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la app. |
| `NEXT_PUBLIC_API_URL` | URL base de la API (ej. http://localhost:4000). |
| `DATABASE_URL` | Conexión temporal (no usada en prod). |
| `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` | Parámetros MySQL usados en local. |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Configuración NextAuth. |
| `JWT_SECRET` | Secreto JWT para NextAuth. |
| `STRIPE_*`, `SENDGRID_API_KEY`, `SENTRY_DSN`, `AWS_*` | Servicios externos (opcionales). |

---
## Instalación paso a paso
1) **Clonar repositorio**
```bash
git clone <repo>
cd Four-Points
```
2) **Backend**
```bash
cd backend
pnpm install
cp .env.example .env   # rellena valores reales
pnpm build              # opcional, genera dist
pnpm dev                # o pnpm dev:local / dev:aiven según DB_ENVIRONMENT
```
3) **Base de datos**
- Crea la base y ejecuta los scripts en `backend/db-mysql/` en orden (`MASTER_INSTALL.sql` o los numerados 01..11 + 99).
- Verifica conectividad con `test_db_conection.js` si lo usas.
4) **Frontend**
```bash
cd ../frontend
pnpm install
cp .env.example .env    # apunta NEXT_PUBLIC_API_URL al backend
pnpm dev                 # arranca Next.js (por defecto 3000)
```
5) **Acceso**
- API: `http://localhost:4000` (según `PORT`).
- Front: `http://localhost:3000`.

---
## Uso de la API
- Enviar credenciales con JSON y **cookies habilitadas** desde el cliente (CORS permite `credentials: true`).
- Tokens se sirven en cookies `access_token` (15m) y `refresh_token` (8h). En desarrollo, también puede usarse header `Authorization: Bearer <token>`.
- Para rutas protegidas: siempre pasar cookies o header Bearer.

---
## Endpoints principales
**Auth** (`/api/auth`)
- `POST /login` — login con cookies de tokens.
- `POST /register` — crear usuario.
- `POST /refresh-token` — renovar tokens (cookies o Bearer).
- `GET /me` — usuario actual (protegido).
- `POST /logout` — limpia cookies (protegido).

**Users** (`/api/users`) — protegido + solo managers (General Manager / Front Office Manager):
- `GET /` listar, `GET /role/:role`, `GET /:id`, `PUT /:id`, `DELETE /:id`.

**Logbook** (`/api/logbooks`)
- `POST /` crear; `PUT /:id` actualizar (protegido);
- `GET /all`, `/department/:departmentId`, `/author/:authorId`, `/priority/:importance`, `/day/:day`, `/trashed`;
- `DELETE /:id` solo autor; comentarios (`/:logbookId/comments` CRUD), reads/solve (`/:logbookId/read|solve|pending|readers|solved`).

**Parking**
- Plazas/Vehículos (`/api/parking/spots`, `/spots/available`, `/vehicles`, `/vehicles/search`, `/vehicles/:id`).
- Reservas (`/api/parking/bookings`): listar con filtros, crear, obtener/actualizar/borrar por `:code`, checkin/checkout/cancel/no-show.
- Stats (`/api/parking/stats` + subrutas pending-checkins/checkout) y analytics (`/api/parking/stats/analytics/*`).

**Cashier** (`/api/cashier`)
- Daily: `/daily/:date` (get/init/close/reopen/summary/list, monthly report).
- Shifts: `/shifts` CRUD, close/reopen, users, history.
- Vouchers: `/vouchers` CRUD, justify/cancel, stats, active.
- Payments: `/shifts/:shiftId/payments`, `/payments/:id`.
- Denominations: `/shifts/:shiftId/denominations`, `/denominations/:id`.
- Reports: `/reports/*` dashboard/daily/period/vouchers-history/shifts-summary.
- History: `/history`, `/history/stats`, `/history/shift/:shiftId`, `/history/recent`.

**Conciliation** (`/api/conciliations`)
- Listar (`/`), por día (`/day/:date`), por id (`/:id`), crear, actualizar formulario (`/:id/form`), cambiar estado (`/:id/status`), recalcular (`/:id/recalculate`), borrar (`DELETE /:id` admin). Sub-ruta mensual: `/monthly-summary/*`.

**Groups** (`/api/groups`)
- Dashboard overview/timeline; CRUD de grupos; pagos (`/:id/payments`), estados (`/:id/status/*`), rooms (`/:id/rooms/*`), contacts (`/:id/contacts/*`), history (`/:id/history`), notificaciones del grupo (`/:id/notifications`).

**Departments / Notifications**
- `GET /api/departments` y CRUD según implementación.
- `GET/POST /api/notifications` (rutas en `notifications-routes.ts`).

---
## Control de roles
- Roles principales: **General Manager**, **Front Office Manager**, **Recepcionist**.
- Middleware `authenticateToken` exige JWT válido.
- Middleware `roleCheck` implementa reglas:
  - `isAdmin` → solo admin (mapea a roles gerenciales).
  - `isOwnerOrAdmin` → usuario dueño del recurso o admin.
  - `canManageGroups`, `canViewGroups`, `canManageCashier`, `canViewReports` → controles específicos.
- Política clave: **solo managers** pueden leer/actualizar usuarios; **logbooks** solo pueden ser eliminados por su autor.

---
## Ejemplos de solicitudes y respuestas
### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "manager",
  "password": "Secret123"
}
```
Respuesta 200 (cookies set):
```json
{
  "success": true,
  "user": { "id": 1, "username": "manager", "role": "general_manager" },
  "token": "<access>",
  "refreshToken": "<refresh>" // sólo en dev
}
```

### Refresh token
```http
POST /api/auth/refresh-token
Authorization: Bearer <refresh_token>
```
Respuesta 200: nuevos tokens en cookies y body.

### Crear logbook
```http
POST /api/logbooks
Content-Type: application/json
Authorization: Bearer <access>

{
  "author_id": 1,
  "department_id": 2,
  "message": "Revisión de habitaciones terminada",
  "importance": "media"
}
```

### Eliminar logbook (solo autor)
```http
DELETE /api/logbooks/123
Authorization: Bearer <access>
```
Respuesta 200: `{"message":"Logbook eliminado (soft‑delete) correctamente"}`

### Crear booking de parking
```http
POST /api/parking/bookings
Authorization: Bearer <access>
Content-Type: application/json
{
  "spot_number": 5,
  "level_code": "-2",
  "expected_checkin": "2025-10-25 15:00",
  "expected_checkout": "2025-10-27 11:00",
  "booking_source": "direct"
}
```
Respuesta: incluye `booking_code` generado.

---
## Notas de seguridad
- Tokens solo en **cookies HttpOnly** en producción; en dev se permite Bearer para debug.
- Access token 15m + refresh 8h (rotación en refresh-token).
- CORS configurado con `credentials: true` y origen explícito (`http://localhost:3000` por defecto).
- `sameSite=lax` en dev, `strict` + `secure` en producción.
- No exponer `SECRET_JWT_KEY` ni contraseñas en repositorios.
- Validaciones de entrada con Zod/JS para evitar payloads malformados.
- Control de roles centralizado en middlewares; auditar rutas nuevas para requerir `authenticateToken` + rol correcto.

---
## Mejoras futuras
- Migrar a **express-session** con store MySQL (documentación ya incluida en `backend/README.md`) para invalidación de sesión server-side.
- Tests automatizados de integración (auth/logbook/parking) y cobertura en `node --test`.
- Endpoints de auditoría y dashboards de sesiones activas.
- Hardening CORS y listas de orígenes por entorno.
- Observabilidad: logs estructurados + métricas.

---
## Créditos
- Equipo Four Points Hotel Logbook.
- Desarrollo backend: Node.js/Express/MySQL.
- Desarrollo frontend: Next.js/Tailwind/NextUI.
