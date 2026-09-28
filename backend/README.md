# Four Points - Backend

> API del Sistema de Gestión Hotelera (Express + MySQL)

---

## Índice

1. [Arquitectura](#1-arquitectura)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Tech Stack](#3-tech-stack)
4. [API Endpoints](#4-api-endpoints)
5. [Middlewares](#5-middlewares)
6. [Base de Datos](#6-base-de-datos)
7. [Configuración y Deployment](#7-configuración-y-deployment)
8. [Scripts y Comandos](#8-scripts-y-comandos)
9. [Completar en Más Detalle](#9-completar-en-más-detalle)

---

## 1. Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ARQUITECTURA FOUR POINTS                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          FRONTEND (Next.js 16)                           │    │
│  │                                                                          │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │    │
│  │  │  Dashboard  │    │  Componentes │    │    Lib/     │    │   Stores  │ │    │
│  │  │   (pages)   │    │  (React UI)  │    │   Hooks     │    │  (Zustand)│ │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │    │
│  │         │                  │                  │                  │        │    │
│  │         └──────────────────┼──────────────────┼──────────────────┘        │    │
│  │                            │                  │                           │    │
│  │                   ┌────────▼────────┐   ┌────▼────────┐                  │    │
│  │                   │  React Query    │   │  API Client │                  │    │
│  │                   │  (Server State) │   │ (auto-refresh)                 │    │
│  │                   └─────────────────┘   └─────────────┘                  │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        │ HTTPS + Credentials                    │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          BACKEND (Express 5)                             │    │
│  │                                                                          │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │    │
│  │  │   Routes    │ →  │ Controllers │ →  │ Repositories│                   │    │
│  │  │  (Express)  │    │  (Lógica)   │    │   (MySQL)   │                   │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘                   │    │
│  │         │                  │                  │                           │    │
│  │         ▼                  ▼                  ▼                           │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │    │
│  │  │ Middlewares │    │  Services   │    │   Models    │                   │    │
│  │  │ (auth, etc) │    │ (cron, etc) │    │  (Zod/TS)   │                   │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘                   │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        │ TCP/IP                                  │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           BASE DE DATOS                                   │    │
│  │                                                                          │    │
│  │  ┌─────────────────┐                    ┌─────────────────────────────┐   │    │
│  │  │  MySQL Local    │                    │  MySQL Aiven (Cloud)        │   │    │
│  │  │  (development)  │                    │  (production)               │   │    │
│  │  └─────────────────┘                    └─────────────────────────────┘   │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
1. Usuario abre navegador → Next.js (Vercel)
2. Login → JWT tokens en HttpOnly cookies
3. Petición API → Express (Render) con credentials: 'include'
4. Express valida JWT → Ejecuta controller → Repository → MySQL
5. Respuesta → Cliente (React Query cache)
```

---

## 2. Estructura del Proyecto

```
backend/
├── config/
│   ├── config.ts            # Variables de entorno
│   ├── db.ts                # Conexión MySQL
│   ├── date-utils.ts        # Utilidades de fecha
│   ├── error-codes.ts       # Códigos de error
│   └── certs/               # Certificados SSL
├── controllers/             # Lógica de negocio
│   ├── auth/
│   │   ├── auth-controllers.ts
│   │   └── user-controllers.ts
│   ├── activity/
│   ├── backoffice/
│   ├── blacklist/
│   ├── cashier/
│   ├── conciliation/
│   ├── departments/
│   ├── group/
│   ├── logbook/
│   ├── maintenance/
│   ├── messages/
│   ├── notifications/
│   ├── parking/
│   └── search/
├── middlewares/
│   ├── authenticateToken.ts # Verificar JWT (cookie o Bearer header)
│   ├── roleCheck.ts         # Validar permisos
│   ├── rateLimiter.ts       # Rate limiting (100 req/15min)
│   └── demoRestriction.ts   # Bloquear writes en demo
├── models/                  # Zod schemas + Types
├── repositories/            # Consultas SQL
├── routes/                  # Express routers
├── services/                # Servicios externos
│   ├── auth/
│   ├── blacklist/
│   ├── conciliation/
│   ├── cron/
│   ├── group/
│   ├── logbook/
│   ├── notifications/
│   ├── parking/
│   └── scheduling/          # Sistema de horarios
├── validations/             # Zod schemas
├── types/
│   └── express.d.ts
├── index.ts                 # Entry point
├── package.json
└── tsconfig.json
```

---

## 3. Tech Stack

| Tecnología             | Propósito                                |
| ---------------------- | ---------------------------------------- |
| **Node.js 20+**        | Runtime environment                      |
| **Express 5**          | Framework web (última versión major)     |
| **TypeScript**         | Desarrollo con tipos                     |
| **MySQL 8**            | Base de datos relacional                 |
| **mysql2**             | Driver MySQL con promesas                |
| **jsonwebtoken**       | Autenticación JWT (access 15 min + refresh 7 d) |
| **cookie-parser**      | Lectura de HttpOnly cookies             |
| **Zod 4**              | Validación de requests                   |
| **Cloudinary**         | Almacenamiento cloud de imágenes/PDFs    |
| **Multer**             | Upload de archivos (multipart/form-data) |
| **Archiver**           | Generación de ZIPs                       |
| **node-cron**          | Tareas programadas                       |
| **nodemailer**         | Envío de emails                          |
| **bcrypt**             | Hash de passwords (10 rounds)            |
| **express-rate-limit** | Rate limiting                            |
| **dayjs**              | Manipulación de fechas                   |
| **Axios**              | Llamadas a APIs externas                 |

### Dependencias

```json
{
  "archiver": "^7.0.1",
  "axios": "^1.12.2",
  "bcrypt": "6.0.0",
  "cloudinary": "^2.8.0",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.5",
  "dayjs": "^1.11.18",
  "express": "5.1.0",
  "express-rate-limit": "^8.2.1",
  "express-session": "^1.18.0",
  "jsonwebtoken": "^9.0.2",
  "multer": "^2.0.2",
  "mysql2": "3.14.2",
  "node-cron": "^4.2.1",
  "nodemailer": "^7.0.10",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "zod": "^4.0.5"
}
```

---

## 4. API Endpoints

### Autenticación

```
POST   /api/auth/login          # Login con credenciales
POST   /api/auth/logout         # Cerrar sesión
GET    /api/auth/me             # Usuario actual
POST   /api/auth/refresh        # Refresh token
POST   /api/auth/register       # Registro (opcional)
```

### Módulos Principales

| Módulo            | Base Route           | Operaciones                                          |
| ----------------- | -------------------- | ---------------------------------------------------- |
| **Users**         | `/api/users`         | CRUD, avatar upload, roles                           |
| **Groups**        | `/api/groups`        | Reservas, contactos, habitaciones, pagos, historial  |
| **Parking**       | `/api/parking`       | Espacios, reservas, check-in/out, tarifas, analytics |
| **Logbooks**      | `/api/logbooks`      | Entradas, comentarios, seguimiento de lectura        |
| **Cashier**       | `/api/cashier`       | Turnos, denominaciones, pagos, vouchers, reportes    |
| **Maintenance**   | `/api/maintenance`   | Órdenes de trabajo, imágenes, estados                |
| **Blacklist**     | `/api/blacklist`     | Incidentes, verificación docs                        |
| **Conciliation**  | `/api/conciliations` | Conteo diario de habitaciones                        |
| **Backoffice**    | `/api/backoffice`    | Facturas, proveedores, PDFs                          |
| **Messages**      | `/api/messages`      | Conversaciones, mensajes directos                    |
| **Notifications** | `/api/notifications` | Alertas, entrega programada                          |
| **Activity**      | `/api/activity`      | Feed del dashboard, KPIs                             |
| **Departments**   | `/api/departments`   | Gestión de departamentos                             |
| **Search**        | `/api/search`        | Búsqueda global                                      |
| **Scheduling**    | `/api/scheduling`    | Gestión de horarios de personal                      |

### Sistema de Scheduling (Módulo Especial) {#scheduling}

El módulo de scheduling incluye:

- **CP-SAT Solver**: Optimizador de horarios con Google OR-Tools
- **Daemon Python**: Proceso persistente para solve requests
- **Validación**: Restricciones de negocio (descansos, días libres, bloques de noche)

```
POST /api/scheduling/months/:id/generate  # Generar cronograma
POST /api/scheduling/months/:id/reset      # Resetear asignaciones
POST /api/scheduling/constraints/:id/approve # Aprobar restricciones
```

> Para scripts de debug del scheduling, ver `docs/backend/scheduling/solver-setup.md`.

### Formato de Respuestas

```typescript
// Éxito
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "...", "code": "ERROR_CODE" }
```

---

## 5. Middlewares

| Middleware             | Propósito                             |
| ---------------------- | ------------------------------------- |
| `authenticateToken`    | Verificar JWT (access token)          |
| `roleCheck`            | Validar permisos por rol              |
| `rateLimiter`         | Prevenir abuso (100 req/15min por IP) |
| `demoRestriction`     | Bloquear writes para usuarios demo    |

### Servicios Cron

```typescript
// CronService ejecuta:
- Notificaciones: Todos los días a las 7:00 AM
- Batch Payment: Día 10 de cada mes a las 23:59
  (facturas 'validated' → 'paid' del mes anterior)
```

---

## 6. Base de Datos

### Esquema de Base de Datos

El sistema usa **40+ tablas** organizadas por módulo:

| Categoría         | Tablas                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Auth**          | `users`, `roles`                                                                                   |
| **Groups**        | `group_reservations`, `group_contacts`, `group_rooms`, `group_payments`, `group_history`           |
| **Parking**       | `parking_spaces`, `parking_bookings`, `parking_rates`, `parking_levels`, `parking_invoices`        |
| **Logbooks**      | `logbook_entries`, `logbook_comments`, `logbook_reads`, `logbook_history`                          |
| **Cashier**       | `cashier_shifts`, `cashier_denominations`, `cashier_payments`, `cashier_vouchers`, `cashier_daily` |
| **Maintenance**   | `maintenance_orders`, `maintenance_images`, `maintenance_history`                                  |
| **Blacklist**     | `blacklist_entries`, `blacklist_images`                                                            |
| **Conciliation**  | `conciliations`, `conciliation_monthly`                                                            |
| **Backoffice**    | `invoices`, `suppliers`, `invoice_images`                                                          |
| **Messages**      | `conversations`, `messages`, `conversation_participants`                                           |
| **Notifications** | `notifications`, `notification_reads`, `notification_schedule`                                     |
| **Scheduling**    | `scheduling_months`, `scheduling_assignments`, `scheduling_constraints`, `scheduling_config`       |
| **Activity**      | `activity_log`, `activity_types`                                                                   |
| **System**        | `departments`, `settings`                                                                          |

### Relaciones Clave

```
users (1) ─────────────< (n) logbook_entries
users (1) ─────────────< (n) maintenance_orders
users (1) ─────────────< (n) cashier_shifts
users (1) ─────────────< (n) group_history
users (1) ─────────────< (n) scheduling_assignments

group_reservations (1) ─< (n) group_contacts
group_reservations (1) ─< (n) group_rooms
group_reservations (1) ─< (n) group_payments
group_reservations (1) ─< (n) group_history

parking_spaces (1) ────< (n) parking_bookings
parking_levels (1) ────< (n) parking_spaces

departments (1) ───────< (n) logbook_entries
departments (1) ───────< (n) users
```

### Configuración de Base de Datos

| Entorno   | Base de Datos | Host                   |
| --------- | ------------- | ---------------------- |
| **Local** | `hotel_db`    | localhost:3306         |
| **Aiven** | `hotel_db`    | Host cloud Aiven (SSL) |

### Scripts SQL

```
db-mysql/
├── MASTER_INSTALL.sql           # Instalación completa
├── MASTER_INSTALL_LOCAL.sql     # Para MySQL local
├── MASTER_INSTALL_AIVEN.sql     # Para Aiven cloud
├── local/
│   ├── 01_create_database.sql
│   ├── 02_core_tables.sql
│   ├── 03_logbook_tables.sql
│   ├── 04_parking_tables.sql
│   ├── 05_parking_functions_triggers.sql
│   ├── 06_parking_procedures.sql
│   ├── 07_parking_initial_data.sql
│   ├── 08_parking_sample_data.sql
│   ├── 09_conciliation.sql
│   ├── 10_group-tracking.sql
│   ├── 11_cashier.sql
│   ├── 12_blacklist.sql
│   ├── 13_maintenance.sql
│   ├── 14_messages.sql
│   ├── 15_demo_user.sql
│   ├── 16_backoffice.sql
│   ├── 17_notifications.sql
│   ├── 18_user_avatar.sql
│   ├── 19_scheduling.sql
│   └── 99_verification.sql
└── backup/
    ├── backup_hotel_db-local.sql
    └── backup_hotel_db-aiven.sql
```

---

## 7. Configuración y Deployment

### Variables de Entorno

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=hotel_db
PORT=4000
SECRET_JWT_KEY=your-secret-key
SESSION_SECRET=your-session-secret
SALT_ROUNDS=10
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NODE_ENV=development
DB_ENVIRONMENT=local  # o 'aiven' para cloud
```

### CORS Configuration

El backend permite los siguientes orígenes:

```
- http://localhost:3000 (desarrollo)
- https://four-points.stackbp.es (producción)
- https://four-points.vercel.app (Vercel)
- https://*.vercel.app (todos los previews)
- https://four-points.onrender.com (fallback)
```

### Seguridad

| Medida                 | Implementación                     |
| ---------------------- | ---------------------------------- |
| **XSS Protection**     | HttpOnly cookies, sin localStorage |
| **CSRF Protection**    | SameSite cookies, whitelist CORS   |
| **SQL Injection**      | Parameterized queries (mysql2)     |
| **Rate Limiting**      | 100 requests / 15 min por IP       |
| **Password Hashing**   | bcrypt (10 rounds)                 |
| **Input Validation**   | Zod schemas en todos los endpoints |
| **Error Sanitization** | Errores genéricos en producción    |

### Deployment

| Servicio     | Proveedor                | Propósito              |
| ------------ | ------------------------ | ---------------------- |
| **Backend**  | Render                   | Auto-deploy desde main |
| **Backend**  | four-points.onrender.com | Fallback               |
| **Database** | Aiven                    | MySQL 8 gestionado     |
| **Media**    | Cloudinary               | Imágenes y PDFs        |

---

## 8. Scripts y Comandos

```bash
pnpm dev              # Desarrollo con tsx watch (puerto 4000)
pnpm dev:local        # Usar MySQL local
pnpm dev:aiven        # Usar MySQL Aiven
pnpm start            # Start producción
pnpm typecheck        # TypeScript check
pnpm test             # Tests con Vitest
pnpm test:watch       # Tests en modo watch
pnpm test:coverage    # Tests con coverage
```

---

## 9. Documentación Relacionada

Para documentación detallada consultar:

- **Sistema de scheduling**: `docs/backend/scheduling/README.md` — arquitectura, endpoints, CP-SAT solver
- **Solver Python**: `docs/backend/scheduling/solver-setup.md` — daemon, OR-Tools, tests
- **Autenticación en producción**: `docs/backend/auth/productionAuthSetup.md`
- **CORS**: `docs/backend/config/cors-configuration.md`
- **Seguridad**: `docs/backend/security/security-implementation.md`
- **Checklist**: `docs/backend/checklist.md`
- **DB**: `backend/db-mysql/INDEX.md`, `MIGRATIONS_POLICY.md`
- **Testing**: `docs/backend/testing/README.md`
- **Restricciones de scheduling**: `docs/scheduling/constraints.md`
- **Variables de entorno**: `docs/backend/enviroments/environment-variables.md`