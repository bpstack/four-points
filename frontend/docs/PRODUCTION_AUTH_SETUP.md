# Sistema de Autenticación Four-Points

> Documento actualizado: Diciembre 2024
> Deployment: Frontend (Vercel) + Backend (Render)
> PROBLEMAS

     🟢- MENOR - Estilos diferentes en backend

     | Módulo | Cómo protege rutas |
     |--------|-------------------|
     | blacklist, maintenance, departments | router.use(authenticateToken) al inicio |
     | groups, parking, logbooks | authenticateToken individual en cada ruta |

     Ambos funcionan, pero es inconsistente.

     ---

     Resumen Visual

     FRONTEND
     ├── apiClient.ts           ✅  Centralizado, bien hecho
     ├── blacklistApi.ts        ⚠️ Duplica auth para uploads
     ├── maintenanceApi.ts      ⚠️ Duplica auth para uploads
     ├── groups/queries.ts      ✅️ Usa apiClient correctamente
     ├── parking/queries.ts     ✅️ Usa apiClient correctamente
     ├── logbooks/queries.ts    ✅️ Usa apiClient correctamente
     └── departments/queries.ts ✅️ Usa apiClient correctamente

     BACKEND
     ├── blacklist-routes.ts    ✅  router.use(authenticateToken)
     ├── maintenance-routes.ts  ✅  router.use(authenticateToken)
     ├── departments-routes.ts  ✅  router.use(authenticateToken)
     ├── group-routes.ts        ✅  Individual pero todas protegidas
     ├── parking.routes.ts      ⚠️ /vehicles/search sin auth
     └── logbook-routes.ts      🔴 MUCHAS rutas sin auth

     ---

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Actual](#arquitectura-actual)
3. [Análisis de Código](#análisis-de-código)
4. [Problemas Detectados](#problemas-detectados)
5. [Opciones de Migración](#opciones-de-migración)
6. [Recomendación Final](#recomendación-final)
7. [Plan de Implementación](#plan-de-implementación)
8. [Configuración CORS para Vercel + Render](#configuración-cors-para-vercel--render)
9. [Checklist de Migración](#checklist-de-migración)

---

## Resumen Ejecutivo

### Estado Actual

- **Frontend**: Next.js 14+ con App Router
- **Backend**: Express.js con JWT
- **Autenticación**: JWT con access token (15min) + refresh token (8h)
- **Almacenamiento**: localStorage (desarrollo) / Cookies HttpOnly (producción)
- **CORS**: Configurado solo para `localhost:3000`

### Problema Principal

El sistema actual tiene **código duplicado**, **URLs hardcodeadas**, y una arquitectura mixta que dificulta el deploy a producción (Vercel + Render).

### Recomendación

**Opción B: Mantener JWT propio con API Routes como proxy** - Es la opción más práctica dado el estado actual del proyecto y permite seguir desarrollando sin grandes cambios.

---

## Arquitectura Actual

### Diagrama de Flujo (Desarrollo)

```
┌─────────────────┐     localStorage      ┌─────────────────┐
│                 │  ←───────────────────→│                 │
│  Next.js        │                       │  Express.js     │
│  Frontend       │  fetch + Bearer token │  Backend        │
│  localhost:3000 │  ────────────────────→│  localhost:4000 │
│                 │  ←────────────────────│                 │
│                 │     JSON response     │                 │
└─────────────────┘                       └─────────────────┘
        ↓                                         ↓
   - authService.ts                        - auth-controllers.ts
   - apiClient.ts                          - authenticateToken.ts
   - useAuth.tsx                           - tokenService.ts
```

### Flujo de Autenticación Actual

```
1. Usuario envía credenciales
   └→ POST /api/auth/login (backend directo)

2. Backend valida y responde con:
   └→ { token, refreshToken, user }
   └→ Set-Cookie: access_token, refresh_token (HttpOnly en prod)

3. Frontend almacena tokens:
   └→ DEV: localStorage.setItem('access_token', token)
   └→ PROD: Cookies automáticas (no implementado aún)

4. Requests autenticados:
   └→ DEV: Authorization: Bearer <token>
   └→ PROD: Cookies enviadas automáticamente

5. Token expirado (401):
   └→ apiClient intenta refresh automático
   └→ POST /api/auth/refresh-token
   └→ Nuevos tokens → reintentar request original
```

---

## Análisis de Código

### Frontend

#### Archivos Principales

| Archivo                          | Propósito                          | Estado            |
| -------------------------------- | ---------------------------------- | ----------------- |
| `app/lib/auth/authService.ts`    | Login/logout con localStorage      | Activo (DEV)      |
| `app/lib/auth/useAuth.tsx`       | Context + hooks de autenticación   | Activo            |
| `app/lib/auth/cookieHandler.ts`  | Helpers para cookies en API Routes | Sin usar          |
| `app/lib/apiClient.ts`           | Cliente HTTP con auto-refresh      | Activo            |
| `app/lib/users/queries.ts`       | authApi duplicado                  | **DUPLICADO**     |
| `app/api/auth/register/route.ts` | Proxy para registro                | Activo            |
| `middleware.ts.disabled`         | Protección de rutas                | **DESHABILITADO** |

#### authService.ts (Desarrollo)

```typescript
// Ubicación: app/lib/auth/authService.ts
// Estado: Activo - usa localStorage + fetch directo al backend

const API_BASE = 'http://localhost:4000/api/auth'  // ❌ URL hardcodeada

export const authLogin = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/login`, {...})
    // Guarda en localStorage
    localStorage.setItem('access_token', data.token)
    localStorage.setItem('refresh_token', data.refreshToken)
    // También guarda en cookies (para Server Components)
    document.cookie = `access_token=${data.token}; path=/; ...`
  },

  logout: async () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    // Limpia cookies
    document.cookie = 'access_token=; expires=...'
  },

  me: async () => {
    // Usa apiClient que tiene auto-refresh
    return apiClient.get(`${API_BASE}/me`)
  }
}
```

#### apiClient.ts (Isomórfico)

```typescript
// Ubicación: app/lib/apiClient.ts
// Estado: Bien diseñado - maneja DEV y PROD

const isDev = process.env.NODE_ENV === 'development'

function getAuthHeaders() {
  if (!isClient) return {} // Servidor: cookies automáticas
  if (isDev) {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {} // Producción: cookies automáticas
}

// Auto-refresh cuando recibe 401
if (response.status === 401 && hasRefreshToken()) {
  // Llama a refresh-token
  // Actualiza tokens
  // Reintenta request original
}
```

#### useAuth.tsx (Context)

```typescript
// Ubicación: app/lib/auth/useAuth.tsx
// Estado: Bien estructurado

- AuthProvider envuelve la app
- checkSession() verifica /api/auth/me
- login() llama a authService.login()
- logout() limpia todo y redirige
- Tiene DEV_MODE para desarrollo rápido
```

### Backend

#### Archivos Principales

| Archivo                                | Propósito                            | Estado         |
| -------------------------------------- | ------------------------------------ | -------------- |
| `controllers/auth/auth-controllers.ts` | Login, register, refresh, logout, me | Activo         |
| `middlewares/authenticateToken.ts`     | Verificar JWT en requests            | Activo         |
| `services/auth/tokenService.ts`        | Generar/verificar JWT                | Activo         |
| `routes/auth/auth-routes.ts`           | Definición de rutas                  | Activo         |
| `index.ts`                             | CORS config                          | Solo localhost |

#### auth-controllers.ts

```typescript
// Configuración de cookies
const cookieOptions = {
  httpOnly: IN_DEV_MODE ? false : true,  // ✅ HttpOnly en prod
  secure: NODE_ENV === 'production',      // ✅ HTTPS en prod
  sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
}

// Login responde con tokens en body Y cookies
res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15min })
res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 8h })
res.json({
  success: true,
  user: userWithoutPassword,
  token: accessToken,                    // Para localStorage (DEV)
  refreshToken: IN_DEV_MODE ? refreshToken : undefined,  // Solo en DEV
})
```

#### tokenService.ts

```typescript
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutos
const REFRESH_TOKEN_EXPIRY = '8h' // 8 horas

// Ambos tokens contienen: { id, username, role }
// Permite regenerar access token sin consultar BD
```

#### authenticateToken.ts

```typescript
// Busca token en orden de prioridad:
// 1. Cookies (más seguro)
// 2. Authorization header (para desarrollo/móviles)

let token = req.cookies?.access_token
if (!token) {
  const authHeader = req.headers['authorization']
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }
}
```

#### CORS Actual (index.ts)

```typescript
app.use(
  cors({
    origin: 'http://localhost:3000', // ❌ Solo localhost
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
)
```

---

## Problemas Detectados

### 1. Código Duplicado

```
authService.ts (app/lib/auth/)     ←── DUPLICADO ──→  authApi (app/lib/users/queries.ts)
       ↓                                                    ↓
  authLogin.login()                                   authApi.login()
  authLogin.logout()                                  authApi.logout()
  authLogin.me()                                      authApi.getMe()
```

**Solución**: Eliminar `authApi` de `users/queries.ts` y usar solo `authService.ts`

### 2. URLs Hardcodeadas

```typescript
// authService.ts
const API_BASE = 'http://localhost:4000/api/auth' // ❌

// users/queries.ts
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000' // ✅ Mejor
```

**Solución**: Usar variables de entorno consistentemente

### 3. Middleware Deshabilitado

```typescript
// middleware.ts.disabled
return NextResponse.next() // LOL he puesto esto aqui para saltarme todo
```

El middleware de protección de rutas está deshabilitado. La protección actual depende solo de:

- `useAuth` verificando sesión en cliente
- Backend rechazando requests sin token válido

**Solución**: Reactivar middleware o mantener protección solo en cliente (menos seguro pero funcional)

### 4. CORS Solo para Localhost

```typescript
origin: 'http://localhost:3000' // No funcionará en Vercel
```

**Solución**: Configurar CORS dinámico para producción

### 5. Cookies sin Dominio Explícito

```typescript
res.cookie('access_token', token, {
  // No hay 'domain' configurado
})
```

En producción con diferentes dominios (Vercel + Render), las cookies pueden no funcionar correctamente.

---

## Opciones de Migración

### Opción A: NextAuth.js (Auth.js)

**Descripción**: Migrar completamente a NextAuth.js con JWT strategy.

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Llamar a tu backend
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
        })
        const user = await res.json()
        if (res.ok && user) return user
        return null
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = user
      return token
    },
    async session({ session, token }) {
      session.user = token.user
      return session
    },
  },
}
```

| Pros                          | Contras                         |
| ----------------------------- | ------------------------------- |
| Estándar de la industria      | Requiere reescribir auth        |
| Manejo automático de sesiones | Curva de aprendizaje            |
| Soporta múltiples providers   | Puede ser overkill para tu caso |
| Middleware integrado          | Menos control granular          |

**Esfuerzo**: Alto (2-3 días)
**Recomendado si**: Planeas añadir OAuth (Google, GitHub) en el futuro

---

### Opción B: Mantener JWT + API Routes Proxy (RECOMENDADA)

**Descripción**: Crear API Routes en Next.js que actúen como proxy al backend. El frontend solo habla con Next.js, nunca directamente con el backend.

```
┌─────────────────┐                      ┌─────────────────┐
│  Vercel         │    Server-to-Server  │  Render         │
│  (Frontend)     │    (sin CORS)        │  (Backend)      │
│                 │                      │                 │
│  /api/auth/*    │  ──────────────────→ │  /api/auth/*    │
│  (Next.js API)  │                      │  (Express)      │
└─────────────────┘                      └─────────────────┘
        ↑
        │ Cookies HttpOnly
        │ (mismo dominio)
        ↓
   Browser/Client
```

**Implementación**:

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL // URL interna de Render

export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status })
  }

  const response = NextResponse.json({ success: true, user: data.user })

  // Copiar cookies del backend
  response.cookies.set('access_token', data.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  })

  response.cookies.set('refresh_token', data.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  })

  return response
}
```

| Pros                        | Contras                     |
| --------------------------- | --------------------------- |
| Sin problemas de CORS       | Más código en frontend      |
| Backend oculto (más seguro) | Latencia adicional (mínima) |
| Cookies HttpOnly fáciles    | Duplica lógica de rutas     |
| Cambio gradual posible      | -                           |
| Mantiene tu sistema actual  | -                           |

**Esfuerzo**: Medio (1-2 días)
**Recomendado si**: Quieres ir a producción rápido sin reescribir todo

---

### Opción C: CORS Directo (Mínimo Cambio)

**Descripción**: Mantener la arquitectura actual y solo configurar CORS correctamente para producción.

```typescript
// backend/index.ts
const allowedOrigins = [
  'http://localhost:3000',
  'https://four-points.vercel.app',
  'https://tu-dominio.com',
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)
```

| Pros                      | Contras                          |
| ------------------------- | -------------------------------- |
| Mínimo cambio de código   | Backend expuesto públicamente    |
| Rápido de implementar     | Cookies cross-domain complicadas |
| Ya funciona en desarrollo | Problemas con SameSite cookies   |
| -                         | Menos seguro                     |

**Esfuerzo**: Bajo (2-4 horas)
**Recomendado si**: Solo necesitas algo rápido para demo/MVP

---

## Recomendación Final

### Para tu situación específica: **OPCIÓN B**

**Razones**:

1. **Ya tienes código funcional** - No necesitas reescribir todo
2. **Vercel + Render** - Los proxies eliminan problemas de CORS
3. **Desarrollo continuo** - Puedes seguir desarrollando features sin bloqueos
4. **Seguridad** - Backend oculto, cookies HttpOnly, sin CORS
5. **Escalabilidad** - Fácil añadir rate limiting, logging, etc.

### Estrategia de Migración

```
FASE 1 (Ahora): Desarrollo local
├── Mantener sistema actual (localStorage + fetch directo)
├── Limpiar código duplicado
└── Usar variables de entorno

FASE 2 (Pre-producción): Crear proxies
├── Crear /api/auth/login/route.ts
├── Crear /api/auth/logout/route.ts
├── Crear /api/auth/me/route.ts
├── Crear /api/auth/refresh/route.ts
└── Actualizar authService.ts para usar rutas relativas

FASE 3 (Producción): Deploy
├── Configurar variables en Vercel
├── Configurar variables en Render
├── Probar flujo completo
└── Activar middleware de protección
```

---

## Plan de Implementación

### Fase 1: Limpieza (30 min)

#### 1.1 Eliminar código duplicado

```typescript
// ELIMINAR de app/lib/users/queries.ts:
export const authApi = { ... }  // ❌ BORRAR

// MANTENER solo:
export const usersApi = { ... }  // ✅ MANTENER
```

#### 1.2 Centralizar variables de entorno

```typescript
// app/lib/config.ts (NUEVO)
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  isProduction: process.env.NODE_ENV === 'production',
}
```

#### 1.3 Actualizar authService.ts

```typescript
// ANTES
const API_BASE = 'http://localhost:4000/api/auth'

// DESPUÉS
import { config } from '@/app/lib/config'
const API_BASE = config.isProduction ? '/api/auth' : `${config.apiUrl}/api/auth`
```

### Fase 2: Crear API Routes Proxy (2-3 horas)

#### Estructura de archivos

```
app/api/auth/
├── login/
│   └── route.ts
├── logout/
│   └── route.ts
├── me/
│   └── route.ts
├── refresh/
│   └── route.ts
└── register/
    └── route.ts  (ya existe)
```

#### 2.1 Login Route

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status })
    }

    // Crear respuesta con cookies
    const response = NextResponse.json({
      success: true,
      user: data.user,
    })

    // Configurar cookies HttpOnly
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    response.cookies.set('access_token', data.token, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutos
    })

    if (data.refreshToken) {
      response.cookies.set('refresh_token', data.refreshToken, {
        ...cookieOptions,
        maxAge: 8 * 60 * 60, // 8 horas
      })
    }

    return response
  } catch (error) {
    console.error('[/api/auth/login] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

#### 2.2 Me Route

```typescript
// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: backendRes.status })
    }

    const data = await backendRes.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

#### 2.3 Refresh Route

```typescript
// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'No hay refresh token' }, { status: 401 })
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!backendRes.ok) {
      // Refresh falló - limpiar cookies
      const response = NextResponse.json({ error: 'Sesión expirada' }, { status: 401 })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    const data = await backendRes.json()

    const response = NextResponse.json({ success: true })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    response.cookies.set('access_token', data.token, {
      ...cookieOptions,
      maxAge: 15 * 60,
    })

    if (data.refreshToken) {
      response.cookies.set('refresh_token', data.refreshToken, {
        ...cookieOptions,
        maxAge: 8 * 60 * 60,
      })
    }

    return response
  } catch (error) {
    console.error('[/api/auth/refresh] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

#### 2.4 Logout Route

```typescript
// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value

    // Notificar al backend (opcional, puede fallar)
    if (accessToken) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      } catch {
        // Ignorar errores del backend en logout
      }
    }

    // Siempre limpiar cookies locales
    const response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada',
    })

    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')

    return response
  } catch (error) {
    console.error('[/api/auth/logout] Error:', error)

    // Incluso con error, limpiar cookies
    const response = NextResponse.json(
      { success: true, message: 'Sesión cerrada' },
      { status: 200 }
    )
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')

    return response
  }
}
```

### Fase 3: Actualizar Frontend (1 hora)

#### 3.1 authService.ts para Producción

```typescript
// app/lib/auth/authService.ts
'use client'

const isDev = process.env.NODE_ENV === 'development'
const API_BASE = isDev
  ? 'http://localhost:4000/api/auth' // Desarrollo: directo
  : '/api/auth' // Producción: proxy

export const authLogin = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: isDev ? 'omit' : 'include',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || data?.message || 'Login failed')
    }

    const data = await res.json()

    // Solo guardar en localStorage en desarrollo
    if (isDev && data.token) {
      localStorage.setItem('access_token', data.token)
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken)
      }
    }

    return data
  },

  logout: async () => {
    // En desarrollo, limpiar localStorage
    if (isDev) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }

    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: isDev ? 'omit' : 'include',
      })
    } catch (error) {
      console.error('[authLogin.logout] Error:', error)
    }
  },

  me: async () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // En desarrollo, añadir token manualmente
    if (isDev) {
      const token = localStorage.getItem('access_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const res = await fetch(`${API_BASE}/me`, {
      headers,
      credentials: isDev ? 'omit' : 'include',
    })

    if (!res.ok) {
      throw new Error('No autenticado')
    }

    const data = await res.json()
    return data.user
  },
}
```

---

## Configuración CORS para Vercel + Render

### Backend (Render)

```typescript
// backend/index.ts
const allowedOrigins = [
  'http://localhost:3000', // Desarrollo
  process.env.FRONTEND_URL, // Producción (Vercel)
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, server-to-server)
      if (!origin) {
        callback(null, true)
        return
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`CORS blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
)
```

### Variables de Entorno

#### Vercel (Frontend)

```env
# .env.production (Vercel)
BACKEND_URL=https://four-points-backend.onrender.com
NODE_ENV=production
```

#### Render (Backend)

```env
# Environment Variables (Render Dashboard)
NODE_ENV=production
FRONTEND_URL=https://four-points.vercel.app
SECRET_JWT_KEY=tu-clave-super-secreta-de-produccion
# ... resto de variables de DB
```

---

## Checklist de Migración

### Fase 1: Limpieza (Desarrollo)

- [ ] Eliminar `authApi` duplicado de `users/queries.ts`
- [ ] Crear `app/lib/config.ts` con variables centralizadas
- [ ] Actualizar imports en archivos que usen authApi

### Fase 2: API Routes (Pre-producción)

- [ ] Crear `app/api/auth/login/route.ts`
- [ ] Crear `app/api/auth/logout/route.ts`
- [ ] Crear `app/api/auth/me/route.ts`
- [ ] Crear `app/api/auth/refresh/route.ts`
- [ ] Actualizar `app/api/auth/register/route.ts` (ya existe)
- [ ] Actualizar `authService.ts` para detectar entorno
- [ ] Actualizar `apiClient.ts` para producción
- [ ] Probar flujo completo en local con `NODE_ENV=production`

### Fase 3: Deploy

- [ ] Configurar variables en Vercel Dashboard
- [ ] Configurar variables en Render Dashboard
- [ ] Actualizar CORS en backend para permitir dominio Vercel
- [ ] Deploy backend a Render
- [ ] Deploy frontend a Vercel
- [ ] Probar login/logout/refresh en producción
- [ ] Verificar cookies HttpOnly en DevTools
- [ ] Probar auto-refresh de tokens

### Fase 4: Seguridad (Post-deploy)

- [ ] Activar `middleware.ts` para protección de rutas
- [ ] Implementar rate limiting en `/api/auth/*`
- [ ] Añadir logging de intentos de login fallidos
- [ ] Configurar alertas de seguridad

---

## Debugging

### Verificar Cookies en Producción

```javascript
// En DevTools > Application > Cookies
// Deberías ver:
// - access_token (HttpOnly: true, Secure: true)
// - refresh_token (HttpOnly: true, Secure: true)
```

### Verificar Headers

```javascript
// En DevTools > Network > Request Headers
// Login request debería tener:
// - credentials: include (producción)
// - Content-Type: application/json

// Response Headers debería tener:
// - Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
// - Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax
```

### Logs Útiles

```typescript
// En API Routes
console.log('[/api/auth/login] Request received')
console.log('[/api/auth/login] Backend response:', res.status)
console.log('[/api/auth/login] Setting cookies')

// En authService
console.log('[authLogin] Environment:', isDev ? 'development' : 'production')
console.log('[authLogin] API Base:', API_BASE)
```

---

## Resumen

| Aspecto                | Desarrollo             | Producción                   |
| ---------------------- | ---------------------- | ---------------------------- |
| **Frontend**           | localhost:3000         | Vercel                       |
| **Backend**            | localhost:4000         | Render                       |
| **Auth Storage**       | localStorage           | Cookies HttpOnly             |
| **API Calls**          | Directo al backend     | Via API Routes proxy         |
| **CORS**               | Necesario              | No necesario (mismo dominio) |
| **Tokens en Response** | Sí (para localStorage) | No (solo cookies)            |

**Próximos pasos recomendados**:

1. Terminar desarrollo de features con el sistema actual
2. Implementar Fase 1 (limpieza) cuando tengas tiempo
3. Implementar Fase 2-3 cuando estés listo para deploy
