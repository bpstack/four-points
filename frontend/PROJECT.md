# Four Points - Hotel Property Management System

> Sistema de gestión hotelera completo (PMS) con arquitectura full-stack

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat&logo=next.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=flat&logo=mysql&logoColor=white)

---

## Índice

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Frontend (Next.js)](#3-frontend-nextjs)
4. [Backend (Express)](#4-backend-express)
5. [Base de Datos MySQL](#5-base-de-datos-mysql)
6. [Módulos del Sistema](#6-módulos-del-sistema)
7. [Tech Stack Completo](#7-tech-stack-completo)
8. [Configuración y Deployment](#8-configuración-y-deployment)
9. [Scripts y Comandos](#9-scripts-y-comandos)
10. [Documentación Relacionada](#10-documentación-relacionada)

---

## 1. Visión General

Four Points es un **Sistema de Gestión Hotelera (PMS)** diseñado para operaciones hoteleras reales. Incluye gestión integral de:

- **Reservas y Grupos** - Administración de reservas grupales con contactos, habitaciones y pagos
- **Parking** - Gestión multinivel con reservas, check-in/out y analíticas
- **Logbooks** - Notas digitales de turno con seguimiento de lectura
- **Caja** - Gestión diaria con 4 turnos, conteo de billetes y reportes
- **Mantenimiento** - Órdenes de trabajo con flujo de estados
- **Blacklist** - Registro de incidentes de huéspedes
- **Conciliación** - Reconciliación diaria de habitaciones
- **Backoffice** - Facturas y proveedores
- **Mensajería** - Comunicación interna
- **Notificaciones** - Sistema de alertas multi-módulo

### Características Principales

| Característica      | Descripción                                            |
| ------------------- | ------------------------------------------------------ |
| **Full-Stack**      | Frontend Next.js + Backend Express separados           |
| **TypeScript**      | Desarrollo con tipos en ambos extremos                 |
| **Base de Datos**   | MySQL 8 (local + Aiven cloud)                          |
| **Autenticación**   | JWT con HttpOnly cookies (XSS protegido)               |
| **Multidioma**      | Inglés y Español (19 namespaces)                       |
| **Dark/Light Mode** | Tema completo con detección del sistema                |
| **Roles**           | 4 roles: admin, receptionist, maintenance, group-admin |
| **Exportación**     | Excel (xlsx) y PDF (pdf-lib)                           |
| **Demo Mode**       | Operaciones restringidas para despliegues públicos     |

### URLs del Sistema

| Entorno             | URL                                |
| ------------------- | ---------------------------------- |
| Frontend Production | https://four-points.stackbp.es     |
| Frontend Vercel     | https://four-points.vercel.app     |
| Backend API         | https://api.four-points.stackbp.es |
| Backend Render      | https://four-points.onrender.com   |

---

## 2. Arquitectura del Sistema

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
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         SERVICIOS EXTERNOS                               │    │
│  │                                                                          │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │    │
│  │  │ Cloudinary  │    │   Vercel    │    │   Render    │                   │    │
│  │  │ (imágenes)  │    │ (frontend)  │    │  (backend)  │                   │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘                   │    │
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

## 3. Frontend (Next.js)

### Estructura del Proyecto

```
frontend/
├── app/
│   ├── (auth)/              # Páginas de autenticación
│   ├── api/                 # API Routes (Next.js)
│   ├── components/          # Componentes React
│   │   ├── auth/            # Login, registro
│   │   ├── blacklist/       # Incidentes de huéspedes
│   │   ├── cashier/         # Gestión de caja
│   │   ├── conciliation/    # Reconciliación
│   │   ├── dashboard/       # KPI, acciones rápidas
│   │   ├── groups/          # Reservas grupales
│   │   ├── layout/          # Sidebar, header
│   │   ├── logbooks/        # Notas de turno
│   │   ├── maintenance/     # Órdenes de trabajo
│   │   ├── notifications/   # Sistema de alertas
│   │   ├── parking/         # Gestión de parking
│   │   ├── search/          # Búsqueda global
│   │   └── theme/           # Toggle de tema
│   ├── dashboard/           # Páginas del dashboard
│   │   ├── parking/         # Parking, reservas, estado
│   │   ├── logbooks/        # Bitácoras
│   │   ├── groups/          # Grupos
│   │   ├── cashier/         # Caja
│   │   ├── maintenance/     # Mantenimiento
│   │   ├── blacklist/       # blacklist
│   │   ├── conciliation/    # Conciliación
│   │   ├── bo/              # Backoffice
│   │   ├── profile/         # Perfil usuario
│   │   └── ...
│   ├── i18n/                # Configuración i18n
│   ├── lib/                 # Utilidades y hooks
│   │   ├── auth/            # Autenticación
│   │   ├── apiClient.ts     # Cliente API con auto-refresh
│   │   ├── parking/         # API y hooks de parking
│   │   ├── logbooks/        # API y hooks de bitácoras
│   │   ├── groups/          # API y hooks de grupos
│   │   ├── cashier/         # API y hooks de caja
│   │   ├── maintenance/     # API y hooks de mantenimiento
│   │   ├── blacklist/       # API y hooks de blacklist
│   │   ├── conciliation/    # API y hooks de conciliación
│   │   ├── backoffice/      # API y hooks de backoffice
│   │   ├── messaging/       # API y hooks de mensajería
│   │   ├── notifications/   # API y hooks de notificaciones
│   │   └── ...
│   ├── stores/              # Zustand stores
│   │   ├── useCashierStore.ts
│   │   ├── useGroupStore.ts
│   │   ├── useMaintenanceStore.ts
│   │   └── useNotificationStore.ts
│   └── ui/                  # Componentes UI base
│       ├── calendar/        # DatePicker, TimePicker
│       ├── panels/          # Modal, SlidePanel
│       ├── skeletons/       # Loading states
│       └── fonts-design/    # Sistema de fuentes
├── messages/
│   ├── en/                  # Traducciones inglés (19 archivos)
│   └── es/                  # Traducciones español (19 archivos)
├── public/
│   ├── screenshots/         # Capturas de pantalla
│   └── icons/               # Favicon, iconos
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### Stack del Frontend

| Tecnología                | Propósito                                |
| ------------------------- | ---------------------------------------- |
| **Next.js 16**            | Framework React (App Router + Turbopack) |
| **React 19**              | Biblioteca UI (última versión)           |
| **TypeScript 5.7**        | Desarrollo con tipos                     |
| **TailwindCSS 3.4**       | Estilos utility-first                    |
| **NextUI 2.6**            | Componentes Tailwind-based               |
| **HeadlessUI**            | Componentes accesibles sin estilos       |
| **Heroicons**             | Biblioteca de iconos SVG                 |
| **Zustand 5**             | State management ligero                  |
| **TanStack Query 5**      | Server state, caching, mutations         |
| **next-intl 4**           | Internacionalización (EN/ES)             |
| **next-themes**           | Dark/Light mode                          |
| **Framer Motion**         | Animaciones suaves                       |
| **React Hook Form + Zod** | Formularios con validación               |
| **Recharts**              | Visualización de datos y gráficos        |
| **xlsx (SheetJS)**        | Generación y exportación Excel           |
| **pdf-lib**               | Generación de documentos PDF             |
| **pdfjs-dist**            | Visor de PDFs en aplicación              |
| **react-hot-toast**       | Notificaciones toast                     |
| **react-day-picker**      | Componentes de selección de fecha        |
| **date-fns**              | Utilidades de manipulación de fechas     |
| **js-cookie**             | Gestión de cookies                       |
| **clsx + tailwind-merge** | Utilidades condicionales de clases       |

### Cliente API (apiClient.ts)

El frontend usa un cliente centralizado con auto-refresh de JWT:

```typescript
// Características principales:
- Auto-refresh de tokens cuando recibe 401
- Cola para manejar refresh concurrentes
- Circuit breaker (max 3 intentos)
- Manejo de errores con códigos i18n
- Support para FormData (upload de archivos)
- Support para Blob (descarga de archivos)
- Cookies HttpOnly (XSS protegido, sin localStorage)
```

### State Management

| Tipo             | Herramienta    | Uso                                     |
| ---------------- | -------------- | --------------------------------------- |
| **Server State** | TanStack Query | Data fetching, caching, mutations       |
| **Client State** | Zustand        | UI state (items seleccionados, filtros) |

### Componentes Principales

| Componente               | Módulo        | Propósito                  |
| ------------------------ | ------------- | -------------------------- |
| `ParkingDashboardClient` | Parking       | Dashboard de parking       |
| `ConciliationClient`     | Conciliación  | Formulario de conciliación |
| `CloseShiftModal`        | Cashier       | Cierre de turno            |
| `CreateBookingPanel`     | Parking       | Crear reserva              |
| `GroupDetailClient`      | Groups        | Detalle de grupo           |
| `ReportDetailClient`     | Maintenance   | Detalle de orden           |
| `GlobalSearch`           | Global        | Búsqueda global            |
| `NotificationsList`      | Notifications | Lista de notificaciones    |
| `SlidePanel`             | UI            | Panel deslizante           |
| `DatePickerInput`        | Calendar      | Selector de fecha          |

---

## 4. Backend (Express)

### Estructura del Proyecto

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
│   │   └── activity-controller.ts
│   ├── backoffice/
│   │   └── backoffice-controller.ts
│   ├── blacklist/
│   │   └── blacklist-controller.ts
│   ├── cashier/
│   │   ├── cashier-shift-controller.ts
│   │   ├── cashier-denomination-controller.ts
│   │   ├── cashier-payment-controller.ts
│   │   ├── cashier-daily-controller.ts
│   │   ├── cashier-report-controller.ts
│   │   └── ...
│   ├── conciliation/
│   │   ├── conciliation.controller.ts
│   │   └── conciliation-monthly.controller.ts
│   ├── departments/
│   │   └── departments-controller.ts
│   ├── group/
│   │   ├── group-controller.ts
│   │   ├── group-contact-controller.ts
│   │   ├── group-payment-controller.ts
│   │   ├── group-room-controller.ts
│   │   └── group-history-controller.ts
│   ├── logbook/
│   │   ├── logbook-controllers.ts
│   │   ├── logbookComments-controllers.ts
│   │   └── logbookReads-controllers.ts
│   ├── maintenance/
│   │   └── maintenance-controller.ts
│   ├── messages/
│   │   ├── conversation-controller.ts
│   │   └── message-controller.ts
│   ├── notifications/
│   │   └── notification-controller.ts
│   ├── parking/
│   │   ├── parking.controller.ts
│   │   ├── bookings.controller.ts
│   │   ├── stats.controller.ts
│   │   └── analytics.controller.ts
│   └── search/
│       └── search-controller.ts
├── middlewares/
│   ├── authenticateToken.ts # Verificar JWT
│   ├── roleCheck.ts         # Validar permisos
│   ├── rateLimiter.ts       # Rate limiting (100 req/15min)
│   └── demoRestriction.ts   # Bloquear writes en demo
├── models/                  # Zod schemas + Types
├── repositories/            # Consultas SQL
│   ├── auth/
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
├── routes/                  # Express routers
│   ├── auth/
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
├── services/                # Servicios externos
│   ├── auth/
│   │   └── tokenService.ts
│   ├── blacklist/
│   │   └── cloudinary-service.ts
│   ├── conciliation/
│   │   └── logic.ts
│   ├── cron/
│   │   └── cron-service.ts
│   ├── group/
│   │   ├── email-service.ts
│   │   ├── group-history-service.ts
│   │   └── payment-calculator-service.ts
│   ├── logbook/
│   │   └── logbookHistory-service.ts
│   ├── notifications/
│   │   └── notification-generator-service.ts
│   └── parking/
│       └── invoicePdfService.ts
├── validations/             # Zod schemas
├── types/
│   └── express.d.ts
├── index.ts                 # Entry point
├── package.json
└── tsconfig.json
```

### Stack del Backend

| Tecnología             | Propósito                                |
| ---------------------- | ---------------------------------------- |
| **Node.js 20+**        | Runtime environment                      |
| **Express 5**          | Framework web (última versión major)     |
| **TypeScript**         | Desarrollo con tipos                     |
| **MySQL 8**            | Base de datos relacional                 |
| **mysql2**             | Driver MySQL con promesas                |
| **Passport.js + JWT**  | Autenticación                            |
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

### API Endpoints

#### Autenticación

```
POST   /api/auth/login          # Login con credenciales
POST   /api/auth/logout         # Cerrar sesión
GET    /api/auth/me             # Usuario actual
POST   /api/auth/refresh        # Refresh token
POST   /api/auth/register       # Registro (opcional)
```

#### Módulos Principales

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

### Middlewares

| Middleware          | Propósito                             |
| ------------------- | ------------------------------------- |
| `authenticateToken` | Verificar JWT, attach user a request  |
| `roleCheck`         | Validar permisos por rol              |
| `rateLimiter`       | Prevenir abuso (100 req/15min por IP) |
| `demoRestriction`   | Bloquear writes para usuarios demo    |

### Servicios Cron

```typescript
// CronService ejecuta:
- Notificaciones: Todos los días a las 7:00 AM
- Batch Payment: Día 10 de cada mes a las 23:59
  (facturas 'validated' → 'paid' del mes anterior)
```

### Manejo de Errores

```typescript
// Respuestas:
{ "success": true, "data": { ... } }  // Éxito
{ "success": false, "error": "...", "code": "ERROR_CODE" }  // Error
```

---

## 5. Base de Datos MySQL

### Esquema de Base de Datos

El sistema usa **40+ tablas** organizadas por módulo:

| Categoría         | Tablas                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Auth**          | `users`, `refresh_tokens`                                                                          |
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
| **Activity**      | `activity_log`, `activity_types`                                                                   |
| **System**        | `departments`, `settings`                                                                          |

### Relaciones Clave

```
users (1) ─────────────< (n) logbook_entries
users (1) ─────────────< (n) maintenance_orders
users (1) ─────────────< (n) cashier_shifts
users (1) ─────────────< (n) group_history

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
│   └── 99_verification.sql
└── backup/
    ├── backup_hotel_db-local.sql
    └── backup_hotel_db-aiven.sql
```

---

## 6. Módulos del Sistema

### Dashboard

- KPIs del sistema
- Acciones rápidas
- Feed de actividad
- Alertas importantes

### Groups (Reservas Grupales)

- Crear/editar reservas grupales
- Gestión de contactos
- Asignación de habitaciones
- Seguimiento de pagos
- Historial completo de cambios
- Flujo de estados (pending → confirmed → checked-in → checked-out → cancelled)

### Parking

- Gestión multinivel de plazas
- Reservas con códigos únicos
- Check-in/check-out
- Tarifas por nivel
- Facturación automática
- Analíticas y reportes
- Panel de estado en tiempo real

### Logbooks (Bitácoras)

- Notas digitales de turno
- Niveles de prioridad
- Comentarios en entradas
- Seguimiento de lectura (quién leyó, cuándo)
- Organización por departamentos
- Auditoría completa

### Cashier (Caja)

- Gestión de 4 turnos diarios
- Conteo de billetes y monedas
- Pagos electrónicos
- Vouchers personalizados
- Reportes diarios
- Resumen por usuario
- Cierre de turno con firma

### Maintenance (Mantenimiento)

- Órdenes de trabajo con IDs personalizados
- Subida de imágenes
- Flujo de estados (pending → in-progress → completed)
- Asignación a personal/contratistas
- Historial de cambios
- Fechas límite

### Blacklist

- Registro de incidentes de huéspedes
- Niveles de severidad
- Verificación de documentos
- Galería de imágenes
- Búsqueda por nombre/DNI

### Conciliation (Conciliación)

- Conteo diario de habitaciones
- Reconciliación entre Recepción y housekeeping
- Notas por habitación
- Resúmenes mensuales
- Reportes Excel

### Backoffice

- Gestión de facturas
- Gestión de proveedores
- Subida de PDFs
- Flujo de validación (pending → validated → paid)
- Resúmenes mensuales
- Batch payment automático (día 10)

### Messaging (Mensajería)

- Conversaciones grupales
- Mensajes directos
- Búsqueda de usuarios
- Notificaciones de nuevos mensajes

### Notifications (Notificaciones)

- Sistema de alertas multi-módulo
- Niveles de prioridad
- Entrega programada
- Integración email
- Marcar como leído

### Activity (Actividad)

- Feed del dashboard
- KPIs en tiempo real
- Registro de acciones del sistema

### Search (Búsqueda Global)

- Búsqueda unificada en todos los módulos
- Filtros por tipo
- Resultados en tiempo real

### Auth (Autenticación)

- Login/logout
- JWT con HttpOnly cookies
- Refresh token automático
- Roles y permisos
- Avatar de usuario

---

## 7. Tech Stack Completo

### Frontend Dependencies

```json
{
  "@headlessui/react": "^2.2.9",
  "@heroicons/react": "^2.2.0",
  "@hookform/resolvers": "^5.2.2",
  "@nextui-org/react": "^2.6.11",
  "@tanstack/react-query": "^5.90.11",
  "@vercel/analytics": "^1.6.1",
  "clsx": "^2.1.1",
  "date-fns": "^4.1.0",
  "framer-motion": "^12.23.22",
  "js-cookie": "^3.0.5",
  "next": "16.0.8",
  "next-intl": "^4.6.1",
  "next-themes": "^0.4.6",
  "pdf-lib": "^1.17.1",
  "pdfjs-dist": "^5.4.449",
  "react": "latest",
  "react-day-picker": "^9.11.1",
  "react-dom": "latest",
  "react-hook-form": "^7.66.0",
  "react-hot-toast": "^2.6.0",
  "react-icons": "^5.5.0",
  "recharts": "^3.5.1",
  "tailwind-merge": "^3.3.1",
  "use-debounce": "^10.0.4",
  "uuid": "^13.0.0",
  "xlsx": "^0.18.5",
  "zod": "^3.25.17",
  "zustand": "^5.0.8"
}
```

### Backend Dependencies

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

## 8. Configuración y Deployment

### Variables de Entorno

#### Frontend (.env.example)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Four Points
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
```

#### Backend (.env.example)

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
```

### Deployment

| Servicio     | Proveedor                | Propósito              |
| ------------ | ------------------------ | ---------------------- |
| **Frontend** | Vercel                   | Auto-deploy desde main |
| **Frontend** | four-points.stackbp.es   | Dominio personalizado  |
| **Backend**  | Render                   | Auto-deploy desde main |
| **Backend**  | four-points.onrender.com | Fallback               |
| **Database** | Aiven                    | MySQL 8 gestionado     |
| **Media**    | Cloudinary               | Imágenes y PDFs        |

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

---

## 9. Scripts y Comandos

### Frontend

```bash
pnpm dev              # Desarrollo con Turbopack (puerto 3000)
pnpm build            # Build de producción
pnpm start            # Start producción
pnpm lint             # ESLint
pnpm format           # Prettier
```

### Backend

```bash
pnpm dev              # Desarrollo con tsx watch (puerto 4000)
pnpm dev:local        # Usar MySQL local
pnpm dev:aiven        # Usar MySQL Aiven
pnpm start            # Start producción
pnpm typecheck        # TypeScript check
pnpm test             # Tests
```

### Base de Datos

```bash
# MySQL commands
mysql -u root -p hotel_db

# Backup local
mysqldump -u root -p hotel_db > backup.sql

# Backup Aiven
mysql -u usuario -h host -p hotel_db -P 3306 --ssl-ca=certs/ca-certificate.pem < backup.sql
```

---

## 10. Documentación Relacionada

### Frontend

| Documento             | Descripción                         |
| --------------------- | ----------------------------------- |
| `frontend/README.md`  | Documentación completa del frontend |
| `frontend/PROJECT.md` | Este archivo (resumen del proyecto) |

### Backend

| Documento           | Descripción                         |
| ------------------- | ----------------------------------- |
| `backend/README.md` | Guía de migración JWT → Sessions    |
| `backend.md`        | Documentación detallada del backend |

### Documentación General

| Documento                                           | Descripción                      |
| --------------------------------------------------- | -------------------------------- |
| `docs/backend/enviroments/environment-variables.md` | Análisis de variables de entorno |
| `docs/general/powershell/useCommands.md`            | Comandos PowerShell útiles       |
| `docs/backend/database/database-configuration.md`   | Configuración de base de datos   |
| `docs/backend/database/aiven-setup.md`              | Configuración Aiven              |
| `docs/backend/security/security-implementation.md`  | Implementación de seguridad      |

### Base de Datos

| Documento                             | Descripción            |
| ------------------------------------- | ---------------------- |
| `backend/db-mysql/README.md`          | Guía de bases de datos |
| `backend/db-mysql/MIGRATION_GUIDE.md` | Guía de migración      |
| `backend/db-mysql/INDEX.md`           | Índice de scripts SQL  |

---

## Autor

**Salvador Pérez (@bpstack)**

- GitHub: [@bpstack](https://github.com/bpstack)
- Email: contact.bpstack@gmail.com

---

<p align="center">
  Construido con Next.js, TypeScript, Express y MySQL
</p>
