# Global Plan — Four Points

**Última actualización:** 2026-05-10
**Autor de la auditoría:** Claude (Opus 4.7) bajo dirección de Azyd
**Propósito:** Documento maestro de auditoría técnica y roadmap estratégico previo a la introducción de datos reales de empresa en producción.

> **Cómo leer este documento**
> - **FASE 1** documenta el estado real del sistema (arquitectura, demo, auth, deuda). No prescribe cambios.
> - **FASE 2** propone el roadmap progresivo, con prioridad, complejidad, riesgo y dependencia.
> - Cada hallazgo cita `archivo:línea` para que cualquier afirmación sea verificable.
> - Cuando código y documentación discrepan, el código es la fuente de verdad y se marca el conflicto explícitamente.

---

## 0. Decisiones tomadas (2026-05-10)

Tras revisar el documento, el dueño confirmó las siguientes decisiones. Estas son ahora invariantes del plan; cualquier nuevo plan o sesión IA debe respetarlas.

| Decisión | Resolución | Notas |
|---|---|---|
| **D-1 · Demo público** | Deshabilitar definitivamente según §5.2 plan de transición | No clonar deployment ni implementar multi-tenancy ahora |
| **D-2 · Cloudflare Access** | Sí, delante de `four-points.stackbp.es` | Usar Zero Trust Access free tier (≤50 usuarios) |
| **D-3 · Refresh token rotation** | Implementar **antes** de datos reales, **después** del merge schedule+checklist a `main` | Ver §6.0 — coordinación con scheduler |
| **D-4 · Multi-tenancy** | Diferida indefinidamente | Reabrir solo si HotelCode capta primer cliente externo |

### 0.1 Coordinación con el merge schedule+checklist

El branch `feature/ai-schedule-generator` (y los branches de checklist) tienen trabajo abierto que bloquea el merge a `main`. Resumen del estado pendiente (verificado en `TODO.md` y `SCHEDULING-SOLVER-PLAN.md` Fase 3):

**Bloqueadores del merge a main:**
- Migración Aiven de `scheduling_employee_requests` (B-2 / TODO.md §pendientes menores).
- Fase 3 paso 1 — tabla `scheduling_solver_runs`.
- Fase 3 paso 2 — UX de infeasibilidad.
- `Promise.allSettled` en `schedule-generate.controller.ts:117` (por).
- `MIN_NIGHTS_REQUIRED` hardcoded en `schedule-validator.ts:229`.
- Tabs y panel de búsqueda rotos en módulo Maintenance.

**Estrategia de orquestación auth ↔ scheduler:**

```
HOY ──────► [Sprint 0 paralelo]      ──────► [merge schedule+checklist a main]
              · H1-1 docs (CLAUDE.md)             ↓
              · H1-12 deshabilitar demo     [Sprint 1 endurecimiento]
              · H1-15 tests auth                  · resto de H1 (rate limit, helmet, CORS, body, refresh body, dead code, Sentry, Pino, render.yaml)
                  (red de seguridad antes        · H2-1 refresh token rotation con tabla `refresh_tokens`
                   de tocar nada de auth)        ↓
                                            [datos reales empiezan a entrar]
                                                 ↓
                                            [Horizonte 2/3 a partir de aquí]
```

**Razonamiento:**
1. **Sprint 0 (paralelo al scheduler)**: solo se tocan documentación, SQL del demo, y se escriben tests. Cero impacto en código de producción que se esté tocando en el merge schedule+checklist. Riesgo de conflicto de merge: nulo.
2. **No mezclar auth con scheduler**: el refresh token rotation toca el flujo de login y exige migración de tabla. Si rompe algo, queremos `main` "tranquilo" para diagnosticar. Mezclarlo con la entrada del scheduler en `main` multiplica las superficies de bug en una misma ventana de inestabilidad.
3. **Tests auth (H1-15) primero**: antes de tocar el módulo de auth en Sprint 1, los tests de regresión deben estar en `main`. Esto es la red de seguridad que hace que cualquier cambio posterior sea reversible.

**Criterio de paso al Sprint 1:** schedule+checklist merge a `main` completado y pasando tests verdes en `main` durante al menos 24h en producción.

---

## Tabla de contenido

- [0. Decisiones tomadas (2026-05-10)](#0-decisiones-tomadas-2026-05-10)
- [FASE 1 — Auditoría técnica](#fase-1--auditoría-técnica)
  - [1. Arquitectura general](#1-arquitectura-general)
  - [2. Usuario Demo](#2-usuario-demo)
  - [3. Autenticación y seguridad](#3-autenticación-y-seguridad)
  - [4. Deuda técnica y discrepancias documentales](#4-deuda-técnica-y-discrepancias-documentales)
- [FASE 2 — Roadmap estratégico](#fase-2--roadmap-estratégico)
  - [5. Estrategia demo/real (HotelCode + Four-Points)](#5-estrategia-demoreal-hotelcode--four-points)
  - [6. Roadmap por horizontes](#6-roadmap-por-horizontes)
  - [7. Plan de mitigación detallado](#7-plan-de-mitigación-detallado)
- [Anexos](#anexos)

---

# FASE 1 — Auditoría técnica

## 1. Arquitectura general

### 1.1 Vista general

Four-Points es un PMS (Property Management System) hotelero monorepo con dos servicios desplegados independientemente y un proceso auxiliar embebido (solver Python).

```
┌──────────────────────┐         ┌────────────────────────┐
│ Frontend (Vercel)    │  HTTPS  │ Backend (Render)       │
│ Next.js 16           │◄───────►│ Express 5.1.0 + tsx    │
│ React 19             │ cookies │ Cron jobs              │
│                      │ HttpOnly│ Daemon Python (solver) │
└──────────────────────┘         └────────┬───────────────┘
                                          │ TCP+SSL
                                          ▼
                                 ┌────────────────────────┐
                                 │ Aiven MySQL 8.0        │
                                 │ hotel_db, ~71 tablas   │
                                 └────────────────────────┘

                                 ┌────────────────────────┐
                                 │ Cloudinary (media)     │
                                 └────────────────────────┘
```

### 1.2 Stack confirmado (no asumido — leído de `package.json`)

**Backend (`backend/package.json`)**
- `express@5.1.0` — versión recién publicada, riesgo de incompatibilidades sutiles con middlewares antiguos.
- `tsx` (sin build step). El runtime ejecuta TypeScript directamente.
- `mysql2@3.14.2` — driver, parametrizado.
- `jsonwebtoken@9.0.2` — JWT activo.
- `bcrypt@6.0.0` — hashing de password.
- `cookie-parser@1.4.7` — parsing de cookies.
- `cors`, `express-rate-limit@8.2.1`, `zod@4.0.5`.
- `passport@0.7.0` + `passport-jwt@4.0.1` — **DEAD CODE**: instalados pero no inicializados ni referenciados en runtime.
- **No instalados**: `express-session`, `connect-redis`, `helmet`, `hpp`, `express-mongo-sanitize`.

**Frontend (`frontend/package.json`)**
- `next@16.0.8` + `react@19.1.1` — bleeding edge.
- `tailwindcss@3.4.17`, `@nextui-org/react@2.6.11`.
- `@tanstack/react-query@5.90.11`, `react-hook-form@7.66.0`.
- `zod@^3.25.17` — **discrepancia con backend (^4.0.5)**: si en algún momento se comparten esquemas Zod entre cliente y servidor, hay riesgo de incompatibilidad de API (Zod 4 reescribió varias APIs públicas).
- `next-auth@5.0.0-beta.25` — beta. Coexiste conceptualmente con la auth JWT propia del backend.

### 1.3 Estructura de directorios real

```
four-points/
├── backend/
│   ├── index.ts                    # bootstrap + middlewares globales + rutas
│   ├── config/{config.ts, db.ts, startup-logger.ts}
│   ├── controllers/                # capa HTTP por dominio
│   ├── services/                   # lógica de negocio
│   │   ├── auth/{tokenService.ts, ...}
│   │   ├── scheduling/             # validador, solver-client, build-solver-input
│   │   └── cron/cron-service.ts
│   ├── repositories/               # acceso a DB (mysql2 raw queries)
│   ├── routes/                     # definición de endpoints
│   ├── middlewares/                # ver §3
│   ├── validations/                # esquemas Zod
│   ├── models/                     # tipos TS
│   ├── scheduling-solver/          # subproyecto Python (CP-SAT)
│   │   ├── daemon.py, model.py, schemas.py
│   │   └── constraints/
│   ├── db-mysql/
│   │   ├── MASTER_INSTALL_AIVEN.sql
│   │   ├── MASTER_INSTALL_LOCAL.sql
│   │   └── aiven/                  # 21 archivos SQL modulares
│   └── tests/                      # vitest
├── frontend/
│   ├── app/                        # App Router
│   │   ├── (auth)/login/
│   │   ├── dashboard/{logbook, parking, scheduling, ...}/
│   │   ├── lib/{apiClient.ts, serverFetch.ts, auth/, schemas/}
│   │   ├── stores/                 # Zustand
│   │   └── ui/                     # design system
│   └── ...
├── README.md, ROADMAP.md, TODO.md
├── SCHEDULING-{CONSTRAINTS, DECISIONS-LOG, SOLVER-PLAN}.md
├── CHECKLIST-ROADMAP.md, CLAUDE.md
└── Global-Plan.md                  # este documento
```

### 1.4 Despliegue real

- **Backend**: Render (Web Service Node). Dominio `api.four-points.stackbp.es` y `four-points.onrender.com`.
- **Frontend**: Vercel. Dominio `four-points.stackbp.es` y `four-points.vercel.app`.
- **DB**: Aiven MySQL 8.0, puerto 23225, SSL obligatorio (`backend/config/db.ts`).
- **Cookies**: dominio compartido `.four-points.stackbp.es` solo en producción (`backend/controllers/auth/auth-controllers.ts:31`).
- **Media externa**: Cloudinary (avatares, PDFs).

**No existe en el repo**: `render.yaml`, `vercel.json`, `Dockerfile`, `.github/workflows/`. Toda la configuración de despliegue está en los paneles de Render/Vercel — esto es un riesgo de **lock-in operativo** y de pérdida de configuración (no reproducible).

### 1.5 Servicios externos

| Servicio | Uso | Variables |
|---|---|---|
| Aiven MySQL | DB de producción | `AIVEN_DB_HOST`, `AIVEN_DB_PORT`, `AIVEN_DB_USER`, `AIVEN_PASSWORD`, `AIVEN_DB_NAME` |
| Cloudinary | Avatares, exports PDF | `CLOUDINARY_*` (inferido) |
| Render | Hosting backend | Variables Render: `NODE_ENV`, todas las anteriores, `SECRET_JWT_KEY` |
| Vercel | Hosting frontend | `NEXT_PUBLIC_API_URL`, `FRONTEND_URL` |
| Nodemailer | Email (configurado, opcional) | sin definir aquí |

### 1.6 Flujo de datos típico (login)

1. Usuario → `POST https://api.four-points.stackbp.es/api/auth/login` con `{username, password}` y `credentials: 'include'`.
2. Backend valida → genera JWT access (15min) + refresh (7d) → setea ambos como `Set-Cookie` HttpOnly.
3. Browser guarda cookies en `.four-points.stackbp.es`. El frontend Vercel hereda el dominio compartido para enviar las cookies en el cross-origin con `credentials: 'include'`.
4. Cualquier request posterior a `/api/*` pasa por `authenticateToken` → `verifyToken(jwt.verify)` → `demoRestriction` → controlador.

---

## 2. Usuario Demo

### 2.1 Ubicación y configuración

- **Definición del rol**: `backend/db-mysql/aiven/15_demo_user.sql:35` — `INSERT INTO roles (id, name) VALUES (7, 'demo-admin')`.
- **Cuenta**: `backend/db-mysql/aiven/15_demo_user.sql:42-54`
  - `username`: `demo`
  - `password`: `demo987654` (bcrypt hash committeado en el repo)
  - `email`: `demo@four-points.local`
  - `id`: `demo-user-0000-0000-000000000001`
  - `is_active = 1`, re-creado en cada deploy con `ON DUPLICATE KEY UPDATE`.
- **Tabla de auditoría**: `demo_activity_log` (`15_demo_user.sql:12-26`).

### 2.2 Cómo se hace cumplir la restricción

El control de escritura del demo se aplica **dentro** del middleware `authenticateToken` (`backend/middlewares/authenticateToken.ts:57`), que llama a `demoRestriction` justo después de adjuntar `req.user`. Esto significa que **toda ruta protegida hereda la restricción automáticamente** — el patrón es robusto.

`backend/middlewares/demoRestriction.ts:22-34`:

```typescript
const DEMO_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: 'POST', pattern: /^\/api\/auth\/logout$/ },
  { method: 'POST', pattern: /^\/api\/parking\/bookings$/ },
  { method: 'POST', pattern: /^\/api\/logbooks\/\d+\/comments$/ },
  { method: 'POST', pattern: /^\/api\/maintenance$/ },
]
```

**Permitido para demo:**
- `GET *` (todos los reads) — explícito en `demoRestriction.ts:89-92`.
- 4 endpoints `POST` listados arriba.

**Bloqueado:** todo lo demás → `403`. El intento se registra de forma asíncrona (`logBlockedAttempt`) en `demo_activity_log` capturando IP, user-agent, route, body preview (500 chars), método.

### 2.3 Riesgos detectados en la implementación demo

#### 🔴 R-DEMO-1 — Aislamiento de datos: NO existe

**Hallazgo**: el usuario demo entra al **mismo `hotel_db` que los usuarios reales**. No hay separación a nivel de DB, schema, ni filtrado por tenant. Hoy es seguro porque solo hay un cliente, pero el momento en que metas datos reales:

- El demo verá tus datos reales (todas sus consultas son `GET *` sin filtro por owner).
- Cualquier creación de booking/comment/maintenance que el demo haga **se mezcla** con tus datos reales.

**Esta es la razón estructural por la que el demo público debe desacoplarse antes de meter datos reales.** No es un bug; es ausencia de multi-tenant. Resolverlo requiere una decisión arquitectónica (§5).

#### 🟡 R-DEMO-2 — Credenciales del demo committeadas en el repo

**Síntoma**: `demo987654` aparece en el SQL versionado (`15_demo_user.sql`). Aunque solo el hash bcrypt está en la DB, el script de seed contiene la contraseña en claro y es público en el repo.

**Riesgo**: cualquiera con acceso al repo puede entrar al demo sin necesidad de "descubrirlo". Esto era aceptable cuando el portfolio quería tráfico demo; con datos reales en la misma instancia, deja de serlo.

**Mitigación a evaluar**: ver §5 (estrategia demo/real).

#### 🟡 R-DEMO-3 — Logging asíncrono del demo activity sin retry

`demoRestriction.ts:54-66` ejecuta el insert sin `await`. Si la DB falla puntualmente (timeout, connection drop), el intento bloqueado **se pierde silenciosamente** (solo a `console.error`, que no se persiste si Render reinicia).

**Impacto bajo** mientras el demo no sea blanco activo de abuso, pero anula el valor forense de `demo_activity_log`.

#### 🟢 R-DEMO-4 — Whitelist correctamente "deny-by-default"

**Verificación**: la whitelist es positive-list. Cualquier método/ruta no listado es bloqueado (`demoRestriction.ts` retorna `false` y va al `else` con 403). No es un gap. La auditoría previa lo había marcado como riesgo; falsa alarma corregida aquí.

⚠️ **Lo que sí queda abierto**: revisar si hay rutas que el demo necesite (e.g. `PATCH /logbooks/:id` para marcar leído) y queden inutilizables sin que el usuario lo entienda. **Hoy es irrelevante** porque la decisión es deshabilitar el demo (§5).

### 2.4 Lo que está bien hecho

- Middleware aplicado **automáticamente** a toda ruta protegida (no es opt-in por endpoint).
- Whitelist como positive-list (deny-by-default).
- Auditoría persistente con índices correctos en `demo_activity_log`.
- `isRealAdmin` (`backend/middlewares/roleCheck.ts:238-255`) bloquea operaciones admin sensibles (registro de usuarios) incluso para demo-admin, devolviendo error explicativo.
- Endpoints de visualización del log están bajo `isRealAdmin` (`/api/demo-activity/*`), por lo que el demo no ve sus propios intentos.

---

## 3. Autenticación y seguridad

### 3.1 Aclaración crítica: JWT, no sesiones

**`CLAUDE.md` está obsoleto.** Afirma (líneas 25, 85-89, 354) que el sistema "migró de JWT a sesiones" con `express-session` y `middlewares/authenticateSession.ts`. **Esto es falso en el código actual.** Verificación:

| Aspecto | Documentado en CLAUDE.md | Realidad en el código |
|---|---|---|
| Mecanismo | Sessions con `express-session` | JWT en HttpOnly cookies |
| Middleware | `authenticateSession.ts` | `authenticateToken.ts` (el otro file no existe) |
| Tabla `sessions` | "session data stored in MySQL `sessions` table" | Tabla mencionada en README pero **ningún código la lee/escribe** |
| Secret | `SESSION_SECRET` | `SECRET_JWT_KEY` |
| Paquete | `express-session` | No instalado en `package.json` |
| `req.session` | implícito | **0 ocurrencias** en grep |

**Acción requerida (§7)**: actualizar CLAUDE.md y README.md para reflejar la realidad. Hasta entonces, cualquier asistente IA o desarrollador que lea la documentación va a tomar decisiones equivocadas.

### 3.2 Flujo JWT actual

`backend/services/auth/tokenService.ts`:
- `generateAccessToken()` → `jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: '15m' })`
- `generateRefreshToken()` → `jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: '7d' })`
- `verifyToken()` → `jwt.verify(token, SECRET_JWT_KEY)` (mismo secret para ambos)

`backend/controllers/auth/auth-controllers.ts:50-110` (login):
1. Bcrypt compare → genera ambos tokens.
2. Setea cookies `access_token` y `refresh_token` con:
   - `httpOnly: true`
   - `secure: NODE_ENV === 'production'`
   - `sameSite: 'lax'`
   - `domain: '.four-points.stackbp.es'` (solo prod)
   - `path: '/'`
3. **Devuelve también el refresh token en el JSON body** del response (comentario en código indica "el proxy de Next.js lo necesita"). Esto reduce el beneficio del HttpOnly: si hay XSS, el JS puede leer la respuesta inicial si el frontend la cachea.

`backend/middlewares/authenticateToken.ts`:
- Lee `req.cookies.access_token` (preferido) o `Authorization: Bearer <token>`.
- Verifica con `jwt.verify`.
- Adjunta `req.user = { id, username, email: '', role }` desde el payload.
- Llama a `demoRestriction(req, res, next)`.

### 3.3 Inventario de roles y RBAC

`backend/middlewares/roleCheck.ts` define ~12 funciones middleware:

| Middleware | Roles permitidos | Uso |
|---|---|---|
| `isAdmin` | admin, demo-admin | Lectura admin general |
| `isRealAdmin` | **admin solamente** | Escrituras admin (registro de usuarios, etc.) |
| `isOwnerOrAdmin` | owner del recurso \| admin/demo-admin | Self-service |
| `canManageGroups` | admin, group-admin, demo-admin | Reservas grupales |
| `canViewGroups` | admin, recepcionista, group-admin, mantenimiento, demo-admin | — |
| `canManageCashier` | admin, recepcionista, group-admin, demo-admin | Caja |
| `canViewReports` | admin, demo-admin | — |
| `canAccessMaintenance` | todos | — |
| `excludeMantenimiento` | bloquea mantenimiento | Sandbox del rol |
| `canResetChecklist` | admin, recepcionista, demo-admin | — |
| `canAccessBackoffice` | admin, demo-admin | Facturas/proveedores |

**Roles definidos en DB (`db-mysql/aiven/`):**
- 1 = `recepcionista`
- 2 = `admin`
- 3 = `mantenimiento`
- 6 = `group-admin`
- 7 = `demo-admin`

Diseño consistente. La distinción `isAdmin` (incluye demo) vs `isRealAdmin` (excluye demo) es deliberada y correcta.

### 3.4 Configuración CORS

`backend/index.ts:45-78`:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'https://four-points.stackbp.es',
  'https://four-points.vercel.app',
  'https://api.four-points.stackbp.es',
  'https://four-points.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean)

const vercelPreviewPattern = /\.vercel\.app$/

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) { callback(null, true); return }   // ← gap
    if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
}))
```

### 3.5 Hallazgos de seguridad (priorizados)

#### 🔴 Críticos (bloquean introducción de datos reales)

##### S-1 · `loginLimiter` desactivado
- **Archivo**: `backend/routes/auth/auth-routes.ts:46` — `router.post('/login', /* loginLimiter, */ login)`
- **Riesgo**: brute force ilimitado contra cualquier cuenta (incluida la tuya como admin real).
- **Por qué importa especialmente con datos reales**: tu cuenta admin tiene acceso completo. Sin rate limit, un atacante con conocimiento del username admin puede probar passwords sin freno hasta que se quede sin energía.

##### S-2 · `apiLimiter` definido pero nunca aplicado
- **Archivo**: `backend/middlewares/rateLimiter.ts` (definido) — sin uso en `index.ts` ni en routers.
- **Riesgo**: cualquier endpoint autenticado es susceptible a abuso (scraping de datos, DoS por inundación).

##### S-3 · `helmet` no instalado
- **Archivo**: ausente de `backend/package.json`.
- **Riesgo**: ausencia de cabeceras `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`, `Content-Security-Policy`. Esto baja varias capas defensivas de XSS, clickjacking y MIME-sniffing.

##### S-4 · `express.json()` sin `limit`
- **Archivo**: `backend/index.ts:83`.
- **Riesgo**: payloads de 100KB son el default no documentado de Express 5; sin límite explícito un atacante puede mandar JSON gigantes y agotar memoria del proceso (especialmente crítico con Render free tier de 512MB).

##### S-5 · CORS acepta requests sin `Origin`
- **Archivo**: `backend/index.ts:61-63`.
- **Riesgo**: cURL, Postman y cualquier cliente que omita Origin pasa el filtro. **No es CORS bypass real** (CORS protege al browser, no al servidor), pero combinado con S-1 facilita brute force scripted.

##### S-6 · Refresh token devuelto en el body del response
- **Archivo**: `backend/controllers/auth/auth-controllers.ts` (login y refresh endpoints).
- **Riesgo**: contradice el modelo de seguridad HttpOnly. Si una XSS llega a ejecutarse antes de que el frontend tire el body del response, el token es legible por JS. Además queda en logs de Render si se loguea el response body.

#### 🟡 Altos

##### S-7 · `/api/auth/refresh-token` sin rate limit
- **Archivo**: `backend/routes/auth/auth-routes.ts:47`.
- **Riesgo**: un atacante con un refresh token (incluso uno antiguo robado) puede pedir nuevos pares ilimitadamente. No hay revocación porque no hay tabla de tokens emitidos.

##### S-8 · No existe revocación de refresh tokens
- **Patrón**: stateless puro; cualquier token válido firmado con `SECRET_JWT_KEY` se acepta hasta que expire.
- **Riesgo**: si un refresh token se compromete (XSS, body leak, log leak), **es válido durante 7 días sin posibilidad de invalidarlo manualmente**. Cambio de password no invalida tokens emitidos previamente.
- **Mitigación correcta**: tabla `refresh_tokens` con `id`/`user_id`/`hash`/`revoked_at`/`expires_at`, rotación en cada refresh, blacklist al logout.

##### S-9 · Frontend `DEV_MODE` hardcoded
- **Archivo**: `frontend/app/lib/auth/useAuth.tsx:17` — `const DEV_MODE = false`.
- **Riesgo**: si en algún momento se setea a `true` y se commitea, bypassea toda la auth en producción. Mejor sacarlo del código (basarse en `process.env.NODE_ENV` en su lugar, o eliminarlo si no aporta hoy).

##### S-10 · No hay logging de eventos de seguridad
- **Patrón**: solo `console.warn` para CORS bloqueado y rate limit hit; no se persiste.
- **Riesgo**: imposible detectar campañas de brute force, accesos sospechosos, o anomalías post-incident. Sin audit trail para compliance.

##### S-11 · Credenciales DB en variables de entorno sin rotación documentada
- **Archivo**: `backend/config/db.ts`.
- **Status**: las variables existen pero no hay procedimiento de rotación. Si filtras un `.env` o un developer ve los logs, no hay forma rápida de rotar y validar que nada se rompe.

##### S-12 · Tabla `users` sin `last_login`, `failed_attempts`, `locked_until`
- **Archivo**: schema en `db-mysql/aiven/`.
- **Riesgo**: no se puede implementar lockout por usuario (solo por IP+username vía rate limiter). Atacantes con botnet (cada IP intenta 5 veces) pueden seguir indefinidamente sobre la misma cuenta.

#### 🟠 Medios

##### S-13 · Mensajes de error que filtran información
- **Síntoma**: registro de usuario distingue "username ya en uso" vs "datos inválidos" → enumeración. Login distingue "token expirado" vs "token inválido".
- **Mitigación**: en producción, devolver mensajes genéricos (`401 Unauthorized` sin detalle).

##### S-14 · Sin CSRF token explícito
- **Patrón**: confianza total en `SameSite=lax` + `credentials: include`.
- **Riesgo**: aunque `lax` cubre el caso típico, hay edge cases (top-level navigation con POST formulario, browsers viejos). Para un PMS con datos sensibles, un token CSRF en operaciones mutativas es prudente.

##### S-15 · Sin observabilidad (Sentry / Datadog / APM)
- **Síntoma**: ningún paquete instalado. Errores en producción solo visibles en logs de Render (que rotan).
- **Riesgo operativo**: imposible diagnosticar incidentes a posteriori. Crítico cuando entren datos reales — si algo se corrompe, no tienes traza.

##### S-16 · Sin `.env.example`
- **Síntoma**: ausente en backend y frontend.
- **Riesgo**: onboarding y despliegue dependen de que recuerdes todas las vars. Riesgo operativo cuando vuelvas dentro de 6 meses.

#### 🔵 Bajos

##### S-17 · Discrepancia de versión Zod entre backend (4.x) y frontend (3.x)
- Si compartes esquemas (no parece ser el caso hoy), problemas de API.

##### S-18 · `passport` y `passport-jwt` instalados sin usar
- Aumenta superficie de ataque y peso del bundle innecesariamente.

##### S-19 · `cookie-parser` sin secret de firma
- Las cookies HttpOnly no necesitan firmarse cuando el contenido es un JWT (que ya se firma a sí mismo). No es un riesgo real, pero si algún día metes cookies que no sean JWT, recordar que están sin firmar.

### 3.6 Lo que está bien hecho

- Cookies `httpOnly + secure (prod) + sameSite=lax` correctamente configuradas.
- bcrypt con salt rounds desde env.
- Queries parametrizadas con `mysql2.query(query, params)` — sin riesgo SQL injection observado.
- Validación Zod en endpoints (presente en muchos, conviene auditar cobertura completa).
- Error handler global que oculta stack traces en producción (`backend/index.ts:182-188`).
- `x-powered-by` deshabilitado.
- `isRealAdmin` correctamente excluye demo de operaciones críticas.
- Demo restriction como middleware automático (no opt-in).

---

## 4. Deuda técnica y discrepancias documentales

### 4.1 Discrepancias entre código y documentación

| Documento | Línea | Afirmación | Realidad |
|---|---|---|---|
| `CLAUDE.md` | 25 | "Cookie-based sessions with JWT" | Solo JWT en cookies; no hay sessions |
| `CLAUDE.md` | 85 | "Cookie-based with `express-session`" | `express-session` no instalado |
| `CLAUDE.md` | 86 | "Session data stored in MySQL `sessions` table" | Tabla no se usa |
| `CLAUDE.md` | 88 | "Authentication middleware: `middlewares/authenticateSession.ts`" | Archivo no existe |
| `CLAUDE.md` | 354 | "Migrated from JWT to sessions" | Migración nunca implementada |
| `README.md` | ~155 | `express-session` instalado | No está en package.json |
| `README.md` | ~284 | tabla `sessions` activa | Sin lectores/escritores |

**Acción**: actualizar ambos documentos como parte del primer ticket de saneamiento. Mientras existan estas discrepancias, cualquier IA o desarrollador nuevo tomará decisiones erradas (intentará registrar `app.use(session(...))`, buscará `req.session.user`, etc.).

### 4.2 Dead code

- `passport@0.7.0`, `passport-jwt@4.0.1` en `backend/package.json` sin código que los inicialice o referencie. Eliminar.
- Comentarios `// loginLimiter` (rate-limit comentado) — limpiar al re-habilitarlo.
- `frontend/app/lib/auth/useAuth.tsx:17` `DEV_MODE = false` constante muerta.

### 4.3 Bloqueadores de despliegue heredados (de `TODO.md`)

#### B-1 · Solver Python: venv no se construye en Render
- `TODO.md:8-46` documenta el problema en detalle.
- `backend/scheduling-solver/venv/` está en `.gitignore`.
- El backend hace `spawn('venv/bin/python')` que falla `ENOENT` en Render.
- **Fix**: crear `render.yaml` o configurar el build command de Render con:
  ```bash
  pnpm install && python3 -m venv backend/scheduling-solver/venv && backend/scheduling-solver/venv/bin/pip install --no-cache-dir ortools pydantic
  ```
- **Coste**: ortools instala ~350MB y tarda 5-10 minutos; en Render free tier puede agotar memoria del builder.

#### B-2 · Tabla `scheduling_employee_requests` no está en `MASTER_INSTALL_AIVEN.sql`
- `TODO.md:120-130`.
- El DDL existe localmente en `scripts/20260425_create_scheduling_employee_requests.sql`.
- Si el solver intenta leer requests aprobados, fallará en la primera consulta.

#### B-3 · `Promise.allSettled` faltante en scheduler
- `TODO.md:118` — en `schedule-generate.controller.ts:117`.
- Si la recalculación de `free_number` falla después de aplicar el schedule, queda numeración inconsistente.

### 4.4 Versiones bleeding-edge

- `express@5.1.0` — major nueva. Hay middlewares ecosystem-side que aún no están totalmente actualizados. Riesgo de fallos sutiles en error-handling o middleware async.
- `next@16` + `react@19` — muy reciente, especialmente combinado con `next-auth@beta`.
- `next-auth@5.0.0-beta.25` — beta. Si lo usas activamente en frontend, planea ruta de upgrade a 5.0 final cuando salga.

### 4.5 Falta de infraestructura como código

Sin `render.yaml`, `vercel.json`, `Dockerfile` ni GitHub Actions:
- La configuración de despliegue vive solo en los paneles web. Si pierdes acceso o el servicio cambia, recuperarse cuesta.
- No hay CI: nadie corre los tests antes de mergear. `pnpm test` se ejecuta solo cuando lo lanzas manualmente.
- No hay typecheck en pre-merge.

### 4.6 Logging y observabilidad

`console.log` esparcido en startup, errores y CORS warnings. Sin Winston/Pino, sin Sentry, sin estructurado. **Cuando metas datos reales y algo se corrompa silenciosamente** (ej: un trigger MySQL falla, un cron escribe mal, un import XLS rompe encoding), no tendrás traza.

### 4.7 Tests

Vitest está instalado y hay tests del scheduler (corpus, parity, benchmark). **No detecté tests de auth, demo restriction, ni endpoints críticos** (parking, logbook, maintenance). Antes de tocar auth, escribir al menos tests de regresión sobre los flujos de login/refresh/logout y demo whitelist.

---

# FASE 2 — Roadmap estratégico

## 5. Estrategia demo/real (HotelCode + Four-Points)

### 5.1 Las dos opciones revisitadas con datos

**Opción A — Mantener un solo deployment, cerrar el demo, endurecer seguridad**

- Coste: bajo (días).
- Cambios: deshabilitar demo, ejecutar S-1 a S-6, opcionalmente añadir capa adicional (Cloudflare Access, IP allowlist, basic auth a nivel proxy).
- Riesgo: convive demo (si lo dejas) y datos reales en mismo schema. **Sin separación de tenants**, esto es estructuralmente inseguro a largo plazo.
- HotelCode actúa como portfolio público (Astro, marketing). Four-Points queda como "producto interno" con acceso restringido.

**Opción B — Dos deployments completos (demo público + producción real)**

- Coste: alto (semanas).
- Cambios: clonar Render service, clonar Aiven instance, clonar Vercel project, segregar secretos, automatizar sincronización de migraciones DB.
- Riesgo: doble coste mensual, doble mantenimiento, deriva entre los dos sistemas.

**Opción C — Multi-tenancy (no propuesta inicialmente, pero la planteo)**

- Mantener un solo deployment, pero introducir `tenant_id` en cada tabla y middleware que filtre por tenant del usuario autenticado.
- Coste: muy alto (refactor profundo de toda la capa de repositorios).
- Beneficio: solución correcta a largo plazo si el producto evolucionará a SaaS.
- Recomendación: **no hacerlo ahora**. Sería una refactorización masiva motivada por seguridad demo, no por necesidad de negocio. Si en algún momento HotelCode capta clientes reales, **entonces** se planifica multi-tenancy.

### 5.2 Recomendación

**Opción A con demo deshabilitado, no con demo modificado.**

Razonamiento:
1. La auditoría confirma que **no hay aislamiento de datos**. Cualquier diseño donde demo y datos reales convivan en el mismo schema es estructuralmente comprometido.
2. HotelCode (Astro, marketing) ya cumple el rol de exposición pública. No necesitas que Four-Points sea públicamente accesible.
3. Mantener el demo activo añade superficie de ataque (S-2, S-3 inactivos lo amplifican) sin beneficio real ahora que el portfolio se mueve a HotelCode.
4. Cuando quieras volver a habilitar un demo, hazlo con base de datos separada (Aiven tiene un free tier que sirve para esto, o un MySQL en Docker dentro de un mini-VPS).

**Plan de transición demo:**

1. Antes de meter datos reales, **deshabilita el usuario demo** poniendo `is_active = 0` en la tabla `users`. Mantén el código de `demoRestriction` y `demo_activity_log` en el repo (por si vuelves).
2. Comenta o quita el seed `15_demo_user.sql` del `MASTER_INSTALL_AIVEN.sql` para que en futuros redeploys no se reactive.
3. **No borres** el rol `demo-admin` ni los middlewares — mantienen la opción abierta a futuro.
4. Cambia el password del demo a algo aleatorio antes del deshabilitado (defensa en profundidad).
5. En HotelCode añade un disclaimer "Demo bajo petición" o un formulario de contacto que active credenciales temporales si decides ofrecer demo a clientes potenciales.

### 5.3 Capas adicionales de acceso (opcionales, defensa en profundidad)

Si quieres seguridad extra mientras la plataforma sigue accesible solo a ti y a tu equipo:

- **Cloudflare Zero Trust Access** delante de `four-points.stackbp.es`: requiere login Google/email magic-link antes de llegar al frontend. Free tier hasta 50 usuarios. **Recomendado** para esta etapa.
- **IP allowlist** en Render/Cloudflare si tienes IP fija (no recomendado si trabajas desde varios sitios).
- **Basic Auth** a nivel proxy de Vercel para entornos preview (evita que previews sean indexados o accedidos sin querer).

## 6. Roadmap por horizontes

> **Estructura ajustada (2026-05-10):** H1 se divide en **Sprint 0** (paralelo al merge schedule+checklist, sin riesgo de conflicto) y **Sprint 1** (post-merge, antes de datos reales). Ver §0.1.

### Sprint 0 — Paralelo al cierre de schedule+checklist (esta semana)

> **Criterio de cierre:** docs alineadas con realidad, demo deshabilitado en producción, suite de tests auth en verde.
> **Garantía:** ninguna de estas tareas toca código que esté en juego en el merge schedule+checklist.

| ID | Acción | Complejidad | Riesgo | Dependencia |
|---|---|---|---|---|
| H1-1 | Actualizar CLAUDE.md y README.md (auth real es JWT, no sessions) | Baja | Bajo | — |
| H1-12 | Deshabilitar usuario demo (`is_active=0` en Aiven + remove from MASTER_INSTALL_AIVEN.sql + cambiar password a aleatorio antes del flag) | Trivial | Bajo | D-1 |
| H1-15 | Tests de regresión sobre login/refresh/logout/demo whitelist (red de seguridad para Sprint 1) | Media | Bajo | Vitest ya configurado |

### Horizonte 1 (Sprint 1) — Post-merge schedule+checklist (1-2 semanas, antes de datos reales)

> **Criterio de cierre:** ningún hallazgo crítico de §3.5 abierto, observabilidad básica activa, refresh token rotation funcionando.
> **Precondición:** schedule+checklist mergeado a `main` y estable ≥24h en producción.

| ID | Acción | Complejidad | Riesgo | Dependencia |
|---|---|---|---|---|
| H1-2 | Habilitar `loginLimiter` en `auth-routes.ts:46` | Trivial | Bajo | H1-15 |
| H1-3 | Aplicar `apiLimiter` global en `index.ts` | Baja | Medio (puede afectar UX si limit muy bajo) | — |
| H1-4 | Instalar y configurar `helmet` con CSP relajada inicialmente | Baja | Bajo (CSP puede romper assets, ajustar) | — |
| H1-5 | Limitar payload `express.json({ limit: '2mb' })` | Trivial | Verificar uploads de imágenes/PDFs (Cloudinary recibe directo) | — |
| H1-6 | CORS: rechazar requests sin `Origin` excepto explícito | Trivial | Probar healthchecks de Render que usen sin-Origin | — |
| H1-7 | Quitar refresh token del body de login/refresh | Baja | Frontend puede depender de él (`apiClient` y `next-auth`) — verificar | H1-15 |
| H1-8 | Añadir rate limiter a `/api/auth/refresh-token` | Trivial | Bajo | — |
| H1-9 | Eliminar `passport`, `passport-jwt` de package.json | Trivial | Bajo | Confirmar 0 imports |
| H1-10 | Eliminar `DEV_MODE` constante en frontend | Trivial | Bajo | — |
| H1-11 | Crear `.env.example` en backend y frontend | Baja | — | — |
| H1-13 | Instalar Sentry o equivalente (mínimo: error tracking) | Media | Bajo | — |
| H1-14 | Instalar Pino o Winston con transporte a stdout estructurado | Media | Bajo | — |
| H1-16 | Crear `render.yaml` y `vercel.json` con configs reproducibles | Media | Importante validar build de scheduler | B-1 |
| **H2-1 promovido** | **Refresh token rotation: tabla `refresh_tokens` + revocación al logout/cambio de password** | Media | Alto si rompe sesiones activas | H1-15, H1-7 |
| **H1-17** | **Configurar Cloudflare Zero Trust Access delante de `four-points.stackbp.es`** | Baja | Verificar que no rompe webhooks/APIs públicas (no las hay hoy) | D-2 |

### Horizonte 2 — Medio plazo (1-2 meses, post estabilización)

> H2-1 (refresh token rotation) y H2-10 (Cloudflare) se han **promovido a Sprint 1** por decisión D-3 y D-2.

| ID | Acción | Complejidad | Riesgo |
|---|---|---|---|
| H2-2 | Añadir columnas `last_login`, `failed_login_count`, `locked_until` en `users` | Baja | Migración Aiven; coordinar con local |
| H2-3 | Lockout por usuario tras N intentos fallidos | Media | UX: necesita endpoint de unlock o desbloqueo automático |
| H2-4 | CSRF token explícito para mutaciones | Media | Frontend debe leer y enviar token |
| H2-5 | Auditar cobertura Zod en todos los endpoints | Media | Bajo |
| H2-6 | GitHub Actions con lint + typecheck + test pre-merge | Media | Acelera dev pero requiere disciplina |
| H2-7 | Logging estructurado de eventos de auth (login OK/KO, password change, role change) | Media | Decidir destino: tabla `security_audit_log` o servicio externo |
| H2-8 | Resolver bloqueadores `TODO.md` que sigan abiertos tras el merge (B-1 venv Render, B-3 allSettled, MIN_NIGHTS_REQUIRED hardcoded) | Variable | Críticos para que scheduling funcione en prod |
| H2-9 | Mensajes de error genéricos en producción (no leak enumerate users) | Baja | Bajo |

### Horizonte 3 — Largo plazo (3-6 meses, evolución estructural)

| ID | Acción | Complejidad | Riesgo |
|---|---|---|---|
| H3-1 | Decidir y, si aplica, implementar multi-tenancy si HotelCode capta clientes | Muy alta | Refactor profundo |
| H3-2 | Migración real de JWT stateless a sessions con Redis o tabla, si rotación de tokens se vuelve crítica | Alta | Cambio de paradigma; planificar bien |
| H3-3 | Pasar a esquemas Zod compartidos backend/frontend (alinear versiones) | Media | Bajo si se hace en paquete `shared/` |
| H3-4 | Consolidar versión de Zod (subir frontend a 4 o bajar backend a 3) | Media | Probar todos los formularios |
| H3-5 | Sustituir `console.*` residuales por logger estructurado | Baja-Media | Reescritura masiva pero mecánica |
| H3-6 | Plan de rotación de secrets (script + procedimiento documentado) | Media | Bajo si está documentado |
| H3-7 | APM (Datadog APM, New Relic, OpenTelemetry) para latencias por endpoint | Alta | Coste $/mes |
| H3-8 | Backup verificado de Aiven con prueba periódica de restore | Media | Crítico cuando datos reales son insustituibles |

## 7. Plan de mitigación detallado

### 7.1 Orden recomendado de ejecución

> Reorganizado según las decisiones de §0. El orden refleja la coordinación con el merge schedule+checklist.

#### Sprint 0 — Paralelo a scheduler/checklist (puede empezar HOY)

**Branch sugerido:** `chore/audit-prep-sprint-0` (separado de `feature/ai-schedule-generator`).

1. **H1-1** (docs CLAUDE.md + README.md) — corregir la mentira "JWT migrated to sessions". Sin esto, cualquier sesión IA posterior toma decisiones erradas.
2. **H1-12** (deshabilitar demo): cambiar password a aleatorio + `is_active=0` + quitar de `MASTER_INSTALL_AIVEN.sql`. Aplicar en Aiven manualmente sin reinstalar (`UPDATE users SET is_active=0, password=? WHERE username='demo';`).
3. **H1-15** (tests regresión auth): vitest sobre login OK, login KO, refresh, logout, demo whitelist (POSTs permitidos vs bloqueados). Esta es la **red de seguridad** antes de Sprint 1.

**Salida esperada:** PR pequeño a `main` con docs + SQL del demo + carpeta `tests/auth/`. Verde, mergeable.

#### Hito intermedio — Merge schedule+checklist

Trabajo que el dueño completa en `feature/ai-schedule-generator` y branches de checklist según `TODO.md` y `SCHEDULING-SOLVER-PLAN.md` Fase 3:
- B-2 migración Aiven `scheduling_employee_requests`.
- Fase 3 paso 1 — tabla `scheduling_solver_runs`.
- Fase 3 paso 2 — UX infeasibilidad.
- B-3 `Promise.allSettled` en `schedule-generate.controller.ts:117`.
- `MIN_NIGHTS_REQUIRED` leer de config.
- Fix Maintenance UI (tabs/búsqueda).

Cuando esto entre a `main` y aguante 24h en producción → arrancar Sprint 1.

#### Sprint 1 — Endurecimiento auth + observabilidad (5-7 días)

**Branch sugerido:** `feature/auth-hardening` desde `main` ya con scheduler.

1. **H1-2, H1-8** (rate limits auth) — primero porque son el mayor blocker bruteforce.
2. **H1-7** (sacar refresh token del body) — preparación para H2-1 (sin esto, la rotación tiene un leak persistente).
3. **H1-3** (apiLimiter global) — probar con un budget alto inicialmente.
4. **H1-4, H1-5, H1-6** (helmet + body limit + CORS Origin) — endurecimiento HTTP.
5. **H1-9, H1-10** (limpieza dead code passport + DEV_MODE).
6. **H1-11** (.env.example).
7. **H1-13, H1-14** (Sentry + Pino) — debe estar antes de H2-1 para tener observabilidad si la rotación produce errores en producción.

#### Sprint 2 — Refresh rotation + Cloudflare (5-7 días)

**Branch sugerido:** `feature/refresh-rotation`.

1. **H2-1 (promovido)** — tabla `refresh_tokens`, rotación cada uso, revocación al logout y al cambio de password. Tests específicos (login, refresh consume token viejo, logout revoca).
2. **H1-16** (render.yaml/vercel.json) — antes o en paralelo con la rotación, da igual.
3. **H1-17 (Cloudflare Access)** — al final del sprint, tras verificar que la rotación no rompe el flujo cross-origin con cookies. Testear primero en preview Vercel.

**Después → datos reales empiezan a entrar.** A partir de aquí, el horizonte 2 se hace con la plataforma viva, lo que aumenta el riesgo de cada cambio. Por eso es importante completar Sprint 0 + 1 + 2 antes.

### 7.2 Cómo abordar los riesgos del refactor

- **Cualquier cambio en auth se prueba con tests de regresión primero** (H1-15). Sin tests, no se toca.
- **Despliegues escalonados**: probar cada cambio en staging (rama separada de Vercel preview) antes de pushear a `main`.
- **Backups Aiven** automáticos (Aiven los hace), pero **prueba manualmente un restore** una vez antes de meter datos reales. Si el restore no funciona, es información crítica que no quieres descubrir tras un incidente.
- **Nunca tocar `MASTER_INSTALL_AIVEN.sql`** sin probar primero localmente con `MASTER_INSTALL_LOCAL.sql` el mismo cambio.

### 7.3 Métricas de éxito de la fase H1

- 0 hallazgos críticos abiertos en `Global-Plan.md §3.5`.
- Tests de regresión auth pasan en CI.
- Sentry recibe el primer error de prueba intencionado.
- Demo no responde a login (verificar en producción).
- `helmet` reporta cabeceras esperadas en `securityheaders.com`.
- `loginLimiter` triggera 429 tras 6 intentos en 15 min (test manual).

---

## Anexos

### A. Glosario de archivos críticos

| Función | Archivo |
|---|---|
| Bootstrap backend | `backend/index.ts` |
| Config DB | `backend/config/db.ts` |
| Config app | `backend/config/config.ts` |
| Auth controller | `backend/controllers/auth/auth-controllers.ts` |
| Auth routes | `backend/routes/auth/auth-routes.ts` |
| Token service | `backend/services/auth/tokenService.ts` |
| Middleware token | `backend/middlewares/authenticateToken.ts` |
| Middleware demo | `backend/middlewares/demoRestriction.ts` |
| Middleware roles | `backend/middlewares/roleCheck.ts` |
| Rate limiters | `backend/middlewares/rateLimiter.ts` |
| Demo seed | `backend/db-mysql/aiven/15_demo_user.sql` |
| Master install Aiven | `backend/db-mysql/MASTER_INSTALL_AIVEN.sql` |
| Master install local | `backend/db-mysql/MASTER_INSTALL_LOCAL.sql` |
| Auth context FE | `frontend/app/lib/auth/useAuth.tsx` |
| API client FE | `frontend/app/lib/apiClient.ts` |
| Server fetch FE | `frontend/app/lib/serverFetch.ts` |

### B. Variables de entorno (consolidado)

**Backend (Render)**
```
NODE_ENV=production
PORT=4000
SECRET_JWT_KEY=<32+ chars random>
SALT_ROUNDS=10
DB_ENVIRONMENT=aiven
AIVEN_DB_HOST=<aiven host>
AIVEN_DB_PORT=23225
AIVEN_DB_USER=avnadmin
AIVEN_PASSWORD=<aiven password>
AIVEN_DB_NAME=hotel_db
FRONTEND_URL=https://four-points.stackbp.es
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
# Pendientes Sprint 2
SENTRY_DSN=...
LOG_LEVEL=info
```

**Frontend (Vercel)**
```
NEXT_PUBLIC_API_URL=https://api.four-points.stackbp.es
NEXTAUTH_SECRET=<si se usa next-auth>
NEXTAUTH_URL=https://four-points.stackbp.es
```

### C. Comprobaciones rápidas

```bash
# Backend
cd backend
pnpm typecheck
pnpm test
pnpm test tests/auth                 # tests específicos de auth (a crear H1-15)

# Frontend
cd frontend
pnpm lint
pnpm build                           # cazar errores de tipo en build estático

# Solver
cd backend/scheduling-solver
venv/Scripts/python -m pytest tests/

# Smoke production
curl -i https://api.four-points.stackbp.es/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"x","password":"x"}'   # debe responder 401, no 500
```

### D. Decisiones tomadas (ver §0)

| Pregunta | Decisión | Fecha |
|---|---|---|
| ¿Demo público o privado? | **Deshabilitado definitivamente** según §5.2 | 2026-05-10 |
| ¿Cloudflare Access? | **Sí** delante de four-points.stackbp.es (Sprint 2 H1-17) | 2026-05-10 |
| ¿Cuándo refresh token rotation? | **Antes de datos reales, después del merge schedule+checklist** (H2-1 promovido a Sprint 2) | 2026-05-10 |
| ¿Multi-tenancy? | **Diferida indefinidamente**; reabrir solo si HotelCode capta cliente externo | 2026-05-10 |

### E. Decisiones aún abiertas (no bloqueantes)

1. **`scheduling_employee_requests` en Aiven**: ¿incluir en el merge schedule+checklist o como hotfix posterior? Recomendación: incluir en el merge — si no, ese merge no es realmente "production-ready".
2. **Pino vs Winston**: pendiente. Pino es más rápido y JSON-native; Winston tiene más transports. Para Render con stdout, Pino es la elección obvia.
3. **Sentry tier**: free hasta 5k errores/mes — suficiente para empezar.

---

**Próximas sesiones:** este documento es la referencia. Cuando se empiece a ejecutar el roadmap, ir actualizando los IDs (`H1-1`, `H1-2`...) marcándolos como `✅ done` con fecha y commit hash al lado, y mover los hallazgos cerrados de §3.5 a una sección "Resueltos" al final.

**Próxima acción concreta:** crear branch `chore/audit-prep-sprint-0` y empezar por **H1-1** (docs) o **H1-15** (tests auth), según prefiera el dueño. H1-12 (deshabilitar demo) puede esperar al final del Sprint 0 para no perder el demo durante el desarrollo de Sprint 0 si surgiera necesidad.
