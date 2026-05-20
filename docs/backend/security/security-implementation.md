# Implementación de Seguridad - Four-Points Hotel PMS

**Última actualización:** 2026-01-16

---

## Tabla de Contenidos

1. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
2. [Rate Limiting](#rate-limiting)
3. [Protección contra Timing Attacks](#protección-contra-timing-attacks)
4. [Logging de Seguridad](#logging-de-seguridad)
5. [Sanitización XSS](#sanitización-xss)
6. [Validación de Contraseñas](#validación-de-contraseñas)
7. [CORS y Configuración de Cookies](#cors-y-configuración-de-cookies)
8. [Configuración de Git y Base de Datos](#configuración-de-git-y-base-de-datos)
9. [Testing de Seguridad](#testing-de-seguridad)
10. [Mejoras Pendientes](#mejoras-pendientes)
11. [Archivos del Sistema](#archivos-del-sistema)
12. [Referencias](#referencias)

---

## Estado Actual del Proyecto

### ✅ Completado

| Área | Descripción |
|------|-------------|
| **Variables de entorno** | Helper `env.ts` unificado, `.env.example` simplificado |
| **Route Handlers** | Validación de método, origen, cookies y mensajes claros |
| **Tokens/Auth** | Solo cookies HttpOnly, eliminado `localStorage` |
| **React Query** | BackOffice, Parking y Maintenance migrados |
| **Seguridad registro** | `/register` protegido (solo admin real) |
| **Demo mode** | Usuario `demo-admin` con restricciones de escritura |
| **Rate limiting** | Login: 5/15min, Password: 3/hora |
| **Timing Attack Protection** |bcrypt.compare() siempre ejecutado |
| **XSS Prevention** | Sanitización de usernames |
| **Logging** | Formato `[SECURITY]` y `[AUTH]` |

### ⏳ Pendiente

| Área | Prioridad | Descripción |
|------|-----------|-------------|
| Política contraseñas | Media | Mínimo 8 chars + complejidad (mayúscula, minúscula, número) |
| Revocación de sesiones | Media | Invalidar sesiones al logout/cambio password |
| Notificación por email | Baja | Al cambiar contraseña |
| Auditoría completa | Baja | Tabla de logs en base de datos |
| 2FA | Baja | Para cuentas sensibles |
| NextAuth/middleware | Baja | Decidir activación |

---

## Rate Limiting

Implementado usando `express-rate-limit` para prevenir ataques de fuerza bruta.

### Dependencia Añadida

```json
{
  "dependencies": {
    "express-rate-limit": "^8.2.1"
  }
}
```

### Configuración por Endpoint

| Endpoint | Límite | Ventana | Clave |
|----------|--------|---------|-------|
| `POST /api/auth/login` | 5 intentos | 15 minutos | IP + username |
| `PATCH /api/auth/me/password` | 3 intentos | 1 hora | User ID |
| `PATCH /api/auth/me/profile` | 5 intentos | 15 minutos | User ID |

### Archivo de Configuración

**Archivo:** `backend/middlewares/rateLimiter.ts`

```typescript
import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  keyGenerator: (req) => `${req.ip}-${req.body?.username || ''}`,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  keyGenerator: (req) => `password-${req.user?.id || req.ip}`,
  message: {
    error: 'Demasiados intentos de cambio de contraseña. Intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  keyGenerator: (req) => `profile-${req.user?.id || req.ip}`,
  message: {
    error: 'Demasiadas actualizaciones de perfil. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
```

### Respuestas de Rate Limit

Cuando se excede el límite, el servidor responde con:

```json
{
  "error": "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos."
}
```

**HTTP Status:** `429 Too Many Requests`

### Aplicación en Rutas

**Archivo:** `backend/routes/auth/auth-routes.ts`

```typescript
import { loginLimiter, passwordChangeLimiter, profileUpdateLimiter } from '../middlewares/rateLimiter.js'

router.post('/login', loginLimiter, loginController)
router.patch('/me/password', authenticateToken, passwordChangeLimiter, updatePasswordController)
router.patch('/me/profile', authenticateToken, profileUpdateLimiter, updateProfileController)
```

---

## Protección contra Timing Attacks

### Problema

Los timing attacks pueden revelar información sobre usuarios existentes midiendo el tiempo de respuesta:
- Si el usuario no existe → respuesta rápida (sin comparación de hash)
- Si el usuario existe → respuesta lenta (comparación bcrypt)

### Solución Implementada

Siempre se ejecuta `bcrypt.compare()`, incluso si el usuario no existe:

**Archivo:** `backend/repositories/auth/user-repository.ts`

```typescript
import bcrypt from 'bcrypt'

const DUMMY_HASH = '$2b$10$dummyhashfortimingatttacksprevent'

export async function verifyLogin(username: string, password: string) {
  // Buscar usuario
  const user = await UserRepository.findByUsername(username)
  
  // Dummy hash para usuarios no encontrados
  const passwordToCompare = user?.password || DUMMY_HASH
  
  // SIEMPRE ejecutar bcrypt.compare()
  const isPasswordValid = await bcrypt.compare(password, passwordToCompare)
  
  // Verificar existencia DESPUÉS de la comparación
  if (!user || !isPasswordValid) {
    throw new Error('Credenciales inválidas')
  }
  
  // Verificar que el usuario esté activo
  if (!user.is_active) {
    throw new Error('Usuario inactivo')
  }
  
  return user
}
```

### Mensaje de Error Genérico

Para evitar enumeration attacks, se usa el mismo mensaje para:
- Usuario no encontrado
- Contraseña incorrecta
- Usuario inactivo

```
"Credenciales inválidas"
```

---

## Logging de Seguridad

### Formato de Logs

| Prefijo | Descripción | Ejemplo |
|---------|-------------|---------|
| `[SECURITY]` | Eventos de seguridad (fallos, rate limits) | Intentos de login fallidos |
| `[AUTH]` | Eventos de autenticación exitosos | Login, cambio de contraseña |
| `[DB]` | Operaciones de base de datos | Query lento, conexión |
| `[API]` | Llamadas a API | Request/response, errores |

### Eventos Registrados

```
[SECURITY] Login failed - user not found: johndoe
[SECURITY] Login failed - invalid password for user: johndoe
[SECURITY] Login failed - inactive user: johndoe
[SECURITY] Rate limit exceeded for login attempt from IP: 192.168.1.1
[SECURITY] Password change failed - invalid current password for user ID: abc123
[SECURITY] Profile update failed - invalid password for user ID: abc123

[AUTH] User logged in successfully: johndoe
[AUTH] Password changed successfully for user ID: abc123
[AUTH] Profile updated for user ID: abc123 (new username: johndoe_new)
```

### Implementación

**Archivo:** `backend/controllers/auth/auth-controllers.ts`

```typescript
import { logger } from '../../config/logger.js'

export async function loginController(req, res) {
  try {
    const { username, password } = req.body
    const user = await UserRepository.verifyLogin(username, password)
    
    // Generar JWT y setear cookies HttpOnly
    const { accessToken, refreshToken } = generateTokens(user)
    setAuthCookies(res, accessToken, refreshToken)
    
    logger.info(`[AUTH] User logged in successfully: ${username}`)
    
    res.json({ success: true, user: { id: user.id, username, role: user.role } })
  } catch (error) {
    logger.warn(`[SECURITY] Login failed - ${error.message}: ${req.body?.username}`)
    res.status(401).json({ error: 'Credenciales inválidas' })
  }
}
```

### Uso en Producción

Estos logs pueden ser:
- Enviados a un servicio de monitoreo (DataDog, Sentry, etc.)
- Almacenados para auditoría
- Configurados con alertas para patrones sospechosos

---

## Sanitización XSS

### Reglas de Username

| Validación | Descripción |
|------------|-------------|
| Caracteres permitidos | `a-z`, `A-Z`, `0-9`, `_` |
| Longitud mínima | 3 caracteres |
| Longitud máxima | 50 caracteres |

### Validación con Zod (Frontend + Backend)

**Archivo:** `backend/validations/auth/user-validation.ts`

```typescript
import { z } from 'zod'

const usernameSchema = z.string()
  .min(3, 'El username debe tener al menos 3 caracteres')
  .max(50, 'El username no puede exceder 50 caracteres')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Solo letras, números y guiones bajos'
  )

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email('Email inválido'),
  password: z.string().min(6).max(100),
  role_id: z.number().int().positive(),
})

const loginSchema = z.object({
  username: z.string().min(1, 'Username requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
})
```

### Sanitización en Repositorio (Defense in Depth)

**Archivo:** `backend/repositories/auth/user-repository.ts`

```typescript
function sanitizeUsername(username: string): string {
  // Solo permitir letras, números y guiones bajos
  const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '')
  // Limitar longitud
  return sanitized.slice(0, 50)
}

function sanitizeInput(input: string): string {
  // Eliminar caracteres HTML potencialmente peligrosos
  const sanitized = input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  return sanitized
}

export async function createUser(data: CreateUserData) {
  const sanitizedUsername = sanitizeUsername(data.username)
  const sanitizedEmail = sanitizeInput(data.email)
  
  // Verificar que no esté vacío tras sanitización
  if (sanitizedUsername.length < 3) {
    throw new Error('Username inválido tras sanitización')
  }
  
  // Continuar con la creación...
}
```

### Dónde se Aplica

- `UserRepository.create()` - Creación de usuarios
- `UserRepository.updateProfile()` - Actualización de perfil
- `UserRepository.updateUsername()` - Cambio de username

---

## Validación de Contraseñas

### Reglas de Validación

| Campo | Regla |
|-------|-------|
| `currentPassword` | Requerido |
| `newPassword` | Mínimo 6 caracteres, máximo 100 |
| `confirmPassword` | Debe coincidir con `newPassword` |
| **Nueva regla** | `newPassword` debe ser diferente a `currentPassword` |

### Implementación (Zod Schema)

**Archivo:** `backend/validations/auth/user-validation.ts`

```typescript
const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña no puede exceder 100 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmación de contraseña requerida'),
})
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  })
```

### Validación en Backend (Defense in Depth)

**Archivo:** `backend/repositories/auth/user-repository.ts`

```typescript
export async function updatePassword(userId: string, currentPassword: string, newPassword: string) {
  // Verificar contraseña actual
  const user = await UserRepository.findById(userId)
  if (!user) {
    throw new Error('Usuario no encontrado')
  }
  
  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    throw new Error('Contraseña actual incorrecta')
  }
  
  // Verificar que la nueva contraseña sea diferente
  if (currentPassword === newPassword) {
    throw new Error('La nueva contraseña debe ser diferente a la actual')
  }
  
  // Hashear nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  // Actualizar en base de datos
  await UserRepository.updatePassword(userId, hashedPassword)
}
```

---

## CORS y Configuración de Cookies

### Configuración CORS

**Archivo:** `backend/index.ts`

```typescript
import cors from 'cors'

const allowedOrigins = [
  'http://localhost:3000',
  'https://four-points.stackbp.es',
  'https://four-points.vercel.app',
  'https://api.four-points.stackbp.es',
  'https://four-points.onrender.com',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (Postman, apps móviles)
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.log('❌ CORS bloqueado para:', origin)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true, // ← CRÍTICO para cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
)
```

### Problema: Previews de Vercel

Las URLs de preview tienen formato dinámico:
```
https://four-points-XXXXX-bpstacks-projects.vercel.app
```

### Solución Recomendada

```typescript
const vercelPreviewPattern = /^https:\/\/four-points-.*\.vercel\.app$/

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
```

### Configuración de Cookies

**Dos Configuraciones Disponibles**

#### Configuración A: Cross-Site (Para Vercel Preview)

```typescript
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
}
```

| Entorno | Funciona |
|---------|----------|
| Producción | ✅ |
| Preview Vercel | ✅ |
| Localhost | ✅ |

#### Configuración B: Same-Site (Más restrictiva)

```typescript
const COOKIE_DOMAIN = '.four-points.stackbp.es'

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(process.env.NODE_ENV === 'production' ? { domain: COOKIE_DOMAIN } : {}),
}
```

| Entorno | Funciona |
|---------|----------|
| Producción | ✅ |
| Preview Vercel | ❌ |
| Localhost | ✅ |

**Estado actual:** Configuración B (Same-Site / `sameSite: 'lax'`)

---

## Configuración de Git y Base de Datos

### .gitignore Recomendado

```gitignore
# ========================================
# 🔒 VARIABLES DE ENTORNO Y SECRETOS
# ========================================
.env
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local

# Claves privadas
*.key
*-key.pem
*.p12
*.pfx
client-cert.pem
ca-certificate.pem

# ========================================
# 📦 NODE / NPM / PNPM
# ========================================
node_modules/
.pnpm-store/
*.log

# ========================================
# 🗄️ BASES DE DATOS
# ========================================
*.sql
backup*.sql
dump*.sql
db-backup/
*.sqlite
*.sqlite3
*.db

# ========================================
# 🏗️ BUILD
# ========================================
dist/
build/
.next/

# ========================================
# 💻 SISTEMA OPERATIVO
# ========================================
.DS_Store
Thumbs.db
*.swp
*.tmp

# ========================================
# 🛠️ IDEs
# ========================================
.vscode/
.idea/
*.sublime-project
*.sublime-workspace
```

### Archivos SEGUROS para Git

| Archivo | ¿En Git? | Razón |
|---------|----------|-------|
| `.env.example` | ✅ Sí | Template sin passwords |
| `.gitignore` | ✅ Sí | Configuración |
| `config/db.ts` | ✅ Sí | Sin credentials |
| `config/certs/ca-certificate.pem` | ⚠️ Revisar | Si es público en Aiven |

### Archivos PROHIBIDOS en Git

| Archivo | Razón |
|---------|-------|
| `.env` | Credentials reales |
| `*.sql` | Datos sensibles |
| `backup*.sql` | Backups completos |
| `ca-certificate.pem` | Si contiene secrets |

### Verificación de Seguridad

```bash
# Verificar que .env NO está en git
git status | grep "\.env$"

# Verificar que no hay passwords
git show HEAD:config/db.ts | grep -i "password\|avns_"

# Verificar estructura
git ls-files | grep -E "\.env|config/"

# Limpiar historial (si expusiste credenciales)
git reset --soft HEAD~1
git add .
git commit -m "fix: Limpiar historial de git"
git push origin main --force
```

---

## Testing de Seguridad

### Probar Rate Limiting

```bash
# Intentar login 6 veces seguidas
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  echo ""
done
```

El 6to intento debería retornar `429 Too Many Requests`.

### Probar Timing Attack Protection

```bash
# Medir tiempo con usuario inexistente
time curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"noexiste","password":"test123"}'

# Medir tiempo con usuario existente pero contraseña incorrecta
time curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpass"}'
```

Ambos deberían tomar aproximadamente el mismo tiempo (~100-200ms).

### Probar Sanitización XSS

```bash
# Intentar crear usuario con caracteres especiales
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","password":"test123","role_id":1}'

# Debe ser rechazado o sanitizado
```

### Probar Rate Limit de Contraseña

```bash
# 4 intentos de cambio de contraseña fallidos
for i in {1..4}; do
  curl -X PATCH http://localhost:4000/api/auth/me/password \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"currentPassword":"wrong","newPassword":"test123","confirmPassword":"test123"}'
  echo ""
done

# El 4to intento debería fallar por rate limit
```

---

## Mejoras Pendientes

### 1. Política de contraseñas más robusta

**Riesgo:** MEDIO  
**Archivo:** `backend/validations/auth/user-validation.ts`

**Implementación recomendada:**
```typescript
password: z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(100, 'La contraseña no puede exceder 100 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'
  )
```

### 2. Revocación de sesiones

**Riesgo:** MEDIO

**SQL:**
```sql
CREATE TABLE revoked_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires (expires_at)
);
```

### 3. Notificación por email al cambiar contraseña

**Riesgo:** BAJO

**Implementación:**
```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendPasswordChangeNotification(email: string, username: string) {
  await transporter.sendMail({
    from: '"Four-Points Hotel" <noreply@four-points.stackbp.es>',
    to: email,
    subject: 'Tu contraseña ha sido cambiada',
    text: `Hola ${username}, tu contraseña ha sido cambiada el ${new Date().toISOString()}. Si no fuiste tú, contacta inmediatamente con soporte.`,
    html: `<p>Hola ${username},</p><p>Tu contraseña ha sido cambiada el ${new Date().toLocaleString()}.</p><p>Si no fuiste tú, contacta inmediatamente con soporte.</p>`,
  })
}
```

### 4. Auditoría completa

**Riesgo:** BAJO

**Tabla de auditoría:**
```sql
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(100),
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

### 5. Implementar CAPTCHA

**Riesgo:** BAJO

Tras 3 intentos fallidos, mostrar CAPTCHA antes del 4to intento.

---

## Archivos del Sistema

### Backend

```
backend/middlewares/
├── authenticateToken.ts      # Middleware JWT (access_token cookie / Bearer header)
├── roleCheck.ts              # Control de acceso por roles
├── demoRestriction.ts        # Restricciones para demo
└── rateLimiter.ts            # Rate limiting

backend/validations/auth/
├── user-validation.ts        # Zod schemas
└── logbook-validation.ts     # Validaciones de logbook

backend/repositories/auth/
└── user-repository.ts        # Repositorio de usuarios

backend/controllers/auth/
├── auth-controllers.ts       # Controladores de auth
└── ...

backend/config/
├── db.ts                     # Conexión MySQL
└── certs/                    # Certificados SSL (Aiven)

backend/routes/auth/
└── auth-routes.ts            # Rutas de autenticación

backend/package.json
└── dependencies: express-rate-limit, bcrypt, jsonwebtoken
```

### Frontend

```
frontend/app/lib/
├── auth/
│   ├── authService.ts        # Servicio de autenticación
│   ├── cookieHandler.ts      # Manejo de cookies
│   └── useAuth.tsx           # Hook de autenticación
└── helpers/
    └── error-utils.ts        # Utilidades de errores

frontend/app/middleware.ts    # Middleware de Next.js

frontend/package.json
└── dependencies: next-intl, react-hook-form, zod
```

### Base de Datos

```
backend/db-mysql/
├── 02_core_tables.sql        # Tabla users, roles, departments
├── 14_messages.sql           # Sistema de mensajería
└── ...

# Para producción (Aiven)
backend/db-mysql/aiven/
└── [mismos archivos con utf8mb4_0900_ai_ci]
```

---

## Referencias

### Guías Oficiales

- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JWT Best Practices](https://auth0.com/blog/jwt-handbook/)
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [express-session](https://github.com/expressjs/session)
- [next-intl](https://next-intl-docs.vercel.app/)

### Documentación Relacionada

- `auth/productionAuthSetup.md` - Arquitectura de autenticación y deploy
- `testing/README.md` - Documentación de testing

---

**Documento unificado:** 2026-01-16
**Fuentes:** `frontend/docs/SECURITY.md`, `docs/backend/security/security-plan.md`, `docs/backend/security/database-security.md`
