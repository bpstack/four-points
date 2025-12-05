# 📘 DOCUMENTACIÓN COMPLETA: MIGRACIÓN DE JWT A SESSIONS

**Sistema de Autenticación para Hotel - Migración a Express-Session**

---

## 📑 ÍNDICE

1. [Contexto y Objetivos](#1-contexto-y-objetivos)
2. [Pre-requisitos](#2-pre-requisitos)
3. [Arquitectura: Antes vs Después](#3-arquitectura-antes-vs-después)
4. [FASE 1: Preparación y Backup](#fase-1-preparación-y-backup)
5. [FASE 2: Backend - Instalación y Configuración](#fase-2-backend---instalación-y-configuración)
6. [FASE 3: Backend - Migración de Auth Controllers](#fase-3-backend---migración-de-auth-controllers)
7. [FASE 4: Backend - Migración de Middlewares](#fase-4-backend---migración-de-middlewares)
8. [FASE 5: Frontend - Simplificación Radical](#fase-5-frontend---simplificación-radical)
9. [FASE 6: Testing y Verificación](#fase-6-testing-y-verificación)
10. [FASE 7: Limpieza Final](#fase-7-limpieza-final)
11. [Rollback Plan](#rollback-plan)
12. [Troubleshooting](#troubleshooting)

---

## 1. CONTEXTO Y OBJETIVOS

### **Situación Actual**

- ✅ Sistema JWT + Refresh Tokens funcional
- ✅ LocalStorage en desarrollo
- ⚠️ Complejidad alta para caso de uso simple (hotel interno, 10-20 usuarios)

### **Objetivo de la Migración**

- 🎯 Simplificar autenticación con express-session
- 🎯 Eliminar complejidad de refresh tokens
- 🎯 Mejorar seguridad con sesiones server-side
- 🎯 Mantener funcionalidad actual (roles, permisos, rutas protegidas)

### **¿Por qué Sessions para tu caso?**

| Aspecto     | Tu Necesidad                   | Solución con Sessions          |
| ----------- | ------------------------------ | ------------------------------ |
| Usuarios    | 10-20 internos                 | ✅ Perfecto para este volumen  |
| Control     | Invalidar sesiones al instante | ✅ Borras de DB y listo        |
| Complejidad | Simple de mantener             | ✅ Menos código, menos bugs    |
| Logout      | Real y efectivo                | ✅ Destruye sesión en servidor |

---

## 2. PRE-REQUISITOS

### **Antes de empezar:**

✅ **Sistema actual funcionando con localStorage**  
✅ **Git con commits limpios** (para rollback si falla)  
✅ **Backup de la base de datos**  
✅ **Node.js >= 16**  
✅ **MySQL >= 5.7**  
✅ **Tiempo estimado: 2-3 horas**

### **Variables de entorno necesarias:**

```bash
# Backend .env
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=hotel_db
SESSION_SECRET=tu_clave_super_secreta_cambiar_en_produccion  # ← NUEVA
```

---

## 3. ARQUITECTURA: ANTES VS DESPUÉS

### **ANTES (JWT + Refresh Tokens + localStorage)**

```
┌─────────────┐          ┌──────────────┐
│   Frontend  │          │   Backend    │
│             │          │              │
│ localStorage├─────────►│ JWT Verify   │
│  - access   │  Bearer  │              │
│  - refresh  │  Token   │ tokenService │
│             │          │              │
│ Auto-refresh│◄─────────┤ refresh-token│
│  logic      │   401    │  endpoint    │
└─────────────┘          └──────────────┘
                                │
                         (stateless)
```

### **DESPUÉS (Sessions + MySQL)**

```
┌─────────────┐          ┌──────────────┐          ┌──────────┐
│   Frontend  │          │   Backend    │          │  MySQL   │
│             │          │              │          │          │
│   (vacío)   ├─────────►│req.session   │◄─────────┤ sessions │
│             │  Cookie  │              │  Query   │  table   │
│ credentials │  Auto    │express-session          │          │
│  'include'  │          │              │          │ Persist  │
└─────────────┘          └──────────────┘          └──────────┘
                                │
                         (stateful)
```

---

## FASE 1: PREPARACIÓN Y BACKUP

### **Paso 1.1: Crear branch de migración**

```bash
git checkout -b migration/jwt-to-sessions
git add .
git commit -m "💾 Backup antes de migración a sessions"
```

### **Paso 1.2: Backup de la base de datos**

```bash
mysqldump -u root -p hotel_db > backup_before_sessions_$(date +%Y%m%d).sql
```

### **Paso 1.3: Documentar estado actual**

Crea `docs/PRE_MIGRATION_STATE.md`:

```markdown
# Estado Pre-Migración

**Fecha:** [HOY]
**Sistema:** JWT + Refresh Tokens + localStorage

## Archivos clave actuales:

- Backend:
  - `controllers/auth-controllers.js` (login con JWT)
  - `middleware/authenticateToken.js` (verifica JWT)
  - `services/tokenService.js` (genera/verifica tokens)
- Frontend:
  - `app/lib/auth/api.ts` (auto-refresh)
  - `app/lib/login/authLogin.ts` (localStorage)

## Tests que funcionan:

- ✅ Login guarda tokens en localStorage
- ✅ Auto-refresh cuando token expira
- ✅ Rutas protegidas funcionan
- ✅ Roles (admin/recepcionista) funcionan
```

---

## FASE 2: BACKEND - INSTALACIÓN Y CONFIGURACIÓN

### **Paso 2.1: Instalar dependencias**

```bash
cd backend  # O donde esté tu servidor
npm install express-session express-mysql-session
```

**Versiones recomendadas:**

```json
{
  "express-session": "^1.18.0",
  "express-mysql-session": "^3.0.3"
}
```

### **Paso 2.2: Crear archivo de configuración de sesión**

**Archivo NUEVO:** `backend/config/sessionConfig.js`

```javascript
// config/sessionConfig.js
import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'
import mysql from 'mysql2/promise'

const MySQLStore = MySQLStoreFactory(session)

// Pool de conexiones (reutiliza el que ya tienes o crea uno nuevo)
const sessionPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5, // Menos conexiones que el pool principal
  queueLimit: 0,
})

// Configuración del store de sesiones
const sessionStore = new MySQLStore(
  {
    clearExpired: true, // Limpia sesiones expiradas automáticamente
    checkExpirationInterval: 900000, // Cada 15 minutos
    expiration: 28800000, // 8 horas por defecto
    createDatabaseTable: true, // Crea tabla 'sessions' si no existe
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data',
      },
    },
  },
  sessionPool
)

// Configuración de la sesión
export const sessionConfig = {
  key: 'hotel_session', // Nombre de la cookie
  secret: process.env.SESSION_SECRET || 'CAMBIAR_EN_PRODUCCION',
  store: sessionStore,
  resave: false, // No guardar si no hay cambios
  saveUninitialized: false, // No crear sesión hasta que haya datos
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    httpOnly: true, // No accesible desde JavaScript
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  rolling: true, // Resetea maxAge en cada request (sliding sessions)
}

// Logs de debugging (opcional)
sessionStore
  .onReady()
  .then(() => {
    console.log('✅ MySQL Session Store ready')
  })
  .catch((error) => {
    console.error('❌ Error en Session Store:', error)
  })

export default sessionConfig
```

### **Paso 2.3: Integrar en el servidor principal**

**Archivo:** `index.js` o `server.js` o `app.js`

```javascript
// index.js (o tu archivo principal)
import express from 'express'
import session from 'express-session'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { sessionConfig } from './config/sessionConfig.js'

const app = express()

// ========================================
// MIDDLEWARES BÁSICOS
// ========================================
app.use(express.json())
app.use(cookieParser())

// ========================================
// CORS (IMPORTANTE: credentials true)
// ========================================
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // ← CRÍTICO para que las cookies funcionen
    exposedHeaders: ['Set-Cookie'],
  })
)

// ========================================
// SESSION MIDDLEWARE (NUEVO)
// ========================================
app.use(session(sessionConfig))

// Debugging middleware (opcional, quitar en producción)
app.use((req, res, next) => {
  if (req.session && req.session.user) {
    console.log(
      `[Session] Usuario: ${req.session.user.username}, Session ID: ${req.sessionID}`
    )
  }
  next()
})

// ========================================
// TUS RUTAS (sin cambios)
// ========================================
import authRoutes from './routes/auth-routes.js'
import userRoutes from './routes/user-routes.js'
// ... resto de imports

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
// ... resto de rutas

// ========================================
// INICIAR SERVIDOR
// ========================================
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV}`)
  console.log(`🔐 Sessions enabled with MySQL store`)
})
```

### **Paso 2.4: Verificar que la tabla sessions se creó**

```sql
-- Ejecutar en MySQL
USE hotel_db;
SHOW TABLES LIKE 'sessions';

-- Debería mostrar:
+-------------------------+
| Tables_in_hotel_db (sessions) |
+-------------------------+
| sessions                |
+-------------------------+

-- Ver estructura
DESC sessions;

-- Resultado esperado:
+------------+--------------+------+-----+---------+-------+
| Field      | Type         | Null | Key | Default | Extra |
+------------+--------------+------+-----+---------+-------+
| session_id | varchar(128) | NO   | PRI | NULL    |       |
| expires    | int unsigned | NO   |     | NULL    |       |
| data       | mediumtext   | YES  |     | NULL    |       |
+------------+--------------+------+-----+---------+-------+
```

---

## FASE 3: BACKEND - MIGRACIÓN DE AUTH CONTROLLERS

### **Paso 3.1: Crear nuevo archivo de controladores**

**Archivo NUEVO:** `controllers/auth-controllers-sessions.js`

```javascript
// controllers/auth-controllers-sessions.js
import { UserRepository } from '../../repositories/auth/user-repository.js'
import {
  validateUser,
  getValidationErrors,
} from '../../validations/auth/user-validation.js'

/**
 * ✅ LOGIN CON SESSIONS
 * Crea sesión en el servidor y envía cookie al cliente
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
      })
    }

    // Validar credenciales (sin cambios)
    const user = await UserRepository.login({ username, password })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // ✅ NUEVO: Crear sesión en lugar de generar JWT
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    }

    // Opcional: Tracking de login
    req.session.loginAt = new Date().toISOString()
    req.session.ipAddress = req.ip

    // Eliminar contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = user

    console.log(
      `[Login] Usuario ${user.username} autenticado. Session ID: ${req.sessionID}`
    )

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      sessionId: req.sessionID, // Solo para debugging, quitar en producción
    })
  } catch (error) {
    console.error('[Login] Error:', error)
    res.status(401).json({
      error: error.message || 'Invalid credentials',
    })
  }
}

/**
 * ✅ LOGOUT CON SESSIONS
 * Destruye la sesión en el servidor
 */
export const logout = (req, res) => {
  const username = req.session?.user?.username || 'Unknown'
  const sessionId = req.sessionID

  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout] Error al destruir sesión:', err)
      return res.status(500).json({
        error: 'Error al cerrar sesión',
      })
    }

    // Limpiar la cookie en el cliente
    res.clearCookie('hotel_session', {
      path: '/',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    })

    console.log(
      `[Logout] Usuario ${username} cerró sesión. Session ID: ${sessionId}`
    )

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente',
    })
  })
}

/**
 * ✅ OBTENER USUARIO ACTUAL
 * Lee de req.session en lugar de verificar JWT
 */
export const me = async (req, res) => {
  try {
    // El middleware authenticateSession ya verificó req.session.user
    // y lo copió a req.user
    const user = await UserRepository.getById(req.user.id)

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Eliminar contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('[Me] Error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

/**
 * ✅ REGISTRO (sin cambios significativos)
 */
export const register = async (req, res) => {
  const validationResult = validateUser(req.body)

  if (!validationResult.success) {
    return res.status(400).json({
      errors: getValidationErrors(validationResult),
    })
  }

  const { username, email, password, role } = req.body

  try {
    const user = await UserRepository.create({
      username,
      email,
      password,
      role,
    })

    // Opcional: Auto-login después del registro
    // req.session.user = {
    //   id: user.id,
    //   username: user.username,
    //   role: user.role
    // }

    res.status(201).json({ success: true, user })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: error.message })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('[Register] Error:', error)
    }

    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * ✅ LOGOUT DE TODOS LOS DISPOSITIVOS (BONUS)
 * Elimina todas las sesiones de un usuario
 */
export const logoutAll = async (req, res) => {
  try {
    const userId = req.session.user.id
    const username = req.session.user.username

    // Importar el pool de MySQL
    import('../../repositories/auth/user-repository.js').then(
      async ({ pool }) => {
        // Eliminar todas las sesiones de este usuario
        await pool.query(`DELETE FROM sessions WHERE data LIKE ?`, [
          `%"id":"${userId}"%`,
        ])

        console.log(`[LogoutAll] Todas las sesiones de ${username} eliminadas`)

        res.json({
          success: true,
          message: 'Todas las sesiones cerradas en todos los dispositivos',
        })
      }
    )
  } catch (error) {
    console.error('[LogoutAll] Error:', error)
    res.status(500).json({ error: 'Error al cerrar sesiones' })
  }
}
```

### **Paso 3.2: Renombrar archivo antiguo**

```bash
# Renombrar el antiguo (no eliminar todavía, por si necesitas rollback)
mv controllers/auth-controllers.js controllers/auth-controllers-JWT-BACKUP.js

# Renombrar el nuevo
mv controllers/auth-controllers-sessions.js controllers/auth-controllers.js
```

---

## FASE 4: BACKEND - MIGRACIÓN DE MIDDLEWARES

### **Paso 4.1: Crear nuevo middleware de autenticación**

**Archivo NUEVO:** `middleware/authenticateSession.js`

```javascript
// middleware/authenticateSession.js

/**
 * Middleware para verificar que existe una sesión válida
 * Reemplaza a authenticateToken.js
 */
export function authenticateSession(req, res, next) {
  // Express-session ya parseó la cookie y cargó req.session

  // Verificar que existe sesión y tiene usuario
  if (!req.session || !req.session.user) {
    console.log('[Auth] Acceso denegado: No hay sesión activa')
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Debes iniciar sesión',
    })
  }

  // Opcional: Verificar que la sesión no expiró
  // (express-session ya lo maneja, pero puedes añadir lógica custom)

  // Copiar usuario de la sesión a req.user para compatibilidad
  // con tus middlewares de roles existentes
  req.user = req.session.user

  // Opcional: Actualizar timestamp de última actividad
  req.session.lastActivity = new Date().toISOString()

  // Opcional: Touch session para resetear el timer (sliding sessions)
  req.session.touch()

  console.log(`[Auth] Usuario ${req.user.username} autenticado via sesión`)

  next()
}

/**
 * Middleware opcional: Verificar inactividad
 * Si el usuario lleva más de X tiempo inactivo, cerrar sesión
 */
export function checkInactivity(maxInactiveMinutes = 30) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return next()
    }

    const lastActivity = new Date(
      req.session.lastActivity || req.session.loginAt
    )
    const now = new Date()
    const minutesInactive = (now - lastActivity) / 1000 / 60

    if (minutesInactive > maxInactiveMinutes) {
      console.log(
        `[Auth] Sesión inactiva (${minutesInactive.toFixed(
          1
        )} min). Cerrando...`
      )

      req.session.destroy((err) => {
        if (err) console.error('[Auth] Error al destruir sesión inactiva:', err)
      })

      return res.status(401).json({
        error: 'Sesión expirada por inactividad',
        message: `Tu sesión expiró después de ${maxInactiveMinutes} minutos de inactividad`,
      })
    }

    next()
  }
}
```

### **Paso 4.2: Actualizar rutas para usar nuevo middleware**

**Archivo:** `routes/auth-routes.js`

```javascript
// routes/auth-routes.js
import { Router } from 'express'
import * as authController from '../controllers/auth-controllers.js'
import { authenticateSession } from '../middleware/authenticateSession.js' // ← NUEVO
// import { authenticateToken } from '../middleware/authenticateToken.js'  // ← ANTIGUO (comentar)

const router = Router()

// Rutas públicas (sin cambios)
router.post('/login', authController.login)
router.post('/register', authController.register)

// Rutas protegidas (CAMBIAR middleware)
router.post('/logout', authenticateSession, authController.logout) // ← NUEVO
router.get('/me', authenticateSession, authController.me) // ← NUEVO

// Bonus: Logout de todos los dispositivos
router.post('/logout-all', authenticateSession, authController.logoutAll)

export default router
```

**Archivo:** `routes/user-routes.js` (y TODAS las rutas protegidas)

```javascript
// routes/user-routes.js
import { Router } from 'express'
import * as userController from '../controllers/user-controller.js'
import { authenticateSession } from '../middleware/authenticateSession.js' // ← CAMBIAR
import { isAdmin, isOwnerOrAdmin } from '../middleware/roleCheck.js' // ← Sin cambios

const router = Router()

// ✅ CAMBIAR authenticateToken por authenticateSession en TODAS las rutas
router.get('/', authenticateSession, isAdmin, userController.getAll)
router.get('/:id', authenticateSession, isOwnerOrAdmin, userController.getById)
router.put('/:id', authenticateSession, isOwnerOrAdmin, userController.update)
router.delete('/:id', authenticateSession, isAdmin, userController.delete)

export default router
```

### **Paso 4.3: El middleware de roles NO cambia**

**Archivo:** `middleware/roleCheck.js` (SIN CAMBIOS)

```javascript
// middleware/roleCheck.js (EXACTAMENTE IGUAL)

export function isAdmin(req, res, next) {
  const allowedRoles = ['admin']

  if (!req.user?.role) {
    return res.status(403).json({
      error: 'No se pudo verificar el rol del usuario',
    })
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador',
    })
  }
}

export function isOwnerOrAdmin(req, res, next) {
  const resourceUserId = req.params.id
  const requestingUserId = req.user.id
  const userRole = req.user.role?.toLowerCase()

  if (userRole === 'admin') {
    return next()
  }

  if (resourceUserId === requestingUserId) {
    return next()
  }

  res.status(403).json({
    error: 'No tienes permiso para acceder a este recurso',
  })
}
```

**¿Por qué no cambia?** Porque sigue usando `req.user`, que `authenticateSession` establece igual que `authenticateToken` lo hacía.

### **Paso 4.4: Renombrar archivos antiguos**

```bash
# Backup del antiguo middleware (no eliminar todavía)
mv middleware/authenticateToken.js middleware/authenticateToken-JWT-BACKUP.js

# Eliminar tokenService (ya no se usa)
mv services/tokenService.js services/tokenService-JWT-BACKUP.js
```

---

## FASE 5: FRONTEND - SIMPLIFICACIÓN RADICAL

### **Paso 5.1: Simplificar authLogin.ts**

**Archivo:** `app/lib/login/authLogin.ts`

```typescript
// app/lib/login/authLogin.ts
'use client'

/**
 * Servicio de autenticación con SESSIONS
 * ✅ VERSIÓN FINAL - Mucho más simple que JWT
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const authLogin = {
  /**
   * Login: La sesión se maneja automáticamente por cookies
   */
  login: async (username: string, password: string) => {
    console.log('[authLogin.login] Iniciando para:', username)

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ← CRÍTICO: Envía/recibe cookies automáticamente
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const message = data?.error || data?.message || 'Login failed'
      throw new Error(message)
    }

    const data = await res.json()
    console.log('[authLogin.login] ✅ Login exitoso:', data.user.username)

    // ✅ NO HAY localStorage
    // ✅ NO HAY tokens que guardar
    // La cookie se maneja automáticamente

    return data
  },

  /**
   * Logout: Destruye la sesión en el servidor
   */
  logout: async () => {
    console.log('[authLogin.logout] Cerrando sesión...')

    try {
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // ← Envía la cookie de sesión
      })

      if (!res.ok) {
        throw new Error('Logout failed')
      }

      console.log('[authLogin.logout] ✅ Sesión cerrada')
    } catch (error) {
      console.error('[authLogin.logout] Error:', error)
      // Incluso si falla, limpiamos el estado local
    }
  },

  /**
   * Me: Obtiene usuario actual (la sesión va automáticamente en la cookie)
   */
  me: async () => {
    console.log('[authLogin.me] Obteniendo usuario actual...')

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      credentials: 'include', // ← Envía la cookie de sesión
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || 'Failed to fetch user')
    }

    const data = await res.json()
    console.log('[authLogin.me] ✅ Usuario obtenido:', data.user.username)
    return data.user
  },

  /**
   * BONUS: Logout de todos los dispositivos
   */
  logoutAll: async () => {
    console.log('[authLogin.logoutAll] Cerrando todas las sesiones...')

    const res = await fetch(`${API_BASE}/api/auth/logout-all`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!res.ok) {
      throw new Error('Logout all failed')
    }

    console.log('[authLogin.logoutAll] ✅ Todas las sesiones cerradas')
  },
}
```

### **Paso 5.2: ELIMINAR api.ts (ya no se necesita)**

```bash
# El archivo de auto-refresh ya no tiene sentido
# Moverlo a backup en lugar de eliminar
mv app/lib/auth/api.ts app/lib/auth/api-JWT-BACKUP.ts
```

**¿Por qué eliminarlo?**

- ❌ No hay tokens que refrescar
- ❌ No hay lógica de reintento 401
- ❌ Las cookies se manejan automáticamente

### **Paso 5.3: Simplificar useAuth.tsx**

**Archivo:** `app/lib/login/useAuth.tsx`

```typescript
// app/lib/login/useAuth.tsx
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authLogin } from './authLogin'
import type { User } from '@/app/lib/logbooks/types'

const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/forgot-password',
  '/login',
  '/register',
]

function formatUsername(username: string): string {
  if (!username) return username
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // 🔍 Verificar sesión (SIMPLIFICADO)
  const checkSession = useCallback(async () => {
    if (PUBLIC_ROUTES.includes(pathname)) {
      console.log('[useAuth] Ruta pública, saltando verificación:', pathname)
      setLoading(false)
      return
    }

    console.log('[useAuth] Verificando sesión en:', pathname)

    try {
      const me = await authLogin.me()
      console.log('[useAuth] Sesión válida:', me.username)

      const formattedUser: User = {
        ...me,
        username: formatUsername(me.username),
      }

      setUser(formattedUser)
    } catch (error: any) {
      console.log('[useAuth] No hay sesión activa:', error?.message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [pathname])

  useEffect(() => {
    checkSession()
  }, [pathname, checkSession])

  // 🔐 Login (SIMPLIFICADO)
  const login = useCallback(
    async (username: string, password: string) => {
      console.log('[useAuth] Iniciando login para:', username)
      setLoading(true)

      try {
        const data = await authLogin.login(username, password)
        console.log('[useAuth] Login exitoso:', data.user.username)

        const formattedUser: User = {
          ...data.user,
          username: formatUsername(data.user.username),
        }

        setUser(formattedUser)
        setLoading(false)

        const searchParams = new URLSearchParams(window.location.search)
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

        console.log('[useAuth] Redirigiendo a:', callbackUrl)
        router.push(callbackUrl)
      } catch (error) {
        console.error('[useAuth] Error en login:', error)
        setLoading(false)
        throw error
      }
    },
    [router]
  )

  // 🚪 Logout (SIMPLIFICADO)
  const logout = useCallback(async () => {
    console.log('[useAuth] Cerrando sesión...')
    setLoading(true)

    try {
      await authLogin.logout()
      setUser(null)
      console.log('[useAuth] Sesión cerrada, redirigiendo a /')
      setLoading(false)
      router.replace('/')
    } catch (error) {
      console.error('[useAuth] Error en logout:', error)
      setUser(null)
      setLoading(false)
      router.replace('/')
    }
  }, [router])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext debe ser usado dentro de AuthProvider')
  }

  return context
}

export const useAuth = useAuthContext
```

### **Paso 5.4: Actualizar middleware.ts de Next.js**

**Archivo:** `middleware.ts`

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/profile', '/settings', '/admin']
const authRoutes = ['/login', '/register', '/forgot-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ⛔️ No aplicar lógica a rutas internas o APIs
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // ✅ Verificar sesión por cookie (simplificado)
  const sessionCookie = request.cookies.get('hotel_session')?.value
  const isAuthenticated = !!sessionCookie

  // 🏠 HOMEPAGE
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 🔒 PROTEGER RUTAS PRIVADAS
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 🚫 EVITAR QUE USUARIOS AUTENTICADOS VEAN LOGIN/REGISTER
  if (
    authRoutes.some((route) => pathname.startsWith(route)) &&
    isAuthenticated
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
```

### **Paso 5.5: useLogin.ts (OPCIONAL, mínimos cambios)**

**Archivo:** `app/components/forms/hooks/useLogin.ts`

```typescript
// app/components/forms/hooks/useLogin.ts
'use client'

import { useState } from 'react'
import { authLogin } from '@/app/lib/login/authLogin'

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login(username: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await authLogin.login(username, password)
      return res.user
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await authLogin.logout()
  }

  return { login, logout, loading, error }
}
```

### **Paso 5.6: ELIMINAR archivos obsoletos del frontend**

```bash
# Backend proxies (ya no se usan)
rm -rf app/api/auth/_backup_httponly_cookies  # Si migraste todo correctamente

# cookieHandler (ya no se necesita)
mv app/lib/auth/cookieHandler.ts app/lib/auth/cookieHandler-JWT-BACKUP.ts
```

---

## FASE 6: TESTING Y VERIFICACIÓN

### **Paso 6.1: Checklist de testing**

#### **TEST 1: Login**

```bash
# Con servidor corriendo
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sara","password":"tu_password"}' \
  -c cookies.txt \
  -v
```

**Verificar:**

- ✅ Status 200
- ✅ Response contiene `{ success: true, user: {...} }`
- ✅ Header `Set-Cookie` con `hotel_session=...`
- ✅ Archivo `cookies.txt` creado con la cookie

**En la base de datos:**

```sql
SELECT * FROM sessions;
-- Debe aparecer 1 fila nueva
```

---

#### **TEST 2: Ruta protegida con sesión**

```bash
# Usar la cookie del login anterior
curl http://localhost:4000/api/auth/me \
  -b cookies.txt \
  -v
```

**Verificar:**

- ✅ Status 200
- ✅ Response contiene datos del usuario
- ✅ NO hay error 401

---

#### **TEST 3: Ruta protegida SIN sesión**

```bash
# Sin enviar cookie
curl http://localhost:4000/api/auth/me -v
```

**Verificar:**

- ✅ Status 401
- ✅ Response: `{ error: "No autorizado" }`

---

#### **TEST 4: Logout**

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt \
  -v
```

**Verificar:**

- ✅ Status 200
- ✅ Response: `{ success: true, message: "..." }`

**En la base de datos:**

```sql
SELECT * FROM sessions WHERE session_id = 'el_session_id_anterior';
-- Debe devolver 0 filas (sesión eliminada)
```

---

#### **TEST 5: Frontend completo**

1. **Limpiar estado:**

   - DevTools → Application → Clear site data

2. **Ir a login:**

   - http://localhost:3000/login

3. **Hacer login:**

   - Username: sara
   - Password: tu_password

4. **Verificar en DevTools:**

   - Application → Cookies → `http://localhost:3000`
   - Debe aparecer `hotel_session` cookie

5. **Verificar localStorage:**

   - Application → Local Storage
   - Debe estar **VACÍO** (no hay access_token ni refresh_token)

6. **Navegar a dashboard:**

   - Debe entrar sin problemas

7. **Recargar página:**

   - Debe seguir autenticado (cookie persiste)

8. **Esperar 10 minutos y recargar:**

   - Debe seguir autenticado (sesión no expira si hay actividad)

9. **Hacer logout:**

   - Click en logout
   - Verificar que redirige a home
   - Verificar que cookie desaparece

10. **Intentar entrar a dashboard sin login:**
    - Debe redirigir a `/login?callbackUrl=/dashboard`

---

### **Paso 6.2: Verificar roles y permisos**

```bash
# Login como admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin_password"}' \
  -c admin_cookies.txt

# Acceder a ruta solo admin
curl http://localhost:4000/api/users \
  -b admin_cookies.txt

# Debe funcionar (200)
```

```bash
# Login como recepcionista
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"recepcionista","password":"recep_password"}' \
  -c recep_cookies.txt

# Intentar acceder a ruta solo admin
curl http://localhost:4000/api/users \
  -b recep_cookies.txt

# Debe fallar (403)
```

---

## FASE 7: LIMPIEZA FINAL

### **Paso 7.1: Eliminar archivos de backup**

```bash
# Backend
rm controllers/auth-controllers-JWT-BACKUP.js
rm middleware/authenticateToken-JWT-BACKUP.js
rm services/tokenService-JWT-BACKUP.js

# Frontend
rm app/lib/auth/api-JWT-BACKUP.ts
rm app/lib/auth/cookieHandler-JWT-BACKUP.ts
```

### **Paso 7.2: Actualizar .gitignore**

```bash
# .gitignore
# Session storage (opcional, si no quieres trackear sesiones en dev)
sessions/
*.session
```

### **Paso 7.3: Actualizar documentación**

**Archivo:** `docs/AUTHENTICATION.md`

````markdown
# Sistema de Autenticación

**Tipo:** Express-Session con MySQL Store
**Fecha migración:** [HOY]

## Flujo de autenticación

1. Usuario hace POST a `/api/auth/login`
2. Backend valida credenciales contra tabla `users`
3. Backend crea sesión en tabla `sessions`
4. Backend envía cookie `hotel_session` al cliente
5. Cliente envía cookie automáticamente en cada request
6. Backend verifica sesión en middleware `authenticateSession`

## Tabla sessions

- `session_id`: VARCHAR(128) PRIMARY KEY
- `expires`: INT (timestamp Unix)
- `data`: MEDIUMTEXT (JSON con user info)

## Duración de sesión

- **Por defecto:** 8 horas
- **Con actividad:** Se extiende automáticamente (rolling sessions)
- **Inactividad máxima:** 30 minutos (configurable)

## Logout

- **Logout simple:** Destruye sesión actual
- **Logout all:** Elimina todas las sesiones del usuario

## Rutas protegidas

Usar middleware `authenticateSession`:

```javascript
router.get('/protected', authenticateSession, controller.handler)
```
````

## Roles

Middleware `roleCheck.js` funciona sin cambios.

````

### **Paso 7.4: Commit final**

```bash
git add .
git commit -m "✅ Migración completada: JWT → Sessions

- Implementado express-session con MySQL store
- Simplificado auth controllers (sin JWT)
- Actualizado middleware authenticateSession
- Frontend simplificado (sin localStorage, sin auto-refresh)
- Tests pasando correctamente
- Documentación actualizada"
````

---

## ROLLBACK PLAN

### **Si algo falla durante la migración:**

#### **Opción 1: Rollback por Git**

```bash
# Ver commits
git log --oneline

# Volver al commit antes de la migración
git reset --hard [commit_hash_pre_migration]

# Restaurar archivos específicos
git checkout [commit_hash] -- path/to/file
```

#### **Opción 2: Restaurar archivos de backup**

```bash
# Backend
mv controllers/auth-controllers-JWT-BACKUP.js controllers/auth-controllers.js
mv middleware/authenticateToken-JWT-BACKUP.js middleware/authenticateToken.js
mv services/tokenService-JWT-BACKUP.js services/tokenService.js

# Frontend
mv app/lib/auth/api-JWT-BACKUP.ts app/lib/auth/api.ts
mv app/lib/auth/cookieHandler-JWT-BACKUP.ts app/lib/auth/cookieHandler.ts
```

#### **Opción 3: Restaurar base de datos**

```bash
# Si la tabla sessions causó problemas
mysql -u root -p hotel_db < backup_before_sessions_YYYYMMDD.sql
```

#### **Opción 4: Modo híbrido temporal**

Si necesitas mantener ambos sistemas funcionando:

```javascript
// controllers/auth-controllers.js
export const login = async (req, res) => {
  const user = await UserRepository.login(...)

  // Detectar modo por header
  const useSession = req.headers['x-auth-mode'] === 'session'

  if (useSession) {
    // Crear sesión
    req.session.user = user
  } else {
    // Generar JWT (antiguo)
    const token = generateAccessToken(user)
    res.cookie('access_token', token, { httpOnly: true })
  }

  res.json({ success: true, user })
}
```

---

## TROUBLESHOOTING

### **Problema 1: "Cannot set headers after they are sent"**

**Causa:** Múltiples `res.json()` o `res.send()` en el mismo handler

**Solución:**

```javascript
// MAL
if (error) {
  res.status(500).json({ error })
}
res.json({ success: true }) // ← ERROR

// BIEN
if (error) {
  return res.status(500).json({ error }) // ← return
}
res.json({ success: true })
```

---

### **Problema 2: "Session undefined"**

**Causa:** Middleware de session no está antes de las rutas

**Solución:**

```javascript
// index.js - ORDEN CORRECTO
app.use(express.json())
app.use(cookieParser())
app.use(cors({ credentials: true }))
app.use(session(sessionConfig)) // ← ANTES de las rutas
app.use('/api/auth', authRoutes) // ← DESPUÉS de session
```

---

### **Problema 3: Cookies no se envían entre puertos**

**Causa:** CORS mal configurado

**Solución Backend:**

```javascript
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true, // ← CRÍTICO
    exposedHeaders: ['Set-Cookie'],
  })
)
```

**Solución Frontend:**

```typescript
fetch(url, {
  credentials: 'include', // ← CRÍTICO en CADA fetch
})
```

---

### **Problema 4: Sesión no persiste después de reiniciar servidor**

**Causa:** Usando MemoryStore en lugar de MySQLStore

**Verificar:**

```javascript
// sessionConfig.js
const sessionStore = new MySQLStore({...}, sessionPool)  // ← Debe estar

app.use(session({
  store: sessionStore,  // ← Debe estar configurado
  ...
}))
```

---

### **Problema 5: "Access denied for user at host"**

**Causa:** Pool de MySQL con credenciales incorrectas

**Solución:**

```javascript
// Verificar .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_real
DB_NAME=hotel_db

// Test de conexión
const pool = mysql.createPool({...})
pool.query('SELECT 1').then(() => {
  console.log('✅ MySQL conectado')
}).catch(err => {
  console.error('❌ Error MySQL:', err)
})
```

---

### **Problema 6: Sesión expira demasiado rápido**

**Causa:** `maxAge` muy corto o `rolling: false`

**Solución:**

```javascript
// sessionConfig.js
cookie: {
  maxAge: 8 * 60 * 60 * 1000,  // ← 8 horas
},
rolling: true,  // ← Resetea el timer en cada request
```

---

### **Problema 7: Multiple sesiones por usuario**

**Comportamiento esperado:** Cada login crea nueva sesión

**Si quieres solo una sesión por usuario:**

```javascript
// Login controller
export const login = async (req, res) => {
  const user = await UserRepository.login(...)

  // Eliminar sesiones anteriores de este usuario
  await pool.query(
    `DELETE FROM sessions WHERE data LIKE ?`,
    [`%"id":"${user.id}"%`]
  )

  // Crear nueva sesión
  req.session.user = user
  res.json({ success: true, user })
}
```

---

### **Problema 8: req.user undefined en middleware de roles**

**Causa:** Olvidaste copiar de session a req.user

**Solución:**

```javascript
// authenticateSession.js
export function authenticateSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  req.user = req.session.user // ← CRÍTICO para roleCheck.js
  next()
}
```

---

### **Problema 9: Sesión no se destruye en logout**

**Causa:** Error en `req.session.destroy()` sin manejar

**Solución:**

```javascript
export const logout = (req, res) => {
  if (!req.session) {
    return res.json({ success: true, message: 'Ya cerrada' })
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroy:', err)
      return res.status(500).json({ error: 'Error al cerrar sesión' })
    }

    res.clearCookie('hotel_session')
    res.json({ success: true })
  })
}
```

---

### **Problema 10: DevTools no muestra la cookie**

**Causa 1:** Cookie con `secure: true` en HTTP

**Solución:**

```javascript
cookie: {
  secure: process.env.NODE_ENV === 'production',  // false en dev
}
```

**Causa 2:** Cookie con `sameSite: 'strict'` entre puertos

**Solución:**

```javascript
cookie: {
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
}
```

---

## 📊 COMPARATIVA FINAL: ANTES VS DESPUÉS

### **Líneas de código**

| Componente         | JWT + Refresh   | Sessions        | Reducción |
| ------------------ | --------------- | --------------- | --------- |
| Backend auth       | ~250 líneas     | ~150 líneas     | **-40%**  |
| Middleware auth    | ~60 líneas      | ~30 líneas      | **-50%**  |
| Frontend authLogin | ~120 líneas     | ~60 líneas      | **-50%**  |
| Frontend api.ts    | ~400 líneas     | 0 líneas        | **-100%** |
| **TOTAL**          | **~830 líneas** | **~240 líneas** | **-71%**  |

### **Complejidad conceptual**

| Concepto           | JWT + Refresh | Sessions      |
| ------------------ | ------------- | ------------- |
| Token generation   | ✅ Necesario  | ❌ No existe  |
| Token verification | ✅ Necesario  | ❌ No existe  |
| Refresh flow       | ✅ Complejo   | ❌ No existe  |
| LocalStorage       | ✅ Manual     | ❌ No existe  |
| Auto-refresh logic | ✅ Complejo   | ❌ No existe  |
| Cookie handling    | ✅ Manual     | ✅ Automático |
| Race conditions    | ⚠️ Posibles   | ❌ No aplica  |

### **Seguridad**

| Aspecto            | JWT + Refresh           | Sessions                    |
| ------------------ | ----------------------- | --------------------------- |
| XSS attack surface | ⚠️ Media (localStorage) | ✅ Baja (httpOnly)          |
| CSRF protection    | ⚠️ Necesita CSRF token  | ✅ Built-in                 |
| Token revocation   | ⚠️ Difícil              | ✅ Inmediata                |
| Session fixation   | ❌ No aplica            | ⚠️ Prevenida con regenerate |

### **Mantenibilidad**

| Tarea                        | JWT + Refresh              | Sessions                |
| ---------------------------- | -------------------------- | ----------------------- |
| Añadir nuevo campo a usuario | Regenerar todos los tokens | Actualizar en DB        |
| Invalidar sesión remota      | Blacklist compleja         | DELETE FROM sessions    |
| Debug de autenticación       | Inspeccionar token + logs  | SELECT \* FROM sessions |
| Migrar a nuevo secret        | Regenerar todos los tokens | UPDATE sessions         |

---

## ✅ CONCLUSIÓN

**Estado final esperado:**

```
✅ Backend usa express-session con MySQL
✅ Frontend NO usa localStorage
✅ Frontend NO tiene lógica de auto-refresh
✅ Autenticación funciona con cookies automáticas
✅ Roles y permisos funcionan igual
✅ Logout es real e instantáneo
✅ Código reducido en ~70%
✅ Complejidad reducida drásticamente
✅ Más fácil de mantener
✅ Más seguro para tu caso de uso
```

**Próximos pasos (opcional):**

1. Añadir límite de sesiones concurrentes por usuario
2. Implementar "Remember me" (extender maxAge)
3. Logging de actividad de sesiones
4. Dashboard admin para ver sesiones activas
5. Rate limiting por sesión

---

**¿Preguntas? ¿Algún paso no quedó claro?**

Guarda esta documentación y cuando estés listo para implementar, la usamos paso a paso 🚀
.

Frontend (para admin):

// Dashboard mostrando:
// Usuario | Dispositivo | Login | Expira | Acción
// Sara | PC1-Recepción | 10:00 | 18:00 | [Cerrar]
// Sara | PC2-Recepción | 10:05 | 18:05 | [Cerrar]
// Maria | PC3-Oficina | 09:30 | 17:30 | [Cerrar]

# ✅ SÍ, ABSOLUTAMENTE PUEDES

Puedes crear un **panel de administración** que muestre todas las sesiones activas en tiempo real y controlarlas. Esto es súper útil para tu hotel.

---

## 🎯 LO QUE PUEDES HACER

### **Dashboard de sesiones activas:**

- ✅ Ver quién está logueado ahora mismo
- ✅ Ver desde qué dispositivo/navegador
- ✅ Ver cuándo hicieron login
- ✅ Ver cuándo expira cada sesión
- ✅ **Cerrar sesión remota** (forzar logout en otro PC)
- ✅ **Cerrar todas las sesiones** de un usuario
- ✅ Ver IP de origen
- ✅ Ver tiempo de inactividad

---

## 📦 IMPLEMENTACIÓN COMPLETA

### **PASO 1: Backend - Endpoints para gestionar sesiones**

**Archivo NUEVO:** `controllers/session-controller.js`

```javascript
// controllers/session-controller.js
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// Pool de MySQL (reutiliza el que ya tienes)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

/**
 * 📊 Listar TODAS las sesiones activas
 * Solo para admin
 */
export const getAllActiveSessions = async (req, res) => {
  try {
    const [sessions] = await pool.query(`
      SELECT 
        session_id,
        FROM_UNIXTIME(expires) as expires_at,
        TIMESTAMPDIFF(MINUTE, NOW(), FROM_UNIXTIME(expires)) as minutes_until_expiry,
        data
      FROM sessions
      WHERE expires > UNIX_TIMESTAMP()
      ORDER BY expires DESC
    `)

    // Parsear el campo JSON 'data' para cada sesión
    const parsedSessions = sessions.map((session) => {
      let userData = {}
      try {
        userData = JSON.parse(session.data)
      } catch (e) {
        console.error('Error parsing session data:', e)
      }

      return {
        sessionId: session.session_id,
        username: userData.user?.username || 'Unknown',
        userId: userData.user?.id || null,
        role: userData.user?.role || 'Unknown',
        loginAt: userData.loginAt || null,
        lastActivity: userData.lastActivity || null,
        device: userData.device || 'Unknown',
        ipAddress: userData.ipAddress || 'Unknown',
        expiresAt: session.expires_at,
        minutesUntilExpiry: session.minutes_until_expiry,
      }
    })

    res.json({
      success: true,
      count: parsedSessions.length,
      sessions: parsedSessions,
    })
  } catch (error) {
    console.error('[Sessions] Error al obtener sesiones:', error)
    res.status(500).json({ error: 'Error al obtener sesiones activas' })
  }
}

/**
 * 👤 Listar sesiones de UN usuario específico
 */
export const getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params

    const [sessions] = await pool.query(
      `
      SELECT 
        session_id,
        FROM_UNIXTIME(expires) as expires_at,
        data
      FROM sessions
      WHERE data LIKE ? AND expires > UNIX_TIMESTAMP()
      ORDER BY expires DESC
    `,
      [`%"id":"${userId}"%`]
    )

    const parsedSessions = sessions.map((session) => {
      let userData = {}
      try {
        userData = JSON.parse(session.data)
      } catch (e) {
        console.error('Error parsing session data:', e)
      }

      return {
        sessionId: session.session_id,
        loginAt: userData.loginAt || null,
        device: userData.device || 'Unknown',
        ipAddress: userData.ipAddress || 'Unknown',
        expiresAt: session.expires_at,
      }
    })

    res.json({
      success: true,
      userId,
      count: parsedSessions.length,
      sessions: parsedSessions,
    })
  } catch (error) {
    console.error('[Sessions] Error al obtener sesiones del usuario:', error)
    res.status(500).json({ error: 'Error al obtener sesiones del usuario' })
  }
}

/**
 * 🗑️ Cerrar UNA sesión específica (forzar logout remoto)
 */
export const killSession = async (req, res) => {
  try {
    const { sessionId } = req.params

    // Obtener info de la sesión antes de eliminarla (para logs)
    const [sessions] = await pool.query(
      'SELECT data FROM sessions WHERE session_id = ?',
      [sessionId]
    )

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    let userData = {}
    try {
      userData = JSON.parse(sessions[0].data)
    } catch (e) {
      // Ignorar error de parsing
    }

    // Eliminar la sesión
    await pool.query('DELETE FROM sessions WHERE session_id = ?', [sessionId])

    console.log(
      `[Sessions] Sesión ${sessionId} cerrada por ${req.user.username}`
    )
    console.log(
      `[Sessions] Usuario afectado: ${userData.user?.username || 'Unknown'}`
    )

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
      affectedUser: userData.user?.username || 'Unknown',
    })
  } catch (error) {
    console.error('[Sessions] Error al cerrar sesión:', error)
    res.status(500).json({ error: 'Error al cerrar sesión' })
  }
}

/**
 * 🗑️ Cerrar TODAS las sesiones de un usuario
 */
export const killUserSessions = async (req, res) => {
  try {
    const { userId } = req.params

    // Contar sesiones antes de eliminar
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as count FROM sessions 
       WHERE data LIKE ? AND expires > UNIX_TIMESTAMP()`,
      [`%"id":"${userId}"%`]
    )

    const sessionCount = countResult[0].count

    if (sessionCount === 0) {
      return res.status(404).json({
        error: 'No se encontraron sesiones activas para este usuario',
      })
    }

    // Eliminar todas las sesiones del usuario
    await pool.query(`DELETE FROM sessions WHERE data LIKE ?`, [
      `%"id":"${userId}"%`,
    ])

    console.log(
      `[Sessions] ${sessionCount} sesiones de usuario ${userId} cerradas por ${req.user.username}`
    )

    res.json({
      success: true,
      message: `${sessionCount} sesión(es) cerrada(s) exitosamente`,
      sessionsClosed: sessionCount,
    })
  } catch (error) {
    console.error('[Sessions] Error al cerrar sesiones del usuario:', error)
    res.status(500).json({ error: 'Error al cerrar sesiones del usuario' })
  }
}

/**
 * 🧹 Limpiar sesiones expiradas (cronjob manual o automático)
 */
export const cleanExpiredSessions = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP()'
    )

    console.log(
      `[Sessions] ${result.affectedRows} sesiones expiradas limpiadas`
    )

    res.json({
      success: true,
      message: 'Sesiones expiradas limpiadas',
      sessionsDeleted: result.affectedRows,
    })
  } catch (error) {
    console.error('[Sessions] Error al limpiar sesiones:', error)
    res.status(500).json({ error: 'Error al limpiar sesiones expiradas' })
  }
}

/**
 * 📊 Estadísticas de sesiones
 */
export const getSessionStats = async (req, res) => {
  try {
    // Total de sesiones activas
    const [total] = await pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE expires > UNIX_TIMESTAMP()'
    )

    // Sesiones por usuario
    const [byUser] = await pool.query(`
      SELECT 
        JSON_EXTRACT(data, '$.user.username') as username,
        COUNT(*) as session_count
      FROM sessions
      WHERE expires > UNIX_TIMESTAMP()
      GROUP BY username
      ORDER BY session_count DESC
    `)

    // Sesiones por rol
    const [byRole] = await pool.query(`
      SELECT 
        JSON_EXTRACT(data, '$.user.role') as role,
        COUNT(*) as session_count
      FROM sessions
      WHERE expires > UNIX_TIMESTAMP()
      GROUP BY role
    `)

    res.json({
      success: true,
      stats: {
        totalActiveSessions: total[0].count,
        byUser: byUser.map((row) => ({
          username: row.username?.replace(/"/g, ''),
          sessionCount: row.session_count,
        })),
        byRole: byRole.map((row) => ({
          role: row.role?.replace(/"/g, ''),
          sessionCount: row.session_count,
        })),
      },
    })
  } catch (error) {
    console.error('[Sessions] Error al obtener estadísticas:', error)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
}
```

---

### **PASO 2: Backend - Rutas**

**Archivo NUEVO:** `routes/session-routes.js`

```javascript
// routes/session-routes.js
import { Router } from 'express'
import * as sessionController from '../controllers/session-controller.js'
import { authenticateSession } from '../middleware/authenticateSession.js'
import { isAdmin } from '../middleware/roleCheck.js'

const router = Router()

// ✅ TODAS las rutas requieren autenticación + rol admin
router.get(
  '/',
  authenticateSession,
  isAdmin,
  sessionController.getAllActiveSessions
)

router.get(
  '/stats',
  authenticateSession,
  isAdmin,
  sessionController.getSessionStats
)

router.get(
  '/user/:userId',
  authenticateSession,
  isAdmin,
  sessionController.getUserSessions
)

router.delete(
  '/:sessionId',
  authenticateSession,
  isAdmin,
  sessionController.killSession
)

router.delete(
  '/user/:userId/all',
  authenticateSession,
  isAdmin,
  sessionController.killUserSessions
)

router.post(
  '/cleanup',
  authenticateSession,
  isAdmin,
  sessionController.cleanExpiredSessions
)

export default router
```

**Integrar en `index.js`:**

```javascript
// index.js
import sessionRoutes from './routes/session-routes.js'

app.use('/api/sessions', sessionRoutes) // ← NUEVO
```

---

### **PASO 3: Frontend - Componente de Dashboard**

**Archivo NUEVO:** `app/admin/sessions/page.tsx`

```typescript
// app/admin/sessions/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/lib/login/useAuth'

interface Session {
  sessionId: string
  username: string
  userId: string
  role: string
  loginAt: string
  lastActivity: string
  device: string
  ipAddress: string
  expiresAt: string
  minutesUntilExpiry: number
}

interface SessionStats {
  totalActiveSessions: number
  byUser: Array<{ username: string; sessionCount: number }>
  byRole: Array<{ role: string; sessionCount: number }>
}

export default function SessionsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch de sesiones
  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/sessions', {
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Error al cargar sesiones')

      const data = await res.json()
      setSessions(data.sessions)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Fetch de estadísticas
  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/sessions/stats', {
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Error al cargar estadísticas')

      const data = await res.json()
      setStats(data.stats)
    } catch (err: any) {
      console.error('Error stats:', err)
    }
  }

  // Cerrar sesión remota
  const killSession = async (sessionId: string) => {
    if (!confirm('¿Cerrar esta sesión?')) return

    try {
      const res = await fetch(
        `http://localhost:4000/api/sessions/${sessionId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (!res.ok) throw new Error('Error al cerrar sesión')

      alert('Sesión cerrada exitosamente')
      fetchSessions() // Recargar lista
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Cerrar todas las sesiones de un usuario
  const killUserSessions = async (userId: string, username: string) => {
    if (!confirm(`¿Cerrar TODAS las sesiones de ${username}?`)) return

    try {
      const res = await fetch(
        `http://localhost:4000/api/sessions/user/${userId}/all`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (!res.ok) throw new Error('Error al cerrar sesiones')

      const data = await res.json()
      alert(data.message)
      fetchSessions()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Limpiar sesiones expiradas
  const cleanExpired = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/sessions/cleanup', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Error al limpiar')

      const data = await res.json()
      alert(`${data.sessionsDeleted} sesiones expiradas eliminadas`)
      fetchSessions()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchSessions(), fetchStats()])
      setLoading(false)
    }

    loadData()

    const interval = setInterval(() => {
      fetchSessions()
      fetchStats()
    }, 10000) // Cada 10 segundos

    return () => clearInterval(interval)
  }, [])

  // Verificar que es admin
  if (user?.role !== 'admin') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p>Solo administradores pueden ver esta página.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Cargando sesiones...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sesiones Activas</h1>
        <p className="text-gray-600">Panel de control de sesiones del hotel</p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800">
              Sesiones Activas
            </h3>
            <p className="text-3xl font-bold text-blue-900">
              {stats.totalActiveSessions}
            </p>
          </div>

          <div className="bg-green-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800">
              Usuarios Conectados
            </h3>
            <p className="text-3xl font-bold text-green-900">
              {stats.byUser.length}
            </p>
          </div>

          <div className="bg-purple-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800">
              Admins / Recepcionistas
            </h3>
            <p className="text-3xl font-bold text-purple-900">
              {stats.byRole.find((r) => r.role === 'admin')?.sessionCount || 0}{' '}
              /{' '}
              {stats.byRole.find((r) => r.role === 'recepcionista')
                ?.sessionCount || 0}
            </p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => fetchSessions()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Refrescar
        </button>
        <button
          onClick={cleanExpired}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          🧹 Limpiar Expiradas
        </button>
      </div>

      {/* Tabla de sesiones */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dispositivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                IP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Expira en
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessions.map((session) => (
              <tr key={session.sessionId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {session.username}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      session.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {session.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.device.includes('Windows')
                    ? '🖥️ PC'
                    : session.device.includes('Mobile')
                    ? '📱 Móvil'
                    : '💻 Navegador'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.ipAddress}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {session.loginAt
                    ? new Date(session.loginAt).toLocaleTimeString('es-ES')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={
                      session.minutesUntilExpiry < 30
                        ? 'text-red-600 font-semibold'
                        : ''
                    }
                  >
                    {session.minutesUntilExpiry} min
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => killSession(session.sessionId)}
                    className="text-red-600 hover:text-red-900 mr-4"
                  >
                    ❌ Cerrar
                  </button>
                  <button
                    onClick={() =>
                      killUserSessions(session.userId, session.username)
                    }
                    className="text-orange-600 hover:text-orange-900"
                  >
                    🗑️ Cerrar Todas
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay sesiones activas
        </div>
      )}
    </div>
  )
}
```

---

### **PASO 4: Añadir info de dispositivo en el login**

Para que el dashboard muestre info útil, modifica el login:

```javascript
// controllers/auth-controllers.js
export const login = async (req, res) => {
  // ... validación de usuario ...

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
  }

  // ✅ AÑADIR info extra
  req.session.loginAt = new Date().toISOString()
  req.session.lastActivity = new Date().toISOString()
  req.session.device = req.headers['user-agent'] || 'Unknown'
  req.session.ipAddress = req.ip || req.headers['x-forwarded-for'] || 'Unknown'

  res.json({ success: true, user })
}
```

Y actualizar en cada request:

```javascript
// middleware/authenticateSession.js
export function authenticateSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  // ✅ Actualizar última actividad
  req.session.lastActivity = new Date().toISOString()

  req.user = req.session.user
  next()
}
```

---

## 🎨 RESULTADO VISUAL

**Dashboard se vería así:**

```
╔══════════════════════════════════════════════════════════════╗
║  SESIONES ACTIVAS - Hotel For Points                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📊 Estadísticas                                             ║
║  ┌──────────────┬──────────────┬──────────────┐            ║
║  │ Activas: 5   │ Usuarios: 3  │ Admins: 2    │            ║
║  └──────────────┴──────────────┴──────────────┘            ║
║                                                              ║
║  [🔄 Refrescar]  [🧹 Limpiar Expiradas]                     ║
║                                                              ║
║  ┌─────────┬─────┬────────────┬──────────┬────────┬────────┬──────┐
║  │ Usuario │ Rol │ Dispositivo│    IP    │ Login  │Expira│Acciones│
║  ├─────────┼─────┼────────────┼──────────┼────────┼────────┼──────┤
║  │ Sara    │Admin│ 🖥️ PC-Win │192.168.1.│ 10:00  │ 45 min│❌🗑️  │
║  │ Sara    │Admin│ 🖥️ PC-Win │192.168.1.│ 10:05  │ 40 min│❌🗑️  │
║  │ Maria   │Recep│ 💻 Chrome  │192.168.1.│ 09:30  │ 15 min│❌🗑️  │
║  │ Juan    │Recep│ 🖥️ Firefox│192.168.1.│ 11:00  │105 min│❌🗑️  │
║  │ Ana     │Admin│ 📱 Mobile  │192.168.1.│ 08:45  │  5 min│❌🗑️  │
║  └─────────┴─────┴────────────┴──────────┴────────┴────────┴──────┘
║                                                              ║
║  Auto-refresh en 10 segundos...                             ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🚀 FUNCIONALIDADES ADICIONALES (BONUS)

### **1. Notificación cuando alguien hace login**

```typescript
// En el frontend, usar WebSocket o polling
useEffect(() => {
  const interval = setInterval(async () => {
    const newSessions = await fetchSessions()

    // Comparar con sesiones anteriores
    const newLogins = newSessions.filter(
      (s) => !sessions.find((old) => old.sessionId === s.sessionId)
    )

    if (newLogins.length > 0) {
      newLogins.forEach((login) => {
        showNotification(`${login.username} acaba de hacer login`)
      })
    }
  }, 5000)

  return () => clearInterval(interval)
}, [sessions])
```

### **2. Graficar sesiones por hora**

```typescript
// Endpoint backend
export const getSessionHistory = async (req, res) => {
  const [history] = await pool.query(`
    SELECT 
      DATE_FORMAT(FROM_UNIXTIME(expires - 28800), '%H:00') as hour,
      COUNT(*) as session_count
    FROM sessions
    WHERE expires > UNIX_TIMESTAMP() - 86400
    GROUP BY hour
    ORDER BY hour
  `)

  res.json({ history })
}
```

### **3. Alertas de sesiones sospechosas**

```javascript
// Detectar múltiples IPs del mismo usuario
export const detectSuspiciousSessions = async (req, res) => {
  const [suspicious] = await pool.query(`
    SELECT 
      JSON_EXTRACT(data, '$.user.username') as username,
      COUNT(DISTINCT JSON_EXTRACT(data, '$.ipAddress')) as ip_count
    FROM sessions
    WHERE expires > UNIX_TIMESTAMP()
    GROUP BY username
    HAVING ip_count > 3
  `)

  res.json({ suspicious })
}
```

---

## 📋 RESUMEN

| Pregunta                        | Respuesta                                         |
| ------------------------------- | ------------------------------------------------- |
| ¿Puedo ver todas las sesiones?  | ✅ SÍ, con endpoint `/api/sessions`               |
| ¿Puedo cerrar sesión remota?    | ✅ SÍ, DELETE `/api/sessions/:sessionId`          |
| ¿Puedo ver quién está logueado? | ✅ SÍ, username, rol, dispositivo, IP             |
| ¿Puedo ver cuándo expira?       | ✅ SÍ, minutos hasta expiración                   |
| ¿Solo admin puede ver esto?     | ✅ SÍ, middleware `isAdmin` protege rutas         |
| ¿Se actualiza en tiempo real?   | ✅ SÍ, con polling cada 10 segundos (o WebSocket) |

---

**¿Te quedó claro? ¿Quieres que añada algo más al dashboard de sesiones?** 🎯
