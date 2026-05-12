# Four-Points — Roadmap

> **Qué contiene este documento:**
> Roadmap completo del proyecto Four-Points (Hotel PMS). Documenta módulo por módulo todas las
> funcionalidades diseñadas e implementadas, con su estado actual (completada, pendiente, con errores).
> Cada módulo se desglosa en: base de datos, backend (endpoints, servicios, repositorios), frontend
> (componentes, hooks, UI) y funcionalidades de usuario final.
>
> **Objetivo:** Tener una referencia centralizada del estado real del proyecto para planificar mejoras,
> detectar inconsistencias y priorizar trabajo futuro.
>
> **Cómo se documenta cada módulo:**
> Para cada módulo se recoge: (1) esquema de base de datos y tablas involucradas, (2) endpoints API
> completos con método HTTP y ruta, (3) arquitectura backend (controllers → services → repositories),
> (4) arquitectura frontend (páginas, componentes, hooks, stores), (5) listado de funcionalidades con
> estado ✅ completada / ⚠️ parcial / ❌ pendiente, (6) patrones de implementación relevantes,
> (7) observaciones sobre posibles mejoras o inconsistencias detectadas.

---

## Módulo 1: Authentication & Users ✅

Sistema de autenticación, gestión de usuarios y control de acceso basado en roles.
JWT con refresh tokens, cookies HttpOnly, rate limiting, restricciones de demo y perfil de usuario con avatar via Cloudinary.

### 1.1 Base de datos

2 tablas principales en `backend/db-mysql/aiven/02_core_tables.sql` + `18_user_avatar.sql`:

| Tabla | Propósito |
|---|---|
| `roles` | Roles del sistema (id, name). Seed: 1=recepcionista, 2=admin, 3=mantenimiento, 6=group-admin |
| `users` | Usuarios (UUID, username, email, password bcrypt, role_id FK, is_active, avatar_url, avatar_public_id, timestamps) |

**Campos destacados de `users`:**
- `id` — CHAR(36), UUID generado en creación
- `password` — hash bcrypt (SALT_ROUNDS configurable, default 10)
- `is_active` — TINYINT(1), soft-delete (0 = eliminado)
- `avatar_url` / `avatar_public_id` — Integración Cloudinary

### 1.2 Sistema de roles

| Rol | ID | Acceso |
|---|---|---|
| **admin** | 2 | Acceso total: crear usuarios, reset passwords, backoffice, reports, todos los módulos |
| **recepcionista** | 1 (default) | Operaciones generales: logbooks, parking, cashier. Sin backoffice ni scheduling |
| **group-admin** | 6 | Gestión de grupos, cashier, reports. Sin backoffice |
| **mantenimiento** | 3 | Solo módulo de mantenimiento. Bloqueado por `excludeMantenimiento` en el resto |
| **demo-admin** | runtime | Solo lectura excepto whitelist (logout, parking booking, logbook comment, maintenance report). Intentos bloqueados se registran en `demo_activity` |

### 1.3 Backend — Endpoints API

#### Públicos (sin auth)
- ✅ `POST /api/auth/login` — Login con username/password, devuelve access token (15 min) + refresh token (7 días) en cookies HttpOnly
- ✅ `POST /api/auth/refresh-token` — Regenera ambos tokens (sliding sessions)

#### Protegidos (usuario autenticado)
- ✅ `GET /api/auth/me` — Datos del usuario actual (password excluido)
- ✅ `POST /api/auth/logout` — Limpia cookies de autenticación
- ✅ `PATCH /api/auth/me/profile` — Cambiar username (requiere password actual, sanitización XSS, rate limited)
- ✅ `PATCH /api/auth/me/password` — Cambiar contraseña (requiere actual, fuerza re-login)
- ✅ `POST /api/auth/me/avatar` — Subir avatar a Cloudinary (max 2MB, JPEG/PNG/WebP/GIF)
- ✅ `DELETE /api/auth/me/avatar` — Eliminar avatar (borra de Cloudinary automáticamente)

#### Solo admin
- ✅ `POST /api/auth/register` — Crear usuario (solo admin real, no demo-admin)
- ✅ `GET /api/users` — Listar todos los usuarios activos
- ✅ `GET /api/users/role/:role` — Filtrar por rol
- ✅ `GET /api/users/:id` — Obtener usuario (owner o admin)
- ✅ `PUT /api/users/:id` — Modificar usuario (transaccional)
- ✅ `DELETE /api/users/:id` — Soft-delete (renombra username a `{original}_deleted_{timestamp}`)
- ✅ `POST /api/users/:id/reset-password` — Reset de contraseña sin verificación

### 1.4 Backend — Arquitectura

```
controllers/auth/
├── auth-controllers.ts       # Login, register, logout, refreshToken, me, updateProfile, updatePassword, avatar
└── user-controllers.ts       # CRUD admin de usuarios (getAll, getById, getByRole, update, delete, resetPassword)

repositories/auth/
└── user-repository.ts        # Todas las queries (create, login, getAll, getById, update, delete, avatar, etc.)

services/auth/
└── tokenService.ts           # generateAccessToken (15min), generateRefreshToken (7d), verifyToken

validations/auth/
└── user-validation.ts        # Zod: userSchema, updateProfileSchema, updatePasswordSchema + helpers

models/auth/
└── index.ts                  # Types: UserRole, User, UserRow, LoginDTO, TokenPayload, AuthResponse, etc.

routes/auth/
├── auth-routes.ts            # Rutas públicas + protegidas de auth
└── user-routes.ts            # Rutas admin de gestión de usuarios

middlewares/
├── authenticateToken.ts      # Extrae JWT de cookie/header, valida, adjunta user a req
├── roleCheck.ts              # isAdmin, isOwnerOrAdmin, isRealAdmin, canManageGroups, canManageCashier, excludeMantenimiento, etc.
├── rateLimiter.ts            # loginLimiter (5/15min), passwordChangeLimiter (3/h), profileUpdateLimiter (5/15min), apiLimiter (100/15min)
└── demoRestriction.ts        # Whitelist de operaciones permitidas para demo-admin
```

### 1.5 Seguridad

- ✅ **Hashing** — bcrypt con SALT_ROUNDS configurable
- ✅ **Timing-safe comparison** — Previene ataques de timing en login
- ✅ **HttpOnly cookies** — Tokens inaccesibles por JavaScript
- ✅ **Secure flag** — Solo HTTPS en producción
- ✅ **SameSite=lax** — Protección CSRF
- ✅ **Token expiry** — Access 15 min, refresh 7 días (sliding sessions)
- ✅ **Rate limiting** — Login (5/15min), password (3/h), profile (5/15min), API general (100/15min)
- ✅ **XSS prevention** — Sanitización de username (alfanumérico + underscore, max 50 chars)
- ✅ **Soft-delete** — Usuarios desactivados, username renombrado para liberar el nombre
- ✅ **Demo restrictions** — Whitelist de escritura, intentos bloqueados loggeados en BD

### 1.6 Frontend — Arquitectura

#### Páginas y componentes
- ✅ `app/(auth)/login/page.tsx` — Login page (validación real-time, dark mode, theme switcher, branding 4P)
- ✅ `app/dashboard/profile/page.tsx` — Perfil con panel dinámico (?panel=settings|messages|notifications)
- ✅ `app/components/profile/ProfileSidebar.tsx` — Avatar upload/delete, edición de username, cambio de password, nav links
- ✅ `app/components/profile/SettingsPanel.tsx` — Panel admin con tabs: Users, Security, Reports, Notifications, Departments
- ✅ `app/components/auth/NewUserModal.tsx` — SlidePanel para crear usuarios (username, email, password, rol)

#### Auth context y hooks
- ✅ `app/lib/auth/useAuth.tsx` — AuthContext con user, loading, isAuthenticated, login, logout, refreshUser. DEV_MODE disponible
- ✅ `app/lib/auth/authService.ts` — Wrapper API: login, logout, me
- ✅ `app/lib/auth/cookieHandler.ts` — Utilidades para cookies HttpOnly en Next.js API routes

#### Proxies API (Next.js API routes)
- ✅ `app/api/auth/login/route.ts` — Valida origin, proxy a backend, setea cookies
- ✅ `app/api/auth/logout/route.ts` — Limpia cookies, notifica backend (non-blocking)
- ✅ `app/api/auth/register/route.ts` — Requiere access_token, proxy a backend

#### API client y types
- ✅ `app/lib/users/queries.ts` — usersApi (CRUD admin) + authApi (login, register)
- ✅ `app/lib/users/types.ts` — Types frontend

### 1.7 Funcionalidades de usuario

#### Autenticación
- ✅ **Login** — Username + password, tokens en cookies HttpOnly, redirect a dashboard
- ✅ **Logout** — Limpia cookies local + notifica backend
- ✅ **Refresh automático** — Sliding sessions con regeneración de ambos tokens
- ✅ **Verificación de sesión** — Check automático en cambio de ruta (solo rutas protegidas)

#### Perfil de usuario
- ✅ **Ver perfil** — Sidebar con avatar, nombre, rol
- ✅ **Editar username** — Inline edit, requiere password actual, sanitización
- ✅ **Cambiar contraseña** — Requiere actual, validación de fortaleza, fuerza re-login
- ✅ **Avatar** — Upload a Cloudinary (2MB, JPEG/PNG/WebP/GIF), eliminar, preview

#### Gestión de usuarios (admin)
- ✅ **Listar usuarios** — Todos los activos con roles
- ✅ **Crear usuario** — Modal con username, email, password, rol
- ✅ **Editar usuario** — Inline editing de username/email/rol
- ✅ **Eliminar usuario** — Soft-delete (marca inactivo, renombra username)
- ✅ **Reset password** — Admin puede resetear sin verificación
- ✅ **Filtrar por rol** — Endpoint dedicado
- ✅ **Color por rol** — admin=purple, group-admin=blue, recepcionista=green, mantenimiento=orange

#### Control de acceso
- ✅ **Middlewares de rol** — isAdmin, isRealAdmin, isOwnerOrAdmin, canManageGroups, canManageCashier, excludeMantenimiento, etc.
- ✅ **Demo-admin** — Whitelist de operaciones, bloqueos registrados en BD
- ✅ **Rutas públicas** — Login, refresh-token (sin auth requerida)

### 1.8 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **JWT vs Sessions** — CLAUDE.md menciona migración de JWT a sessions, pero el código actual sigue usando JWT con refresh tokens. El sistema funciona correctamente con JWT |
| 2 | ⚠️ | **Register solo via admin** — No hay registro público (self-signup). Es intencional para un PMS hotelero pero vale documentarlo |
| 3 | ⚠️ | **SettingsPanel.tsx tiene múltiples tabs** (Users, Security, Reports, Notifications, Departments) — Los tabs de Security y Reports podrían necesitar revisión para verificar que están completamente implementados |
| 4 | ℹ️ | **Auto-asignación de notificaciones** — Al crear un admin/group-admin se le asignan automáticamente las notificaciones existentes recientes |

---

## Módulo 2: Logbooks ✅

Sistema de libro de registro operativo del hotel. Permite al personal crear entradas diarias,
comentarlas, marcar como leídas/resueltas y mantener un historial completo de auditoría.

### 1.1 Base de datos

4 tablas en `backend/db-mysql/aiven/03_logbook_tables.sql`:

| Tabla | Propósito |
|---|---|
| `logbooks` | Entradas principales (message, importance_level, department_id, is_solved, soft-delete) |
| `logbook_comments` | Comentarios por entrada (comment, importance_level, department_id, soft-delete) |
| `logbook_reads` | Tracking de lectura por usuario (clave compuesta logbook_id + user_id) |
| `logbook_history` | Auditoría completa (action: create/update/delete/read/unread/solve/reopen, previous_content, new_content) |

**Campos destacados de `logbooks`:**
- `importance_level` — enum: baja / media / alta / urgente
- `is_solved` — 0/1, con `solved_at` y `solved_by`
- `date` — fecha personalizable (opcional)
- `deleted_at` — soft-delete

### 1.2 Backend — Endpoints API

Base: `/api/logbooks` — Middleware: `authenticateToken` + `excludeMantenimiento`

#### CRUD principal
- ✅ `POST /` — Crear entrada (message 3-5000 chars, department, priority, date opcional)
- ✅ `PUT /:id` — Editar entrada (solo autor, tracking de cambios en historial)
- ✅ `DELETE /:id` — Soft-delete (solo autor, registra contenido previo en historial)

#### Consultas y filtros
- ✅ `GET /all` — Listar todas (paginado: limit/offset, default 100, max 500)
- ✅ `GET /day/:day` — Filtrar por fecha YYYY-MM-DD (uso principal del frontend)
- ✅ `GET /department/:departmentId` — Filtrar por departamento
- ✅ `GET /author/:authorId` — Filtrar por autor
- ✅ `GET /priority/:importance` — Filtrar por prioridad
- ✅ `GET /trashed` — Entradas eliminadas (papelera)

#### Comentarios
- ✅ `POST /:logbookId/comments` — Crear comentario (puede actualizar campos del padre)
- ✅ `GET /:logbookId/comments` — Listar comentarios (excluye soft-deleted)
- ✅ `PUT /:logbookId/comments/:id` — Editar comentario (autor o admin)
- ✅ `DELETE /:logbookId/comments/:id` — Soft-delete comentario (autor o admin)
- ✅ `GET /:logbookId/comments/:commentId/history` — Historial del comentario

#### Estado y lectura
- ✅ `POST /:logbookId/read` — Marcar como leído (upsert)
- ✅ `DELETE /:logbookId/read` — Desmarcar lectura
- ✅ `PUT /:logbookId/solve` — Marcar como resuelto (guarda solved_by + solved_at)
- ✅ `PUT /:logbookId/pending` — Reabrir (limpia is_solved)
- ✅ `GET /:logbookId/readers` — Listar lectores con timestamps
- ✅ `GET /:logbookId/solved` — Info del usuario que resolvió

#### Historial
- ✅ `GET /:logbookId/history` — Historial completo de la entrada

### 1.3 Backend — Arquitectura

```
controllers/logbook/
├── logbook-controllers.ts          # CRUD principal + filtros
├── logbookComments-controllers.ts  # CRUD comentarios
└── logbookReads-controllers.ts     # Read/unread/solve/reopen

repositories/logbook/
├── logbook-repository.ts           # Queries principales (JOINs users & departments)
├── logbookComments-repository.ts   # Queries comentarios
├── logbookReads-repository.ts      # Read tracking + solve status
├── logbookHistory-repository.ts    # Auditoría de entradas
└── logbookCommentsHistory-repository.ts  # Auditoría de comentarios

services/logbook/
└── logbookHistory-service.ts       # logAction, updateLogbookHistory, deleteLogbookHistory

validations/logbook/
└── logbook-schemas.ts              # Zod: create/update logbook + comment schemas

models/logbook/
└── index.ts                        # Types: LogbookRow, LogbookWithAuthor, ImportanceLevel, HistoryAction

routes/logbook/
└── logbook-routes.ts               # Definición de rutas Express
```

### 1.4 Frontend — Arquitectura

#### Páginas y componentes
- ✅ `app/dashboard/logbooks/page.tsx` — Página wrapper
- ✅ `app/components/logbooks/LogbooksContainer.tsx` — Contenedor principal (estado de fecha, navegación mensual, HorizontalDatePicker)
- ✅ `app/components/logbooks/LogbooksList.tsx` — Renderizado principal (~500 líneas: entradas, comentarios, acciones, avatares de lectores)
- ✅ `app/components/logbooks/NewLogbookEntry.tsx` — SlidePanel para crear entrada (SimpleCalendar + validación)
- ✅ `app/components/logbooks/NewCommentEntry.tsx` — SlidePanel para crear comentario
- ✅ `app/components/logbooks/EditLogbookModal.tsx` — Modal edición de entrada
- ✅ `app/components/logbooks/EditCommentModal.tsx` — Modal edición de comentario

#### Hooks y API
- ✅ `app/lib/logbooks/hooks/useLogbooks.ts` — Hook principal (React Query, mutations para CRUD, toggle status/read, toasts i18n)
- ✅ `app/lib/logbooks/hooks/useDepartments.ts` — Fetch y formateo de departamentos
- ✅ `app/lib/logbooks/queries.ts` — API client (`logbooksApi` con todos los métodos)
- ✅ `app/lib/logbooks/types.ts` — Types frontend (LogbookEntry, LogEntry, CreateLogbookDto, etc.)
- ✅ `app/lib/logbooks/validations.ts` — Zod schemas cliente (mirror de backend)

#### i18n
- ✅ `messages/en/logbook.json` + `messages/es/logbook.json` — Traducciones EN/ES

### 1.5 Funcionalidades de usuario

#### Gestión de entradas
- ✅ **Crear entrada** — Message (3-5000 chars), departamento, prioridad (baja/media/alta/urgente), fecha opcional
- ✅ **Editar entrada** — Solo el autor puede editar; cambios registrados en historial
- ✅ **Eliminar entrada** — Soft-delete, solo el autor; contenido previo guardado en historial
- ⚠️ **Papelera** — Endpoint `GET /trashed` funciona pero no hay vista frontend para consultar ni restaurar entradas eliminadas

#### Sistema de comentarios
- ✅ **Crear comentario** — Cualquier usuario; puede establecer prioridad y departamento por comentario
- ✅ **Editar comentario** — Solo autor o admin
- ✅ **Eliminar comentario** — Soft-delete, solo autor o admin
- ⚠️ **Historial por comentario** — Endpoint existe y funciona, pero no hay componente en UI que lo muestre

#### Tracking de estado
- ✅ **Marcar como leído/no leído** — Por usuario, patrón upsert; avatares circulares de lectores (max 8 visibles + "+N")
- ✅ **Marcar como resuelto** — Guarda quién y cuándo resolvió
- ✅ **Reabrir** — Limpia estado de resolución; registrado en historial

#### Filtrado y navegación
- ✅ **Por fecha** — HorizontalDatePicker + navegación mensual (prev/next/today); uso principal de la UI
- ⚠️ **Por departamento** — Endpoint dedicado con paginación, sin selector en la UI
- ⚠️ **Por autor** — Endpoint dedicado con paginación, sin selector en la UI
- ⚠️ **Por prioridad** — Endpoint dedicado con validación de enum, sin selector en la UI

#### Auditoría
- ✅ **Historial completo** — Acciones: create/update/delete/read/unread/solve/reopen
- ✅ **Contenido anterior/nuevo** — Almacenado en JSON
- ✅ **Información del editor** — user_id, username, email en cada registro
- ⚠️ **Vista de historial** — El historial se registra correctamente en backend pero no hay componente frontend para visualizarlo

#### UI/UX
- ✅ **Colores por prioridad** — rojo=urgente, naranja=alta, amarillo=media, verde=baja
- ✅ **Dark mode** — Soporte completo via next-themes
- ✅ **Responsive** — flex-wrap headers, overflow-x-auto
- ✅ **Toast notifications** — En todas las acciones con mensajes i18n
- ✅ **Confirmación en acciones destructivas** — Diálogos de confirmación

### 1.6 Patrones de implementación

- **Soft-delete** consistente en entradas y comentarios (campo `deleted_at`)
- **Permisos** verificados tanto en frontend como backend (autor-only para editar/eliminar)
- **React Query** con staleTime 2-5 min, invalidación automática en mutations
- **Mapping de prioridades** frontend ↔ backend: urgente↔critical, alta↔high, media↔medium, baja↔low
- **Paginación** con defaults: limit=100, max=500
- **Middleware de rol**: `excludeMantenimiento` bloquea acceso al rol de mantenimiento

### 1.7 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Vista de historial sin UI** — El endpoint `GET /:logbookId/history` funciona pero no hay componente frontend para visualizarlo |
| 2 | ⚠️ | **Papelera sin UI** — El endpoint `GET /trashed` funciona pero no hay vista para consultar entradas eliminadas ni opción de restaurar |
| 3 | ⚠️ | **Filtros avanzados sin UI** — Los endpoints de filtro por departamento/autor/prioridad existen pero la UI solo filtra por fecha |
| 4 | ⚠️ | **LogbooksList.tsx extenso** (~500 líneas) — Candidato a extraer sub-componentes (lista de comentarios, acciones por entrada, etc.) |

---

## Módulo 3: Parking ✅

Sistema completo de gestión de parking hotelero. Gestiona plazas, vehículos, reservas con ciclo de vida
completo (reserva → check-in → check-out), estadísticas en tiempo real y analytics de ocupación.

### 3.1 Base de datos

5 tablas en `backend/db-mysql/aiven/04_parking_tables.sql` + triggers/funciones en `05`, procedures en `06`, seed en `07`/`08`:

| Tabla | Propósito |
|---|---|
| `parking_spots` | Plazas físicas (levels: -2, -3; types: normal, ancha, mas_ancha, esquina, accesible, estrecha_bicis) |
| `parking_vehicles` | Registro de vehículos (plate_number, owner_name, model) |
| `parking_bookings` | Reservas con booking_code auto-generado (PK-YYYYMMDD-####), status, payment, source |
| `parking_availability` | Disponibilidad diaria por plaza |
| `parking_rates` | Tarifas por días |

**Triggers:**
- `trg_generate_booking_code` — Auto-genera código PK-YYYYMMDD-#### en INSERT
- `trg_update_availability_on_booking` — Marca plaza no disponible en rango de fechas al crear reserva

**Funciones:**
- `check_availability(spot_id, date_from, date_to)` — Boolean de disponibilidad
- `get_total_availability(date)` — Conteo de plazas disponibles

**Enums destacados:**
- Status: reserved / checked_in / completed / canceled / no_show
- Payment method: cash / card / transfer / agency
- Booking source: direct / booking_com / expedia / airbnb / agency_other

### 3.2 Backend — Endpoints API

Base: `/api/parking` — Middleware: `authenticateToken` + `excludeMantenimiento`

#### Plazas
- ✅ `GET /spots` — Listar todas (con filtros por level y type)
- ✅ `GET /spots/available` — Plazas disponibles por fecha o rango (max 60 días)

#### Vehículos
- ✅ `GET /vehicles` — Listar todos (filtros: plate_number, owner_name)
- ✅ `POST /vehicles` — Registrar vehículo (normalización de matrícula, detección de duplicados)
- ✅ `GET /vehicles/search?q=` — Búsqueda full-text (matrícula o propietario)
- ✅ `PUT /vehicles/:id` — Actualizar vehículo
- ✅ `DELETE /vehicles/:id` — Eliminar (solo admin, verifica FK con reservas)

#### Reservas
- ✅ `GET /bookings` — Listar con filtros avanzados y paginación (default 50, max 500)
- ✅ `GET /bookings?quickFilter=` — Filtros rápidos dashboard (arrivals_pending, arrivals_inside, departures_pending, departures_completed, etc.)
- ✅ `GET /bookings?startDate=X&endDate=Y` — Filtro por rango de fechas
- ✅ `POST /bookings` — Crear reserva (valida disponibilidad, auto-calcula precio, transaccional)
- ✅ `GET /bookings/:code` — Detalle por booking_code
- ✅ `PUT /bookings/:code` — Editar reserva (restricciones por estado)
- ✅ `DELETE /bookings/:code` — Eliminar (solo status reserved, no iniciada)
- ✅ `PUT /bookings/:code/checkin` — Check-in (solo desde reserved, valida ocupación)
- ✅ `PUT /bookings/:code/checkout` — Check-out + pago (solo desde checked_in)
- ✅ `PUT /bookings/:code/cancel` — Cancelar (desde reserved o checked_in)
- ✅ `PUT /bookings/:code/no-show` — Marcar no-show
- ✅ `GET /bookings/overdue/list` — Reservas con check-out vencido

#### Estadísticas
- ✅ `GET /stats` — Stats diarias o por rango (ocupación, pendientes, completados, tasa de ocupación %)
- ✅ `GET /stats/pending-checkins` — Check-ins pendientes por fecha
- ✅ `GET /stats/pending-checkouts` — Check-outs pendientes por fecha

#### Analytics
- ⚠️ `GET /stats/analytics/trends` — Tendencias de ocupación últimos N días
- ⚠️ `GET /stats/analytics/comparison` — Comparación entre dos periodos
- ⚠️ `GET /stats/analytics/performance` — Ranking por nivel de ocupación
- ⚠️ `GET /stats/analytics/booking-analysis` — Salud de reservas y tasas de conversión

### 3.3 Backend — Arquitectura

```
controllers/parking/
├── parking.controller.ts       # Plazas, vehículos, disponibilidad
├── bookings.controller.ts      # Ciclo de vida completo de reservas (class-based)
├── stats.controller.ts         # Estadísticas diarias y por rango
└── analytics.controller.ts     # Analytics y tendencias

repositories/parking/
├── parking.repository.ts       # CRUD básico (plazas, vehículos)
├── bookings.repository.ts      # Lógica compleja de reservas (class-based, transaccional)
└── stats.repository.ts         # Queries de analytics multi-subquery

routes/parking/
├── parking.routes.ts           # Rutas de plazas y vehículos
├── bookings.routes.ts          # Rutas de reservas
├── stats.routes.ts             # Rutas de estadísticas
└── analytics.routes.ts         # Rutas de analytics

validations/parking/
├── booking-validation.ts       # Zod: createBookingSchema, updateBookingSchema
└── vehicle-validation.ts       # Normalización y validación de matrículas

models/parking/
└── index.ts                    # Types, DTOs, enums (SpotType, LevelCode, BookingStatus, etc.)

services/parking/
└── invoicePdfService.ts        # Stub (no implementado)
```

### 3.4 Frontend — Arquitectura

#### Páginas
- ✅ `app/dashboard/parking/page.tsx` — Dashboard principal (SSR con prefetch)
- ✅ `app/dashboard/parking/bookings/page.tsx` — Lista de reservas con filtros
- ✅ `app/dashboard/parking/bookings/new/page.tsx` — Crear reserva (wizard)
- ✅ `app/dashboard/parking/bookings/[code]/page.tsx` — Detalle de reserva
- ✅ `app/dashboard/parking/status/page.tsx` — Estado en tiempo real del parking

#### Componentes principales
- ✅ `ParkingDashboardClient.tsx` — Dashboard con stats cards, ocupación por nivel, pendientes, filtros fecha/nivel
- ✅ `BookingsListClient.tsx` — Lista con quick filters, filtros avanzados, paginación, búsqueda, acciones por reserva
- ✅ `BookingDetailClient.tsx` — Detalle completo con modales de check-in/out/edit/payment
- ✅ `ParkingStatusClient.tsx` — Grid interactivo del parking, acciones rápidas, alertas de overdue

#### Componentes de reservas
- ✅ `CheckInModal.tsx` — Check-in con override de fecha/hora
- ✅ `CheckOutModal.tsx` — Check-out con captura de pago
- ✅ `EditBookingModal.tsx` — Edición de reserva (antes de check-in)
- ✅ `PaymentModal.tsx` — Registro de pago independiente

#### Componentes compartidos
- ✅ `StatusBadge.tsx` — Badge por estado (reserved=blue, checked_in=purple, completed=green, canceled=gray, no_show=orange)
- ✅ `ActionDropdown.tsx` — Menú contextual por reserva (acciones dinámicas según estado, portal rendering)
- ✅ `VehicleSearchModal.tsx` — Búsqueda de vehículos con debounce
- ✅ `ParkingTable.tsx` — Grid de datos responsive (overflow-x-auto, sticky headers)
- ✅ `StatusPanels.tsx` — Sidebar con resumen de ocupación y operaciones pendientes

#### API y hooks
- ✅ `app/lib/parking/queries.ts` — parkingApi (spots, vehicles, bookings, stats, overdue)
- ✅ `app/lib/parking/types.ts` — Types frontend completos
- ✅ `app/lib/parking/actions.ts` — Server actions con auth
- ✅ `app/components/parking/helpers/` — date-formatters, constants, helpers

### 3.5 Funcionalidades de usuario

#### Gestión de plazas
- ✅ **Listar plazas** — Por nivel (-2, -3) y tipo (normal, ancha, accesible, etc.)
- ✅ **Consultar disponibilidad** — Por fecha o rango (max 60 días)
- ✅ **Grid interactivo** — Vista en tiempo real del estado de cada plaza

#### Gestión de vehículos
- ✅ **Registrar vehículo** — Matrícula (3-12 chars, normalizada a mayúsculas), propietario, modelo
- ✅ **Buscar vehículos** — Full-text por matrícula o propietario
- ✅ **Editar/eliminar** — Con protección FK (no eliminar si tiene reservas)
- ✅ **Detección de duplicados** — Por matrícula

#### Ciclo de vida de reservas
- ✅ **Crear reserva** — Wizard con selección de plaza, vehículo, fechas, fuente de reserva
- ✅ **Check-in** — Desde estado reserved, con override de hora, validación de ocupación
- ✅ **Check-out** — Desde checked_in, con captura de pago (importe, método, referencia)
- ✅ **Cancelar** — Desde reserved o checked_in
- ✅ **No-show** — Marcado para auditoría
- ✅ **Eliminar** — Solo reservas no iniciadas (status reserved)
- ✅ **Editar** — Campos de pago en cualquier estado; otros campos solo en reserved/checked_in

#### Quick filters (dashboard)
- ✅ **arrivals_pending** — Reservadas con entrada hoy
- ✅ **arrivals_inside** — Todos los checked_in
- ✅ **departures_pending** — Checked_in con salida hoy
- ✅ **departures_completed** — Completados hoy
- ✅ **Overdue** — Check-outs vencidos

#### Estadísticas
- ✅ **Stats diarias** — Total/ocupadas/disponibles, pendientes, completados, tasa de ocupación %
- ✅ **Stats por rango** — Consolidadas con medias diarias (semanal, mensual, N días)
- ✅ **Ocupación por nivel** — Desglose por planta
- ✅ **Pendientes** — Check-ins y check-outs pendientes por fecha

#### UI/UX
- ✅ **Dark mode** — Soporte completo
- ✅ **Responsive** — overflow-x-auto en tablas, min-w en grids (patrón de referencia del proyecto)
- ✅ **Modales** — Sistema completo para todas las acciones
- ✅ **Toast notifications** — En todas las operaciones
- ✅ **Skeletons** — Loading states con Suspense
- ✅ **Paginación** — 50 por página, offset-based

### 3.6 Patrones de implementación

- **Booking code** como identificador público (no ID numérico) — PK-YYYYMMDD-####
- **Class-based** controllers y repositories en bookings (a diferencia del resto del proyecto)
- **Transaccional** en operaciones críticas (crear reserva, check-in/out)
- **Respuesta anidada** — spot, vehicle, operator, schedule, payment, timestamps como subobjetos
- **Timezone Madrid** — Stats calculadas con zona horaria correcta
- **Quick filters** — Filtros predefinidos para dashboard con queries optimizadas
- **Normalización** — Matrículas uppercase, espacios/guiones normalizados

### 3.7 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Analytics parcialmente implementados** — Los 4 endpoints de analytics existen pero usan cálculos placeholder; trends, comparison, performance y booking-analysis necesitan lógica completa |
| 2 | ⚠️ | **PDF/Facturación stub** — `invoicePdfService.ts` existe pero está vacío/comentado. Sin generación de facturas |
| 3 | ⚠️ | **Status page en refactoring** — Componentes de `/status/` tienen comentarios sobre fases de refactoring; podría necesitar verificación |
| 4 | ❌ | **Sin tests** — No se encontraron archivos de test para el módulo de parking |
| 5 | ℹ️ | **Sin operaciones bulk** — No hay check-in/out masivo |
| 6 | ℹ️ | **Pricing básico** — Solo lookup por días, sin pricing dinámico ni override de tarifas |
| 7 | ℹ️ | **Sin notificaciones** — No hay emails/SMS de confirmación de reserva |
| 8 | ℹ️ | **Sin export** — No hay exportación CSV/Excel de reservas o stats |

---

## Módulo 4: Scheduling ✅

Sistema de planificación mensual de turnos del personal. Edición manual celda a celda con validación
en tiempo real, sistema de restricciones con aprobación y auto-sincronización, contratos anuales,
exportación PDF y 7 reglas de validación activas.

### 4.1 Base de datos

10 tablas en `backend/db-mysql/aiven/19_scheduling.sql`:

| Tabla | Propósito |
|---|---|
| `scheduling_config` | Configuración del sistema (20+ parámetros: staffing, horas descanso, bloques noche, libre mensual, etc.) |
| `scheduling_shifts` | Tipos de turno (M, T, N, P, PI, B, V, L, FO, IT, E, A) con horarios, horas, colores, flags trabajo/pagado |
| `scheduling_employees` | Empleados inscritos en el sistema de turnos |
| `scheduling_employee_contracts` | Contratos anuales por empleado (dias_trabajo, horas_anuales, dias_vacaciones, etc.) |
| `scheduling_employee_rules` | Reglas por empleado (turno fijo, sin fines de semana, max/min turnos, etc.) |
| `scheduling_months` | Meses de planificación (status: draft/published, notas, published_by/at) |
| `scheduling_days` | Días de cada mes (festivo, nombre festivo, ocupación %, llegadas/salidas, notas) |
| `scheduling_assignments` | Asignaciones turno-empleado-día (con source_constraint_id para bloqueo, libre_number) |
| `scheduling_constraints` | Restricciones/solicitudes (vacation, sick_leave, sick_day, training, holiday, request_off/shift/no_shift) con status pending/approved/rejected |
| `scheduling_history` | Auditoría (created, published, unpublished, assignment_changed, constraint_added/approved/rejected, manual_edit, reset) |

**Diseño clave:**
- Constraints aprobados → auto-sync a assignments + bloqueo de celdas (source_constraint_id)
- Estados de mes: `draft` (editable) ↔ `published` (bloqueado para visualización)
- Constraints retroactivos permitidos (admin puede añadir para fechas pasadas)

### 4.2 Tipos de turno

| Código | Nombre | Tipo | Horas |
|---|---|---|---|
| M | Mañana | Trabajo | 8h |
| T | Tarde | Trabajo | 8h |
| N | Noche | Trabajo | 10h |
| P | Presencia | Trabajo | 24h |
| PI | Personal Intervención | Trabajo | 24h |
| L | Libre | Descanso | — |
| V | Vacaciones | Ausencia | — |
| B | Bonificable/Festivo | Ausencia | — |
| E | Enfermedad | Ausencia | — |
| IT | Incapacidad Temporal | Ausencia | — |
| FO | Formación | Ausencia | — |
| A | Ausencia injustificada | Ausencia | — |

### 4.3 Backend — Endpoints API

Base: `/api/scheduling` — Middleware: `authenticateToken` + `excludeMantenimiento` (admin para operaciones sensibles)

#### Configuración
- ✅ `GET /config` — Toda la configuración
- ✅ `GET /config/map` — Config como mapa clave-valor tipado
- ✅ `PATCH /config` — Actualizar config (admin)

#### Turnos
- ✅ `GET /shifts` — Listar todos los tipos de turno
- ✅ `GET /shifts/:id` — Detalle de turno
- ✅ `POST /shifts` — Crear turno (admin)
- ✅ `PUT /shifts/:id` — Editar turno (admin)
- ✅ `DELETE /shifts/:id` — Eliminar turno (admin)

#### Meses
- ✅ `GET /months` — Listar meses (con filtros año/status)
- ✅ `GET /months/:id` — Mes completo (días, asignaciones, constraints, stats)
- ✅ `GET /months/:id/info` — Panel de info (constraints aprobados + reglas empleados)
- ✅ `POST /months` — Crear mes (admin)
- ✅ `PUT /months/:id` — Editar mes (admin)
- ✅ `DELETE /months/:id` — Eliminar mes (admin)
- ✅ `POST /months/:id/validate` — Validar schedule completo
- ✅ `POST /months/:id/reset` — Reset: borra asignaciones, re-seed desde constraints aprobados (admin)
- ✅ `PATCH /months/:id/unpublish` — Despublicar (admin)

#### Días
- ✅ `PATCH /days/:id` — Actualizar día (festivo, notas, etc.)
- ✅ `POST /days/bulk` — Actualización masiva de días

#### Asignaciones
- ✅ `PATCH /assignments/:id` — Editar celda individual (retorna 409 si celda bloqueada)
- ✅ `POST /assignments/bulk` — Edición masiva de celdas

#### Constraints
- ✅ `GET /constraints` — Listar por mes
- ✅ `POST /constraints` — Crear constraint
- ✅ `PUT /constraints/:id` — Editar constraint
- ✅ `POST /constraints/:id/approve` — Aprobar/rechazar + auto-sync asignaciones (admin)
- ✅ `DELETE /constraints/:id` — Eliminar constraint

#### Reglas de empleado
- ✅ `GET /employee-rules` — Todas las reglas
- ✅ `GET /employee-rules/employee/:id` — Reglas por empleado
- ✅ `POST /employee-rules` — Crear regla (admin)
- ✅ `PUT /employee-rules/:id` — Editar regla (admin)
- ✅ `DELETE /employee-rules/:id` — Eliminar regla (admin)

#### Empleados
- ✅ `GET /employees` — Empleados planificables
- ✅ `GET /employees/all` — Todos con status de inclusión
- ✅ `POST /employees` — Añadir empleado al sistema
- ✅ `DELETE /employees/:id` — Quitar empleado del sistema
- ✅ `PUT /employees` — Establecer lista completa de empleados

#### Contratos
- ✅ `GET /contracts/:year` — Contratos por año
- ✅ `GET /contracts/:year/:employeeId` — Contrato individual
- ✅ `POST /contracts` — Crear contrato
- ✅ `PUT /contracts/:id` — Editar contrato
- ✅ `DELETE /contracts/:id` — Eliminar contrato
- ✅ `POST /contracts/initialize/:year` — Inicializar contratos para todo el año
- ✅ `POST /contracts/initialize/:year/:employeeId` — Inicializar contrato individual
- ✅ `GET /contracts/calculate-proportional` — Calcular contrato proporcional

#### Totales anuales
- ✅ `GET /annual-totals/:year` — Totales calculados desde meses publicados (convenio vs disfrutados vs pendiente)

#### Historial
- ✅ `GET /history/:monthId` — Auditoría del mes

### 4.4 Sistema de validación (7 constraints activos)

| Prioridad | Constraint | Regla | Severidad |
|---|---|---|---|
| 100 | **Coverage** | Min/max personal por turno por día (1M, 1T, 1N min; 2M, 2T, 1N max) | ERROR (0 staff) / WARNING |
| 100 | **Night Block** | Noches consecutivas obligatorias (min 3, recomendado 4-6) | ERROR si dispersas |
| 95 | **Consecutive Rest** | Min 2 días de descanso consecutivos en ventana rodante de 7 días | ERROR |
| 90 | **Max Consecutive Work** | Máximo 6 días laborables consecutivos (regulación laboral) | ERROR |
| 85 | **Rotation Continuity** | T→M en días consecutivos = ERROR (solo 8h entre turnos) | ERROR |
| 75 | **Employee Rules** | Turno fijo, sin fines de semana, max/min turnos por mes | WARNING/INFO |
| 70 | **Monthly Libre** | 7-10 días libres por mes (incluye V, B, IT, E, FO además de L) | WARNING |

**Arquitectura:**
- Base abstracta con `check()` y `fix()` (opcional)
- Registry que ejecuta todos en orden de prioridad
- Resultado: `ValidationResult { isValid, errors[], warnings[], stats }`

### 4.5 Backend — Arquitectura

```
controllers/scheduling/
└── scheduling-controller.ts        # Controlador monolítico (~67KB) con todos los endpoints

repositories/scheduling/
└── scheduling-repository.ts        # CRUD completo para las 10 tablas

services/scheduling/
├── schedule-validator.ts           # Motor de validación (ejecuta constraints sobre asignaciones existentes)
├── constraints/
│   ├── base-constraint.ts          # Clase abstracta base
│   ├── registry.ts                 # Registro y ejecución de constraints
│   ├── coverage.constraint.ts      # Min/max staffing por turno
│   ├── night-block.constraint.ts   # Bloques de noche consecutivos
│   ├── consecutive-rest.constraint.ts   # Descanso mínimo en ventana 7 días
│   ├── max-consecutive-work.constraint.ts  # Max 6 días trabajo consecutivo
│   ├── rotation-continuity.constraint.ts   # Transiciones T→M prohibidas
│   ├── employee-rules.constraint.ts        # Reglas individuales
│   └── monthly-libre.constraint.ts         # Rango libre mensual
├── types/
│   └── index.ts                    # Types internos (Employee, ScheduleMatrix, DayInfo, GeneratorContext)
└── utils/
    ├── matrix.ts                   # Operaciones sobre la matriz de turnos (isWorkShift, countShift, etc.)
    └── day-helpers.ts              # Helpers de días (isWeekend, getWeeksInMonth, areConsecutive, etc.)

validations/scheduling/
└── scheduling-schemas.ts           # Zod schemas para todos los DTOs

models/scheduling/
└── index.ts                        # ~650 líneas de types, enums y DTOs

routes/scheduling/
└── scheduling-routes.ts            # 269 líneas de definición de rutas con middleware
```

### 4.6 Frontend — Arquitectura

#### Páginas
- ✅ `app/dashboard/scheduling/page.tsx` — Página principal (Suspense + skeleton)
- ✅ `app/dashboard/scheduling/config/page.tsx` — Configuración (Suspense + skeleton)

#### Componentes principales
- ✅ `SchedulingClient.tsx` — Orquestador: selección mes/año (URL-based), edición de celdas, validación, publicar/despublicar, reset, PDF export, festivos
- ✅ `ScheduleGrid.tsx` — Grid mensual interactivo (30+ columnas, drag-to-select bulk, celdas bloqueadas visualmente distintas, DOM directo para performance)
- ✅ `SchedulingConfigClient.tsx` — Panel de config con 7 tabs (employees, totals, general, rules, requests, shift-stats, presencias) + todos los modales
- ✅ `ValidationWarnings.tsx` — Feedback de validación (errores/warnings/info, agrupados por severidad, expandible)
- ✅ `MonthInfoPanel.tsx` — Panel lateral con constraints aprobados y reglas de empleado
- ✅ `ManageHolidaysModal.tsx` — Modal para gestionar festivos (toggle + nombre inline)
- ✅ `EmployeeTotals.tsx` — Contratos anuales editables, inicialización, totales calculados
- ✅ `MonthSelector.tsx` — Selector de año + pills de mes con indicador de estado (draft=gris, published=verde)
- ✅ `ShiftSelector.tsx` — Menú contextual para selección de turno (single y bulk mode)
- ✅ `ScheduleStats.tsx` — Cards de stats (empleados, turnos M/T/N, cobertura)
- ✅ `ShiftLegend.tsx` — Leyenda de turnos con colores

#### API y utilidades
- ✅ `app/lib/scheduling/queries.ts` — React Query hooks completos (config, shifts, months, constraints, rules, contracts, totals, history, employees, validation)
- ✅ `app/lib/scheduling/types.ts` — Types frontend (~300 líneas)
- ✅ `app/lib/scheduling/export-pdf.ts` — Exportación PDF (A4 landscape, colores matching web, multi-page, pdf-lib)
- ✅ `app/lib/scheduling/shift-styles.ts` — Sistema de colores por turno (light + dark mode)

#### i18n
- ✅ `messages/es/scheduling.json` + `messages/en/scheduling.json` — 500+ claves cada uno

### 4.7 Funcionalidades de usuario

#### Gestión de meses
- ✅ **Crear mes** — Inicializa grid con días y asignaciones vacías
- ✅ **Publicar/despublicar** — Cambia estado draft ↔ published
- ✅ **Reset** — Borra asignaciones y re-seed desde constraints aprobados
- ✅ **Eliminar mes** — Con confirmación
- ✅ **Selector visual** — Pills por mes con estado coloreado

#### Edición de turnos
- ✅ **Celda individual** — Click → menú de turno → asignar (retorna 409 si bloqueada)
- ✅ **Selección múltiple** — Drag-to-select → asignar turno a múltiples celdas
- ✅ **Celdas vacías editables** — Celdas sin asignación en BD se crean vía upsert al editar (antes lanzaban error)
- ✅ **Celdas bloqueadas** — Visualmente distintas, no editables (desde constraints aprobados)
- ✅ **Libre numbering (L1–L45)** — Celdas L muestran su par cronológico anual (L1, L1, L2, L2...). Se recalcula automáticamente tras cualquier cambio que involucre L. Columna `libre_number` en `scheduling_assignments`
- ✅ **Validación en tiempo real** — Feedback inmediato de errores/warnings tras edición

#### Sistema de constraints
- ✅ **Crear solicitud** — vacation, sick_leave, sick_day, training, holiday, request_off/shift/no_shift
- ✅ **Aprobar/rechazar** — Admin aprueba → auto-sync a asignaciones + bloqueo de celdas
- ✅ **Constraints retroactivos** — Admin puede añadir para fechas pasadas
- ✅ **Panel de info** — Vista de constraints aprobados y reglas activas por mes

#### Reglas de empleado
- ✅ **Turno fijo** (fixed_shift) — Empleado solo trabaja un tipo de turno
- ✅ **Sin fines de semana** (no_weekends) — No trabaja sábado/domingo
- ✅ **Max/min turnos** — Límites por código de turno por mes
- ✅ **Prioridad de turno** (shift_priority) — Turno preferido
- ✅ **Días fijos** (fixed_days) — Solo trabaja en días específicos

#### Contratos y totales
- ✅ **Gestión de contratos** — Crear/editar contratos anuales por empleado
- ✅ **Inicialización masiva** — Inicializar contratos para año completo o individualmente
- ✅ **Cálculo proporcional** — Para contratos parciales
- ✅ **Totales anuales** — Calculados automáticamente desde meses publicados (convenio vs disfrutados vs pendiente)

#### Festivos
- ✅ **Gestionar festivos** — Toggle día festivo + nombre editable inline
- ✅ **Tooltip festivo** — Visible en grid

#### Exportación
- ✅ **PDF** — A4 landscape, grid completo con colores, multi-página, paginación

#### Presencias
- ✅ **Conversión de horario** — Convierte códigos de turno (M/T/N/PI/P→P, Lxx→L, resto sin cambio) al formato del documento oficial de presencias
- ✅ **Cálculo de horas nocturnas** — T=1h (22:00-23:00), N=7h (23:00-6:00), resto=0h. Calculado sobre el código original antes de convertir
- ✅ **Bloque 1 (Presencias)** — Output tab-separado por empleado: 28/30/31 códigos convertidos + total presencias. Listo para pegar en pestaña "Presencias" del Excel oficial
- ✅ **Bloque 2 (Variables)** — Un número por línea: total horas nocturnas del mes por empleado. Listo para pegar en pestaña "Variables" del Excel oficial
- ✅ **Copy-to-clipboard** — Botón en cada bloque con feedback visual (2s)
- ✅ **Limpiar** — Resetea input y resultado

#### UI/UX
- ✅ **Dark mode** — Colores de turno adaptados (light + dark palette)
- ✅ **Responsive** — overflow-x-auto, columnas sticky
- ✅ **Estado en URL** — Mes/año/tab persisten en searchParams
- ✅ **Leyenda de turnos** — Colores y códigos
- ✅ **Stats coverage** — Cards con conteo por turno y alertas de cobertura

### 4.8 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **Sin generación automática** — El sistema es 100% manual (celda a celda). No hay algoritmo de auto-generación de horarios. Es decisión de diseño documentada |
| 2 | ⚠️ | **Controller monolítico** — `scheduling-controller.ts` tiene ~67KB. Candidato fuerte a dividir en sub-controllers por dominio (months, assignments, constraints, etc.) |
| 3 | ⚠️ | **Métodos fix() incompletos** — Algunos constraints tienen `fix()` parcialmente implementado (rotation-continuity lo tiene, max-consecutive-work tiene stub) |
| 4 | ℹ️ | **Archive/AI eliminado** — CLAUDE.md menciona `services/scheduling/archive/` con fases/scoring/AI pero el directorio no existe en el código actual (limpieza intencional) |
| 5 | ℹ️ | **Soft markers no implementados** — Prefijos REQUEST_, AVOID_, PREFER_ definidos en utils pero no usados en la UI actual |
| 6 | ⚠️ | **SchedulingConfigClient.tsx extenso** (~3000 líneas) — Contiene 7 tabs + todos los modales (employees, totals, general, rules, requests, shift-stats, presencias). Candidato fuerte a extracción de componentes por tab en `config/` |
| 7 | ℹ️ | **Presencias — integración pendiente** — La tab de Presencias funciona con input manual (paste desde Excel). Cuando el scheduling esté estable, leer directamente desde `scheduling_assignments` eliminando el textarea. Endpoint previsto: `GET /presencias/:monthId` |
| 8 | ℹ️ | **Presencias — exportación Excel pendiente** — Futuro: exportar directamente el documento oficial de presencias (.xlsx) con formato completo (cabeceras, leyenda, ambas pestañas) sin necesidad de copy-paste |

---

## Módulo 5: Maintenance ✅

Sistema de gestión de incidencias y mantenimiento del hotel. Ciclo de vida completo de reportes
(reported → assigned → in_progress → waiting → completed → closed/canceled), imágenes via Cloudinary,
asignación interna/externa, notas de resolución y auditoría completa.

### 5.1 Base de datos

3 tablas en `backend/db-mysql/aiven/13_maintenance.sql`:

| Tabla | Propósito |
|---|---|
| `maintenance_reports` | Reportes principales (ID formato DDMMYY-XXX auto-generado, title, description, location, status, priority, assignment, soft-delete) |
| `maintenance_images` | Imágenes asociadas (max 5 por reporte, Cloudinary URL + public_id, auto_delete_on_close flag) — FK CASCADE |
| `maintenance_history` | Auditoría completa (9 acciones: created, status_changed, priority_changed, updated, assigned, resolved, closed, deleted, restored) con old/new values |

**Campos destacados de `maintenance_reports`:**
- `id` — Formato DDMMYY-XXX, auto-generado secuencial
- `location_type` — enum: room / common_area / exterior / facilities / other
- `status` — 7 estados: reported → assigned → in_progress → waiting → completed → closed / canceled
- `priority` — low / medium / high / urgent (default: medium)
- `assigned_type` — internal (user_id) / external (company_name + contact)
- `room_out_of_service` — Flag para habitaciones fuera de servicio
- Timestamps: `started_at`, `resolved_at`, `closed_at` (auto-gestionados por cambios de estado)
- Soft-delete: `is_deleted` + `deleted_at`

### 5.2 Backend — Endpoints API

Base: `/api/maintenance` — Middleware: `authenticateToken` + `canAccessMaintenance`

#### CRUD principal
- ✅ `POST /` — Crear reporte (title 3-150, description 10+, location, priority, assignment opcional)
- ✅ `GET /` — Listar con filtros avanzados y paginación (status, priority, location_type, assigned_to, created_by, room_number, search, date range)
- ✅ `GET /:id` — Detalle completo con imágenes e historial
- ✅ `PATCH /:id` — Editar campos del reporte
- ✅ `DELETE /:id` — Soft-delete
- ✅ `PATCH /:id/restore` — Restaurar reporte eliminado

#### Estado, prioridad y asignación
- ✅ `PATCH /:id/status` — Cambiar estado (auto-gestiona timestamps: started_at, resolved_at, closed_at)
- ✅ `PATCH /:id/priority` — Cambiar prioridad
- ✅ `PATCH /:id/assign` — Asignar a interno/externo (auto-setea status='assigned')
- ✅ `PATCH /:id/resolution-notes` — Añadir notas de resolución timestamped

#### Imágenes
- ✅ `GET /:id/images` — Listar imágenes del reporte
- ✅ `POST /:id/images` — Subir imagen (multer memory, 5MB max, JPEG/PNG/WebP/GIF, Cloudinary)
- ✅ `DELETE /:id/images/:imageId` — Eliminar imagen (Cloudinary + BD)

#### Historial y estadísticas
- ✅ `GET /:id/history` — Historial completo del reporte
- ✅ `GET /stats` — Estadísticas globales (total, por status, por priority, por location_type, habitaciones fuera de servicio)

### 5.3 Backend — Arquitectura

```
controllers/maintenance/
└── maintenance-controller.ts       # ~750 líneas: todos los handlers HTTP

repositories/maintenance/
└── maintenance-repository.ts       # ~970 líneas: CRUD + images + history + stats (static methods)

validations/maintenance/
└── schemas.ts                      # ~336 líneas: Zod schemas (create, update, status, priority, assign, filters, images)

models/maintenance/
└── index.ts                        # ~340 líneas: Types, enums, DTOs, labels en español

routes/maintenance/
└── maintenance-routes.ts           # 156 líneas: rutas con multer config

db-mysql/aiven/
└── 13_maintenance.sql              # 116 líneas: schema + collation utf8mb4_0900_ai_ci
```

**Nota:** No hay capa de services separada — controllers llaman directamente a repositories.

### 5.4 Frontend — Arquitectura

#### Páginas
- ✅ `app/dashboard/maintenance/page.tsx` — Lista (server component, prefetch via server action)
- ✅ `app/dashboard/maintenance/[id]/page.tsx` — Detalle (client component, fetch en useEffect)

#### Componentes principales
- ✅ `MaintenanceListClient.tsx` — Lista con búsqueda, filtros (status, priority, location, fecha), paginación, click para detalle
- ✅ `ReportDetailClient.tsx` — Orquestador de detalle con tabs (Detail/History), modales de edición y confirmación

#### Tabs de detalle
- ✅ `DetailTab.tsx` — Vista completa: status/priority editables inline, info del reporte, ubicación, asignación, fechas, notas de resolución, galería de imágenes con lightbox
- ✅ `HistoryTab.tsx` — Timeline de cambios con badges coloreados por acción, old/new values, usuario y timestamp

#### Paneles/modales
- ✅ `CreateReportPanel.tsx` — SlidePanel con React Hook Form + Zod, campos dinámicos (room si location=room, company si external), drag-and-drop de imágenes, preview antes de crear
- ✅ `EditReportPanel.tsx` — Similar a Create pero pre-poblado, gestión de imágenes existentes vs nuevas

#### Layout y shared
- ✅ `ReportHeader.tsx` — Header con back button, título, ID, status badge, timestamps, acciones
- ✅ `TabNavigation.tsx` — Tabs Detail/History con estado en URL query params
- ✅ `ConfirmDialog.tsx` — Diálogo de confirmación con variantes (danger/warning/primary)
- ✅ `LoadingSpinner.tsx` — Spinner animado con tamaños
- ✅ `EmptyState.tsx` — Estado vacío con icono y mensaje

#### Hooks, API y store
- ✅ `hooks/useMaintenanceList.ts` — React Query wrapper con mutations (create, update, status, priority, delete, restore) + invalidación automática + toasts
- ✅ `maintenanceApi.ts` — API client centralizado (CRUD + images + stats)
- ✅ `useMaintenanceStore.ts` — Zustand store para página de detalle (report, images, history, filters, loading states, refresh methods)
- ✅ `maintenance.ts` — Types frontend (mirror de backend)
- ✅ `maintenance-schemas.ts` — Zod schema para formularios

#### i18n
- ✅ `messages/en/maintenance.json` + `messages/es/maintenance.json` — ~250 claves cada uno

### 5.5 Funcionalidades de usuario

#### Gestión de reportes
- ✅ **Crear reporte** — Título, descripción, ubicación (5 tipos), prioridad, asignación opcional, imágenes drag-and-drop
- ✅ **Editar reporte** — Panel lateral con todos los campos editables
- ✅ **Eliminar/restaurar** — Soft-delete con opción de restaurar
- ✅ **Búsqueda full-text** — Por título, descripción, ubicación, room, ID (case/accent insensitive)
- ✅ **Filtros combinables** — Status + priority + location_type + fecha (día o rango)

#### Flujo de estados
- ✅ **reported → assigned** — Auto al asignar responsable
- ✅ **→ in_progress** — Marca started_at automáticamente
- ✅ **→ waiting** — En espera (materiales, proveedor, etc.)
- ✅ **→ completed** — Marca resolved_at automáticamente
- ✅ **→ closed / canceled** — Marca closed_at automáticamente
- ✅ **Edición inline** — Status y priority editables directamente en la vista de detalle

#### Asignación
- ✅ **Interna** — Dropdown de usuarios del sistema
- ✅ **Externa** — Empresa + contacto (campos dinámicos)
- ✅ **Sin asignar** — Opción válida

#### Imágenes
- ✅ **Upload** — Max 5 por reporte, 5MB cada una, JPEG/PNG/WebP/GIF
- ✅ **Cloudinary** — Almacenamiento externo con public_id para gestión
- ✅ **Preview/lightbox** — Thumbnails + vista expandida
- ✅ **Eliminar individual** — Borra de Cloudinary + BD
- ✅ **Drag-and-drop** — En panel de creación/edición

#### Notas de resolución
- ✅ **Añadir notas** — Timestamped con username, acumulativas
- ✅ **Historial de notas** — Visibles en la vista de detalle

#### Auditoría
- ✅ **9 tipos de acción** — created, status_changed, priority_changed, updated, assigned, resolved, closed, deleted, restored
- ✅ **Valores old/new** — Cambios tracked con campo + valores anteriores/nuevos
- ✅ **Timeline visual** — Tab de historial con badges coloreados

#### Estadísticas
- ✅ **Dashboard stats** — Total, por status, por priority, por location_type, habitaciones fuera de servicio

#### UI/UX
- ✅ **Dark mode** — Completo
- ✅ **Responsive** — Mobile + desktop
- ✅ **Toasts i18n** — En todas las operaciones
- ✅ **Loading states** — Spinners y skeletons
- ✅ **Empty states** — Con contexto
- ✅ **Confirmación destructiva** — Diálogos de confirmación

### 5.6 Patrones de implementación

- **ID secuencial con fecha** — DDMMYY-XXX en lugar de auto-increment o UUID
- **Zustand + React Query** — Store para estado local de detalle, React Query para lista con cache
- **Server action** para carga inicial de lista (SSR), client fetch para detalle
- **Collation utf8mb4_0900_ai_ci** — Búsqueda case/accent insensitive nativa en MySQL
- **Soft-delete** con restore — is_deleted flag + endpoint de restauración
- **Timestamps automáticos** — started_at, resolved_at, closed_at gestionados por cambios de estado
- **Imágenes en Cloudinary** — Con tracking de public_id para limpieza

### 5.7 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **`auto_delete_on_close` es código muerto** — El flag existe en `maintenance_images` pero no hay lógica que ejecute la limpieza automática de imágenes al cerrar un reporte. Feature a medio implementar |
| 2 | ⚠️ | **Data fetching inconsistente** — La lista usa server action (SSR prefetch) pero el detalle usa `useEffect` con fetch client-side. Patrón mixto dentro del mismo módulo |
| 3 | ⚠️ | **State management mixto** — Lista usa React Query (cache, invalidación, mutations) pero detalle usa Zustand con llamadas directas a API. Dos enfoques distintos en el mismo módulo |
| 4 | ⚠️ | **UI de papelera/restaurar incompleta** — Endpoint `PATCH /:id/restore` y filtro de deleted existen en backend, pero no hay toggle visible en la UI para ver reportes eliminados ni botón de restaurar |
| 5 | ⚠️ | **Sin capa de services** — Controllers llaman directamente a repositories. Funcional pero inconsistente con el patrón de otros módulos del proyecto |
| 6 | ❌ | **Sin tests** — No se encontraron archivos de test para el módulo de maintenance |
| 7 | ℹ️ | **Sin notificaciones** — No hay alertas push/email cuando se asigna un reporte o cambia de estado |
| 8 | ℹ️ | **Sin SLA tracking** — No hay tiempos objetivo de resolución por prioridad ni alertas de SLA vencido |

---

## Módulo 6: Cashier ✅

Sistema de caja registradora del hotel. Gestión diaria con 4 turnos (noche, mañana, tarde, cierre),
conteo de denominaciones en efectivo, métodos de pago electrónicos, vales (vouchers) con ciclo de vida,
reporting mensual con gráficos y exportación PDF.

### 6.1 Base de datos

9 tablas en `backend/db-mysql/aiven/11_cashier.sql`:

| Tabla | Propósito |
|---|---|
| `payment_methods` | Catálogo de métodos de pago (Card, BACS, Web Payment, Transfer, Other) |
| `cashier_vouchers` | Pool global de vales (amount, reason, type income/expense, status pending/justified/cancelled) |
| `cashier_shifts` | Entidad principal — 4 turnos/día (shift_date + shift_type UNIQUE, status, initial_fund €200, income, cash_counted/expected/difference, payments_total, grand_total) |
| `cashier_shift_users` | Responsables por turno (primary + secondary, UK shift_id+user_id) |
| `cashier_denominations` | Conteo físico de efectivo por turno (€200→€0.01, quantity, total GENERATED ALWAYS) |
| `cashier_payments` | Pagos electrónicos por turno (payment_method_id + amount, UK shift_id+method_id) |
| `cashier_shift_vouchers` | Many-to-many turnos↔vales (PK compuesta, CASCADE ambos lados) |
| `cashier_daily` | Agregados diarios (totales por método, grand_total, status open/closed) |
| `cashier_history` | Auditoría (9 acciones, shift_id, table_affected, field_changed, old/new values) |

**Diseño clave:**
- 4 turnos por día: night / morning / afternoon / closing
- Denominaciones con `total` GENERATED ALWAYS (columna computada, previene errores de cálculo)
- `income_breakdown` JSON para futuro tracking multi-departamento
- Cascade deletes preservan historial

### 6.2 Backend — Endpoints API

Base: `/api/cashier` — Middleware: `authenticateToken` + `excludeMantenimiento` + roles específicos

#### Día (daily)
- ✅ `GET /daily/:date` — Detalles completos del día
- ✅ `POST /daily/:date/initialize` — Crear los 4 turnos del día
- ✅ `PATCH /daily/:date/close` — Cerrar día (requiere 4 turnos cerrados)
- ✅ `PATCH /daily/:date/reopen` — Reabrir día para correcciones
- ✅ `GET /daily` — Listar días con paginación/filtros
- ✅ `GET /daily/:date` — Resumen compacto

#### Turnos (shifts)
- ✅ `GET /shifts/:id` — Detalle con users, denominations, payments, vouchers
- ✅ `GET /shifts` — Listar con filtros (fecha, tipo, status, usuario)
- ✅ `PATCH /shifts/:id` — Actualizar
- ✅ `PATCH /shifts/:id/close` — Cerrar turno
- ✅ `PATCH /shifts/:id/reopen` — Reabrir (solo admin)
- ✅ `PUT /shifts/:id/users` — Asignar responsables (primary + secondary)
- ✅ `DELETE /shifts/:id` — Eliminar (solo admin, solo si open)

#### Vales (vouchers)
- ✅ `GET /vouchers` — Listar con filtros y paginación
- ✅ `GET /vouchers/active` — Solo vales activos
- ✅ `GET /vouchers/:id` — Detalle
- ✅ `POST /shifts/:shiftId/vouchers` — Crear vale (max 5 por turno)
- ✅ `PATCH /vouchers/:id` — Editar
- ✅ `PATCH /vouchers/:id/justify` — Marcar justificado
- ✅ `PATCH /vouchers/:id/cancel` — Marcar cancelado
- ✅ `DELETE /vouchers/:id` — Eliminar (solo pending)
- ✅ `GET /vouchers/stats` — Estadísticas agregadas

#### Denominaciones (cash counting)
- ✅ `GET /shifts/:shiftId/denominations` — Listar denominaciones
- ✅ `PUT /shifts/:shiftId/denominations` — Reemplazar todas (bulk)
- ✅ `POST /shifts/:shiftId/denominations` — Crear individual
- ✅ `PATCH /denominations/:id` — Actualizar cantidad
- ✅ `DELETE /denominations/:id` — Eliminar

#### Pagos electrónicos
- ✅ `GET /shifts/:shiftId/payments` — Listar por turno
- ✅ `GET /shifts/:shiftId/payments/summary` — Resumen por método
- ✅ `PUT /shifts/:shiftId/payments` — Reemplazar todos (bulk)
- ✅ `POST /shifts/:shiftId/payments` — Crear individual
- ✅ `PATCH /payments/:id` — Actualizar importe
- ✅ `DELETE /payments/:id` — Eliminar

#### Historial y auditoría
- ✅ `GET /history` — Historial completo con filtros (acción, tabla, fecha)
- ✅ `GET /history/stats` — Estadísticas agregadas
- ✅ `GET /history/shift/:shiftId` — Historial por turno
- ✅ `GET /history/recent` — Últimas N entradas

#### Reportes
- ✅ `GET /reports/dashboard` — Overview del día (admin)
- ✅ `GET /reports/daily/:date` — Reporte diario detallado
- ✅ `GET /reports/period?from_date=...&to_date=...` — Análisis por período (max 31 días)
- ✅ `GET /reports/monthly/:year/:month` — Resumen mensual
- ✅ `GET /reports/vouchers-history` — Historial de vales con paginación
- ✅ `GET /reports/shifts-summary` — Resumen por tipo de turno

### 6.3 Backend — Arquitectura

```
controllers/cashier/
├── cashier-daily-controller.ts       # 369 líneas: día (init, close, reopen, summary)
├── cashier-shift-controller.ts       # 267 líneas: turnos CRUD
├── cashier-voucher-controller.ts     # 272 líneas: vales lifecycle
├── cashier-denomination-controller.ts # 122 líneas: conteo de efectivo
├── cashier-payment-controller.ts     # 135 líneas: pagos electrónicos
├── cashier-history-controller.ts     # 301 líneas: auditoría
└── cashier-report-controller.ts      # 402 líneas: reportes y dashboard (N+1 optimizado)

repositories/cashier/
├── cashier-daily-repository.ts       # Día CRUD + detalles + monthly summary
├── cashier-shift-repository.ts       # Turno CRUD + recalc totales + JSON parsing
├── cashier-voucher-repository.ts     # Vales CRUD + stats + límite 5/turno
├── cashier-denomination-repository.ts # Denominaciones CRUD + bulk + total agregado
├── cashier-payment-repository.ts     # Pagos CRUD + bulk + batch optimization (N+1)
├── cashier-history-repository.ts     # Log creation + filtros + recientes
├── cashier-shift-user-repository.ts  # Asignación de responsables primary/secondary
└── cashier-payment-method-repository.ts # Catálogo de métodos de pago

validations/cashier/
└── cashier-validation.ts             # Zod schemas (shift types, denominations €, vouchers, discrepancy >€0.50 require comment)

models/cashier/
└── index.ts                          # ~497 líneas: types, DTOs, filters, report structures

routes/cashier/
└── cashier-routes.ts                 # 200+ líneas: 25+ rutas con role-based access
```

### 6.4 Frontend — Arquitectura

#### Páginas
- ✅ `app/dashboard/cashier/page.tsx` — Dashboard principal (stats rápidas, alertas de inicialización, vales pendientes, acciones rápidas)
- ✅ `app/dashboard/cashier/hotel/page.tsx` — Operaciones diarias (tabs por turno, ShiftCard, sidebar resumen, responsive 1400px+)
- ✅ `app/dashboard/cashier/logs/page.tsx` — Auditoría (DateNavigator, filtros acción/usuario, tabla paginada, stats sidebar)
- ✅ `app/dashboard/cashier/reports/page.tsx` — Analytics (3 tabs: Summary/Payments/Vouchers, gráficos pie/bar, MonthlyReport tabla)

#### Componentes principales (~26 componentes, 3500+ LOC)
- ✅ `ShiftCard.tsx` (~400 LOC) — Editor de turno: denominaciones, pagos, vales, cierre
- ✅ `ShiftTabs.tsx` — Navegación por tabs de turno
- ✅ `ShiftUsersManager.tsx` — Asignar/quitar responsables
- ✅ `DenominationForm.tsx` — Grid de input para conteo de efectivo (€200→€0.01)
- ✅ `PaymentForm.tsx` — Importes por método de pago electrónico
- ✅ `VoucherList.tsx` — Lista de vales con acciones
- ✅ `CreateVoucherModal.tsx` — Crear vale con validación

#### Modales
- ✅ `InitializeDayModal.tsx` — Crear 4 turnos del día
- ✅ `CloseDayModal.tsx` — Cerrar día (valida 4 turnos cerrados)
- ✅ `CloseShiftModal.tsx` — Cerrar turno individual
- ✅ `ReopenDayModal.tsx` — Reabrir con motivo

#### Reportes
- ✅ `MonthlyReport.tsx` — Tabla con desglose diario
- ✅ `PaymentChart.tsx` — Gráfico Recharts (pie/bar) de métodos de pago
- ✅ `VouchersHistory.tsx` — Tabla filtrable de vales

#### Layout y utils
- ✅ `DaySummarySidebar.tsx` — Sidebar derecho (desktop)
- ✅ `DateNavigator.tsx` — Selector de fecha/mes
- ✅ `CashierCalendarNav.tsx` — Widget de calendario
- ✅ `HistoryTable.tsx` / `HistoryFilters.tsx` / `HistoryStats.tsx` — Auditoría UI
- ✅ `LoadingState.tsx` / `ErrorState.tsx` / `UninitializedDayState.tsx` — Estados

#### API, hooks y store
- ✅ `app/lib/cashier/queries.ts` (~400 LOC) — React Query hooks completos (useDailyDetails, useShiftDetails, useVoucherStats, useInitializeDay, useCloseDay, useDenominations, usePayments, useHistoryLogs, useMonthlyReport, useDashboardOverview...)
- ✅ `app/lib/cashier/types.ts` — ~298 líneas (mirror backend, string decimals)
- ✅ `app/lib/cashier/exportDailyPdf.ts` (~500 LOC) — PDF con jsPDF+autoTable (header, shifts, denominations, payments, vouchers)
- ✅ `useCashierStore` (Zustand) — Estado UI: selectedDate, activeTab, modales, filtros logs/reports, chartViewMode

#### i18n
- ✅ `messages/es/cashier.json` — ~370 claves en español

### 6.5 Funcionalidades de usuario

#### Operaciones diarias
- ✅ **Inicializar día** — Crea 4 turnos automáticamente (night, morning, afternoon, closing)
- ✅ **Cerrar día** — Requiere los 4 turnos cerrados previamente
- ✅ **Reabrir día** — Para correcciones (con motivo)

#### Gestión de turnos
- ✅ **Editor de turno (ShiftCard)** — Denominaciones, pagos electrónicos, vales, notas
- ✅ **Cerrar/reabrir turno** — Con validación de discrepancia (>€0.50 requiere comentario)
- ✅ **Asignar responsables** — Primary + secondary por turno
- ✅ **Tabs por tipo** — Night / Morning / Afternoon / Closing

#### Conteo de efectivo
- ✅ **Grid de denominaciones** — €200, €100, €50, €20, €10, €5, €2, €1, €0.50, €0.20, €0.10, €0.05, €0.02, €0.01
- ✅ **Total automático** — Columna GENERATED ALWAYS en BD
- ✅ **Bulk replace** — Reemplazar todas las denominaciones de un turno

#### Pagos electrónicos
- ✅ **Por método** — Card, BACS, Web Payment, Transfer, Other
- ✅ **Resumen por turno** — Total por método
- ✅ **Bulk replace** — Reemplazar todos los pagos de un turno

#### Vales (vouchers)
- ✅ **Crear vale** — Amount + reason (5-1000 chars), income/expense
- ✅ **Límite 5 por turno** — Validado en backend
- ✅ **Lifecycle** — pending → justified / cancelled
- ✅ **Stats** — Totales, pendientes, justificados, cancelados

#### Reportes y analytics
- ✅ **Dashboard** — Stats del día: grand total, cash, electronic, estado de turnos
- ✅ **Reporte mensual** — Tabla con desglose diario + totales
- ✅ **Gráficos** — Pie/bar chart de métodos de pago (Recharts)
- ✅ **Historial de vales** — Tabla filtrable con paginación
- ✅ **PDF export** — Reporte diario completo (jsPDF + autoTable)

#### Auditoría
- ✅ **9 tipos de acción** — created, updated, deleted, status_changed, adjustment, voucher_created, voucher_repaid, daily_closed, daily_reopened
- ✅ **Filtros** — Por acción, usuario, fecha
- ✅ **Stats** — Total entries, usuarios activos, acción más frecuente
- ✅ **Paginación** — En tabla de historial

#### UI/UX
- ✅ **Dark mode** — Completo
- ✅ **Responsive** — Breakpoint 1400px+ para layout desktop, mobile cards
- ✅ **Alertas** — Día no inicializado, vales pendientes
- ✅ **Acciones rápidas** — Cards de navegación en dashboard

### 6.6 Patrones de implementación

- **4 turnos/día fijos** — Inicialización atómica (crea los 4 a la vez)
- **Bulk operations** — Denominaciones y pagos soportan reemplazo completo
- **GENERATED ALWAYS** — Total de denominaciones calculado por MySQL, no por app
- **N+1 optimización** — Batch payment queries en reportes
- **Discrepancia con comentario** — Si cash_counted - cash_expected > €0.50, requiere nota
- **Zustand + React Query** — Store para UI state, Query para server state (consistente)
- **String decimals** — Backend envía DECIMAL como string, frontend parsea con parseFloat()

### 6.7 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin checks de rol en frontend** — Los botones admin (reopen, delete) son visibles para todos; solo backend middleware bloquea. Debería ocultar/deshabilitar en UI según rol |
| 2 | ⚠️ | **Period report sin UI** — Endpoint `GET /reports/period` existe pero no hay interfaz para accederlo |
| 3 | ⚠️ | **Export de logs stub** — Funcionalidad de export en logs solo hace console.log, no está implementada |
| 4 | ⚠️ | **Manejo de decimales con parseFloat()** — DECIMAL viene como string del backend; parseFloat() puede causar errores de precisión en operaciones monetarias. Considerar decimal.js |
| 5 | ⚠️ | **Console.logs en producción** — Múltiples console.log/error en controllers y componentes que deberían eliminarse o usar debug library |
| 6 | ❌ | **Sin tests** — No se encontraron archivos de test |
| 7 | ℹ️ | **income_breakdown JSON** — Campo preparado para tracking multi-departamento futuro, actualmente sin uso |
| 8 | ℹ️ | **i18n solo español** — A diferencia de otros módulos, no se encontró `messages/en/cashier.json` |

---

## Módulo 7: Backoffice (bo) ✅

Sistema de gestión de facturas y proveedores del hotel. Ciclo de vida completo de facturas
(pending → validated → paid / rejected), editor de PDF con sellos y firmas, pagos batch automatizados
por cron (día 10), exportación Excel/PDF/ZIP, y gestión de activos (stamps/signatures) via Cloudinary.

### 7.1 Base de datos

5 tablas + 3 vistas en `backend/db-mysql/aiven/16_backoffice.sql`:

| Tabla | Propósito |
|---|---|
| `bo_categories` | Categorías de gasto (23 pre-seeded: administration, maintenance, supplies, marketing, HR...). UK: cost_center+department |
| `bo_suppliers` | Proveedores (name UK, CIF, periodicity, payment_method, bank_account, contact info, soft-delete via is_active) |
| `bo_invoices` | Facturas completas (invoice_number, amounts with/without VAT, status workflow, PDF original+validated en Cloudinary, validation tracking, audit fields, hard-delete) |
| `bo_invoice_history` | Auditoría de facturas (7 acciones: created/updated/validated/rejected/paid/deleted/restored, field_changed, old/new values) — CASCADE delete |
| `bo_assets` | Sellos y firmas (type stamp/signature, Cloudinary URL, is_default — uno por tipo) |

**Vistas:**
- `v_bo_invoices_detail` — Factura + proveedor + categoría + usuario (JOINs)
- `v_bo_suppliers_stats` — Proveedor con stats calculadas (total facturas, pendientes, pagadas, YTD, última factura)
- `v_bo_monthly_summary` — Agregados mensuales por año/mes (count, amounts por status)

**Enums:**
- Status: pending → validated → paid / rejected
- Payment method: transfer / direct_debit
- Periodicity: monthly / bimonthly / quarterly / annual / on_demand
- Asset type: stamp / signature

### 7.2 Backend — Endpoints API

Base: `/api/backoffice` — Middleware: `authenticateToken` + `canAccessBackoffice` (admin + demo-admin lectura) + `isRealAdmin` (escritura)

#### Categorías
- ✅ `GET /categories` — Listar activas
- ✅ `GET /categories/:id` — Detalle
- ✅ `POST /categories` — Crear (cost_center, department, description)

#### Proveedores
- ✅ `GET /suppliers` — Listar con filtros y paginación (category, periodicity, payment_method, search)
- ✅ `GET /suppliers/:id` — Detalle con stats y lista de facturas
- ✅ `POST /suppliers` — Crear (validación nombre duplicado)
- ✅ `PATCH /suppliers/:id` — Editar (protección nombre duplicado)
- ✅ `DELETE /suppliers/:id` — Soft-delete (protección si tiene facturas activas)

#### Facturas — CRUD
- ✅ `GET /invoices` — Listar con filtros avanzados (status comma-separated, supplier, category, payment_method, date range, search, include_deleted). Paginación: default 50, max 100
- ✅ `GET /invoices/:id` — Detalle con historial
- ✅ `POST /invoices` — Crear con auto-history
- ✅ `PATCH /invoices/:id` — Editar con tracking de usuario + history
- ✅ `DELETE /invoices/:id` — HARD DELETE con limpieza Cloudinary (original + validated PDFs)

#### Facturas — Workflow de estado
- ✅ `POST /invoices/:id/validate` — pending → validated (con PDF validado, notas)
- ✅ `POST /invoices/:id/reject` — pending → rejected (con notas)
- ✅ `POST /invoices/:id/unvalidate` — validated → pending (deshacer validación)
- ✅ `POST /invoices/:id/pay` — validated → paid (pago manual individual)

#### Facturas — PDF
- ✅ `POST /invoices/:id/pdf` — Upload PDF a Cloudinary (original o validated, reemplaza anterior)
- ✅ `GET /invoices/:id/pdf-url` — URL firmada de 1 hora
- ✅ `GET /invoices/:id/pdf-download` — Proxy download con 4 estrategias fallback
- ✅ `POST /invoices/download-zip` — ZIP de hasta 100 PDFs validados (filename: `{Supplier}_{Invoice}_{Month}_validado.pdf`)

#### Batch Payment (cierre de mes)
- ✅ `GET /invoices/batch-pay/preview` — Preview: facturas validated del mes anterior
- ✅ `POST /invoices/batch-pay` — Ejecutar: marcar todas como paid (paid_date = invoice_date)
- ✅ `GET /invoices/batch-pay/revert/preview` — Preview reversión
- ✅ `POST /invoices/batch-pay/revert` — Revertir: paid → validated para el mes

#### Activos (stamps/signatures)
- ✅ `GET /assets` — Listar (defaults primero)
- ✅ `POST /assets` — Crear (upload imagen a Cloudinary, auto-gestión de default)
- ✅ `DELETE /assets/:id` — Eliminar (Cloudinary + BD)
- ✅ `PATCH /assets/:id/default` — Establecer como default (uno por tipo)

#### Estadísticas
- ✅ `GET /stats` — Resumen: pending count/amount, overdue, paid this month/all-time, suppliers
- ✅ `GET /monthly-summary` — Desglose mensual por año

#### Cron automático
- ✅ **Día 10 de cada mes a las 23:59** — Batch payment automático del mes anterior

### 7.3 Backend — Arquitectura

```
controllers/backoffice/
└── backoffice-controller.ts    # ~1800 líneas: todos los handlers (categorías, suppliers, invoices, batch, assets, stats)

repositories/backoffice/
└── backoffice-repository.ts    # ~946 líneas: queries SQL, filtros dinámicos, vistas, history tracking

models/backoffice/
└── index.ts                    # Types, enums, DTOs, constants (status colors, labels)

routes/backoffice/
└── backoffice-routes.ts        # ~295 líneas: rutas con role-based access

services/cron/
└── cron-service.ts             # Batch payment automation (día 10, 23:59)
```

### 7.4 Frontend — Arquitectura

#### Página
- ✅ `app/dashboard/bo/page.tsx` — Server Component con Suspense: StatsCards + TabsNavigation + TabContent (data prefetch paralelo)

#### Tabs (lazy-loaded)
- ✅ `PendingInvoicesTab.tsx` — Facturas pending/validated con filtros, resumen por mes/método, acciones (validate, reject, pay, export, delete)
- ✅ `PaidInvoicesTab.tsx` — Facturas pagadas, batch close/reopen month, paginación URL-based
- ✅ `SuppliersTab.tsx` — Lista de proveedores con stats YTD, panel de detalle con últimas 10 facturas
- ✅ `SettingsTab.tsx` — Upload/gestión de stamps y signatures (Cloudinary)

#### Modales
- ✅ `InvoiceFormModal.tsx` — Crear/editar factura (React Hook Form + Zod, cálculo VAT automático)
- ✅ `SupplierFormModal.tsx` — Crear/editar proveedor (validación IBAN, nombre duplicado)
- ✅ `SupplierInvoicesModal.tsx` — Ver facturas de un proveedor
- ✅ `PdfUploadModal.tsx` — Dropzone para PDF (max 10MB)
- ✅ `PdfViewerModal.tsx` — Visor dual tabs (original/validated), download, open in new tab
- ✅ `PdfEditorModal.tsx` — (~1000+ LOC) Editor de PDF con herramientas: selección, texto, highlight, stamps, signatures, multi-page, zoom, undo/redo (max 5), resize handles. Usa pdfjs-dist (render) + pdf-lib (modificación)
- ✅ `ConfirmDialog.tsx` — Confirmación genérica

#### Componentes
- ✅ `StatsCards.tsx` — 6 métricas (Server Component)
- ✅ `TabsNavigation.tsx` — 4 tabs (Client)
- ✅ `TabContent.tsx` — Render dinámico del tab activo

#### API y utilidades
- ✅ `app/lib/backoffice/backofficeApi.ts` (~513 LOC) — API client completo (CRUD invoices, suppliers, assets, batch payment, PDF operations, ZIP download)
- ✅ `app/lib/backoffice/data.ts` (~352 LOC) — Server-only data fetching con cache (serverFetch + cookies)
- ✅ `app/lib/backoffice/types.ts` (~353 LOC) — Types + constants + helpers (formatCurrency, calculateVat, getStatusBadgeClasses)
- ✅ `app/lib/backoffice/export-utils.ts` (~335 LOC) — Excel export (2 sheets: detalle + resumen) + PDF export (A4 landscape, tabla multi-page)

#### i18n
- ✅ `messages/es/backoffice.json` — ~525+ claves en español

### 7.5 Funcionalidades de usuario

#### Gestión de facturas
- ✅ **Crear factura** — Número, proveedor (dropdown), categoría, fecha, importes (con cálculo VAT auto), método pago, fechas recepción/vencimiento/periodo, notas
- ✅ **Editar factura** — Actualización parcial con tracking en historial
- ✅ **Eliminar factura** — Hard delete con limpieza de PDFs en Cloudinary
- ✅ **Filtros avanzados** — Status (multi-select), proveedor, categoría, método pago, rango fechas, búsqueda texto

#### Workflow de validación
- ✅ **Validar** — pending → validated, con PDF editor para añadir sello+firma
- ✅ **Rechazar** — pending → rejected, con notas de motivo
- ✅ **Revertir validación** — validated → pending (deshacer)
- ✅ **Marcar pagada** — validated → paid (manual individual)

#### PDF
- ✅ **Upload** — Original y validated, Cloudinary, reemplazo automático del anterior
- ✅ **Visor** — Dual tabs (original/validated), embedded
- ✅ **Editor** — Añadir sellos, firmas, texto, highlights. Multi-page, zoom, undo/redo
- ✅ **Download** — 4 estrategias fallback para robustez
- ✅ **ZIP batch** — Hasta 100 PDFs validados en un ZIP

#### Batch payment (cierre de mes)
- ✅ **Preview** — Ver facturas validated del mes que se van a cerrar
- ✅ **Ejecutar** — Marcar todas como paid (paid_date = invoice_date)
- ✅ **Cron automático** — Día 10 a las 23:59 para mes anterior
- ✅ **Revertir** — Reabrir mes: paid → validated

#### Proveedores
- ✅ **CRUD** — Con validación nombre duplicado, IBAN, soft-delete
- ✅ **Stats** — YTD total, count facturas, pendientes, última factura
- ✅ **Ver facturas** — Modal con últimas facturas del proveedor

#### Activos (stamps/signatures)
- ✅ **Upload** — PNG/WebP, Cloudinary
- ✅ **Default** — Uno por tipo (stamp/signature)
- ✅ **Gestión** — Preview, delete, set-default

#### Exportación
- ✅ **Excel** — 2 hojas (detalle + resumen), columnas auto-dimensionadas
- ✅ **PDF** — A4 landscape, tabla multi-page, totales
- ✅ **ZIP** — Batch download de PDFs validados

### 7.6 Patrones de implementación

- **Hard delete** para facturas (no soft-delete) — con limpieza Cloudinary en cascade
- **Soft delete** para proveedores (is_active flag)
- **Vistas SQL** — v_bo_invoices_detail, v_bo_suppliers_stats, v_bo_monthly_summary para queries complejas
- **Server Components** — StatsCards como Server Component, tabs lazy-loaded como Client
- **Cron job** — Batch payment automatizado, con manual override via endpoint
- **PDF multi-fallback** — 4 estrategias de download para robustez con Cloudinary
- **VAT auto-calc** — Calcular importe con/sin IVA bidireccional
- **23 categorías pre-seeded** — Catálogo fijo inicializado con el schema

### 7.7 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Hard delete de facturas** — Eliminación permanente sin soft-delete. Una factura eliminada pierde todo el historial (CASCADE). Considerar soft-delete como en otros módulos |
| 2 | ⚠️ | **Batch payment timezone** — Cron job a las 23:59 del día 10 sin manejo de timezone offset. Podría fallar en edge cases de zona horaria |
| 3 | ⚠️ | **PDF download frágil** — 4 estrategias fallback indica problemas recurrentes con URLs de Cloudinary. Podría simplificarse si se resuelve el problema raíz |
| 4 | ⚠️ | **PdfEditorModal muy extenso** — ~1000+ líneas con lógica de renderizado, herramientas, y manipulación de PDF. Candidato fuerte a extracción de sub-componentes |
| 5 | ⚠️ | **Controller monolítico** — ~1800 líneas en un solo archivo. Candidato a dividir por dominio (invoices, suppliers, assets, batch) |
| 6 | ⚠️ | **Detección de duplicados** — No hay warning para invoice_number duplicado (mismo proveedor podría tener facturas repetidas) |
| 7 | ❌ | **Sin tests** — No se encontraron archivos de test para backoffice |
| 8 | ℹ️ | **demo-admin** — Solo lectura (GET), escritura bloqueada por isRealAdmin. Funcional para demos |
| 9 | ℹ️ | **Supplier invoices modal** — Muestra facturas pero sin paginación (solo fetch inicial) |

---

## Módulo 8: Messages & Chat ✅

Sistema de mensajería interna con dos subsistemas: **Messages** (DMs y grupos) completamente funcional,
y **Chat AI** (asistente de ayuda) deliberadamente archivado/deshabilitado.

### 8.1 Base de datos

3 tablas en `backend/db-mysql/aiven/14_messages.sql`:

| Tabla | Propósito |
|---|---|
| `conversations` | Conversaciones (type: dm/group, name para grupos, created_by) |
| `conversation_participants` | Participantes (user_id, is_admin, is_active soft-delete, last_read_at para tracking no leídos). UK: conversation_id+user_id |
| `messages` | Mensajes (content TEXT, notify flag, is_edited, edited_at, deleted_at soft-delete). FULLTEXT INDEX en content |

**Constantes del sistema:**
- Max content: 5000 chars
- Max participantes por grupo: 10
- Retención: 90 días (cleanup automático via MySQL Event)
- Paginación: 50 mensajes por defecto (cursor-based)

**Evento de limpieza:** Borra mensajes >90 días diariamente; conversaciones vacías eliminadas en cascade.

### 8.2 Backend — Endpoints API

Base: `/api/messages` — Middleware: `authenticateToken`

#### Conversaciones
- ✅ `GET /conversations` — Listar conversaciones del usuario (ordenadas por última actividad)
- ✅ `POST /conversations` — Crear DM o grupo (previene DMs duplicados)
- ✅ `GET /conversations/:id` — Detalle con participantes
- ✅ `PATCH /conversations/:id` — Renombrar grupo (solo admin del grupo)
- ✅ `DELETE /conversations/:id` — Abandonar conversación
- ✅ `DELETE /conversations/:id/delete` — Eliminar conversación (admin grupo / system admin)
- ✅ `POST /conversations/:id/read` — Marcar como leída (actualiza last_read_at)
- ✅ `POST /conversations/:id/participants` — Añadir participantes (solo admin grupo)
- ✅ `DELETE /conversations/:id/participants/:userId` — Eliminar participante (solo admin grupo)
- ✅ `GET /users` — Buscar usuarios para crear conversaciones (incluye existing_dm_id)
- ✅ `GET /conversations/all` — Ver todas las conversaciones (solo system admin)

#### Mensajes
- ✅ `GET /conversations/:id/messages` — Mensajes paginados (cursor-based, before_id)
- ✅ `POST /conversations/:id/messages` — Enviar mensaje (con notify flag opcional)
- ✅ `PATCH /:messageId` — Editar mensaje propio
- ✅ `DELETE /:messageId` — Eliminar mensaje propio (soft-delete)
- ✅ `GET /unread-count` — Total no leídos + desglose por conversación
- ✅ `GET /search` — Búsqueda FULLTEXT + fallback LIKE

#### Chat AI (archivado)
- 🔴 `POST /api/chat/message` — Devuelve mensaje de archivado, no funcional
- 🔴 `GET /api/chat/status` — Devuelve available: false

### 8.3 Backend — Arquitectura

```
controllers/messages/
├── conversation-controller.ts    # 754 líneas: CRUD conversaciones, participantes, admin tools
└── message-controller.ts         # 442 líneas: CRUD mensajes, unread, search, notificaciones

repositories/messages/
├── conversation-repository.ts    # 457 líneas: queries conversaciones + participant management + user search
└── message-repository.ts         # 331 líneas: CRUD mensajes, cursor pagination, fulltext search, unread counts

models/messages/
└── index.ts                      # 189 líneas: types, DTOs, constantes

routes/messages/
└── messages-routes.ts            # 58 líneas: rutas + middleware

controllers/chat/
└── chat-controller.ts            # 78 líneas: wrapper (devuelve archivado)

services/chat/
├── chat-service.ts               # ARCHIVADO — retorna error fijo
├── chat-types.ts                 # Types ChatMessage/Request/Response
└── app-knowledge.ts              # 403 líneas: documentación legacy del sistema (no activa)
```

**Sistema de permisos (error codes específicos):**
- 50+ códigos de error `MESSAGES_*` (MESSAGES_DM_ONE_PARTICIPANT, MESSAGES_GROUP_MAX_PARTICIPANTS, MESSAGES_ONLY_OWN_EDIT, etc.)

### 8.4 Frontend — Arquitectura

#### Integración en perfil
- ✅ `app/dashboard/profile/page.tsx` — Panel dinámico: `?panel=messages` abre MessagesPanel, `&chat=123` auto-abre conversación

#### Componente principal
- ✅ `app/components/profile/MessagesPanel.tsx` — (~890 líneas) UI completa de mensajería:
  - Lista de conversaciones con búsqueda y badges de no leídos
  - Vista de chat con thread de mensajes
  - DM vs grupo visualmente diferenciados
  - Edición/eliminación de mensajes (hover actions)
  - Modal de nueva conversación
  - Lista de participantes para grupos
  - Menú de conversación (abandonar/eliminar)
  - Toggle de notificación por mensaje
  - Layout split desktop / mobile (lista oculta al seleccionar chat)

#### Hooks
- ✅ `useConversations.ts` — fetch, select, create, remove, leave, markAsRead, optimistic updates
- ✅ `useChat.ts` — fetch con cursor pagination, send, edit, remove, loadMore, editingState, auto-scroll refs
- ✅ `useUserSearch.ts` — debounced search, selectedUsers, isGroup detection, canCreate

#### API y types
- ✅ `app/lib/messaging/queries.ts` — API client (conversations CRUD + messages CRUD + search + unread)
- ✅ `app/lib/messaging/types.ts` — Types completos (Conversation, Message, Participant, UserSearchResult, responses)

#### Chat AI (frontend archivado)
- 🔴 `app/components/chat/HelpChatModal.tsx` — Componente existe pero no está conectado a ningún botón en la UI actual

#### i18n
- ✅ `messages/en/messages.json` + `messages/es/messages.json` — Traducciones completas

### 8.5 Funcionalidades de usuario

#### Mensajería interna (Messages) ✅
- ✅ **DMs** — Conversaciones 1:1, previene duplicados (reutiliza existente)
- ✅ **Grupos** — Hasta 10 participantes, nombre obligatorio
- ✅ **Enviar mensajes** — Con flag `notify` para notificación urgente a todos los participantes
- ✅ **Editar mensajes** — Solo el remitente, registra edited_at
- ✅ **Eliminar mensajes** — Soft-delete, remitente o system admin
- ✅ **Cargar más** — Cursor-based pagination (load older messages)
- ✅ **Buscar mensajes** — FULLTEXT + fallback LIKE
- ✅ **No leídos** — Badge por conversación + total
- ✅ **Marcar como leída** — Al seleccionar conversación
- ✅ **Gestión de grupos** — Añadir/quitar participantes, renombrar (solo admin grupo)
- ✅ **Abandonar grupo** — Con transferencia automática de admin al miembro más antiguo
- ✅ **Eliminar conversación** — Admin grupo o system admin
- ✅ **Notificaciones** — Mensaje con notify=true crea notificación en sistema para todos los participantes
- ✅ **Dark mode** — Completo
- ✅ **Responsive** — Split view desktop, mobile con lista oculta al abrir chat

#### Chat AI 🔴
- 🔴 **Archivado** — Servicio retorna error fijo: *"El servicio de chat con IA ha sido archivado"*

### 8.6 Patrones de implementación

- **Cursor-based pagination** — `before_id` para cargar mensajes más antiguos (mejor UX que offset para chats)
- **FULLTEXT INDEX** — En messages.content para búsqueda eficiente con fallback LIKE
- **Admin transfer automático** — Al abandonar grupo, admin se transfiere al participante más antiguo
- **Prevención DM duplicados** — `findExistingDM()` antes de crear, retorna existing_dm_id
- **existing_dm_id** — En resultados de búsqueda de usuarios para indicar si ya hay conversación
- **Notify flag** — Integración con sistema de notificaciones al marcar mensaje como urgente
- **MySQL Event** — Limpieza automática de mensajes >90 días

### 8.7 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin real-time** — Polling/refresh únicamente, sin WebSocket. Para mensajería frecuente puede ser lento |
| 2 | ⚠️ | **Chat AI archivado con código muerto** — Controllers, servicio, tipos, componente y queries existen pero están completamente deshabilitados. Candidato a eliminar o documentar decisión |
| 3 | ⚠️ | **app-knowledge.ts desactualizado** — 403 líneas de documentación legacy que menciona Next.js 16 (el proyecto usa 14). No está activa |
| 4 | ⚠️ | **Sin rate limiting** — No hay límite de mensajes por usuario/tiempo. Riesgo de spam |
| 5 | ⚠️ | **Sin transacciones DB** — Operaciones concurrentes podrían generar race conditions |
| 6 | ℹ️ | **Retención 90 días** — Mensajes eliminados automáticamente. El usuario podría no saberlo |
| 7 | ℹ️ | **Sin adjuntos** — Las traducciones i18n mencionan `attachments` pero la funcionalidad no está implementada |
| 8 | ℹ️ | **Sin threading** — Mensajes lineales únicamente, sin respuestas anidadas |
| 9 | ℹ️ | **Sin "leído por"** — Solo se rastrea last_read_at por conversación, no confirmación de lectura por mensaje |

---

## Módulo 9: Groups ✅

Sistema de gestión de grupos hoteleros. Tracking completo del ciclo de vida de un grupo (contactos,
habitaciones, pagos, estados de booking/contrato/rooming/balance), dashboard con timeline, historial
de auditoría y notificaciones automáticas.

### 9.1 Base de datos

6 tablas en `backend/db-mysql/aiven/10_group-tracking.sql`:

| Tabla | Propósito |
|---|---|
| `hotel_groups` | Grupo principal (nombre, agency, arrival/departure, status, pax count, totales) |
| `group_contacts` | Contactos del grupo (nombre, email, teléfono, rol, is_primary) |
| `group_rooms` | Habitaciones asignadas (type, quantity, rate, rooming_status, deadline) |
| `group_status` | Estado detallado (booking_confirmed, contract_signed, rooming_list, balance_status + fechas) |
| `group_payments` | Pagos del grupo (amount, due_date, status, payment_date, notes) |
| `group_history` | Auditoría (action: created/updated/status_changed/payment_updated/deleted, field_changed, old/new values) |

**Enums:**
- GroupStatus: inquiry / confirmed / on_hold / cancelled / completed
- RoomType: single / double / suite
- RoomingStatus: pending / received / confirmed
- BalanceStatus: pending / partial / paid / overdue
- PaymentStatus: pending / paid / overdue / cancelled

### 9.2 Backend — Endpoints API

Base: `/api/groups` — Middleware: `authenticateToken` + `canManageGroups` / `canViewGroups`

#### Dashboard
- ✅ `GET /dashboard/overview` — KPIs: grupos activos, por llegar, pagos pendientes, balance total
- ✅ `GET /dashboard/timeline` — Timeline de llegadas/salidas del mes

#### CRUD principal
- ✅ `GET /` — Listar grupos con filtros y paginación
- ✅ `GET /:id` — Detalle completo con contactos, habitaciones, pagos, estado
- ✅ `POST /` — Crear grupo
- ✅ `PUT /:id` — Editar grupo
- ✅ `DELETE /:id` — Eliminar grupo

#### Estado
- ✅ `GET /:id/status` — Obtener estado del grupo
- ✅ `PUT /:id/status/booking` — Actualizar estado de booking
- ✅ `PUT /:id/status/contract` — Actualizar estado de contrato
- ✅ `PUT /:id/status/rooming` — Actualizar estado de rooming list
- ✅ `PUT /:id/status/balance` — Actualizar estado de balance

#### Pagos
- ✅ `GET /:id/payments` — Pagos del grupo
- ✅ `POST /:id/payments` — Crear pago
- ✅ `PUT /:id/payments/:paymentId` — Editar pago
- ✅ `PATCH /:id/payments/:paymentId/status` — Actualizar estado de pago
- ✅ `PATCH /:id/payments/:paymentId/amount` — Actualizar importe pagado
- ✅ `DELETE /:id/payments/:paymentId` — Eliminar pago
- ✅ `GET /payments/upcoming` — Pagos próximos (todos los grupos)
- ✅ `GET /payments/overdue` — Pagos vencidos (todos los grupos)

#### Contactos
- ✅ `GET /:id/contacts` — Contactos del grupo
- ✅ `POST /:id/contacts` — Crear contacto
- ✅ `PUT /:id/contacts/:contactId` — Editar contacto
- ✅ `DELETE /:id/contacts/:contactId` — Eliminar contacto
- ✅ `GET /:id/contacts/primary` — Contacto principal

#### Habitaciones
- ✅ `GET /:id/rooms` — Habitaciones del grupo
- ✅ `POST /:id/rooms` — Crear/actualizar habitación
- ✅ `PUT /:id/rooms/:roomId` — Editar habitación
- ✅ `DELETE /:id/rooms/:roomId` — Eliminar habitación

#### Historial y notificaciones
- ✅ `GET /:id/history` — Historial de auditoría del grupo
- ✅ `GET /:id/notifications` — Notificaciones del grupo
- ✅ `POST /:id/notifications` — Crear notificación manual para grupo

### 9.3 Backend — Arquitectura

```
controllers/group/
├── group-controller.ts             # CRUD principal + dashboard
├── group-payment-controller.ts     # Gestión de pagos
├── group-status-controller.ts      # Workflow de estados
├── group-contact-controller.ts     # Gestión de contactos
├── group-room-controller.ts        # Gestión de habitaciones
└── group-history-controller.ts     # Auditoría

repositories/group/
├── group-repository.ts             # Queries principales
├── group-payment-repository.ts     # Queries de pagos + summaries
├── group-status-repository.ts      # Queries de estado
├── group-contact-repository.ts     # Queries de contactos
├── group-room-repository.ts        # Queries de habitaciones
└── group-history-repository.ts     # Queries de historial

services/group/
├── group-history-service.ts        # ~198 líneas: logging de auditoría (logGroupCreated, logStatusChanged, etc.)
├── payment-calculator-service.ts   # ~89 líneas: cálculo de importes, balance, recalculate
└── email-service.ts                # ~166 líneas: notificaciones email (parcialmente implementado)

validations/group/
└── group-schemas.ts                # VACÍO — sin Zod schemas

models/group/
└── index.ts                        # Types, enums, DTOs, response types, Dashboard types
```

### 9.4 Frontend — Arquitectura

#### Páginas
- ✅ `app/dashboard/groups/page.tsx` — Lista de grupos
- ✅ `app/dashboard/groups/[id]/page.tsx` — Detalle del grupo
- ✅ `app/dashboard/groups/loading.tsx` / `error.tsx` — Estados

#### Componentes (~22 archivos)
- ✅ `GroupsListClient.tsx` — Lista con filtros
- ✅ `GroupDetailClient.tsx` — Orquestador con tabs y panels
- **Tabs**: OverviewTab, PaymentsTab, ContactsTab, RoomsTab, StatusTab, HistoryTab
- **Cards**: ContactCard, PaymentCard, RoomCard, BalanceCard, BookingCard, ContractCard, RoomingCard
- **Panels**: CreateGroupPanel, EditGroupPanel, PaymentPanel, ContactPanel, RoomPanel
- **Layout**: GroupHeader, GroupDetailSummaryPanel, TabNavigation
- **Shared**: EmptyState, GroupsLoadingState, LoadingSpinner, StatusBadge
- ✅ `NotificationModal.tsx` — Modal de notificaciones para grupo

#### API y types
- ✅ `app/lib/groups/queries.ts` — ~23KB React Query hooks completos (getAll, getById, create, update, delete, dashboard, payments, contacts, rooms, status, history)
- ✅ `app/lib/groups/types.ts` — Types frontend completos

#### i18n
- ✅ `messages/es/groups.json` — ~18KB en español

### 9.5 Funcionalidades de usuario

- ✅ **Dashboard** — KPIs + timeline de llegadas/salidas del mes
- ✅ **CRUD grupos** — Con filtros y paginación
- ✅ **Gestión de contactos** — Múltiples contactos por grupo, contacto primario
- ✅ **Gestión de habitaciones** — Tipos, tarifas, cantidades, estado de rooming
- ✅ **Gestión de pagos** — Vencimientos, estados, importes parciales, vencidos/próximos
- ✅ **Workflow de estados** — Booking / Contrato / Rooming / Balance con fechas
- ✅ **Historial de auditoría** — Cambios tracked con old/new values
- ✅ **Notificaciones automáticas** — Recordatorios de pago (15 y 7 días antes), llegada (3 días), contrato sin firmar, balance pendiente, rooming list

### 9.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Estado duplicado (HIGH PRIORITY)** — `hotel_groups.status` y `group_status.booking_confirmed` rastrean información solapada. TODO documentado en el código. Requiere refactoring de BD + código |
| 2 | ❌ | **Validaciones Zod vacías** — `group-schemas.ts` existe pero está completamente vacío. Sin validación de input en backend |
| 3 | ⚠️ | **Email service parcial** — `email-service.ts` existe (~166 líneas) pero sin integración real de envío SMTP |
| 4 | ❌ | **Sin tests** — No se encontraron archivos de test |
| 5 | ℹ️ | **i18n solo español** — Sin `messages/en/groups.json` |

---

## Módulo 10: Notifications ✅

Sistema centralizado de notificaciones internas. Generación automática de recordatorios vinculados
al módulo de Groups (pagos, llegadas, contratos, balance, rooming). Entrega in-app con
bell icon, modal de centro de notificaciones y badge de no leídos.

### 10.1 Base de datos

2 tablas en `backend/db-mysql/aiven/17_notifications.sql`:

| Tabla | Propósito |
|---|---|
| `notifications` | Notificaciones (module, related_to, priority, status, group_id, link, title, body, scheduled_for, sent_at, email_sent_at) |
| `notification_recipients` | Receptores (notification_id, user_id, read_at). UK: notification_id+user_id |

**Enums:**
- Module: groups / parking / logbooks / system
- Related_to: payment / rooming / balance / contract / arrival / general
- Priority: low / medium / high / urgent
- Status: pending / sent / read

### 10.2 Backend — Endpoints API

Base: `/api/notifications` — Middleware: `authenticateToken` + `canViewGroups`

- ✅ `GET /notifications` — Listar con filtros (status, priority, module, limit)
- ✅ `GET /notifications/unread` — Solo no leídas
- ✅ `GET /notifications/unread/count` — Contador para badge
- ✅ `POST /notifications` — Crear notificación general (solo admin)
- ✅ `POST /notifications/check-pending` — Trigger manual del cron de notificaciones
- ✅ `PATCH /notifications/read-all` — Marcar todas como leídas
- ✅ `PATCH /notifications/:id/read` — Marcar una como leída
- ✅ `DELETE /notifications/:id` — Eliminar (solo admin)

Integrado en Groups:
- ✅ `GET /groups/:id/notifications` — Notificaciones de un grupo específico
- ✅ `POST /groups/:id/notifications` — Crear notificación manual para grupo

### 10.3 Backend — Arquitectura

```
controllers/notifications/
└── notification-controller.ts      # Todos los handlers

repositories/notifications/
└── notification-repository.ts      # CRUD + recipients + unread + mark read

services/notifications/
└── notification-generator-service.ts  # Generación automática de recordatorios (cron)
    - generatePaymentReminder()         # 15 y 7 días antes del vencimiento
    - generateOverduePaymentNotification() # En fecha de vencimiento
    - generateRoomingListReminder()      # 15 y 7 días antes del deadline
    - generateArrivalReminder()          # 3 días antes de llegada
    - generateContractUnsignedReminder() # 10 y 5 días antes de llegada
    - generateBalancePendingReminder()   # 7 días después de salida
    - checkAndGenerateNotifications()    # Entry point del cron

models/notifications/
└── index.ts                        # Types, enums, DTOs, PRIORITY_COLORS map
```

### 10.4 Frontend — Arquitectura

- ✅ `NotificationBell.tsx` — Bell icon con badge de no leídos (30s stale, 1min refetch)
- ✅ `GlobalNotificationModal.tsx` — Centro de notificaciones (~20KB): lista, filtros, mark read
- ✅ `NotificationItem.tsx` — Item individual con colores por prioridad
- ✅ `NotificationsList.tsx` / `NotificationsHeader.tsx` — Wrappers

#### Hooks y queries
- ✅ `useNotificationsQuery()` — Todas (2 min stale)
- ✅ `useUnreadNotificationsQuery()` — No leídas (1 min stale)
- ✅ `useUnreadCountQuery()` — Count con 30s stale + 1min refetch
- ✅ `useMarkAsReadMutation()` — Con optimistic update
- ✅ `useMarkAllAsReadMutation()` — Bulk

#### i18n
- ✅ `messages/es/notifications.json`

### 10.5 Funcionalidades de usuario

- ✅ **Bell icon** — Badge con count de no leídas, polling frecuente
- ✅ **Centro de notificaciones** — Modal con lista filtrable
- ✅ **Recordatorios automáticos de Groups** — Pagos, llegadas, contratos, balance, rooming
- ✅ **Marcar como leída** — Individual o todas
- ✅ **Links directos** — Cada notificación enlaza al recurso relacionado
- ✅ **Trigger manual** — Endpoint para ejecutar el generador manualmente (cron bypass)
- ✅ **Prioridades** — low/medium/high/urgent con colores

### 10.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Email delivery no implementado** — La BD tiene campos email_sent/email_sent_at y `markEmailSent()` existe en el repositorio, pero no hay envío real de emails |
| 2 | ⚠️ | **Módulos parking y logbooks** — Los enums incluyen parking y logbooks como módulos, pero no hay generadores de notificaciones para ellos |
| 3 | ℹ️ | **Sin preferencias de usuario** — No hay opt-out ni configuración de notificaciones por usuario |
| 4 | ℹ️ | **Sin historial de notificaciones enviadas** — Solo existe el estado actual, sin log de entrega |

---

## Módulo 11: Departments ⚠️

Gestión de departamentos del hotel. Backend completo pero **sin implementación frontend**. Funciona
como catálogo de referencia usado por el módulo de Logbooks para categorizar entradas.

### 11.1 Base de datos

1 tabla en `backend/db-mysql/aiven/02_core_tables.sql`:

| Tabla | Propósito |
|---|---|
| `departments` | Departamentos (id INT, name VARCHAR UNIQUE). Ordered by name |

### 11.2 Backend — Endpoints API

Base: `/api/departments` — Middleware: `authenticateToken` + `excludeMantenimiento`

- ✅ `GET /departments` — Listar todos
- ✅ `GET /departments/:id` — Obtener por ID
- ✅ `POST /departments` — Crear (solo admin)
- ✅ `PUT /departments/:id` — Editar (solo admin)
- ✅ `DELETE /departments/:id` — Eliminar (solo admin)

### 11.3 Backend — Arquitectura

```
controllers/departments/
└── departments-controller.ts   # CRUD simple

repositories/departments/
└── departments-repository.ts   # Queries + duplicate name check + transaction en update

routes/departments/
└── departments-routes.ts       # 5 rutas con auth + role checks
```

**Sin modelos separados** — Types inline en el repositorio (`DepartmentRow`, `CreateDepartmentInput`)
**Sin validaciones Zod** — No hay schemas de validación

### 11.4 Frontend

- ✅ `app/lib/departments/queries.ts` — API wrapper básico (getAll, getById, create, update, delete). Sin React Query
- ✅ `app/lib/departments/types.ts` — Interface `Department { id, name }`
- ❌ **Sin páginas ni componentes** — No hay UI para gestionar departamentos

El módulo de Logbooks usa `useDepartments` hook propio para consumir este endpoint y formatear nombres para mostrar en la UI de logbooks.

### 11.5 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ❌ | **Sin UI** — Toda la gestión de departamentos está en backend pero no hay página ni componentes frontend |
| 2 | ❌ | **Sin relaciones en BD** — No hay FK desde otras tablas a departments (excepto logbooks que usa department_id). No se puede saber qué usuarios pertenecen a qué departamento |
| 3 | ❌ | **Sin validaciones Zod** — Ni en backend ni en frontend |
| 4 | ℹ️ | **Gestionado via Settings de Auth** — El tab de "Departments" en SettingsPanel del módulo de Auth podría ser la UI destinada para esto |
| 5 | ℹ️ | **Uso real** — Principalmente consumido por Logbooks para categorizar entradas por departamento |

---

## Módulo 12: Conciliation ✅

Sistema de conciliación diaria entre recepción y housekeeping. Formulario de cuadre de habitaciones
con workflow de estados (draft → confirmed → closed) y resumen mensual agregado.

### 12.1 Base de datos

4 tablas en `backend/db-mysql/aiven/09_conciliation.sql`:

| Tabla | Propósito |
|---|---|
| `conciliation_summary` | Cabecera diaria (date UNIQUE, total_reception, total_housekeeping, difference GENERATED, status draft/confirmed/closed, soft-delete) |
| `conciliation_reception` | 5 líneas de recepción por día (reason enum, direction add/subtract, value, room_number, notes, soft-delete) — FK CASCADE |
| `conciliation_housekeeping` | 7 líneas de housekeeping por día (mismos campos) — FK CASCADE |
| `conciliation_monthly_summary` | Metadatos de cierre mensual (year, month, status, closed_by, closed_at). UNIQUE (year, month) |

**Motivos de recepción (5):** base_rooms, no_show, room_change, gratuity, other
**Motivos de housekeeping (7):** cleaned, do_not_disturb, ooo_cleaned, pending_cleaned, pending_to_clean, room_clean, other
**Diferencia:** columna GENERATED (total_reception - total_housekeeping)

### 12.2 Backend — Endpoints API

Base: `/api/conciliations` — Middleware: `authenticateToken` + `excludeMantenimiento`

#### Conciliación diaria
- ✅ `GET /conciliations` — Listar todas
- ✅ `GET /conciliations/:id` — Detalle con todas las líneas (recepción + housekeeping)
- ✅ `GET /conciliations/day/:date` — Por fecha (null si no existe)
- ✅ `POST /conciliations` — Crear + inicializar automáticamente todas las líneas a 0 (transaccional)
- ✅ `PUT /conciliations/:id/form` — Actualizar formulario completo (todas las líneas a la vez + recalcular totales, transaccional)
- ✅ `PATCH /conciliations/:id/status` — Cambiar estado (closed solo admin)
- ✅ `POST /conciliations/:id/recalculate` — Recalcular totales
- ✅ `DELETE /conciliations/:id` — Soft-delete (solo admin)

#### Resumen mensual
- ✅ `GET /conciliations/monthly-summary/:year/:month` — Totales del mes con desglose por motivo
- ✅ `GET /conciliations/monthly-summary/:year/:month/validation` — Verificar si el mes puede cerrarse
- ✅ `PATCH /conciliations/monthly-summary/:year/:month/status` — Cerrar/reabrir mes
- ✅ `GET /conciliations/monthly-summary/:year/:month/missing-days` — Días faltantes del mes

### 12.3 Backend — Arquitectura

```
controllers/conciliation/
├── conciliation.controller.ts          # 7 endpoints de conciliación diaria
└── conciliation-monthly.controller.ts  # 4 endpoints de resumen mensual

repositories/conciliation/
├── conciliation.repository.ts          # CRUD diario + createWithAllEntries() + updateForm() transaccionales
└── conciliation-monthly.repository.ts  # calculateMonthlySummary() + validateMonthlyClose() + getOrCreateMonthlySummaryMeta()

services/conciliation/
└── logic.ts                            # Mapeos reason→direction (add/subtract)
```

**Sin validaciones Zod** — Validación inline en controllers.

### 12.4 Frontend — Arquitectura

- ✅ `app/dashboard/conciliation/page.tsx` — Página wrapper
- ✅ `ConciliationClient.tsx` — Orquestador: date picker con navegación mensual, create mutation, render del formulario
- ✅ `ConciliationForm.tsx` — Formulario de todas las líneas
- ✅ `ConciliationTable.tsx` — Tabla de visualización
- ✅ `TotalsCards.tsx` — Cards de resumen
- ✅ `app/lib/conciliation/queries.ts` — React Query hooks
- ✅ `app/lib/conciliation/types.ts` — Types completos
- ✅ `app/lib/conciliation/config.ts` — Labels de motivos + direction mappings + arrays ordenados

### 12.5 Funcionalidades de usuario

- ✅ **Crear conciliación** — Inicializa automáticamente todas las líneas (5 recepción + 7 housekeeping) a 0
- ✅ **Formulario de cuadre** — Editar todas las líneas de una vez con recalculate automático
- ✅ **Workflow de estados** — draft → confirmed → closed (closed solo admin)
- ✅ **Vista diaria** — Por fecha con navegación de mes
- ✅ **Resumen mensual** — Totales agregados con desglose por motivo
- ✅ **Validación de cierre** — Verifica que todos los días del mes estén closed antes de cerrar el mes
- ✅ **Días faltantes** — Lista los días del mes sin conciliación

### 12.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin edición individual de líneas** — Solo se puede editar el formulario completo (todas las líneas a la vez), no una línea individual |
| 2 | ⚠️ | **Totales mensuales sin caché** — Se recalculan on-demand (30+ queries si el mes está completo) |
| 3 | ⚠️ | **Sin auditoría por línea** — Solo hay created_by/updated_by en el summary. Los cambios individuales en líneas no se rastrean |
| 4 | ⚠️ | **Sin Zod** — Validación inline en controllers, no schemas reutilizables |
| 5 | ℹ️ | **Check admin comentado** — En `conciliation-monthly.controller.ts` hay un check de admin comentado (línea ~144-150) |

---

## Módulo 13: Blacklist ✅

Lista negra de huéspedes del hotel. CRUD completo con soft-delete/restore, auditoría de cambios
por campo (JSON), imágenes vía Cloudinary, filtros avanzados y estadísticas.

### 13.1 Base de datos

1 tabla en `backend/db-mysql/aiven/12_blacklist.sql`:

| Tabla | Propósito |
|---|---|
| `blacklist_entries` | Entradas (guest_name, document_type/number, check_in/out dates, reason, severity MEDIUM default, comments, images JSON, status ACTIVE/DELETED, audit_trail JSON, soft-delete fields) |

**Índices:** document_number, check_in/out dates, severity, status+severity compuesto, status+created_at compuesto
**FK:** created_by RESTRICT (no se puede borrar al creador), deleted_by SET NULL

### 13.2 Backend — Endpoints API

Base: `/api/blacklist` — Middleware: `authenticateToken` + `excludeMantenimiento`

- ✅ `GET /blacklist` — Listar con filtros (q, document, severity, status, created_by, date range) y paginación
- ✅ `GET /blacklist/stats` — Estadísticas (total, active, deleted, by_severity, recent 5)
- ✅ `GET /blacklist/:id` — Detalle con audit_trail completo
- ✅ `POST /blacklist` — Crear entrada + audit trail inicial
- ✅ `PATCH /blacklist/:id` — Editar (trackea solo los campos que cambian en audit trail)
- ✅ `DELETE /blacklist/:id` — Soft-delete + entrada en audit trail
- ✅ `PATCH /blacklist/:id/restore` — Restaurar + entrada en audit trail
- ✅ `POST /blacklist/upload` — Subir imagen a Cloudinary
- ✅ `DELETE /blacklist/upload/:publicId` — Eliminar imagen de Cloudinary

### 13.3 Backend — Arquitectura

```
controllers/blacklist/
└── blacklist-controller.ts         # Static class, 8 handlers

repositories/blacklist/
└── blacklist-repository.ts         # CRUD + audit trail tracking + existsByDocument()

validations/blacklist/
└── schemas.ts                      # Zod v4: create, update, filters, idParam (con regex para guest_name y document)

models/blacklist/
└── index.ts                        # Types: BlacklistEntry, AuditEntry, DTOs, filters, responses, BlacklistStats

services/cloudinary/
└── cloudinary-service.ts           # uploadImage, uploadAvatar, uploadPdf, deleteImage, generateSignedUrl (lazy config)
```

### 13.4 Frontend — Arquitectura

- ✅ `app/dashboard/blacklist/page.tsx` — Lista con filtros, tabla desktop/cards mobile, stats sidebar (>1400px), paginación
- ✅ `app/dashboard/blacklist/[id]/page.tsx` — Detalle
- ✅ `app/dashboard/blacklist/new/page.tsx` — Crear
- ✅ `app/dashboard/blacklist/[id]/edit/page.tsx` — Editar
- ✅ `panels/CreateBlacklistPanel.tsx` / `EditBlacklistPanel.tsx` — Formularios
- ✅ `mains/BlacklistForm.tsx` — Lógica de formulario compartida
- ✅ `mains/BlacklistTable.tsx` — Tabla de datos
- ✅ `mains/ImageGallery.tsx` — Galería de imágenes
- ✅ `mains/AuditTrail.tsx` — Visualización del historial de cambios
- ✅ `app/lib/blacklist/blacklistApi.ts` — API client completo
- ✅ `app/lib/blacklist/blacklistSchema.ts` — Zod schemas (mirror backend)
- ✅ `app/lib/blacklist/blacklistUtils.ts` — formatDate, highlightMatches, truncateText
- ✅ `app/lib/blacklist/types.ts` — Types completos

### 13.5 Funcionalidades de usuario

- ✅ **CRUD** — Con validación Zod (guest_name con regex, document con regex, fechas checkout > checkin)
- ✅ **Soft-delete / restaurar** — Con entradas en audit trail
- ✅ **Auditoría por campo** — Al editar, solo se registran los campos que realmente cambiaron
- ✅ **Imágenes** — Upload a Cloudinary, galería en detalle, delete individual
- ✅ **Filtros** — Búsqueda texto, document, severity, status, created_by, rango de fechas
- ✅ **Paginación** — 50 por página
- ✅ **Stats** — Total, activos, eliminados, por severity, últimas 5 entradas
- ✅ **Vista dual** — Tabla (desktop) / Cards (mobile)
- ✅ **Detección de duplicados** — existsByDocument() antes de crear

### 13.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Audit trail como JSON en columna** — No normalizado. Funcional pero difícil de consultar, indexar o paginar el historial |
| 2 | ⚠️ | **Imágenes como JSON en columna** — Misma limitación: sin tabla separada de imágenes |
| 3 | ℹ️ | **Sin rate limiting** en upload de imágenes |
| 4 | ℹ️ | **Cloudinary con lazy config** — Se configura en el primer uso (previene timing issues con dotenv) |

---

## Módulo 14: Search ⚠️

Búsqueda global del sistema. Un único endpoint que ejecuta búsquedas en paralelo en 4 módulos
(parking, maintenance, groups, blacklist) y devuelve resultados unificados.

### 14.1 Backend — Endpoints API

Base: `/api/search` — Middleware: `authenticateToken`

- ✅ `GET /search?q=query` — Búsqueda global (mínimo 2 chars, o 11 para códigos "PK-")

**Módulos indexados (LIMIT 10 cada uno, paralelo con Promise.all):**
- Parking: booking_code, plate_number, owner_name
- Maintenance: id, title, room_number, location_description (excluye soft-deleted)
- Groups: name, agency
- Blacklist: guest_name, document_number (solo status ACTIVE)

### 14.2 Backend — Arquitectura

```
controllers/search/
└── search-controller.ts    # Validación mínima inline, llama a repository

repositories/search/
└── search-repository.ts    # searchParking, searchMaintenance, searchGroups, searchBlacklist + globalSearch() (Promise.all)
```

### 14.3 Frontend — Arquitectura

- ✅ `components/search/GlobalSearch.tsx` — Barra de búsqueda con dropdown de resultados por módulo, teclado (Enter/Escape), botón clear
- ✅ `components/search/MobileSearchModal.tsx` — UI optimizada para móvil
- ✅ `components/search/useGlobalSearch.ts` — Hook: `isParkingCode()`, `getMinChars()`, `performSearch()`, `navigateTo()`
- ✅ `lib/search/normalizeSearch.ts` — Utilidad de normalización

### 14.4 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin paginación** — LIMIT 10 hardcodeado por módulo, sin offset ni "ver más" |
| 2 | ⚠️ | **LIKE % simple** — Sin full-text indexes, puede ser lento con tablas grandes |
| 3 | ⚠️ | **Sin scoring** — Todos los resultados tienen igual relevancia, sin ranking |
| 4 | ⚠️ | **Módulos no cubiertos** — Logbooks, cashier, scheduling, backoffice no están indexados |
| 5 | ℹ️ | **Lógica PK- en frontend** — La detección de códigos de parking solo en el hook, sin optimización backend |

---

## Módulo 15: Activity (Audit Logging) ✅

Agregador de actividad reciente cross-módulo. Un único endpoint que hace UNION ALL sobre las tablas
de historial existentes (cashier, groups, logbook, maintenance) y devuelve actividad unificada.

### 15.1 Backend — Endpoints API

Base: `/api/activity` — Middleware: `authenticateToken`

- ✅ `GET /activity/recent` — Actividad reciente unificada
  - Params: `limit` (1-50, default 5), `source` (cashier|groups|logbook|maintenance), `user_id`, `date` (YYYY-MM-DD)

### 15.2 Backend — Arquitectura

```
controllers/activity/
└── activity-controller.ts      # Validación de params, llama a repository

repositories/activity/
└── activity-repository.ts      # UNION ALL sobre cashier_history + group_history + logbook_history + maintenance_history
                                 # Métodos: getRecentActivity, getActivityBySource, getActivityByDate, getActivityByUser
```

**Sin base de datos propia** — Lee de las tablas de historial de otros módulos.

**Normalización de IDs:** `${source}-${source_id}` (ej: `cashier-42`, `groups-7`)
**Normalización de timestamps:** `changed_at` (cashier/groups/maintenance) vs `created_at` (logbook)
**Username fallback:** `COALESCE(u.username, "Sistema")` si el usuario fue eliminado

### 15.3 Frontend

- ✅ `app/lib/activity/queries.ts` — `getRecentActivity()` + activityApi object
- ✅ `app/lib/activity/types.ts` — UnifiedActivity, ActivityResponse, ActivityFilters
- ❌ **Sin componentes UI** — No hay página ni componentes de visualización. Se consume internamente por otros módulos o dashboards

### 15.4 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ❌ | **Sin UI** — Solo API + types. No hay página de actividad ni componente de timeline |
| 2 | ⚠️ | **Filtros no combinables** — La prioridad es: date > user_id > source > all. No se puede filtrar por date + user_id simultáneamente |
| 3 | ⚠️ | **Sin paginación** — Solo límite (max 50), sin offset |
| 4 | ℹ️ | **Scheduling y parking no incluidos** — Los módulos scheduling y parking no tienen sus historiales en el UNION |

---

## Módulo 17: Booking ✅

> **Nota:** El módulo de Booking no es independiente — comparte base de datos, rutas y repositorios
> con el módulo de **Parking** (Módulo 3). Se documenta separado porque tiene sus propios
> componentes frontend (`components/booking/`) y traducciones (`messages/*/booking.json`).

Sistema de reservas del parking hotelero. Wizard de creación multi-step (vehicle → fechas/plaza →
confirmación), ciclo de vida completo (reserved → checked_in → completed/canceled/no_show),
disponibilidad gestionada automáticamente via triggers MySQL, y soporte de pago en checkout.

### 17.1 Base de datos

Comparte tablas con el módulo de Parking. Las tablas clave para bookings son:

| Tabla | Propósito |
|---|---|
| `parking_bookings` | Reservas (booking_code PK-YYYYMMDD-NNNN auto, spot_id, vehicle_id, operator_id, expected/actual checkin/checkout, status enum, total_amount, payment_amount/method/reference/date, booking_source, external_booking_id, notes, audit trail) |
| `parking_availability` | Disponibilidad por plaza/día (is_available, booking_id). Gestionada 100% por triggers |
| `parking_rates` | Tarifas por duración (días) para auto-cálculo de precio |

**5 triggers automáticos:**
- `trg_generate_booking_code` — Auto-genera PK-YYYYMMDD-NNNN en INSERT
- `trg_update_availability_on_booking` — Bloquea fechas en availability al crear reserva
- `trg_free_availability_on_status_change` — Libera fechas al completar/cancelar/no_show
- `trg_validate_booking_insert` — Valida disponibilidad ANTES del INSERT (error si ocupada)
- `trg_update_availability_on_date_change` — Libera fechas antiguas y ocupa nuevas al cambiar fechas/plaza

**Enums:**
- Status: reserved / checked_in / completed / canceled / no_show
- Payment method: cash / card / transfer / agency
- Booking source: direct / booking_com / expedia / airbnb / agency_other

### 17.2 Backend — Endpoints API

Base: `/api/parking/bookings` — Middleware: `authenticateToken` + `excludeMantenimiento`

- ✅ `GET /bookings` — Listar con filtros completos (status, quickFilter, startDate/endDate, date, spot_id, vehicle_id, plate_number, owner_name, booking_source, page, limit). Default 50, max 500
- ✅ `GET /bookings/overdue/list` — Reservas checked_in con checkout vencido
- ✅ `GET /bookings/:code` — Detalle por booking_code (PK-YYYYMMDD-NNNN)
- ✅ `POST /bookings` — Crear reserva (auto-precio si no se especifica, transaccional)
- ✅ `PUT /bookings/:code` — Editar (restricciones por estado: campos de pago editables siempre, resto solo en reserved/checked_in)
- ✅ `DELETE /bookings/:code` — Eliminar (solo status=reserved y no iniciada)
- ✅ `PUT /bookings/:code/checkin` — Check-in (reserved → checked_in, actual_checkin, valida plaza no ocupada)
- ✅ `PUT /bookings/:code/checkout` — Check-out + pago opcional (checked_in → completed, actual_checkout, payment_amount/method/reference)
- ✅ `PUT /bookings/:code/cancel` — Cancelar (desde reserved o checked_in)
- ✅ `PUT /bookings/:code/no-show` — No-show (solo desde reserved)

**Quick filters disponibles:**
- arrivals_pending, arrivals_inside, arrivals_total
- departures_pending, departures_completed, departures_total

### 17.3 Backend — Arquitectura

```
controllers/parking/
└── bookings.controller.ts          # 845 líneas: 10 handlers con Zod, timezone Madrid, auto-precio

repositories/parking/
└── bookings.repository.ts          # 1102 líneas: queries, transacciones, joins, formato anidado de respuesta

validations/parking/
└── booking-validation.ts           # Zod: createBookingSchema (spot, level, vehicle, fechas, amount, source)
                                     # Refinements: checkin >= hoy, checkout > checkin

models/parking/
└── index.ts                        # Types: FormattedBooking, BookingStatus, BookingSource, PaymentMethod, DTOs
```

**Formato de respuesta anidado:**
```json
{
  "spot": { id, number, level, type },
  "vehicle": { id, plate, owner, model },
  "operator": { id, username },
  "schedule": { expected_checkin, expected_checkout, actual_checkin, actual_checkout, planned_days, actual_days },
  "payment": { total_amount, paid_amount, pending_amount, method, reference, date },
  "booking_info": { source, external_id },
  "timestamps": { created_at, updated_at, created_by, updated_by }
}
```

**Lógica de pricing (3 niveles):**
1. Si `total_amount` en request → usar ese valor
2. Si no → consultar `parking_rates` para la duración (días)
3. Si no hay tarifa → calcular días × €15 (default hardcodeado)

### 17.4 Frontend — Arquitectura

#### Páginas
- ✅ `app/dashboard/parking/bookings/page.tsx` — Lista (server component, server action para datos iniciales)
- ✅ `app/dashboard/parking/bookings/new/page.tsx` — Wizard full-page
- ✅ `app/dashboard/parking/bookings/[code]/page.tsx` — Detalle dinámico

#### BookingWizard (Componente principal de creación)

El wizard existe en **dos variantes** con el mismo estado interno:

| Variante | Uso | Estilo |
|---|---|---|
| `full` | Página dedicada `/bookings/new` | GitHub-style, progress bar |
| `modal` | SlidePanel dentro de otros componentes | Emerald/teal, footer con botones |

**Estructura interna:**
```
BookingWizard/
├── index.tsx                  # Orquestador (244 líneas)
├── types.ts                   # Types del wizard (105 líneas)
├── hooks/
│   └── useBookingWizard.ts    # Estado completo (454 líneas): vehicle, dates, spots, availability
└── steps/
    ├── VehicleStep.tsx        # Step 1: buscar o crear vehículo (live filter, dropdown)
    ├── DateSpotStep.tsx       # Step 2 (full): fechas + time pickers + grid de plazas disponibles
    ├── DateOnlyStep.tsx       # Step 2 (modal): solo fechas, plaza pre-seleccionada
    └── ConfirmationStep.tsx   # Step 3: resumen antes de crear (2 layouts por variante)
```

**`useBookingWizard.ts` (454 líneas):**
- Gestiona todo el estado del wizard: step actual, vehículo, fechas, plaza seleccionada, UI flags
- Vehicle: search API (live), create new, select existing
- Availability: consulta plazas disponibles para rango de fechas, filtra conflictos
- Creation: valida, crea vehículo si es nuevo, crea booking via API
- Calendar UI: control open/close de los date pickers

**`DateSpotStep.tsx` (variante full):**
- Date pickers para check-in y check-out con time pickers (default 15:00 entrada, 15:00 salida)
- Indicador de días de duración
- Botón "Buscar plazas disponibles" (con loading)
- Grid de plazas disponibles (2-4 columnas responsive, scrollable)
- Cards de plaza: planta + número + tipo, seleccionada en verde
- Campos: precio manual (opcional), fuente de reserva, ID externo, notas

**`ConfirmationStep.tsx`:**
- Resumen completo: vehículo, plaza, fechas + horas, días, precio
- "Precio auto" si no se especificó importe

#### Otros componentes de booking
- ✅ `CreateBookingPanel.tsx` (~499 líneas) — Alternativa: SlidePanel con formulario único (misma funcionalidad que wizard pero en un paso). Permite pre-seleccionar fecha y plaza
- ✅ `BookingsListClient.tsx` — Lista completa con filtros de status, quick filters, date range, búsqueda, paginación
- ✅ `BookingDetailClient.tsx` — Detalle con cards, modales de acción, refresh
- ✅ `CheckInModal.tsx` — Fecha/hora + notas opcionales
- ✅ `CheckOutModal.tsx` — Fecha/hora + campos de pago
- ✅ `EditBookingModal.tsx` — Formulario de edición
- ✅ `PaymentModal.tsx` — Registrar pago (importe, método, referencia)

#### API y state
- ✅ `app/lib/parking/queries.ts` — parkingApi (createBooking, getBookingByCode, checkIn/Out, cancel, update, delete, createVehicle, getAllVehicles)
- ✅ `app/lib/parking/actions.ts` — Server action `getBookings()` con Bearer token
- ✅ `app/lib/parking/types.ts` — Types completos incluyendo ParkingBooking, Stats, PendingCheckin/Checkout

**State management:** useState local en `useBookingWizard`, sin React Query ni Zustand para el wizard. Lista sin React Query (datos desde server action).

#### i18n
- ✅ `messages/es/booking.json` + `messages/en/booking.json` — Traducciones completas (wizard, steps, confirmation, sources, errors, toasts)

### 17.5 Funcionalidades de usuario

#### Crear reserva (wizard)
- ✅ **Step 1 — Vehículo** — Buscar existente (live filter por matrícula/propietario) o crear nuevo
- ✅ **Step 2 — Fechas y plaza** — Date pickers con time, buscar plazas disponibles, grid de selección
- ✅ **Step 3 — Confirmación** — Resumen completo antes de confirmar
- ✅ **Precio automático** — Calcula desde `parking_rates` o €15/día por defecto
- ✅ **Fuente de reserva** — Direct, Booking.com, Expedia, Airbnb, agency_other
- ✅ **ID externo** — Para tracking de reservas de terceros

#### Ciclo de vida
- ✅ **Check-in** — Transición reserved → checked_in, registra actual_checkin, valida plaza libre
- ✅ **Check-out** — Transición checked_in → completed, registra actual_checkout, captura pago
- ✅ **Cancelar** — Desde reserved o checked_in, libera plaza automáticamente
- ✅ **No-show** — Desde reserved, queda registrado para auditoría

#### Pago
- ✅ **Durante check-out** — Amount, método (cash/card/transfer/agency), referencia
- ✅ **Por separado** — PaymentModal desde el detalle de la reserva
- ✅ **Parcial** — Se calcula pending_amount (total - paid)
- ✅ **payment_date automático** — Se setea al registrar un importe

#### Disponibilidad
- ✅ **100% automática** — Triggers MySQL gestionan availability sin intervención de la app
- ✅ **Validación en insert** — Trigger rechaza si plaza no disponible
- ✅ **Liberación automática** — Al completar, cancelar o no-show
- ✅ **Cambio de fechas/plaza** — Libera antiguas y bloquea nuevas automáticamente

### 17.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin React Query en booking list** — La lista usa server action para carga inicial pero sin React Query para refetch/cache en cliente. Inconsistente con otros módulos |
| 2 | ⚠️ | **Precio default hardcodeado** — €15/día como fallback si no hay tarifa en `parking_rates`. Debería ser configurable |
| 3 | ⚠️ | **Dos componentes de creación** — BookingWizard y CreateBookingPanel ofrecen la misma funcionalidad con lógicas distintas. Duplicidad de código |
| 4 | ⚠️ | **Sin paginación en overdue** — El endpoint de overdue devuelve todos los resultados sin limit/offset |
| 5 | ℹ️ | **Módulo compartido con Parking** — Backend y BD son los mismos. La separación es solo a nivel de frontend components |
| 6 | ℹ️ | **Sin React Query en wizard** — useBookingWizard usa useState local puro, sin caché ni invalidación |

---

---

## Módulo 18: Profile ✅

El módulo Profile es la página personal del usuario autenticado. Agrupa cuatro grandes áreas en una sola ruta (`/dashboard/profile`): la gestión de la propia cuenta (sidebar), la bandeja de mensajes, el centro de notificaciones y un panel de ajustes avanzados (administración de usuarios, departamentos, informes y seguridad). Es uno de los módulos más densos del frontend.

### 18.1 Base de datos

El módulo Profile no tiene tablas propias más allá de las ya documentadas en Auth & Users (Módulo 1). Reutiliza:

- `users` — datos del perfil (username, email, role, avatar_url)
- `sessions` — sesión activa del usuario
- `departments` — tabla gestionada desde la pestaña Departments del panel de ajustes
- `notifications` — gestionadas desde el panel de notificaciones
- `conversations` + `messages` — gestionadas desde MessagesPanel (documentadas en Módulo 8)

### 18.2 Backend — Endpoints propios del perfil

Los endpoints de perfil están bajo el controlador de Auth (`backend/controllers/auth/`):

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/auth/me/profile` | Cambiar username (requiere contraseña actual) |
| `PATCH` | `/api/auth/me/password` | Cambiar contraseña (requiere current, new, confirm) |
| `POST`  | `/api/auth/me/avatar` | Subir avatar (multer, máx 2MB, JPEG/PNG/WebP/GIF) |
| `DELETE`| `/api/auth/me/avatar` | Eliminar avatar (limpia Cloudinary y BD) |

El resto de funcionalidades del panel de ajustes usa endpoints ya documentados en sus módulos respectivos:
- Usuarios: `GET/PATCH/DELETE /api/users/{id}` (Módulo 1)
- Departamentos: `GET/POST/PATCH/DELETE /api/departments` (Módulo 11)
- Notificaciones globales: `POST /api/notifications` (Módulo 10)
- Informes: endpoints de logbook, mantenimiento, grupos y cajero (Módulos 2, 5, 9, 6)

### 18.3 Arquitectura frontend

```
app/dashboard/profile/
├── page.tsx            # Entry point — panel selector via ?panel= query param
├── error.tsx           # Error boundary con ModuleError
└── loading.tsx         # Skeleton animado (avatar + info + menú)

app/components/profile/
├── ProfileSidebar.tsx          # Tarjeta de perfil + edición + navegación (714 líneas)
├── SettingsPanel.tsx           # Panel de ajustes multi-tab (1194 líneas)
├── MessagesPanel.tsx           # Bandeja de mensajes + chat (890 líneas)
├── NotificationsPanel.tsx      # Lista de notificaciones con filtros (110 líneas)
└── reports/
    ├── ReportsTab.tsx          # Orquestador de informes con lazy loading (210 líneas)
    ├── DateFilter.tsx          # Filtro de fecha con SimpleCalendar
    ├── types.ts                # Tipos compartidos de informes
    ├── index.ts                # Re-exports
    └── sections/
        ├── OverviewSection.tsx     # Actividad unificada de todos los módulos
        ├── LogbooksSection.tsx     # Historial de cambios en logbooks
        ├── MaintenanceSection.tsx  # Informes de mantenimiento con historial
        ├── GroupsSection.tsx       # Grupos + pagos con historial
        └── CashierSection.tsx      # Cajero: dashboard, vouchers e historial
```

**Navegación entre paneles:** `page.tsx` lee `?panel=settings|messages|notifications|reports` y renderiza el componente correspondiente. El estado activo se persiste en la URL, por lo que al recargar la página se mantiene el panel seleccionado.

**Responsividad:** En móvil, cuando MessagesPanel tiene una conversación activa, el sidebar de perfil se oculta completamente (controlado por el callback `onConversationSelect` en `page.tsx`).

### 18.4 ProfileSidebar — Tarjeta de cuenta propia

**`ProfileSidebar.tsx` (714 líneas):**

**Avatar:**
- Muestra la `avatar_url` de Cloudinary o genera un avatar de gradiente a partir del username
- Hover overlay con icono de cámara → dropdown: subir foto / eliminar
- Restricciones: máx 2MB, formatos JPEG/PNG/WebP/GIF
- API: `POST /api/auth/me/avatar` y `DELETE /api/auth/me/avatar`
- Llama `refreshUser()` tras éxito para actualizar el `AuthContext` global

**Cambio de username:**
- Modo inline de edición (click sobre el nombre)
- Requiere confirmación con contraseña actual
- Validación: mín 3 chars, solo alfanumérico + guion bajo
- API: `PATCH /api/auth/me/profile`
- Toast de éxito durante 3 segundos

**Cambio de contraseña:**
- Tres campos: contraseña actual, nueva, confirmación
- Toggle de visibilidad (ojo) en cada campo
- Validación: mín 6 chars, nueva ≠ actual, confirmación coincide
- Warning box en ámbar antes del formulario
- API: `PATCH /api/auth/me/password`
- Al éxito: redirige al login con `?message=password_changed`

**Navegación:**
- 4 botones: Messages, Notifications, Settings (+ icono)
- Estado activo en azul (sincronizado con query param `?panel=`)
- Labels e iconos de react-icons/fi

### 18.5 SettingsPanel — Administración del sistema

**`SettingsPanel.tsx` (1194 líneas)** — Panel de administración con 5 pestañas:

**Pestaña Users (solo admin):**
- Tabla de todos los usuarios del sistema
- Edición inline: username, email, rol (guardar/cancelar por fila)
- Modal para crear nuevo usuario (`NewUserModal`)
- Botón de resetear contraseña con modal de confirmación
- Eliminar usuario con confirmación
- API: `GET /api/users`, `PATCH /api/users/{id}`, `DELETE /api/users/{id}`

**Pestaña Departments (solo admin):**
- CRUD completo de departamentos vía `departmentsApi`
- Añadir y editar a través de `CenterModal`
- Nombres formateados con `formatDepartmentName` (capitalización + reglas especiales)
- Ordenación automática alfabética tras operaciones

**Pestaña Notifications:**
- Componente `GlobalNotificationModal` para enviar notificaciones a todo el sistema
- Botón para comprobar notificaciones pendientes
- Resultado con toast y estado de éxito/fallo

**Pestaña Security:**
- `SecuritySettings` — componente stub con implementación mínima
- Muestra info de sesión activa y opción de logout
- ⚠️ Sin funcionalidades reales implementadas aún

**Pestaña Reports (solo admin, lazy-loaded):**
- `ReportsTab` cargado con `React.lazy` + `Suspense`
- 5 secciones: Overview, Logbooks, Maintenance, Groups, Cashier
- Sidebar de navegación entre secciones
- Cada sección carga datos de forma independiente con filtros de fecha

**Comportamiento responsive de tabs:**
- Móvil: dropdown centrado como overlay modal
- Desktop: pestañas horizontales con subrayado en activo
- Estado persistido en URL via `?tab=users|departments|notifications|security|reports`

### 18.6 MessagesPanel — Mensajería directa

**`MessagesPanel.tsx` (890 líneas)** — Reuso del sistema de mensajería (Módulo 8) dentro del perfil:

**Lista de conversaciones:**
- Búsqueda por nombre
- Badge de mensajes no leídos
- Preview del último mensaje + timestamp
- Avatar generado por gradiente o icono para grupos

**Vista de chat:**
- Auto-scroll al fondo al abrir y al enviar
- Load more para cargar mensajes anteriores
- Mensajes propios a la derecha, ajenos a la izquierda
- Editar/eliminar mensaje propio (aparece al hover)
- Etiqueta "editado" + timestamp en mensajes modificados

**Nueva conversación:**
- Búsqueda de usuarios con debounce (300ms)
- Tags removibles de usuarios seleccionados
- Campo de nombre de grupo cuando hay 2+ usuarios
- Indicador de "DM existente" para evitar duplicados
- Crear DM individual o chat grupal

**Notificación urgente:**
- Toggle de campana en el input → marca el mensaje como urgente
- El receptor recibe una notificación especial

**Hooks:** `useConversations`, `useChat`, `useUserSearch` (todos en `frontend/app/lib/messaging/hooks/`)

### 18.7 NotificationsPanel — Centro de notificaciones

**`NotificationsPanel.tsx` (110 líneas):**
- Filtro Todas / No leídas
- Marcar todas como leídas (botón en header)
- Eliminar notificación individual
- `NotificationItem` renderiza UI específica por tipo de notificación
- Scroll interno con `calc(100vh - 280px)`
- Hook: `useNotifications()` con React Query

### 18.8 Reports — Informes por módulo

**`ReportsTab.tsx` (210 líneas)** — Orquestador con lazy loading:
- Sidebar de navegación con iconos y descripciones
- Botón de refresh en header
- Cada sección envuelta en `Suspense` con `SectionSkeleton`
- Secciones lazy: OverviewSection, LogbooksSection, MaintenanceSection, GroupsSection, CashierSection

**`OverviewSection`:**
- Actividad unificada de: cashier, groups, logbook, maintenance
- Colores e iconos distintos por fuente
- Tabla: fuente, acción, usuario, ID de registro, timestamp
- Filtros: fecha + fuente
- Estado inicial "Load Activity" (no carga automáticamente)

**`LogbooksSection`:**
- Lista entradas de logbook con badges de importancia y estado
- Filas expandibles con historial de ediciones (texto anterior tachado, nuevo en negrita)
- Filtros: fecha, modo (todas/papelera), prioridad
- Límite por defecto: 50 registros

**`MaintenanceSection`:**
- Reportes con estado (reported, pending, in_progress, resolved, closed) con colores
- Iconos de prioridad (alta: triángulo alerta, urgente: círculo alerta)
- Filas expandibles con historial de cambios campo por campo (antiguo → nuevo)
- Filtros: fecha, estado, prioridad, incluir eliminados

**`GroupsSection`:**
- Stats globales: total, confirmados, pendientes, mostrados
- Búsqueda por ID de grupo
- Expandible con historial de cambios (tabla afectada, campo, old → new)
- Formateo de moneda en MXN locale
- Filtros: fecha, estado

**`CashierSection`:**
- 3 modos de vista: Dashboard / Vouchers / Historia
- **Dashboard:** resumen del día (total, efectivo, otros métodos, turnos abiertos/cerrados), alerta de vouchers pendientes, informe diario por fecha
- **Vouchers:** estado (pending/justified/cancelled) con iconos, importe, concepto, fechas
- **Historia:** tabla de cambios
- Turnos: morning, afternoon, night, audit (desde i18n)

**`DateFilter`:**
- Wrapper de `SimpleCalendar` con botón que muestra la fecha seleccionada
- Botón de limpiar cuando hay fecha activa
- Cierre al hacer click fuera

### 18.9 Funcionalidades de usuario

#### Perfil personal
- ✅ **Ver datos de cuenta** — Username, email, rol, avatar en sidebar
- ✅ **Cambiar username** — Inline con confirmación de contraseña
- ✅ **Cambiar contraseña** — Formulario con validación completa
- ✅ **Gestionar avatar** — Subir desde local o eliminar; previsualización inmediata
- ✅ **Navegar a paneles** — Botones de nav hacia mensajes, notificaciones y ajustes

#### Mensajería (dentro del perfil)
- ✅ **Ver conversaciones** — DMs y grupos con unread count
- ✅ **Chatear** — Envío, edición y borrado de mensajes propios
- ✅ **Crear conversación** — DM individual o chat de grupo con búsqueda de usuarios
- ✅ **Mensajes urgentes** — Toggle de campana para notificación especial

#### Notificaciones
- ✅ **Ver notificaciones** — Con filtro por estado (todas/no leídas)
- ✅ **Marcar como leídas** — Individual o todas a la vez
- ✅ **Eliminar notificaciones** — Borrado individual

#### Administración (solo admin)
- ✅ **Gestión de usuarios** — Crear, editar (username/email/rol), resetear contraseña, eliminar
- ✅ **Gestión de departamentos** — CRUD completo con formateo de nombres
- ✅ **Notificaciones globales** — Enviar notificación a todos los usuarios
- ✅ **Informes** — Vista unificada de actividad y por módulo (logbook, mantenimiento, grupos, cajero)
- ❌ **Security tab** — Pestaña visible pero sin funcionalidad real implementada

### 18.10 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ❌ | **Security tab sin implementar** — `SecuritySettings.tsx` es un stub vacío. La pestaña aparece en el menú pero no ofrece ninguna funcionalidad real. Se podría usar para: gestión de sesiones activas, 2FA, historial de accesos |
| 2 | ⚠️ | **SettingsPanel excesivamente grande** — 1194 líneas en un solo archivo que contiene 5 tabs con lógica compleja. Candidato claro a refactorizar en sub-componentes por tab |
| 3 | ⚠️ | **MessagesPanel duplica lógica con Messages module** — La funcionalidad de mensajería está implementada dos veces: en `/dashboard/messages/` (Módulo 8) y aquí en MessagesPanel. Hooks compartidos pero UI completamente separada |
| 4 | ⚠️ | **OverviewSection no carga automáticamente** — El usuario debe pulsar "Load Activity" explícitamente. Inconsistente con las otras secciones que cargan al montar |
| 5 | ⚠️ | **GroupsSection usa MXN hardcodeado** — La sección de grupos formatea moneda con `MXN` locale hardcodeado en el componente, ignorando la moneda real del grupo |
| 6 | ⚠️ | **ReportsTab solo visible para admin** — Las secciones de informes son de solo lectura y podrían ser útiles para roles como recepcionista con permisos acotados |
| 7 | ℹ️ | **Lazy loading en ReportsTab** — Buena práctica: las 5 secciones de informes se cargan con `React.lazy` + `Suspense`, evitando impacto en el tiempo de carga inicial del perfil |
| 8 | ℹ️ | **Estado de panel en URL** — El panel activo y la pestaña activa de settings se persisten en query params (`?panel=` y `?tab=`), permitiendo compartir/bookmarkear estados concretos |

---

---

## Módulo 19: Demo ✅

El módulo Demo implementa un modo de solo lectura para usuarios con rol `demo-admin`. Permite mostrar el sistema a clientes o evaluadores sin riesgo de modificar datos reales. El diseño es no invasivo: se puede activar/desactivar sin tocar el código principal.

**Credenciales de demo:** `demo` / `demo987654`

### 19.1 Base de datos

**Script de instalación:** `backend/db-mysql/aiven/15_demo_user.sql` (desactivado por defecto en `MASTER_INSTALL.sql`)

**Tabla: `demo_activity_log`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT AUTO_INCREMENT PK | Identificador |
| `timestamp` | DATETIME | Momento del intento |
| `user_id` | VARCHAR(36) | ID del usuario demo |
| `username` | VARCHAR(100) | Username para referencia rápida |
| `method` | VARCHAR(10) | Método HTTP (POST/PATCH/DELETE) |
| `route` | VARCHAR(255) | Ruta intentada |
| `body_preview` | TEXT | Primeros 500 chars del body |
| `ip_address` | VARCHAR(45) | IP del cliente |
| `user_agent` | TEXT | User agent del navegador |
| `blocked` | BOOLEAN | True = intento bloqueado |

Índices en: `timestamp`, `username`, `route`.

**Role insertado:** `demo-admin` con ID 7.
**Usuario insertado:** `demo` (UUID: `demo-user-0000-0000-000000000001`, role_id: 7, is_active: 1).

### 19.2 Backend — Arquitectura

```
backend/
├── middlewares/
│   └── demoRestriction.ts          # Core: intercepta y bloquea escrituras
├── controllers/demo/
│   └── demo-activity-controller.ts # Endpoints de consulta de logs (solo real-admin)
├── repositories/demo/
│   └── demo-activity-repository.ts # Acceso a demo_activity_log
└── routes/demo/
    └── demo-activity-routes.ts     # Rutas /api/demo-activity/*
```

**Flujo de ejecución:**
```
authenticateToken.ts
  └─> llama demoRestriction()
      └─> si role === 'demo-admin'
          └─> GET → siempre permitido
          └─> POST/PATCH/DELETE → comprueba DEMO_ALLOWED_ROUTES
              ├─> ruta en whitelist → next()
              └─> ruta no en whitelist → log asíncrono + 403 {demo: true}
```

#### Middleware: `demoRestriction.ts`

Invocado desde `authenticateToken.ts` tras validar la sesión. Funciona con whitelist de rutas permitidas (regex-based):

| Ruta permitida | Descripción |
|----------------|-------------|
| `POST /api/auth/logout` | Poder cerrar sesión |
| `POST /api/parking/bookings` | Crear reservas de parking |
| `POST /api/logbooks/{id}/comments` | Añadir comentarios a entradas |
| `POST /api/maintenance` | Crear partes de mantenimiento |

Cualquier otra petición de escritura devuelve `403 { message: "Acción no disponible en modo demo", demo: true }`.

El log a `demo_activity_log` es **asíncrono** (no bloquea la respuesta).

#### Endpoints de actividad (`/api/demo-activity/`)

Todos protegidos con `isRealAdmin` — los usuarios `demo-admin` no pueden acceder a sus propios logs:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/demo-activity/logs` | Logs paginados con filtros (username, método, ruta, fecha, bloqueado) |
| `GET` | `/api/demo-activity/stats` | Estadísticas: total bloqueados, usuarios únicos, rutas más intentadas, actividad por día |
| `GET` | `/api/demo-activity/export` | Descarga archivo `registrosDemo.md` |
| `DELETE` | `/api/demo-activity/cleanup` | Purga logs antiguos (default 90 días, mín 30) |

#### `demo-activity-repository.ts`

- `logActivity(input)` — Inserta log de intento
- `getLogs(limit, offset, filters)` — Consulta paginada con filtros
- `getStats(days)` — Estadísticas agregadas: `total_blocked`, `unique_users`, `most_attempted_routes` (top 10), `activity_by_day`
- `exportToMarkdown(limit)` — Genera fichero markdown de intentos bloqueados
- `cleanOldLogs(daysToKeep)` — Limpieza de logs anteriores a N días

### 19.3 Control de roles en `roleCheck.ts`

El middleware `roleCheck.ts` distingue entre `admin` y `demo-admin` en las funciones de acceso:

| Función | Permite demo-admin | Uso |
|---------|:-----------------:|-----|
| `isAdmin` | ✅ | Acceso general de admin |
| `isOwnerOrAdmin` | ✅ | Acceso a recursos propios o como admin |
| `canManageGroups` | ✅ | Ver/gestionar grupos (escritura bloqueada por demoRestriction) |
| `canViewGroups` | ✅ | Ver grupos |
| `canManageCashier` | ✅ | Acceso al cajero (visual) |
| `canViewReports` | ✅ | Ver informes |
| `canAccessMaintenance` | ✅ | Módulo de mantenimiento |
| `canAccessBackoffice` | ✅ | Backoffice (solo lectura vía demoRestriction) |
| `isRealAdmin` | ❌ | Bloquea explícitamente con "Acceso de solo lectura" |

`isRealAdmin` se usa en: creación de usuarios, rutas de backoffice de escritura, y todos los endpoints de `demo-activity`.

### 19.4 Frontend

**`isAdminRole()` helper** (`frontend/app/lib/helpers/utils.ts`):
```typescript
export function isAdminRole(role: string | undefined | null): boolean {
  const normalizedRole = role?.toLowerCase().trim()
  return normalizedRole === 'admin' || normalizedRole === 'demo-admin'
}
```

El usuario `demo-admin` ve exactamente la misma UI que un admin real. La restricción es puramente backend. Componentes que usan `isAdminRole`:

| Componente | Efecto |
|------------|--------|
| `SettingsPanel.tsx` | Muestra pestañas Users, Departments, Reports (igual que admin) |
| `app/dashboard/page.tsx` | Muestra sección BackOffice en el dashboard |
| `nav-links.tsx` | Muestra los mismos links de nav que admin |
| `scheduling/layout.tsx` | Permite acceso a la vista de scheduling |

**Detección de error demo en `apiClient.ts`:**
- Detecta `response.json().demo === true` en respuestas 403
- Muestra toast especial: `🔒 "Modo Demo: Esta acción no está disponible"` (4000ms, colores ámbar)
- `ApiError` incluye flag `isDemo: boolean`
- Helper `isDemoError(err)` para evitar doble-toast en catch blocks

### 19.5 Funcionalidades del usuario demo

#### Lo que puede hacer
- ✅ **Ver todos los módulos** — Dashboard, logbook, parking, scheduling, maintenance, cashier, backoffice, grupos, mensajes
- ✅ **Crear reservas de parking** — Única acción de escritura en parking
- ✅ **Añadir comentarios en logbooks** — Participación sin modificar entradas
- ✅ **Crear partes de mantenimiento** — Reportar incidencias
- ✅ **Cerrar sesión** — Siempre disponible

#### Lo que no puede hacer (bloqueado con toast 🔒)
- ❌ Crear/editar/eliminar usuarios
- ❌ Crear/editar/cerrar entradas de logbook
- ❌ Editar/cerrar partes de mantenimiento
- ❌ Modificar reservas de parking existentes
- ❌ Modificar/editar horarios de scheduling
- ❌ Gestionar cajero (turnos, vouchers)
- ❌ Cualquier operación en backoffice
- ❌ Gestionar grupos y pagos
- ❌ Cambiar configuración del sistema

### 19.6 Documentación interna

**`docs/frontend/demo/demoSYSTEM.md`** (256 líneas) — Guía completa del sistema demo que cubre: credenciales, acciones permitidas/bloqueadas, instalación paso a paso, verificación, desinstalación (6 pasos), personalización de rutas permitidas, arquitectura técnica y notas de diseño.

### 19.7 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin indicador visual de modo demo** — El usuario demo ve la misma UI que un admin real. No hay banner, badge ni aviso de que está en modo demo hasta que intenta una acción bloqueada. Podría añadirse un indicador persistente en el header/sidebar |
| 2 | ⚠️ | **Whitelist de rutas mantenida manualmente** — Al añadir nuevas rutas al sistema, hay que recordar actualizar `DEMO_ALLOWED_ROUTES` en `demoRestriction.ts`. No hay tests que verifiquen esta cobertura |
| 3 | ⚠️ | **Sin dashboard de actividad demo en frontend** — Los endpoints de `demo-activity` existen en backend pero no hay ninguna página en el frontend para que los admins consulten los logs o estadísticas de uso demo |
| 4 | ⚠️ | **Instalación desactivada por defecto** — El script SQL está comentado en `MASTER_INSTALL.sql`. Fácil de olvidar al instalar en un nuevo entorno |
| 5 | ℹ️ | **Diseño no invasivo** — Para eliminar el modo demo basta con: borrar `demoRestriction.ts`, eliminar su import en `authenticateToken.ts`, y borrar las rutas y el SQL. El resto del código no se ve afectado |
| 6 | ℹ️ | **Logging asíncrono** — Los intentos bloqueados se loguean sin bloquear la respuesta HTTP. No afecta a la latencia del sistema |
| 7 | ℹ️ | **Sin tests** — No existe ningún fichero de test para el middleware `demoRestriction` ni para el controller de actividad demo |

---

# Secciones Transversales

---

## Sección A: Middlewares del Backend ✅

Los middlewares del backend se encuentran en `backend/middlewares/`. Actualmente hay 4 ficheros, cada uno con responsabilidades bien diferenciadas.

### A.1 Middlewares implementados

#### `authenticateToken.ts` — Autenticación JWT
- **Módulos que lo usan:** Todas las rutas protegidas (aplicado globalmente desde `index.ts`)
- **Función:** Verifica el token JWT desde la cookie `access_token` o el header `Authorization: Bearer <token>`. Si es válido, setea `req.user` con `{id, username, email, role}`. Diferencia entre token expirado (401 "Token expirado") e inválido (401 "Token inválido").
- **Integración demo:** Tras autenticar, llama a `demoRestriction()` si el rol es `demo-admin`.
- **Observaciones:** El campo `email` no se extrae del token (queda vacío); el comentario en el código indica que se puede obtener de la BD si es necesario.

#### `demoRestriction.ts` — Restricción de escritura para demo-admin
- **Módulos que lo usa:** Aplicado automáticamente desde `authenticateToken.ts` para todos los usuarios con role `demo-admin`.
- **Función:** Intercepta todas las peticiones de escritura (POST/PATCH/PUT/DELETE). Las GETs siempre pasan. Las escrituras se comparan contra una whitelist hardcodeada. Si no están en la whitelist, devuelve `403 { demo: true }` y loguea el intento asíncronamente en `demo_activity_log`.
- **Whitelist actual:** `POST /api/auth/logout`, `POST /api/parking/bookings`, `POST /api/logbooks/{id}/comments`, `POST /api/maintenance`.
- **Diseño no invasivo:** Puede eliminarse borrando el fichero y su import en `authenticateToken.ts`.

#### `rateLimiter.ts` — Rate limiting por tipo de endpoint
- **Módulos que lo usan:**
  - Auth: `loginLimiter` en `POST /auth/login`
  - Auth: `passwordChangeLimiter` en `PATCH /auth/me/password`
  - Auth: `profileUpdateLimiter` en `PATCH /auth/me/profile`
  - Global: `apiLimiter` (100 req/15 min, por IP) — disponible para aplicar a cualquier ruta
- **Función:** Previene ataques de fuerza bruta y abuso de API. Usa `express-rate-limit`.
- **Limitadores exportados:**

| Limitador | Límite | Ventana | Clave |
|-----------|--------|---------|-------|
| `loginLimiter` | 5 intentos | 15 min | IP + username |
| `passwordChangeLimiter` | 3 intentos | 1 hora | user ID o IP |
| `profileUpdateLimiter` | 5 intentos | 15 min | user ID o IP |
| `apiLimiter` | 100 peticiones | 15 min | IP |

- **Observaciones:** IPv6 localhost (`::1`) normalizado a `127.0.0.1`. Loguea warnings de seguridad con IP.

#### `roleCheck.ts` — Control de acceso basado en roles (RBAC)
- **Módulos que lo usan:** Aplicado en rutas específicas según el módulo.
- **Función:** Exporta múltiples funciones middleware que verifican el rol del usuario en `req.user.role`. Si no tiene el rol requerido, devuelve `403`.
- **Funciones disponibles y dónde se aplican:**

| Función | Roles permitidos | Aplicado en |
|---------|-----------------|-------------|
| `isAdmin` | admin, demo-admin | Rutas generales de admin |
| `isOwnerOrAdmin` | owner + admin/demo-admin | Recursos propios |
| `canManageGroups` | admin, group-admin, demo-admin | Rutas de grupos |
| `canViewGroups` | admin, recepcionista, group-admin, mantenimiento, demo-admin | Vista de grupos |
| `canManageCashier` | admin, recepcionista, group-admin, demo-admin | Módulo cajero |
| `canViewReports` | admin, demo-admin | Informes |
| `canAccessMaintenance` | Todos excepto... | Módulo mantenimiento |
| `excludeMantenimiento` | Bloquea mantenimiento | Módulos generales |
| `canAccessBackoffice` | admin, demo-admin | Backoffice |
| `isRealAdmin` | admin ONLY | Operaciones sensibles (crear users, escritura backoffice) |

### A.2 Middlewares que podrían implementarse

| # | Middleware | Descripción | Prioridad |
|---|-----------|-------------|-----------|
| 1 | **Request logging** | Loguear todas las peticiones (método, ruta, tiempo de respuesta, status code) en desarrollo/producción. Útil para depurar y auditar. | Media |
| 2 | **Input sanitization** | Middleware global que sanitize todos los inputs (strip HTML, prevenir XSS) antes de llegar a los controllers. Actualmente la validación Zod rechaza datos malformados pero no sanitiza. | Alta |
| 3 | **File upload validation** | Centralizar la validación de uploads (tipo MIME real — no solo extensión, tamaño máximo) en un único middleware en lugar de tenerla dispersa por controllers. | Media |
| 4 | **CORS dinámico mejorado** | El CORS actual permite dominios Vercel con regex. Podría añadirse un middleware de lista blanca de IPs para entornos de producción. | Baja |
| 5 | **Refresh token middleware** | Actualmente el refresh de tokens es manual en cada cliente. Un middleware que detecte access tokens a punto de expirar y los renueve automáticamente simplificaría el flujo. | Media |
| 6 | **Audit trail global** | Middleware que loguee todas las operaciones de escritura (POST/PATCH/DELETE) de forma centralizada, similar a `demo_activity_log` pero para todos los usuarios. Actualmente cada módulo implementa su propio historial. | Baja |

---

## Sección B: Servicios del Backend ⚠️

Los servicios están en `backend/services/`. Contienen la lógica de negocio que los controllers delegan. Actualmente hay 11 directorios con un total de ~28 ficheros.

### B.1 Servicios implementados

#### `services/auth/tokenService.ts` — Gestión de tokens JWT
- **Módulo:** Auth & Users (Módulo 1)
- **Funciones:** `generateAccessToken(user)` (15 min), `generateRefreshToken(user)` (7 días), `verifyToken(token)` (valida + decodifica, lanza excepción en expiración)
- **Payload del token:** `{id, username, role}` — el email no se incluye (comentario indica que se puede obtener de BD si es necesario)

#### `services/blacklist/cloudinary-service.ts` — Gestión de imágenes y ficheros en Cloudinary
- **Módulo:** Blacklist (Módulo 13) + compartido con otros módulos (avatares, backoffice)
- **Funciones:**
  - `uploadImage()` — Imágenes con límite 1200×1200px, calidad automática
  - `uploadAvatar()` — Avatar 400×400px cuadrado, 95% calidad, formato WebP
  - `uploadPdf()` — Upload de raw files con acceso público
  - `deleteImage()` / `deleteFile()` — Eliminación en Cloudinary
  - `extractPublicId()` — Parsea el public ID de una URL de Cloudinary
  - `generateSignedUrl()` — URL firmada con expiración (1h por defecto) para ficheros raw
  - `generateSignedUrlFromUrl()` — Wrapper de conveniencia
- **Organización de carpetas en Cloudinary:** `blacklist/`, `avatars/`, `backoffice/invoices/`
- **Observaciones:** Configuración lazy (solo inicializa en el primer uso). Las PDFs reciben URLs firmadas de 1h; las imágenes tienen URLs permanentes.

#### `services/chat/` — Servicio de chat con IA (ARCHIVADO)
- **Módulo:** Chat AI (inactivo)
- **Estado:** `chat-service.ts` retorna error "El servicio de chat con IA ha sido archivado" — completamente desactivado.
- **`app-knowledge.ts`** — 340+ líneas de base de conocimiento del PMS (scheduling, auth, roles, módulos). Preservada para uso futuro (entrenamiento IA o RAG).

#### `services/conciliation/logic.ts` — Lógica de conciliación
- **Módulo:** Conciliation (Módulo 12)
- **Funciones:** `getDirection(reason, type)` (mapea razón a sumar/restar), `calculateDelta(value, direction)` (aplica dirección)
- **Lógica:** Recepción: base_rooms/room_change/gratuity → suma; no_show → resta. Housekeeping: todas las acciones → suma.

#### `services/cron/cron-service.ts` — Tareas programadas
- **Módulo:** Transversal (arranca desde `index.ts`)
- **Trabajos activos:**
  - **Notificaciones:** Diariamente a las 7:00 AM — ejecuta `NotificationGeneratorService.processPendingNotifications()`
  - **Batch payment:** Día 10 de cada mes a las 23:59 — marca facturas validadas del mes anterior como pagadas
- **Funciones de gestión:** `start()`, `runNotificationsNow()`, `runBatchPaymentNow()`, `previewBatchPayment()`, `getStatus()`
- **Observaciones:** Flag `isRunning` previene doble inicialización. El usuario del sistema para batch payment es `'system-cron'` — no se valida que exista en la BD.

#### `services/group/email-service.ts` — Envío de emails (Nodemailer)
- **Módulo:** Groups (Módulo 9)
- **Funciones:** `sendNotification(notification)` (todos los destinatarios), `sendEmail(to, subject, message, priority)`, `verifyConnection()`
- **Config:** SMTP desde env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Observaciones:** Si faltan las env vars, falla silenciosamente. Template HTML con prioridad coloreada. `urgent` se mapea a `high` de nodemailer.

#### `services/group/group-history-service.ts` — Historial de grupos
- **Módulo:** Groups (Módulo 9)
- **Funciones:** `logGroupCreated()`, `logGroupUpdated()` (solo campos cambiados), `logStatusChanged()`, `logPaymentUpdated()`, `logDeleted()`, `logChange()` genérico, `getGroupHistory()`
- **Lógica:** Serializa todos los valores (objetos → JSON). Solo loguea campos que realmente cambiaron en updates.

#### `services/group/payment-calculator-service.ts` — Cálculo de pagos de grupos
- **Módulo:** Groups (Módulo 9)
- **Funciones:** `recalculatePayments()`, `calculateAmount()`, `calculatePercentage()`, `calculateBalance()`, `isPaymentComplete()`, `isPaymentPartial()`
- **Observaciones:** Redondea a 2 decimales. Lógica matemática simple, sin estado.

#### `services/logbook/logbookHistory-service.ts` — Historial de logbook
- **Módulo:** Logbooks (Módulo 2)
- **Funciones:** `logAction()` genérico, `updateLogbookHistory()` (verifica autoría), `deleteLogbookHistory()`
- **Lógica:** Verifica que solo el autor puede actualizar su propia entrada. Guarda el contenido anterior antes de actualizar.

#### `services/notifications/notification-generator-service.ts` — Generación de notificaciones automáticas
- **Módulo:** Notifications (Módulo 10) — foco en grupos
- **Funciones públicas:**
  - `generatePaymentReminder()` — X días antes del vencimiento de un pago
  - `generateOverduePaymentNotification()` — Pago vencido
  - `generateRoomingListReminder()` — Antes del deadline de rooming list
  - `generateArrivalReminder()` — Días antes de la llegada del grupo
  - `generateManualNotification()` — Disparada por usuario, puede ser futura
  - `generateGeneralNotification()` — Notificación global del sistema
  - `processPendingNotifications()` — Función principal del cron (7:00 AM)
  - `checkAndGenerateNotifications()` — Autodetección de eventos pendientes
  - `getConfig()` — Devuelve configuración de timing
- **Configuración de timing:**

| Tipo | Días de antelación |
|------|--------------------|
| `payment_upcoming` | 15, 7 días antes |
| `payment_overdue` | 0 (el mismo día) |
| `rooming_list` | 15, 7 días antes del deadline |
| `arrival` | 3 días antes |
| `contract_unsigned` | 10, 5 días antes — **NO IMPLEMENTADO** |
| `balance_pending` | 7 días después del checkout — **NO IMPLEMENTADO** |

- **Observaciones:** Prevención de duplicados (últimas 48h por tipo + ID). URLs directas a tabs específicas del módulo de grupos. Notificaciones futuras (campo `scheduled_for`).

#### `services/parking/invoicePdfService.ts` — PDF de facturas de parking (PENDIENTE)
- **Módulo:** Parking (Módulo 3)
- **Estado:** Completamente comentado. Planificado con almacenamiento dual (disco local O AWS S3) pero sin implementar.

#### `services/scheduling/` — Sistema completo de validación de scheduling
- **Módulo:** Scheduling (Módulo 4)
- Ver Módulo 4 para documentación detallada. En resumen:
  - `schedule-validator.ts` (875 líneas) — Validador completo del mes
  - `constraints/` — 7 constraints implementadas (coverage, night_block, consecutive_rest, max_consecutive_work, rotation_continuity, monthly_libre, employee_rules)
  - `utils/matrix.ts` (409 líneas) — Operaciones sobre la matriz de horarios
  - `utils/day-helpers.ts` — Utilidades de fechas y días en español

### B.2 Servicios que podrían implementarse

| # | Servicio | Módulo | Descripción |
|---|---------|--------|-------------|
| 1 | **PDF de facturas parking** | Parking | `invoicePdfService.ts` existe pero está completamente comentado. Completar integración con almacenamiento (local o S3) |
| 2 | **Notificaciones: contract_unsigned** | Notifications | Config existe (`contract_unsigned: [10, 5]`) pero la lógica de generación no está implementada |
| 3 | **Notificaciones: balance_pending** | Notifications | Config existe (`balance_pending: [7]`) pero la lógica de generación no está implementada |
| 4 | **Export service centralizado** | Transversal | Actualmente los exports de Excel/PDF están dispersos por módulos (grupos, cashier, scheduling). Un servicio centralizado evitaría duplicación |
| 5 | **Image resize/optimization** | Blacklist / Profile | La compresión de imágenes se delega a Cloudinary. Para uploads locales o casos sin Cloudinary, podría añadirse un servicio de procesamiento de imágenes con `sharp` |
| 6 | **Audit service global** | Transversal | Cada módulo implementa su propio historial de cambios (logbook_history, maintenance_history, group_history). Un servicio genérico `AuditService.log()` evitaría la duplicación |

---

## Sección C: Validaciones Zod del Backend ⚠️

Las validaciones se encuentran en `backend/validations/`. Hay 9 directorios con 8 ficheros de schemas + 1 fichero vacío. Todos los schemas se usan en los controllers para validar el body/params/query de las peticiones con `schema.parse()` o `schema.safeParse()`.

### C.1 Validaciones implementadas

#### `validations/auth/user-validation.ts` — Auth & Users (Módulo 1)
- `userSchema` — Crear usuario: username (mín 3 chars), email, password (mín 6 chars), role (opcional)
- `updateProfileSchema` — Cambiar username: 3-50 chars, solo alfanumérico + guion bajo, requiere `currentPassword`
- `updatePasswordSchema` — Cambiar contraseña: current + new (6-100 chars) + confirm. Reglas: nueva ≠ actual; confirm = nueva
- Helper `getValidationErrors()` — Extrae errores de un `ZodError` como array de strings

#### `validations/blacklist/schemas.ts` — Blacklist (Módulo 13)
- `createBlacklistSchema` — Crear entrada: guest_name (letras+espacios, 3-255), document (5-20 chars, auto-uppercase), fechas YYYY-MM-DD (checkout > checkin), reason (10-1000 chars), severity (LOW/MEDIUM/HIGH/CRITICAL), comments (10-2000 chars), images (máx 5 URLs)
- `updateBlacklistSchema` — Todos los campos opcionales, mismas reglas cuando están presentes
- `blacklistFiltersSchema` — Filtros de búsqueda: search, document, severity, status, date range, page (default 1), limit (máx 100, default 50)
- `idParamSchema` — ID debe ser entero positivo

#### `validations/cashier/cashier-validation.ts` — Cashier (Módulo 6)
- `CreateShiftSchema` — Crear turno: shift_date, tipo (morning/afternoon/night/closing), 2 UUIDs responsables, initial_fund (default €200), comments (máx 2000)
- `CloseShiftSchema` — Cerrar turno: cash_counted, cash_expected, difference, totales. Regla: si difference > €0.50, comments obligatorio
- `DenominationSchema` — 14 denominaciones de euro: [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]
- `CreateVoucherSchema` — Importe > 0.01, reason (5-1000 chars)
- `RepayVoucherSchema` — UUID del que repaga
- `CreateHistorySchema` — Tracking de cambios: table_affected, record_id, field_changed, old/new_value
- Query schemas para turnos, vouchers e informes con paginación

#### `validations/group/group-schemas.ts` — Groups (Módulo 9)
- ⚠️ **FICHERO VACÍO — SIN VALIDACIONES IMPLEMENTADAS**
- El módulo de grupos no tiene ningún schema Zod. Los datos de entrada no se validan en el backend.

#### `validations/logbook/logbook-schemas.ts` — Logbooks (Módulo 2)
- `createLogbookSchema` — Crear entrada: message (3-5000 chars), importance_level (baja/media/alta/urgente), department_id (int positivo), author_id (UUID), date opcional (YYYY-MM-DD)
- `updateLogbookSchema` — Todos opcionales, mínimo 1 campo
- `createCommentSchema` — comment (3-5000 chars), department_id y importance_level opcionales
- `updateCommentSchema` — Todos opcionales, mínimo 1 campo

#### `validations/maintenance/schemas.ts` — Maintenance (Módulo 5)
- `createReportSchema` — title (3-150), description (10+), location_type, location_description (3-200), room_number (si location=room, obligatorio), room_out_of_service, priority (default medium), assigned_to UUID, assigned_type (internal/external)
- `updateReportSchema` — Todos opcionales, mismas validaciones condicionales
- `updateStatusSchema` — new_status (enum 7 estados), notes opcional
- `addImageSchema` — file_name, URL, file_size (máx 5MB), mime_type (jpeg/png/webp/gif), auto_delete_on_close (default true)
- `assignReportSchema` — Reglas: internal requiere assigned_to UUID; external requiere company_name
- `idParamSchema` — Formato DDMMYY-XXX (ej: 120625-001)
- `reportFiltersSchema` — Filtros completos con paginación (máx 100/página)

#### `validations/parking/booking-validation.ts` — Parking Bookings (Módulo 3 / 17)
- `createBookingSchema` — spot_number (int positivo), level_code (enum: '-2' o '-3'), vehicle_id (int positivo), expected_checkin/checkout (datetime con dayjs), booking_source (default 'direct'), notes (máx 500). Reglas: check-in no puede ser en el pasado; checkout >= checkin
- `updateBookingSchema` — Todos opcionales

#### `validations/parking/vehicle-validation.ts` — Parking Vehicles (Módulo 3)
- `plateNumberSchema` — 3-12 chars, uppercase, alfanumérico + espacios/guiones, normalizado (colapsa múltiples espacios/guiones)
- `ownerNameSchema` — 3-35 chars, permite acentos + apóstrofo, normalizado. Regex: `/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'\-]+$/`
- `modelSchema` — 3-35 chars opcional, permite acentos + puntos/guiones
- `registerVehicleSchema` / `updateVehicleSchema` — Composición de los anteriores
- Helper `normalizeSpacesAndDashes()` — Normaliza separadores en matrículas y nombres

#### `validations/scheduling/scheduling-schemas.ts` — Scheduling (Módulo 4)
- `createMonthSchema` — year (2020-2100), month (1-12), notes opcional
- `updateMonthSchema` — status o notes, mínimo 1
- `updateAssignmentSchema` — shift_code (1-5 chars), notes
- `bulkUpdateAssignmentsSchema` — Array de `{day_id, employee_id UUID, shift_code}`
- `createConstraintSchema` — month_id, employee_id, constraint_type, fechas. Regla: si tipo es request_shift/request_no_shift, shift_code obligatorio; end_date >= start_date. Prioridad 1-7.
- `approveConstraintSchema` — status (approved/rejected), notes
- `createEmployeeRuleSchema` — employee_id, rule_type (7 tipos), rule_value, priority 0-10
- `updateConfigSchema` — config_value (1-255 chars)

### C.2 Validaciones que podrían implementarse / faltan

| # | Estado | Módulo | Descripción |
|---|--------|--------|-------------|
| 1 | ❌ | **Groups** | `group-schemas.ts` está vacío. Falta validación de: crear/actualizar grupo (name, agency, fechas de llegada/salida, total, currency, status), crear/actualizar pago (concept, amount, due_date, percentage), actualizar rooming list, filtros de búsqueda |
| 2 | ❌ | **Departments** | No existe fichero de validación. Las operaciones CRUD de departamentos no tienen schemas Zod (name validado solo por la BD) |
| 3 | ❌ | **Notifications** | No existe fichero de validación. La generación manual de notificaciones y las consultas de filtrado no tienen schemas Zod |
| 4 | ❌ | **Messages / Chat** | No existe fichero de validación. Envío de mensajes, creación de conversaciones y búsqueda de usuarios no tienen schemas Zod |
| 5 | ❌ | **Backoffice** | No existe fichero de validación. Operaciones CRUD de facturas, proveedores y otros recursos del backoffice no tienen schemas Zod |
| 6 | ❌ | **Conciliation** | No existe fichero de validación. Los datos de conciliación no se validan con Zod |
| 7 | ❌ | **Demo Activity** | No existe fichero de validación. Los filtros de consulta de logs de demo no tienen schemas |
| 8 | ⚠️ | **Parking levels** | `level_code` en `createBookingSchema` solo acepta `'-2'` o `'-3'`. Si se añaden más plantas, hay que actualizar manualmente el enum |
| 9 | ⚠️ | **Maintenance ID format** | El `idParamSchema` acepta formato DDMMYY-XXX pero no valida que el DDMMYY sea una fecha real (podría aceptar `320699-001`) |
| 10 | ⚠️ | **Cashier denomination** | La lista de 14 denominaciones está hardcodeada en el schema. Si cambia la política de moneda (ej. MXN en lugar de EUR), habría que actualizar el schema |

---

## Sección D: Otras áreas a revisar ⚠️

### D.1 Tests

Actualmente hay tests en `backend/tests/`. Sin embargo, la cobertura es parcial:

| Área | Estado |
|------|--------|
| Scheduling validator | ⚠️ Tests presentes pero incompleta |
| Constraints de scheduling | ⚠️ Tests parciales |
| Controllers / Services | ❌ Sin tests unitarios |
| Middlewares (rateLimiter, demoRestriction) | ❌ Sin tests |
| Repositories | ❌ Sin tests de integración |
| Validaciones Zod | ❌ Sin tests de schemas |

### D.2 Variables de entorno

Las siguientes variables de entorno son necesarias pero no tienen valores por defecto (si faltan, algunos módulos fallan silenciosamente):

| Variable | Módulo | Consecuencia si falta |
|----------|--------|----------------------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Groups (emails) | Envío de emails falla silenciosamente |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Blacklist, Profile (avatares), Backoffice | Uploads de imágenes fallan |
| `SECRET_JWT_KEY` | Auth | Todos los tokens inválidos (fallo crítico) |
| `DB_ENVIRONMENT` | Global | Usa BD incorrecta (local vs Aiven) |

### D.3 Cron jobs

| Job | Schedule | Función | Observaciones |
|-----|----------|---------|---------------|
| Notificaciones | Diario 7:00 AM | Genera notificaciones automáticas de grupos | Ejecutable manualmente via endpoint admin |
| Batch payment | Día 10 del mes 23:59 | Marca facturas validadas del mes anterior como pagadas | Usuario 'system-cron' — no validado en BD |
| Message cleanup | MySQL Event | Limpia mensajes antiguos | Configurado directamente en MySQL, no en Node |

---

## Sección E: State Management del Frontend ✅

El frontend usa **Zustand** para estado local de UI y **React Query** (@tanstack/react-query) para datos del servidor. Ambos se configuran en `app/lib/theme/ThemeProvider.tsx`.

### E.1 Configuración de React Query

Configurado en `ThemeProvider.tsx` con `QueryClientProvider`:

| Opción | Valor | Propósito |
|--------|-------|-----------|
| `staleTime` | 30 segundos | Datos considerados frescos durante 30s (evita refetches innecesarios) |
| `gcTime` | 5 minutos | Cache en memoria durante 5 min tras desmontar componente |
| `refetchOnWindowFocus` | `false` | No refetch automático al volver a la pestaña |
| `retry` | 1 | Un solo reintento en caso de error |

- **DevTools:** `ReactQueryDevtools` habilitado solo en desarrollo (`initialIsOpen: false`, posición bottom-right)
- **Patrón de uso:** Cada módulo tiene su propio `queries.ts` (ej: `app/lib/logbooks/queries.ts`) con hooks que usan `useQuery`/`useMutation`
- **Invalidación:** Automática en mutations mediante `queryClient.invalidateQueries()`

### E.2 Zustand Stores

4 stores en `app/stores/`, cada uno con responsabilidades bien diferenciadas:

#### `useCashierStore.ts` — Estado del módulo Cashier (~300 líneas)

El store más complejo del proyecto. Gestiona 3 vistas del módulo de cajero:

**Estado Hotel (fecha + UI):**
- `selectedDate`, `currentDate`, `selectedDay` — Navegación de fecha
- `activeTab: ShiftType` — Tab de turno activo (morning/afternoon/night/closing)
- `activeModal: ModalType` — Modal abierto (initializeDay/closeDay/reopenDay/closeShift/null)
- `modalData` — Datos del modal activo

**Estado Logs:**
- `logsDate`, `logsActionFilter`, `logsUserFilter` — Filtros de historial
- `logsLimit` (50), `logsOffset` — Paginación

**Estado Reports:**
- `reportsYear`, `reportsMonth`, `reportsTab` (summary/payments/vouchers)
- `chartViewMode` (pie/bar)

**Computed:**
- `getCurrentMonth(locale)` — Nombre del mes localizado
- `getLogsFormattedDate(locale)` — Fecha de logs formateada
- `getReportsDisplayLabel(locale)` — Etiqueta de reports (ej: "Marzo 2026")

**Actions:** Navegación temporal (prev/next/today para cada vista), modales, tabs, reset completo

**Selector hooks optimizados:**
- `useSelectedDate()`, `useActiveTab()`, `useActiveModal()`, `useIsModalOpen(modal)`
- `useLogsDate()`, `useLogsFilters()` (con `useShallow`)
- `useReportsDate()`, `useReportsTab()`, `useChartViewMode()`

#### `useGroupStore.ts` — Estado del módulo Groups (~200 líneas)

**Data (viene de API — fetch directo, no React Query):**
- `currentGroup: GroupWithDetails | null`
- `payments: GroupPayment[]`, `contacts: GroupContact[]`, `rooms: GroupRoom[]`
- `status: GroupStatusRecord | null`

**UI:**
- `activeTab` — Tab del detalle de grupo (overview, payments, contacts, rooms, etc.)
- `activePanelId` — SlidePanel abierto ('new', 'edit-5', null)
- `highlightId` — Item resaltado tras creación/edición

**Loading states:** `isLoadingGroup`, `isLoadingPayments`, `isLoadingContacts`, `isLoadingRooms`, `isLoadingStatus`

**Refresh actions:** `refreshGroup(id)`, `refreshPayments(id)`, `refreshContacts(id)`, `refreshRooms(id)`, `refreshStatus(id)` — Llaman a `groupsApi.*` directamente

**Observación:** Este store mezcla data fetching con UI state. Los módulos más recientes (cashier, notifications) usan React Query para data fetching y Zustand solo para UI.

#### `useMaintenanceStore.ts` — Estado del módulo Maintenance (~150 líneas)

**Data:**
- `currentReport: ReportWithDetails | null`
- `images: MaintenanceImage[]`, `history: MaintenanceHistory[]`

**UI:**
- `filters: ReportFilters`
- `activeTab` — Tab del detalle (detail, images, history)
- `highlightId`

**Loading states:** `isLoadingReport`, `isLoadingImages`, `isLoadingHistory`

**Refresh actions:** `refreshReport(id)`, `refreshImages(id)`, `refreshHistory(id)` — Llaman a `maintenanceApi.*` directamente

**Observación:** Patrón similar a useGroupStore (data fetching dentro del store). Las funciones `addImage`, `removeImage`, `addHistoryEntry` permiten actualizaciones optimistas.

#### `useNotificationStore.ts` — Estado del módulo Notifications (~30 líneas)

El store más limpio. **Solo UI**, data fetching via React Query (`lib/notifications/queries.ts`):

- `isDropdownOpen: boolean` — Si el dropdown de notificaciones está abierto
- `selectedNotificationId: number | null` — Notificación seleccionada
- `reset()` — Resetear estado

### E.3 Patrón de evolución observado

| Store | Data fetching | Complejidad | Patrón |
|-------|--------------|-------------|--------|
| `useNotificationStore` | React Query (separado) | Baja | ✅ Recomendado: Zustand solo para UI |
| `useCashierStore` | React Query (separado) | Alta | ✅ Zustand para UI compleja, React Query para data |
| `useGroupStore` | Dentro del store (fetch directo) | Media | ⚠️ Legacy: mezcla data + UI |
| `useMaintenanceStore` | Dentro del store (fetch directo) | Media | ⚠️ Legacy: mezcla data + UI |

### E.4 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **useGroupStore y useMaintenanceStore mezclan data y UI** — Podrían migrar el data fetching a React Query para consistencia con cashier/notifications |
| 2 | ℹ️ | **Selector hooks** — useCashierStore exporta selectores optimizados con `useShallow` para evitar re-renders. Los otros stores no lo hacen |
| 3 | ℹ️ | **Ningún store persiste a localStorage** — Excepto `SIDEBAR_COLLAPSED_KEY` en el dashboard layout (fuera de Zustand) |

---

## Sección F: API Client del Frontend ✅

El frontend tiene 2 clientes API: `apiClient.ts` para Client Components y `serverFetch.ts` para Server Components.

### F.1 `app/lib/apiClient.ts` — Cliente principal (~350 líneas)

**Métodos exportados:**

| Método | Uso |
|--------|-----|
| `apiClient.get<T>(url, options?)` | GET con JSON response |
| `apiClient.post<T>(url, data?, options?)` | POST con JSON body |
| `apiClient.patch<T>(url, data?, options?)` | PATCH con JSON body |
| `apiClient.put<T>(url, data?, options?)` | PUT con JSON body |
| `apiClient.delete<T>(url, options?)` | DELETE (maneja respuestas vacías) |
| `apiClient.postFormData<T>(url, formData, options?)` | POST multipart (uploads) |
| `apiClient.getBlob(url, options?)` | GET que retorna Blob (descargas) |

**Autenticación:**
- Cookies HttpOnly — viajan automáticamente con `credentials: 'include'`
- No se almacenan tokens en localStorage/sessionStorage
- `getAuthHeaders()` retorna `{}` — las cookies se gestionan por el navegador

**Auto-refresh de tokens (circuit breaker):**

| Parámetro | Valor | Propósito |
|-----------|-------|-----------|
| `MAX_REFRESH_ATTEMPTS` | 3 | Máximo de intentos antes de redirigir a login |
| `REFRESH_COOLDOWN_MS` | 5.000 ms | Tiempo entre reseteos del contador de intentos |

**Flujo de auto-refresh:**
1. Request recibe 401
2. Verifica circuit breaker (< 3 intentos en ventana de 5s)
3. Si ya hay refresh en curso → encola el request en `failedQueue`
4. Ejecuta `refreshSession()` → `POST /api/auth/refresh-token`
5. Si refresh exitoso → resetea contador, procesa cola, reintenta request original
6. Si refresh falla → limpia cookies, redirige a `/login`

**Rutas excluidas de auto-refresh:**
- `/auth/login`, `/auth/logout`, `/auth/refresh-token`, `/auth/register`
- Nota: `/auth/me` SÍ hace refresh (se usa para validar sesión)

**Manejo de errores:**

```
class ApiError extends Error {
  demo: boolean    // true = restricción de modo demo (toast ya mostrado)
  status: number   // HTTP status code
  code?: string    // Código de error del backend para i18n
}
```

- **Errores demo:** Toast especial "Modo Demo: Esta acción no está disponible" (🔒, fondo amarillo)
- **Helper `isDemoError(error)`** — Detecta si un error es de demo para evitar doble toast en catch blocks
- **Códigos de error:** El `code` del backend (ej: `AUTH_INVALID_CREDENTIALS`) se captura para traducción i18n en el frontend

**`clearAuthCookiesAndRedirect()`:**
- Previene múltiples redirects simultáneos (flag `__redirectingToLogin`)
- Limpia cookies manualmente, resetea estado del módulo, `window.location.replace('/login')`

### F.2 `app/lib/serverFetch.ts` — Fetch para Server Components (~60 líneas)

**Funciones exportadas:**

| Función | Uso |
|---------|-----|
| `serverFetch<T>(endpoint, options?)` | Fetch autenticado para Server Components |
| `serverFetchPublic<T>(endpoint, options?)` | Fetch público (sin auth, cacheable) |

**`serverFetch` (autenticado):**
- Lee la cookie `access_token` con `cookies()` de Next.js
- La reenvía en el header `Cookie: access_token=...`
- `cache: 'no-store'` — No cachea requests autenticados
- Retorna `null` si no hay token o si falla (no lanza errores)

**`serverFetchPublic` (público):**
- Sin cookies, cacheable por Next.js
- Retorna `null` en caso de error

**Observación:** `serverFetch` usa `SERVER_API_BASE_URL` (env var para server-side), mientras que `apiClient` usa `API_BASE_URL` (puede ser distinta por proxy).

### F.3 URL de API

La URL base se configura en `app/lib/env.ts`:
- `API_BASE_URL` — URL para el cliente (client-side)
- `SERVER_API_BASE_URL` — URL para server components (server-side)
- En producción: ambas apuntan al backend en Render

### F.4 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **postFormData y getBlob** reimplementan la lógica de auto-refresh por separado (no reutilizan `fetchWithRefresh`). Podrían refactorizarse para usar un único punto de refresh |
| 2 | ℹ️ | **Console.log en producción** — El apiClient loguea todas las peticiones en consola. Podría condicionarse a NODE_ENV |
| 3 | ℹ️ | **Circuit breaker efectivo** — Previene loops infinitos de refresh. Patrón sólido |

---

## Sección G: Layouts, Routing y Error Boundaries ⚠️

### G.1 Root Layout — `app/layout.tsx`

Layout raíz de toda la aplicación. Integra:

**Providers (orden de wrapping):**
```
<html> (lang dinámico, CSS font variables)
  <NextIntlClientProvider>       ← i18n
    <NextUIProvider>             ← UI library
      <NextThemesProvider>       ← Dark mode
        <QueryClientProvider>    ← React Query
          <AuthProvider>         ← Autenticación
            {children}
            <Toaster />          ← Toast notifications
            <ReactQueryDevtools /> ← Solo dev
          </AuthProvider>
        </QueryClientProvider>
      </NextThemesProvider>
    </NextUIProvider>
  </NextIntlClientProvider>
  <Analytics />                  ← Vercel Analytics
</html>
```

**Metadata y SEO:**
- Title template: `%s | Four Points`
- Open Graph configurado (tipo website, locale es_ES)
- PWA manifest (`/manifest.json`)
- Favicons: SVG, ICO, PNG 96x96, Apple Touch Icon 180x180
- `appleWebApp` con status bar translúcida
- `formatDetection: false` para teléfonos, emails, direcciones

**Viewport:**
- `themeColor` dinámico: `#ffffff` (light) / `#010409` (dark)
- `userScalable: false`, `viewportFit: cover` (PWA-ready)

**Fonts:**
- Sistema dinámico via CSS variables (`--font-primary`, `--font-display`)
- Configurado en `fonts.helper.ts` con ACTIVE_FONTS switchable
- Actualmente: Poppins (primary) + Ubuntu (display)

**Analytics:**
- Google Analytics (GA4): ID `G-ZYSZ6THVDW` via script tag
- Vercel Analytics: componente `<Analytics />`

### G.2 Dashboard Layout — `app/dashboard/layout.tsx`

Layout protegido para todas las rutas del dashboard. Client Component (`'use client'`).

**Autenticación:**
- Verifica `user` del `useAuth()` context
- Si no hay usuario → `window.location.href = '/login'` (con flag `redirecting` para evitar loops)
- Muestra `<DashboardSkeleton />` durante loading

**Sidebar:**
- Colapsable (estado persistido en `localStorage` con key `sidebar-collapsed`)
- Mobile: overlay con backdrop semitransparente, desliza desde la izquierda
- Desktop: estático, transición 300ms entre collapsed (64px) y expanded (256px)
- Componente: `<SideNav>` con props `onClose`, `collapsed`, `onToggleCollapse`

**Header (64px):**
- **Izquierda:** Hamburger (mobile) + breadcrumbs (desktop)
- **Derecha:** Búsqueda (GlobalSearch desktop / MobileSearchModal), theme toggle, NotificationBell, ProfileDropdown

**Breadcrumbs:**
- Generados dinámicamente desde `pathname.split('/')`
- Último segmento: texto estático. Anteriores: links clicables
- Capitalización y reemplazo de guiones por espacios

**Content area:** `<main>` con `overflow-y-auto` y padding responsive (p-4 mobile, p-6 desktop)

### G.3 Route Groups

| Grupo | Ruta | Layout | Propósito |
|-------|------|--------|-----------|
| `(auth)` | `/login` | Público (sin sidebar) | Autenticación |
| `dashboard/` | `/dashboard/*` | Dashboard layout (sidebar + header) | Todas las rutas protegidas |

### G.4 Error Boundaries

**Componente reutilizable: `app/ui/errors/ModuleError.tsx`**

Componente genérico para error boundaries de módulos. Recibe:
- `error: Error & { digest? }` — El error capturado
- `reset: () => void` — Función de Next.js para reintentar
- `translationNamespace: string` — Namespace i18n del módulo

**Funcionalidades:**
- Loguea el error en consola con prefijo del módulo
- Muestra card de error con icono, título y descripción (traducidos)
- Detalles técnicos expandibles solo en desarrollo
- Botones: "Reintentar" (ejecuta `reset()`) y "Volver al Dashboard"
- Texto de ayuda al pie

**Traducciones requeridas por módulo** (en `messages/{locale}/{module}.json`):
```json
{
  "error": {
    "title": "...",
    "subtitle": "...",
    "errorTitle": "...",
    "errorDescription": "...",
    "errorDetails": "...",
    "retry": "...",
    "backToDashboard": "...",
    "helpText": "..."
  }
}
```

**Módulos con error boundary implementado (10):**

| Módulo | Fichero |
|--------|---------|
| Blacklist | `app/dashboard/blacklist/error.tsx` |
| Backoffice | `app/dashboard/bo/error.tsx` |
| Cashier | `app/dashboard/cashier/error.tsx` |
| Conciliation | `app/dashboard/conciliation/error.tsx` |
| Groups | `app/dashboard/groups/error.tsx` |
| Logbooks | `app/dashboard/logbooks/error.tsx` |
| Maintenance | `app/dashboard/maintenance/error.tsx` |
| Parking | `app/dashboard/parking/error.tsx` |
| Profile | `app/dashboard/profile/error.tsx` |
| Restaurant | `app/dashboard/restaurant/error.tsx` |

Todos siguen el mismo patrón de 2 líneas:
```tsx
export default function XxxError({ error, reset }) {
  return <ModuleError error={error} reset={reset} translationNamespace="xxx" />
}
```

**Módulos SIN error boundary:** Scheduling, Booking, Messages, Search, Notifications, Dashboard principal

### G.5 Not-Found Pages

Actualmente solo implementadas en Blacklist:
- `app/dashboard/blacklist/not-found.tsx` — 404 general del módulo
- `app/dashboard/blacklist/[id]/not-found.tsx` — Registro no encontrado

Ambas usan traducciones i18n y tienen botones de navegación (volver al listado, ir al dashboard).

### G.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **6 módulos sin error boundary** — Scheduling, Booking, Messages, Search, Notifications, Dashboard. Si fallan, el error sube al layout padre |
| 2 | ⚠️ | **Not-found solo en Blacklist** — Los demás módulos no tienen página 404 personalizada |
| 3 | ℹ️ | **Breadcrumbs simples** — Generados por split de pathname. No tienen traducciones ni labels customizables |
| 4 | ℹ️ | **Auth redirect con window.location** — No usa next/navigation para mantener compatibilidad con middleware de cookies |

---

## Sección H: UI Component Library / Design System ✅

Los componentes compartidos del frontend se encuentran en `app/ui/` (core) y `app/components/` (domain-specific).

### H.1 Estructura de `app/ui/`

```
app/ui/
├── calendar/
│   ├── DatePickerInput.tsx         # Input con dropdown de calendario (portal-based)
│   ├── HorizontalDatePicker.tsx    # Selector horizontal de días del mes
│   ├── SimpleCalendarCompact.tsx   # Calendario compacto para sidepanels
│   ├── simplecalendar.tsx          # Calendario mensual completo
│   └── timepicker.tsx              # Selector de hora (intervalos de 30 min)
├── dashboard/
│   ├── sidenav.tsx                 # Sidebar principal con collapse/expand
│   └── nav-links.tsx               # Links de navegación con dropdowns y RBAC
├── errors/
│   └── ModuleError.tsx             # Error boundary reutilizable (ver Sección G.4)
├── fonts-design/
│   ├── fonts.ts                    # Importaciones de fuentes de Next.js
│   ├── fonts.helper.ts             # Sistema de selección de fuentes (ACTIVE_FONTS)
│   └── design-system.ts            # Tokens de diseño
├── panels/
│   ├── CenterModal.tsx             # Modal centrado con soporte de wizard (steps)
│   ├── SlidePanel.tsx              # Panel lateral deslizante con indicador de pasos
│   ├── ConfirmDialog.tsx           # Diálogo de confirmación (danger/warning variants)
│   ├── SlidePanelFooterWithDelete.tsx  # Footer de SlidePanel con botón de eliminar
│   └── index.ts                    # Re-exports
├── skeletons.tsx                   # Shimmer skeleton loaders (tabla, card)
├── global.css                      # Estilos globales + Tailwind imports
└── home.module.css                 # CSS Module para landing page
```

### H.2 Calendarios

#### `DatePickerInput.tsx` — Input con dropdown de calendario
- Portal-based rendering (evita problemas de z-index y overflow)
- Posicionamiento automático (arriba/abajo según espacio disponible)
- Soporte de rango de fechas (min/max)
- Dark mode completo
- Click outside para cerrar
- Formato configurable

#### `HorizontalDatePicker.tsx` — Selector horizontal de días
- Barra horizontal scrollable con los días del mes
- Navegación por mes (prev/next/today)
- Día actual resaltado, día seleccionado con indicador
- Responsive: se adapta al ancho disponible
- Usado en: Logbooks, Cashier

#### `simplecalendar.tsx` — Calendario mensual
- Grid de 7 columnas (L M X J V S D)
- Navegación mensual
- Días del mes anterior/siguiente en gris
- Soporte de eventos/marcadores
- Usado en: Parking (reservas), Logbooks (crear entrada con fecha)

#### `timepicker.tsx` — Selector de hora
- Intervalos de 30 minutos (00:00, 00:30, 01:00, ...)
- Dropdown con scroll
- Formato 24h
- Usado en: Parking (hora de check-in/out)

### H.3 Paneles y diálogos

#### `CenterModal.tsx` — Modal centrado
- Basado en Headless UI `Dialog`
- Overlay con transición de opacidad
- Tamaños: `sm`, `md`, `lg`, `xl`
- **Soporte wizard:** Indicador de pasos (`currentStep`, `totalSteps`)
- Botón de cerrar (X)
- Cierre con Escape o click fuera

#### `SlidePanel.tsx` — Panel lateral deslizante
- Se desliza desde la derecha
- Overlay semitransparente
- **Indicador de pasos** para wizards multi-step
- Header con título y botón cerrar
- Footer sticky opcional
- Transición 300ms
- Usado en: Logbooks (crear entrada), Parking (crear reserva), Cashier (crear turno)

#### `ConfirmDialog.tsx` — Diálogo de confirmación
- Dos variantes: `danger` (rojo, eliminar) y `warning` (amarillo, advertencia)
- Icono contextual (FiAlertTriangle para warning, FiTrash2 para danger)
- Botones: confirmar (con loading spinner) y cancelar
- Título, mensaje y textos de botones customizables
- Usado en todas las acciones destructivas del proyecto

### H.4 Skeletons

`skeletons.tsx` — Loaders con animación shimmer:
- Skeleton de tabla (filas con celdas animadas)
- Skeleton de card (bloques rectangulares)
- Animación definida en Tailwind: keyframe `shimmer` con gradiente translúcido

### H.5 Navegación

#### `sidenav.tsx` — Sidebar principal
- **Collapsed mode:** Solo iconos (64px ancho)
- **Expanded mode:** Iconos + labels (256px ancho)
- Botón toggle collapse (desktop) / close (mobile)
- Logo Four Points con badge de versión
- Links generados por `nav-links.tsx`
- Fixed en desktop, overlay en mobile

#### `nav-links.tsx` — Links con RBAC
- Links principales con icono y label
- **Dropdowns anidados** para módulos con sub-rutas
- **Control de acceso basado en roles:**
  - Cada link tiene `roles?: string[]` opcionales
  - Si no tiene roles → visible para todos
  - Si tiene roles → solo visible para esos roles
- **Detección de ruta activa** con `usePathname()`
- Iconos de `react-icons/fi` (Feather Icons)

### H.6 Sistema de fuentes

#### `fonts.helper.ts` — Selector de fuentes

Variable `ACTIVE_FONTS` que define las fuentes activas:
- `primary` — Fuente principal del texto (actualmente: **Poppins**)
- `display` — Fuente de títulos y headings (actualmente: **Ubuntu**)

Las fuentes se aplican via CSS variables (`--font-primary`, `--font-display`) en el root layout.
Cambiar `ACTIVE_FONTS` cambia globalmente las fuentes sin tocar componentes.

### H.7 Estructura de `app/components/`

Componentes organizados por dominio (20 directorios):

| Directorio | Módulo | Contenido |
|-----------|--------|-----------|
| `_utils/` | Shared | Utilidades comunes |
| `auth/` | Auth | NewUserModal, LoginForm |
| `blacklist/` | Blacklist | Cards, forms, detail views, UI components propios |
| `bo/` | Backoffice | Facturas, proveedores, assets |
| `booking/` | Booking | Componentes de reservas |
| `cashier/` | Cashier | Turnos, vouchers, reports, denominations |
| `chat/` | Chat | Chat con IA (archivado) |
| `conciliation/` | Conciliation | Formularios de conciliación |
| `dashboard/` | Dashboard | DashboardSkeleton, widgets |
| `groups/` | Groups | Pagos, contactos, rooms, historial |
| `layout/` | Layout | LanguageSwitcher, ProfileDropdown |
| `logbooks/` | Logbooks | Entries, comments, edit modals |
| `maintenance/` | Maintenance | Reports, images, status |
| `notifications/` | Notifications | NotificationBell, dropdown |
| `parking/` | Parking | Spots, bookings, vehicles, stats |
| `profile/` | Profile | Settings panels |
| `restaurant/` | Restaurant | Componentes de restaurante |
| `scheduling/` | Scheduling | Matriz de horarios |
| `search/` | Search | GlobalSearch, MobileSearchModal |
| `theme/` | Theme | SetThemeButton, ThemeSwitcher |

### H.8 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **Headless UI** — CenterModal y SlidePanel usan `@headlessui/react` para accesibilidad (focus trap, Escape, aria) |
| 2 | ℹ️ | **NextUI** — Algunos componentes usan NextUI (`@nextui-org/react`) pero los core panels/modals son custom |
| 3 | ⚠️ | **Sin Storybook** — No hay catálogo visual de componentes. La documentación es implícita por uso |
| 4 | ℹ️ | **Patrón portal** — DatePickerInput usa `createPortal` para evitar problemas de z-index en tablas/modales |

---

## Sección I: Internacionalización (i18n) ✅

Sistema de internacionalización completo con **next-intl** v4.6.1. Soporte para español (ES) e inglés (EN) con detección automática de idioma.

### I.1 Configuración

**Ficheros:**
- `app/i18n/config.ts` — Definición de locales, cookie name, labels
- `app/i18n/request.ts` — Lógica de detección de idioma y carga de traducciones

**Locales soportados:** `['es', 'en']`
**Locale por defecto:** `es`
**Cookie de preferencia:** `NEXT_LOCALE`

### I.2 Detección automática de idioma (prioridad)

| # | Fuente | Método | Ejemplo |
|---|--------|--------|---------|
| 1 | Cookie | `NEXT_LOCALE` cookie (preferencia del usuario) | `NEXT_LOCALE=en` |
| 2 | Geolocalización | Header `x-vercel-ip-country` (solo Vercel) | `ES` → `es`, `US` → `en` |
| 3 | Navegador | Header `Accept-Language` | `es-ES,es;q=0.9,en;q=0.8` → `es` |
| 4 | Fallback | Default locale | `es` |

**Países hispanohablantes auto-detectados (21):**
ES, MX, AR, CO, PE, VE, CL, EC, GT, CU, BO, DO, HN, PY, SV, NI, CR, PA, UY, PR, GQ

### I.3 Módulos de traducción

20 módulos de traducción, cada uno en `messages/{locale}/{module}.json`:

| Módulo | Fichero | Contenido |
|--------|---------|-----------|
| `common` | common.json | Textos globales (botones, estados, acciones) |
| `dashboard` | dashboard.json | Textos del dashboard principal |
| `parking` | parking.json | Módulo de parking |
| `logbooks` | logbooks.json | Módulo de logbooks |
| `logbook` | logbook.json | Textos internos de logbook |
| `groups` | groups.json | Módulo de grupos |
| `cashier` | cashier.json | Módulo de cajero |
| `maintenance` | maintenance.json | Módulo de mantenimiento |
| `blacklist` | blacklist.json | Módulo de blacklist |
| `backoffice` | backoffice.json | Módulo de backoffice |
| `messages` | messages.json | Módulo de mensajes/chat |
| `profile` | profile.json | Módulo de perfil |
| `conciliation` | conciliation.json | Módulo de conciliación |
| `auth` | auth.json | Autenticación y login |
| `errors` | errors.json | Mensajes de error (vinculado a error-codes.ts del backend) |
| `validation` | validation.json | Errores de validación de formularios |
| `restaurant` | restaurant.json | Módulo de restaurante |
| `booking` | booking.json | Módulo de reservas |
| `notifications` | notifications.json | Módulo de notificaciones |
| `scheduling` | scheduling.json | Módulo de scheduling |

**Total:** 40 ficheros (20 módulos × 2 idiomas)

### I.4 Integración en el código

**Server Components:**
```tsx
import { getLocale, getMessages } from 'next-intl/server'
// En root layout: <NextIntlClientProvider messages={messages}>
```

**Client Components:**
```tsx
import { useTranslations } from 'next-intl'
const t = useTranslations('parking')
// Uso: t('error.title'), t('booking.status.confirmed')
```

**Cambio de idioma:**
- `components/layout/LanguageSwitcher.tsx` — Componente con banderas (🇪🇸/🇬🇧)
- Setea cookie `NEXT_LOCALE` y recarga la página

### I.5 Vinculación con error codes del backend

Los `error-codes.ts` del backend (ej: `AUTH_INVALID_CREDENTIALS`) se envían en la respuesta de error como campo `code`. El frontend usa ese código como key de traducción en `errors.json`:

```
Backend: { error: "Invalid credentials", code: "AUTH_INVALID_CREDENTIALS" }
Frontend: t(`errors.${error.code}`) → "Credenciales inválidas" / "Invalid credentials"
```

### I.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **next-intl sin routing** — No usa prefijos de ruta (`/es/`, `/en/`). El locale se detecta por cookie/header. Single URL para ambos idiomas |
| 2 | ⚠️ | **Módulos `logbooks` y `logbook` separados** — Podría consolidarse en uno solo |
| 3 | ℹ️ | **Graceful degradation** — Si un fichero de traducción no existe, se loguea warning y se salta (no rompe la app) |

---

## Sección J: Theme / Dark Mode ✅

### J.1 Arquitectura

**Librería:** next-themes v0.4.6
**Wrapper:** NextUI (`@nextui-org/react`) como provider externo

**Configuración en ThemeProvider.tsx:**

| Opción | Valor | Efecto |
|--------|-------|--------|
| `attribute` | `"class"` | Aplica `class="dark"` al `<html>` |
| `defaultTheme` | `"system"` | Detecta preferencia del OS |
| `enableSystem` | `true` | Escucha cambios en `prefers-color-scheme` |
| `disableTransitionOnChange` | `false` | Permite transiciones al cambiar tema |

### J.2 Colores principales

| Contexto | Light | Dark |
|----------|-------|------|
| Background (body) | `bg-white` | `bg-[#010409]` |
| Card/Surface | `bg-white` | `bg-[#151b23]` o `bg-[#0D1117]` |
| Border | `border-gray-200` | `border-gray-800` |
| Text primary | `text-gray-900` | `text-gray-100` |
| Text secondary | `text-gray-600` | `text-gray-400` |

### J.3 Componentes de tema

- `components/theme/SetThemeButton.tsx` — Botón simple (sol/luna) para el header
- `components/theme/ThemeSwitcher.tsx` — Switcher más elaborado (para settings)

### J.4 Tailwind CSS

**Config en `tailwind.config.ts`:**
- `darkMode: 'class'` — Activación por clase CSS
- Custom blue palette override
- Font families via CSS variables: `fontFamily: { sans: ['var(--font-primary)'], display: ['var(--font-display)'] }`
- Custom animations: `shimmer` (skeleton loaders), `pulse-green` (status indicators)
- Plugin: `@tailwindcss/forms` para estilos de formularios
- Custom scrollbar styling (light/dark)

### J.5 Observaciones

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **GitHub-inspired dark** — El color `#010409` es el background de GitHub en dark mode |
| 2 | ℹ️ | **13 columnas grid** — Tailwind config incluye `gridTemplateColumns: { '13': 'repeat(13, minmax(0, 1fr))' }` para el scheduling |

---

## Sección K: Database Setup ✅

### K.1 Conexión — `backend/config/db.ts`

**Librería:** `mysql2/promise` v3.14.2
**Tipo:** Connection pool (reutilización de conexiones)

**Entornos soportados:**

| Entorno | Variable | Host | SSL | Uso |
|---------|----------|------|-----|-----|
| **local** | `DB_ENVIRONMENT=local` | `localhost:3306` | ❌ (rejectUnauthorized: false) | Desarrollo |
| **aiven** | `DB_ENVIRONMENT=aiven` | `AIVEN_DB_HOST:AIVEN_PORT` | ✅ (con certificado CA) | Producción |

**Selección:** Variable de entorno `DB_ENVIRONMENT` determina qué configuración usar.

**Variables de entorno por entorno:**

| Local | Aiven |
|-------|-------|
| `LOCAL_DB_HOST` | `AIVEN_DB_HOST` |
| `LOCAL_DB_PORT` | `AIVEN_PORT` |
| `LOCAL_DB_USER` | `AIVEN_DB_USER` |
| `LOCAL_DB_PASSWORD` | `AIVEN_PASSWORD` |
| `LOCAL_DB_NAME` | `AIVEN_DB_NAME` |
| — | `AIVEN_CA_CERT` (PEM) |

**DB name por defecto:** `hotel_db`

**Validación al arrancar:**
1. Loguea configuración (sin contraseñas): host, port, db, user, SSL status
2. Ejecuta `pool.getConnection()` para verificar
3. Si falla → `process.exit(1)` (el servidor no arranca)

### K.2 Scripts SQL

**Ubicación:** `backend/db-mysql/`

| Fichero | Propósito |
|---------|-----------|
| `MASTER_INSTALL_LOCAL.sql` | Instalación completa para desarrollo local |
| `MASTER_INSTALL_AIVEN.sql` | Instalación para Aiven (producción) |
| `aiven/01_init.sql` ... `aiven/XX_*.sql` | Scripts individuales por tabla/feature |
| `backup/` | Backups de la base de datos |

### K.3 Observaciones

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **Sin ORM** — Queries raw con `pool.execute()` y parámetros preparados. Previene SQL injection por diseño |
| 2 | ℹ️ | **Pool global** — Un único pool exportado, creado al importar el módulo. No hay re-conexión automática (la validación al arrancar es suficiente para mysql2 pools) |

---

## Sección L: Error Handling ✅

### L.1 Backend — Error Codes centralizados

**Fichero:** `backend/config/error-codes.ts` (~442 líneas)

Sistema centralizado de códigos de error para **toda** la API. Formato: `MODULE_ACTION_DESCRIPTION`.

**Códigos por módulo:**

| Módulo | Prefijo | Ejemplo | Cantidad aprox |
|--------|---------|---------|----------------|
| Auth | `AUTH_` | `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED`, `AUTH_REGISTER_SUCCESS` | 30+ |
| Backoffice | `BACKOFFICE_` | `BACKOFFICE_INVOICE_NOT_FOUND`, `BACKOFFICE_ASSET_CREATED` | 40+ |
| Blacklist | `BLACKLIST_` | `BLACKLIST_ENTRY_NOT_FOUND`, `BLACKLIST_DUPLICATE_DOCUMENT` | 20+ |
| Cashier | `CASHIER_` | `CASHIER_SHIFT_NOT_FOUND`, `CASHIER_ALREADY_CLOSED` | 30+ |
| Conciliation | `CONCILIATION_` | `CONCILIATION_ENTRY_NOT_FOUND` | 10+ |
| Departments | `DEPARTMENTS_` | `DEPARTMENTS_NOT_FOUND`, `DEPARTMENTS_HAS_DEPENDENCIES` | 10+ |
| Groups | `GROUP_` | `GROUP_NOT_FOUND`, `GROUP_PAYMENT_DELETED` | 25+ |
| Logbook | `LOGBOOK_` | `LOGBOOK_NOT_FOUND`, `LOGBOOK_COMMENT_UPDATED` | 20+ |
| Maintenance | `MAINTENANCE_` | `MAINTENANCE_REPORT_NOT_FOUND`, `MAINTENANCE_IMAGE_UPLOADED` | 20+ |
| Messages | `MESSAGES_` | `MESSAGES_CONVERSATION_NOT_FOUND` | 10+ |
| Notifications | `NOTIFICATIONS_` | `NOTIFICATIONS_NOT_FOUND`, `NOTIFICATIONS_MARKED_READ` | 10+ |
| Parking | `PARKING_` | `PARKING_BOOKING_NOT_FOUND`, `PARKING_SPOT_NOT_AVAILABLE` | 25+ |
| Activity | `ACTIVITY_` | `ACTIVITY_FETCH_ERROR` | 5+ |

**Nota:** Incluye tanto códigos de error como códigos de éxito (ej: `BACKOFFICE_ASSET_CREATED`, `LOGBOOK_COMMENT_UPDATED`). Los de éxito se usan para traducir toasts en el frontend.

**Uso en controllers:**
```typescript
import { ERROR_CODES } from '../config/error-codes'
res.status(404).json({ error: 'Not found', code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND })
```

### L.2 Backend — Global Error Handler

En `backend/index.ts`:
- Middleware global de errores (4 parámetros Express)
- Loguea el error completo en consola
- Retorna `{ error: 'Internal server error' }` con status 500
- Endpoint 404 genérico para rutas no encontradas

### L.3 Frontend — ApiError class

En `app/lib/apiClient.ts`:

```typescript
class ApiError extends Error {
  demo: boolean    // true = restricción modo demo
  status: number   // HTTP status
  code?: string    // Código del backend (para i18n)
}
```

**Helper:** `isDemoError(error)` — Detecta errores de demo en catch blocks

### L.4 Frontend — Error Boundaries

Ver Sección G.4 para detalle completo del componente `ModuleError` y los 10 módulos con error boundary.

### L.5 Frontend — Traducción de errores

El campo `code` de la respuesta del backend se usa como key de traducción:

```
Backend: { code: "PARKING_SPOT_NOT_AVAILABLE" }
Frontend: messages/es/errors.json → { "PARKING_SPOT_NOT_AVAILABLE": "La plaza no está disponible" }
```

### L.6 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **~200+ códigos** — Cobertura completa de todos los módulos |
| 2 | ⚠️ | **Códigos de éxito y error mezclados** — Podría separarse en SUCCESS_CODES y ERROR_CODES para claridad |
| 3 | ⚠️ | **No todos los controllers usan error codes** — Algunos todavía devuelven mensajes en texto plano sin `code` |

---

## Sección M: File Upload ✅

### M.1 Arquitectura general

**Backend:** Multer 2.0 con memory storage → Cloudinary para persistencia
**Frontend:** `apiClient.postFormData()` para enviar FormData

**Flujo:**
```
Frontend (FormData) → Multer (memory buffer) → Controller → Cloudinary SDK → URL almacenada en BD
```

### M.2 Configuración de Multer

Multer se configura **por ruta** (no globalmente). Usa `memoryStorage()` — los ficheros nunca tocan disco.

| Endpoint | Módulo | Límite | Tipos permitidos |
|----------|--------|--------|-----------------|
| `POST /api/auth/me/avatar` | Profile | 2 MB | JPEG, PNG, WebP, GIF |
| `POST /api/blacklist/:id/images` | Blacklist | configurable | JPEG, PNG, WebP, GIF |
| `POST /api/backoffice/invoices/:id/pdf` | Backoffice | configurable | PDF only |
| `POST /api/backoffice/assets` | Backoffice | configurable | JPEG, PNG, WebP (seals, signatures) |

### M.3 Cloudinary

**Librería:** `cloudinary` v2.8.0
**Servicio:** `services/blacklist/cloudinary-service.ts` (compartido por todos los módulos)

**Funciones:**

| Función | Propósito | Config |
|---------|-----------|--------|
| `uploadImage()` | Upload imagen general | Max 1200×1200px, calidad auto |
| `uploadAvatar()` | Upload avatar de perfil | 400×400px cuadrado, 95% calidad, WebP |
| `uploadPdf()` | Upload PDF (raw file) | Acceso público |
| `deleteImage()` | Eliminar imagen por publicId | — |
| `deleteFile()` | Eliminar raw file por publicId | — |
| `extractPublicId()` | Extraer publicId de URL Cloudinary | — |
| `generateSignedUrl()` | URL firmada con expiración | 1h por defecto |
| `generateSignedUrlFromUrl()` | Wrapper para signed URLs desde URL | — |

**Carpetas en Cloudinary:**

| Carpeta | Módulo |
|---------|--------|
| `avatars/` | Profile (avatares de usuario) |
| `blacklist/` | Blacklist (imágenes de registros) |
| `backoffice/invoices/` | Backoffice (PDFs de facturas) |

**Inicialización lazy:** Solo se configura Cloudinary en el primer uso (no al arrancar el servidor).

**URLs:**
- Imágenes: URLs permanentes (públicas)
- PDFs/raw files: URLs firmadas con expiración de 1h (acceso temporal)

### M.4 Variables de entorno

| Variable | Propósito |
|----------|-----------|
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud Cloudinary |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |

### M.5 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ℹ️ | **Memory storage** — Los ficheros nunca se escriben en disco. Seguro pero limita el tamaño máximo a la memoria disponible |
| 2 | ⚠️ | **Validación de MIME type** — Se valida por extensión/header, no por magic bytes (excepto donde se indica). Podría añadirse `file-type` para validación real |
| 3 | ℹ️ | **cloudinary-service.ts en blacklist/** — El servicio está en el directorio de blacklist pero es compartido por todos los módulos. Podría moverse a `services/shared/` |

---

## Sección N: Security Headers & CORS ⚠️

### N.1 CORS

**Configuración en `backend/index.ts`:**

**Origins permitidos:**

| Origin | Entorno |
|--------|---------|
| `http://localhost:3000` | Desarrollo |
| `https://four-points.stackbp.es` | Producción (custom domain) |
| `https://four-points.vercel.app` | Producción (Vercel) |
| `https://api.four-points.stackbp.es` | API (custom domain) |
| `https://four-points.onrender.com` | Backend directo (Render) |
| `*.vercel.app` (regex) | Previews de Vercel |

**Validación dinámica:**
- Función que verifica si el origin está en la lista o match del regex de Vercel previews
- Requests sin origin (Postman, server-side) son permitidos

**Headers permitidos:**

| Parámetro | Valor |
|-----------|-------|
| `methods` | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| `allowedHeaders` | Content-Type, Authorization, Cookie |
| `exposedHeaders` | Set-Cookie |
| `credentials` | `true` (necesario para cookies HttpOnly cross-origin) |

### N.2 Security Headers

| Header | Configuración | Propósito |
|--------|--------------|-----------|
| `x-powered-by` | Deshabilitado (`app.disable('x-powered-by')`) | Oculta que el servidor usa Express |

**Headers NO configurados actualmente:**
- Content-Security-Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- Referrer-Policy

### N.3 Cookie Security

| Cookie | HttpOnly | Secure | SameSite | Expiry |
|--------|----------|--------|----------|--------|
| `access_token` | ✅ | ✅ (prod) | Lax | 15 min |
| `refresh_token` | ✅ | ✅ (prod) | Lax | 7 días |

### N.4 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin CSP headers** — Content-Security-Policy no está configurado. Podría añadirse para prevenir XSS y data injection |
| 2 | ⚠️ | **Sin X-Frame-Options** — No se previene el clickjacking. Añadir `X-Frame-Options: DENY` |
| 3 | ⚠️ | **Sin X-Content-Type-Options** — Añadir `nosniff` para prevenir MIME type sniffing |
| 4 | ⚠️ | **Sin HSTS** — En producción debería forzar HTTPS |
| 5 | ℹ️ | **Vercel preview regex** — Permite cualquier subdominio `.vercel.app`. Seguro para previews pero amplio |

---

## Sección O: Configuración y Build ✅

### O.1 Frontend — `next.config.ts`

| Configuración | Valor | Propósito |
|--------------|-------|-----------|
| Plugin next-intl | `createNextIntlPlugin()` | Internacionalización |
| `serverExternalPackages` | `['@react-icons/all-files']` | Optimización de imports |
| `images.remotePatterns` | `unsplash.com`, `res.cloudinary.com` | Dominios permitidos para `next/image` |

### O.2 Frontend — `tailwind.config.ts`

| Configuración | Detalle |
|--------------|---------|
| `darkMode` | `'class'` |
| `fontFamily.sans` | `var(--font-primary)` (Poppins) |
| `fontFamily.display` | `var(--font-display)` (Ubuntu) |
| `gridTemplateColumns.13` | Grid de 13 columnas (para scheduling) |
| `colors.blue` | Override completo del azul (50-950) |
| `animation.shimmer` | Keyframe para skeleton loaders |
| `animation.pulse-green` | Keyframe para indicadores de status en vivo |
| Plugins | `@tailwindcss/forms`, custom scrollbar |

### O.3 Frontend — `tsconfig.json`

| Configuración | Valor |
|--------------|-------|
| `target` | ES2017 |
| `module` | esnext |
| `moduleResolution` | bundler |
| Path aliases | `@/*` → `./` , `@/app/*` → `./app/*` |
| `strict` | true |
| Plugins | `next` (TypeScript plugin) |

### O.4 Backend — `tsconfig.json`

| Configuración | Valor |
|--------------|-------|
| `target` | ES2022 |
| `module` | ESNext |
| `moduleResolution` | Bundler |
| `outDir` | `./dist` |
| `strict` | true |
| `noUnusedLocals` | true |
| `noUnusedParameters` | true |
| `esModuleInterop` | true |
| `resolveJsonModule` | true |

### O.5 Backend — `vitest.config.ts`

| Configuración | Valor |
|--------------|-------|
| `environment` | node |
| `include` | `tests/**/*.test.ts` |
| `coverage.provider` | v8 |
| `coverage.include` | `services/scheduling/**/*.ts` |
| `testTimeout` | 10.000 ms |
| `globals` | true |

### O.6 Dependencias destacadas

#### Frontend (`package.json`)

| Categoría | Dependencias |
|-----------|-------------|
| **Framework** | next 16.0.8, react 19.1.0, react-dom 19.1.0 |
| **UI Library** | @nextui-org/react, @headlessui/react 2.2.4, @heroicons/react |
| **State** | zustand 5.0.5, @tanstack/react-query 5.81.5 |
| **Forms** | react-hook-form 7.56.4, @hookform/resolvers |
| **i18n** | next-intl 4.6.1 |
| **Theme** | next-themes 0.4.6 |
| **Charts** | recharts 2.15.3 |
| **Icons** | react-icons 5.5.0 |
| **Dates** | date-fns 4.1.0, dayjs 1.11.13 |
| **Excel** | xlsx 0.18.5 |
| **Auth** | next-auth 5.0.0-beta.25 |
| **Toast** | react-hot-toast 2.5.2 |
| **Analytics** | @vercel/analytics 1.5.0 |
| **Validation** | zod 3.25.42 |
| **TypeScript** | 5.7.3 |

#### Backend (`package.json`)

| Categoría | Dependencias |
|-----------|-------------|
| **Framework** | express 5.1.0 |
| **Database** | mysql2 3.14.2 |
| **Auth** | jsonwebtoken 9.0.2, passport 0.7.0, bcrypt 6.0.0 |
| **Upload** | multer 2.0.0, cloudinary 2.8.0 |
| **Cron** | node-cron 3.0.3 |
| **Email** | nodemailer 6.10.1 |
| **Validation** | zod 3.25.42 |
| **HTTP** | axios 1.8.4, cors 2.8.5, cookie-parser 1.4.7 |
| **Files** | archiver 7.0.1 |
| **AI** | @anthropic-ai/sdk 0.52.0 |
| **Dates** | dayjs 1.11.13 |
| **Runtime** | tsx 4.19.4 |
| **TypeScript** | 5.9.3 |
| **Test** | vitest 3.2.1 |

### O.7 Package Manager y Scripts

**Package manager:** npm (no pnpm ni yarn)

**Frontend scripts:**
```bash
npm run dev       # next dev --turbopack
npm run build     # next build
npm start         # next start
npm run lint      # next lint
```

**Backend scripts:**
```bash
npm run dev       # tsx watch --clear-screen=false backend/index.ts
npm run build     # tsc
npm start         # node dist/index.js
npm run typecheck # tsc --noEmit
npm test          # vitest run
npm run test:watch # vitest
npm run test:coverage # vitest run --coverage
```

---

## Sección P: Deploy ⚠️

### P.1 Plataformas

| Componente | Plataforma | Dominio |
|-----------|-----------|---------|
| Frontend | Vercel | `four-points.vercel.app` / `four-points.stackbp.es` |
| Backend | Render | `four-points.onrender.com` / `api.four-points.stackbp.es` |
| Database | Aiven | MySQL 8.0 cloud |

### P.2 CI/CD

**Estado:** No hay CI/CD automatizado.
- Sin GitHub Actions
- Sin Dockerfile
- Sin `.gitlab-ci.yml`
- Deploy asumido como manual (push a main → Vercel auto-deploy para frontend, manual trigger en Render para backend)

### P.3 Variables de entorno en producción

**Frontend (Vercel):**
- `NEXT_PUBLIC_API_URL` — URL pública del backend
- `API_BASE_URL` — URL del backend para server-side

**Backend (Render):**
- Todas las variables de Sección D.2 + Sección K.1
- `DB_ENVIRONMENT=aiven`

### P.4 Observaciones y mejoras potenciales

| # | Estado | Observación |
|---|---|---|
| 1 | ⚠️ | **Sin CI/CD** — No hay tests automáticos en push ni deploy automatizado del backend |
| 2 | ⚠️ | **Sin Docker** — El proyecto no tiene Dockerfile. Podría facilitar replicación de entornos |
| 3 | ℹ️ | **Vercel auto-deploy** — El frontend se despliega automáticamente al pushear a main. El backend en Render requiere trigger manual o auto-deploy configurado |

---

## Sección Q: Deuda técnica — Dependencias ⚠️

### Q.1 Política de versionado (vigente)

Criterio aplicado al `package.json` de `backend/` y `frontend/`:

**Fijar versión exacta (sin `^`) cuando:**
- Seguridad / auth: `bcrypt`, `jsonwebtoken`, `passport`, `passport-jwt`, `cookie-parser`, `cors`, `express-rate-limit`
- Driver de base de datos: `mysql2`, `postgres`
- Framework de aplicación: `express`, `next`, `react`, `react-dom`
- Beta / RC: `next-auth 5.0.0-beta.25`
- Data layer / state / forms (con APIs que cambian en minors): `@tanstack/react-query`, `@tanstack/react-query-devtools`, `react-hook-form`, `@hookform/resolvers`, `zustand`, `zod`
- UI framework core: `@nextui-org/react`, `framer-motion`, `recharts`
- File I/O / media / infra: `axios`, `cloudinary`, `multer`, `nodemailer`, `node-cron`, `archiver`, `pdf-lib`, `pdfjs-dist`
- i18n: `next-intl`
- Auth cliente: `js-cookie`

**Mantener con `^` (utilidades estables, semver estricto):**
- `dayjs`, `clsx`, `date-fns`, `tailwind-merge`, `use-debounce`
- `@heroicons/react`, `@headlessui/react`, `react-hot-toast`, `react-icons`
- `xlsx`, `uuid`, `next-themes`, `@vercel/analytics`, `@tailwindcss/forms`
- Todos los `@types/*`
- Dev tools: `eslint`, `prettier`, `vitest`, `tsx`, `typescript`, `cross-env`, `standard`

### Q.2 Deuda pendiente

| # | Item | Estado | Notas |
|---|------|--------|-------|
| 1 | **Zod version mismatch** — backend en `4.0.5`, frontend en `^3.25.17` (v3 legacy) | ⚠️ Pendiente | Los schemas no se comparten entre repos hoy → riesgo runtime = 0. Sin embargo, v3 está en legacy y la divergencia crece. Migrar frontend a v4 cuando haya ventana: los 4 archivos afectados (`app/lib/schemas/group-schemas.ts`, `app/lib/maintenance/maintenance-schemas.ts`, `app/lib/logbooks/validations.ts`, `app/lib/blacklist/blacklistSchema.ts`) usan APIs v3 (`required_error`, `invalid_type_error`, `errorMap`) que cambiaron en v4 al parámetro unificado `error`. Estimación: ~2-3 h incluyendo tests Vitest + smoke test manual de formularios. |
| 2 | **Deps sospechosas en frontend** — `mysql2`, `postgres` y `bcrypt` aparecen como dependencias de cliente | ⚠️ Revisar | Un bundle de Next.js no debería incluir drivers de BD ni `bcrypt`. Puede que: (a) se usen solo en Server Components / Server Actions y Next.js las excluya del bundle cliente — verificar con `next build` y análisis de bundle, (b) sean arrastre de un boilerplate Next.js (el ejemplo `next-learn` usa `postgres` + `bcrypt` para el tutorial de auth) y estén sin uso real. Acción: buscar importaciones reales con `grep -r "from ['\"](mysql2\|postgres\|bcrypt)['\"]" frontend/app` y, si no se usan, eliminarlas. |
| 3 | **`next-auth` peer mismatch** — `5.0.0-beta.25` declara peer `next@"^14 \|\| ^15"` pero está instalado con `next@16.0.8` | ℹ️ Informativo | Funciona en la práctica (pnpm no bloquea), pero es frágil. Vigilar releases estables de `next-auth` v5. |

