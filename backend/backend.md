# Four Points - Backend Architecture

> Private REST API for the Hotel Property Management System

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=flat&logo=mysql&logoColor=white)

This document describes the backend architecture. The backend repository is **private**.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Architecture](#2-architecture)
3. [Entry Point (index.ts)](#3-entry-point-indexts)
4. [Configuration](#4-configuration)
5. [API Structure](#5-api-structure)
6. [Controllers](#6-controllers)
7. [Repositories](#7-repositories)
8. [Services](#8-services)
9. [Authentication & Security](#9-authentication--security)
10. [Database Schema](#10-database-schema)
11. [Cron Jobs](#11-cron-jobs)
12. [File Handling](#12-file-handling)
13. [Error Handling](#13-error-handling)
14. [Middlewares](#14-middlewares)
15. [Demo Mode](#15-demo-mode)
16. [Deployment](#16-deployment)
17. [Scripts & Commands](#17-scripts--commands)

---

## 1. Tech Stack

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **Node.js** | 20+ | Runtime environment |
| **Express** | 5.1.0 | Web framework (latest major) |
| **TypeScript** | 5.9.3 | Type-safe development |
| **MySQL** | 8 | Relational database |
| **mysql2** | 3.14.2 | MySQL driver with promises |
| **Passport.js** | 0.7.0 | Authentication middleware |
| **passport-jwt** | 4.0.1 | JWT strategy for Passport |
| **jsonwebtoken** | 9.0.2 | JWT token handling |
| **bcrypt** | 6.0.0 | Password hashing (10 rounds) |
| **Zod** | 4.0.5 | Request validation & schemas |
| **Cloudinary** | 2.8.0 | Image & PDF cloud storage |
| **Multer** | 2.0.2 | File upload (multipart/form-data) |
| **Archiver** | 7.0.1 | ZIP file generation |
| **node-cron** | 4.2.1 | Scheduled tasks |
| **nodemailer** | 7.0.10 | Email notifications |
| **express-rate-limit** | 8.2.1 | Rate limiting (100 req/15min) |
| **cors** | 2.8.5 | Cross-origin resource sharing |
| **cookie-parser** | 1.4.7 | Cookie parsing |
| **dayjs** | 1.11.18 | Date manipulation |
| **Axios** | 1.12.2 | External API calls |
| **dotenv** | 17.2.0 | Environment variables |
| **tsx** | 4.20.6 | TypeScript execution (dev) |

### Package Manager

```json
{
  "packageManager": "pnpm@10.13.1"
}
```

### Dev Dependencies

| Tool | Purpose |
| ---- | ------- |
| cross-env | Environment variables cross-platform |
| standard | ESLint config |
| @types/* | TypeScript definitions |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    index.ts                          │   │
│  │  • CORS configuration (7 origins allowed)           │   │
│  │  • Security middleware (x-powered-by disabled)      │   │
│  │  • Global error handler                             │   │
│  │  • 404 handler                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Middlewares                        │   │
│  │  • express.json() - Body parsing                    │   │
│  │  • cookie-parser() - Cookie parsing                 │   │
│  │  • cors() - Cross-origin settings                   │   │
│  │  • rateLimiter - 100 req/15min per IP              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Routes    │ →  │ Controllers │ →  │Repositories │      │
│  │  (Express)  │    │  (Lógica)   │    │   (MySQL)   │      │
│  │  validation │    │  negocio    │    │   queries   │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │ Zod Schemas │    │  Services   │    │   Models    │      │
│  │ (validatio) │    │ (cron,ext)  │    │  (Zod/TS)   │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                            │                                │
│                            ▼                                │
│                     ┌─────────────┐                         │
│                     │   MySQL 8   │                         │
│                     │ (40+ tables)│                         │
│                     └─────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Entry Point (index.ts)

**File:** `backend/index.ts` (192 líneas)

```typescript
// Main imports
import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { PORT } from './config/config.js'

// Services
import { CronService } from './services/cron/cron-service.js'

// Route imports (18 route files)
import authRoutes from './routes/auth/auth-routes.js'
import userRoutes from './routes/auth/user-routes.js'
import logbookRoutes from './routes/logbook/logbook-routes.js'
import parkingRoutes from './routes/parking/parking.routes.js'
import parkingStatsRoutes from './routes/parking/stats.routes.js'
import parkingBookingsRoutes from './routes/parking/bookings.routes.js'
import departmentsRoutes from './routes/departments/departments-routes.js'
import conciliationRoutes from './routes/conciliation/conciliation.routes.js'
import groupRoutes from './routes/group/group-routes.js'
import notificationRoutes from './routes/notifications/notifications-routes.js'
import cashierRoutes from './routes/cashier/cashier-routes.js'
import blacklistRoutes from './routes/blacklist/blacklist-routes.js'
import maintenanceRoutes from './routes/maintenance/maintenance-routes.js'
import activityRoutes from './routes/activity/activity-routes.js'
import messagesRoutes from './routes/messages/messages-routes.js'
import backofficeRoutes from './routes/backoffice/backoffice-routes.js'
import searchRoutes from './routes/search/search-routes.js'
import demoActivityRoutes from './routes/demo/demo-activity-routes.js'

// App initialization
const app = express()

// Security: Disable x-powered-by header
app.disable('x-powered-by')

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://four-points.stackbp.es',
  'https://four-points.vercel.app',
  'https://api.four-points.stackbp.es',
  'https://four-points.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

const vercelPreviewPattern = /\.vercel\.app$/

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }
    if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
}))

// Global middlewares
app.use(express.json())
app.use(cookieParser())

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
  })
})

// Route registration (18 modules)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/logbooks', logbookRoutes)
app.use('/api/parking', parkingRoutes)
app.use('/api/parking/stats', parkingStatsRoutes)
app.use('/api/parking/bookings', parkingBookingsRoutes)
app.use('/api/departments', departmentsRoutes)
app.use('/api/conciliations', conciliationRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/cashier', cashierRoutes)
app.use('/api/blacklist', blacklistRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/backoffice', backofficeRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/demo-activity', demoActivityRoutes)

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
  })
})

// Global Error Handler
interface HttpError extends Error {
  status?: number
}

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error global:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
  CronService.start()
})
```

---

## 4. Configuration

**File:** `backend/config/config.ts` (44 líneas)

```typescript
import dotenv from 'dotenv'
dotenv.config()

interface EnvConfig {
  PORT: number
  SECRET_JWT_KEY: string
  SALT_ROUNDS: number
}

// Critical: JWT secret must be defined
if (!process.env.SECRET_JWT_KEY) {
  throw new Error('Falta la variable SECRET_JWT_KEY en el entorno')
}

export const PORT: number = parseInt(process.env.PORT || '3000', 10)
export const SECRET_JWT_KEY: string = process.env.SECRET_JWT_KEY
export const SALT_ROUNDS: number = parseInt(process.env.SALT_ROUNDS || '10', 10)

export default config
```

### Environment Variables (.env.example)

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=hotel_db
DB_ENVIRONMENT=local

# Authentication
SECRET_JWT_KEY=your-super-secret-key
SALT_ROUNDS=10

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

### Database Connection

**File:** `backend/config/db.ts`

Manages MySQL connection pool using mysql2 with promise support.

### Error Codes

**File:** `backend/config/error-codes.ts`

Centralized error codes for i18n integration.

### Date Utilities

**File:** `backend/config/date-utils.ts`

Helper functions for date manipulation using dayjs.

---

## 5. API Structure

### Authentication

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/register` | Register new user |

### Core Modules

| Module | Base Route | Controllers |
| ------ | ---------- | ----------- |
| **Users** | `/api/users` | user-controllers.ts |
| **Groups** | `/api/groups` | group-controller.ts, contact, payment, room, history |
| **Parking** | `/api/parking` | parking.controller.ts, bookings, stats |
| **Logbooks** | `/api/logbooks` | logbook-controllers.ts, comments, reads |
| **Cashier** | `/api/cashier` | shift, denomination, payment, daily, report, voucher |
| **Maintenance** | `/api/maintenance` | maintenance-controller.ts |
| **Blacklist** | `/api/blacklist` | blacklist-controller.ts |
| **Conciliation** | `/api/conciliations` | conciliation.controller.ts, monthly |
| **Backoffice** | `/api/backoffice` | backoffice-controller.ts |
| **Messages** | `/api/messages` | conversation-controller.ts, message-controller.ts |
| **Notifications** | `/api/notifications` | notification-controller.ts |
| **Activity** | `/api/activity` | activity-controller.ts |
| **Departments** | `/api/departments` | departments-controller.ts |
| **Scheduling** | `/api/scheduling` | scheduling-controller.ts |
| **Chat** | `/api/chat` | chat-controller.ts |
| **Search** | `/api/search` | search-controller.ts |
| **Demo** | `/api/demo-activity` | demo-activity-controller.ts |

---

## 6. Controllers

Located in `backend/controllers/` (20+ controller files)

### Auth Controllers

| File | Functions |
| ---- | --------- |
| `auth-controllers.ts` | login, logout, me, refresh |
| `user-controllers.ts` | CRUD, avatar upload, profile |

### Module Controllers

**Groups:**
- `group-controller.ts` - Main CRUD operations
- `group-contact-controller.ts` - Contact management
- `group-payment-controller.ts` - Payment tracking
- `group-room-controller.ts` - Room assignment
- `group-history-controller.ts` - Audit trail
- `group-status-controller.ts` - Status workflow

**Parking:**
- `parking.controller.ts` - Spaces, rates, levels
- `bookings.controller.ts` - Booking CRUD, check-in/out
- `stats.controller.ts` - Dashboard statistics

**Cashier:**
- `cashier-shift-controller.ts` - Shift management
- `cashier-denomination-controller.ts` - Currency counting
- `cashier-payment-controller.ts` - Payment processing
- `cashier-daily-controller.ts` - Daily summaries
- `cashier-report-controller.ts` - Report generation
- `cashier-history-controller.ts` - History tracking
- `cashier-voucher-controller.ts` - Voucher management

**Logbooks:**
- `logbook-controllers.ts` - Entry CRUD
- `logbookComments-controllers.ts` - Comments
- `logbookReads-controllers.ts` - Read tracking

**Others:**
- `activity-controller.ts` - Dashboard feed
- `backoffice-controller.ts` - Invoices, suppliers
- `blacklist-controller.ts` - Incident records
- `maintenance-controller.ts` - Work orders
- `conciliation.controller.ts` - Daily reconciliation
- `conciliation-monthly.controller.ts` - Monthly summaries
- `departments-controller.ts` - Department management
- `notification-controller.ts` - Alert management
- `conversation-controller.ts` - Chat conversations
- `message-controller.ts` - Individual messages
- `search-controller.ts` - Global search
- `demo-activity-controller.ts` - Demo logging

---

## 7. Repositories

Located in `backend/repositories/` (25+ repository files)

### Structure Pattern

Each module has dedicated repositories for data access:

```
repositories/
├── auth/
│   └── user-repository.ts
├── activity/
│   └── activity-repository.ts
├── backoffice/
│   └── backoffice-repository.ts
├── blacklist/
│   └── blacklist-repository.ts
├── cashier/
│   ├── cashier-daily-repository.ts
│   ├── cashier-denomination-repository.ts
│   ├── cashier-history-repository.ts
│   ├── cashier-payment-repository.ts
│   ├── cashier-shift-repository.ts
│   ├── cashier-shift-user-repository.ts
│   └── cashier-voucher-repository.ts
├── conciliation/
│   ├── conciliation.repository.ts
│   └── conciliation-monthly.repository.ts
├── departments/
│   └── departments-repository.ts
├── group/
│   ├── group-contact-repository.ts
│   ├── group-history-repository.ts
│   ├── group-payment-repository.ts
│   ├── group-repository.ts
│   ├── group-room-repository.ts
│   └── group-status-repository.ts
├── logbook/
│   ├── logbook-repository.ts
│   ├── logbookComments-repository.ts
│   ├── logbookCommentsHistory-repository.ts
│   ├── logbookHistory-repository.ts
│   └── logbookReads-repository.ts
├── maintenance/
│   └── maintenance-repository.ts
├── messages/
│   ├── conversation-repository.ts
│   └── message-repository.ts
├── notifications/
│   └── notification-repository.ts
├── parking/
│   ├── bookings.repository.ts
│   ├── parking.repository.ts
│   └── stats.repository.ts
└── search/
    └── search-repository.ts
```

---

## 8. Services

Located in `backend/services/` (8 service files)

| Service | File | Purpose |
| ------- | ---- | ------- |
| **Token Service** | `auth/tokenService.ts` | JWT generation and verification |
| **Cloudinary** | `blacklist/cloudinary-service.ts` | Image upload management |
| **Cron Service** | `cron/cron-service.ts` | Scheduled tasks |
| **Group History** | `group/group-history-service.ts` | Audit logging |
| **Payment Calculator** | `group/payment-calculator-service.ts` | Payment calculations |
| **Logbook History** | `logbook/logbookHistory-service.ts` | Read tracking |
| **Notification Generator** | `notifications/notification-generator-service.ts` | Auto notifications |
| **Schedule Validator** | `scheduling/schedule-validator.ts` | Real-time schedule validation |

---

## 9. Authentication & Security

### JWT Flow

```
Login → Validate credentials → Generate tokens → Set HttpOnly cookies
                                                                    │
Request with cookie → Verify JWT → Check role → Execute controller ─┘
                                                                    │
401 → Auto-refresh via /api/auth/refresh → Retry request
                                                                    │
Refresh expired → Redirect to /login
```

### Token Configuration

| Token | Duration | Storage |
| ----- | -------- | ------- |
| Access | 15 min | HttpOnly cookie |
| Refresh | 7 days | HttpOnly cookie |

### Security Measures

| Measure | Implementation |
| ------- | -------------- |
| **XSS Protection** | HttpOnly cookies, no localStorage |
| **CSRF Protection** | SameSite cookies, CORS whitelist |
| **SQL Injection** | Parameterized queries (mysql2) |
| **Rate Limiting** | 100 requests / 15 min per IP |
| **Password Hashing** | bcrypt (10 rounds) |
| **Input Validation** | Zod schemas on all endpoints |
| **Error Sanitization** | Generic errors in production |
| **Header Security** | x-powered-by disabled |

### Middleware Functions

```typescript
// authenticateToken.ts
export function authenticateToken(req, res, next) {
  const token = req.cookies.access_token
  if (!token) return res.status(401).json({ error: 'No token' })
  
  jwt.verify(token, SECRET_JWT_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' })
    req.user = user
    next()
  })
}

// roleCheck.ts
export function roleCheck(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
```

---

## 10. Database Schema

### Core Tables (40+)

| Category | Tables |
| --------- | ------ |
| **Auth** | `users`, `refresh_tokens` |
| **Groups** | `group_reservations`, `group_contacts`, `group_rooms`, `group_payments`, `group_history` |
| **Parking** | `parking_spaces`, `parking_bookings`, `parking_rates`, `parking_levels`, `parking_invoices` |
| **Logbooks** | `logbook_entries`, `logbook_comments`, `logbook_reads`, `logbook_history` |
| **Cashier** | `cashier_shifts`, `cashier_denominations`, `cashier_payments`, `cashier_vouchers`, `cashier_daily`, `cashier_shift_users` |
| **Maintenance** | `maintenance_orders`, `maintenance_images`, `maintenance_history` |
| **Blacklist** | `blacklist_entries`, `blacklist_images` |
| **Conciliation** | `conciliations`, `conciliation_monthly` |
| **Backoffice** | `invoices`, `suppliers`, `invoice_images` |
| **Messages** | `conversations`, `messages`, `conversation_participants` |
| **Notifications** | `notifications`, `notification_reads`, `notification_schedule` |
| **Activity** | `activity_log`, `activity_types` |
| **Scheduling** | `scheduling_months`, `scheduling_days`, `scheduling_assignments`, `scheduling_constraints`, `scheduling_shifts`, `scheduling_employee_rules`, `scheduling_employees`, `scheduling_employee_contracts`, `scheduling_config`, `scheduling_history` |
| **System** | `departments`, `settings` |

### Key Relationships

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

---

## 11. Cron Jobs

**File:** `backend/services/cron/cron-service.ts` (263 líneas)

### Scheduled Tasks

| Job | Schedule | Purpose |
| --- | -------- | ------- |
| **Notifications** | Daily at 7:00 AM (`0 7 * * *`) | Process pending notifications |
| **Batch Payment** | Day 10 at 23:59 (`59 23 10 * *`) | Mark validated invoices as paid |

### Batch Payment Process

```typescript
// Marks all 'validated' invoices from previous month as 'paid'
// Triggered automatically on day 10 at 23:59
// Manual trigger available via CronService.runBatchPaymentNow()
```

### Cron Service Methods

| Method | Purpose |
| ------- | ------- |
| `start()` | Initialize all cron jobs |
| `runNotificationsNow()` | Manual trigger for notifications |
| `runBatchPaymentNow()` | Manual trigger for batch payment |
| `previewBatchPayment()` | Preview invoices to be marked as paid |
| `getStatus()` | Get next run times |

---

## 12. File Handling

| Feature | Technology | Usage |
| ------- | ---------- | ----- |
| **Image Upload** | Multer + Cloudinary | Avatars, maintenance photos, blacklist evidence |
| **PDF Upload** | Multer + Cloudinary | Invoice documents, contracts |
| **ZIP Generation** | Archiver | Bulk export of images/documents |
| **Email Attachments** | Nodemailer | Reports, notifications with files |
| **PDF Generation** | pdf-lib (service) | Parking invoices, receipts |

---

## 13. Error Handling

### Response Format

```typescript
// Success response
{ "success": true, "data": { ... } }

// Error response
{ "success": false, "error": "Error message", "code": "ERROR_CODE" }

// Validation error
{ "success": false, "error": "Validation failed", "details": [...] }
```

### HTTP Status Codes

| Code | Meaning |
| ---- | ------- |
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

## 14. Middlewares

| Middleware | File | Purpose |
| --------- | ---- | ------- |
| `authenticateToken` | authenticateToken.ts | Verify JWT, attach user to request |
| `roleCheck` | roleCheck.ts | Validate user role permissions |
| `rateLimiter` | rateLimiter.ts | Prevent abuse (100 req/15min per IP) |
| `demoRestriction` | demoRestriction.ts | Block write operations for demo users |

---

## 15. Demo Mode

Demo users can read all data but write operations are restricted:

| Route | Method | Allowed Action |
| ----- | ------ | -------------- |
| `/api/auth/logout` | POST | Session management |
| `/api/parking/bookings` | POST | Test booking flow |
| `/api/logbooks/*/comments` | POST | Test comments |
| `/api/maintenance` | POST | Test work orders |

All other write operations return `403 Forbidden`.

---

## 16. Deployment

| Service | Provider | Configuration |
| ------- | -------- | ------------- |
| **Backend** | Render | Auto-deploy from main branch |
| **Backend** | Fallback | four-points.onrender.com:4000 |
| **Database** | Aiven | MySQL 8 with SSL |
| **Media Storage** | Cloudinary | Images and PDFs |

### Build & Start

```bash
# Development
pnpm dev              # tsx watch
pnpm dev:local        # DB_ENVIRONMENT=local
pnpm dev:aiven        # DB_ENVIRONMENT=aiven

# Production
pnpm start            # tsx index.ts

# TypeScript
pnpm typecheck        # tsc --noEmit
```

---

## 17. Scripts & Commands

### npm Scripts

```bash
pnpm dev              # Development with tsx watch
pnpm dev:local        # Use local MySQL database
pnpm dev:aiven        # Use Aiven cloud database
pnpm build            # No build needed (tsx)
pnpm start            # Production start
pnpm typecheck        # TypeScript type checking
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
```

### Database Commands

```bash
# MySQL connection
mysql -u root -p hotel_db

# Aiven connection
mysql -u usuario -h host -p hotel_db -P 3306 --ssl-ca=certs/ca-certificate.pem

# Dump local
mysqldump -u root -p hotel_db > backup.sql

# Import
mysql -u root -p hotel_db < backup.sql
```

---

## Related Documentation

| Document | Description |
| --------- | ----------- |
| `backend/README.md` | JWT to Sessions migration guide |
| `backend.md` | This file |
| `docs/backend/database/` | Database configuration guides |
| `docs/backend/security/` | Security implementation details |

---

## Author

**Salvador Perez**

- GitHub: [@bpstack](https://github.com/bpstack)
- Email: contact.bpstack@gmail.com

---

<p align="center">
  Built with Express 5, TypeScript, and MySQL
</p>
