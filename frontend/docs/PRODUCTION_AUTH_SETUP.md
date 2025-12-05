# 🚀 Configuración de Autenticación para Producción

## 📋 Diferencias: Desarrollo vs Producción

### 🔧 DESARROLLO (Actual)

```
Frontend (localhost:3000) → Backend (localhost:4000)
     ↓                            ↓
  Llamada directa          JWT + Cookies HttpOnly
     ↓                            ↓
  CORS necesario           credentials: 'include'
```

**Características:**

- ✅ Simple y directo
- ✅ Fácil de debuggear
- ❌ CORS puede dar problemas
- ❌ Backend expuesto al cliente

### 🚀 PRODUCCIÓN (Recomendado)

```
Frontend (app.tuhotel.com) → Next.js Proxy (/api/*) → Backend (interno)
     ↓                              ↓                        ↓
  Mismo dominio            Maneja cookies           JWT + Cookies
     ↓                              ↓                        ↓
  Sin CORS                  Auto-refresh            Lógica de auth
     ↓                              ↓
  Cookies seguras          Backend oculto
```

**Características:**

- ✅ Sin CORS (mismo dominio)
- ✅ Backend oculto y seguro
- ✅ Cookies HttpOnly más seguras
- ✅ Fácil cambiar backend sin tocar frontend
- ✅ Mejor para escalabilidad

---

## 🔄 Migración a Producción

### Paso 1: Crear Proxies de Next.js

#### `/app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend-interno:4000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    const response = NextResponse.json(data, { status: 200 })

    // Copiar cookies del backend al frontend
    const setCookieHeaders = res.headers.getSetCookie()
    setCookieHeaders.forEach((cookieString) => {
      const [nameValue] = cookieString.split(';')
      const [name, value] = nameValue.split('=')

      if (name === 'access_token') {
        response.cookies.set('access_token', value, {
          httpOnly: true,
          secure: true, // ✅ HTTPS en producción
          sameSite: 'strict', // ✅ Más estricto en producción
          path: '/',
          maxAge: 15 * 60,
        })
      } else if (name === 'refresh_token') {
        response.cookies.set('refresh_token', value, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 8 * 60 * 60,
        })
      }
    })

    return response
  } catch (error) {
    console.error('[/api/auth/login] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

#### `/app/api/auth/me/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend-interno:4000'

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Enviar cookies al backend
    const cookieHeader = [
      accessToken && `access_token=${accessToken}`,
      refreshToken && `refresh_token=${refreshToken}`,
    ]
      .filter(Boolean)
      .join('; ')

    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      credentials: 'include',
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Not authenticated' }))
      return NextResponse.json(errorData, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
```

#### `/app/api/auth/refresh-token/route.ts` ⭐ CRÍTICO

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend-interno:4000'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    // Llamar al backend para refresh
    const res = await fetch(`${BACKEND_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`,
      },
      credentials: 'include',
    })

    if (!res.ok) {
      // Refresh falló - limpiar cookies
      const response = NextResponse.json({ error: 'Refresh token inválido' }, { status: 401 })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    const data = await res.json()
    const response = NextResponse.json(data, { status: 200 })

    // Actualizar cookies con nuevos tokens
    const setCookieHeaders = res.headers.getSetCookie()
    setCookieHeaders.forEach((cookieString) => {
      const [nameValue] = cookieString.split(';')
      const [name, value] = nameValue.split('=')

      if (name === 'access_token') {
        response.cookies.set('access_token', value, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 15 * 60,
        })
      } else if (name === 'refresh_token') {
        response.cookies.set('refresh_token', value, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 8 * 60 * 60,
        })
      }
    })

    return response
  } catch (error) {
    console.error('[/api/auth/refresh-token] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

#### `/app/api/auth/logout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend-interno:4000'

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value

    if (accessToken) {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `access_token=${accessToken}`,
        },
        credentials: 'include',
      })
    }

    const response = NextResponse.json(
      { success: true, message: 'Sesión cerrada' },
      { status: 200 }
    )

    // Limpiar cookies
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')

    return response
  } catch (error) {
    console.error('[/api/auth/logout] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

### Paso 2: Actualizar `authLogin.ts`

```typescript
// Cambiar todas las URLs de:
const API_BASE_URL = 'http://localhost:4000'

// A:
const API_BASE_URL = '' // Vacío para usar rutas relativas

// Y cambiar:
fetch(`${API_BASE_URL}/auth/login`, ...)
// A:
fetch('/api/auth/login', ...)
```

---

### Paso 3: Actualizar `api.ts`

```typescript
// Cambiar:
const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
  method: 'POST',
  credentials: 'include',
})

// A:
const refreshResponse = await fetch('/api/auth/refresh-token', {
  method: 'POST',
  credentials: 'include',
})
```

---

### Paso 4: Variables de Entorno

#### `.env.local` (desarrollo)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### `.env.production`

```bash
BACKEND_API_URL=http://backend-interno:4000
# No exponer NEXT_PUBLIC_API_URL en producción
```

---

## 🔒 Seguridad Adicional para Producción

### 1. HTTPS Obligatorio

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}
```

### 2. CSP (Content Security Policy)

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  )

  return response
}
```

### 3. Rate Limiting en Proxies

```typescript
// /app/api/auth/login/route.ts
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minuto
  uniqueTokenPerInterval: 500,
})

export async function POST(req: NextRequest) {
  try {
    await limiter.check(req, 5) // Máx 5 intentos por minuto
    // ... resto del código
  } catch {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
}
```

---

## 📊 Comparación Final

| Característica | Desarrollo                | Producción       |
| -------------- | ------------------------- | ---------------- |
| URLs           | `localhost:4000` directas | `/api/*` proxies |
| CORS           | Necesario                 | No necesario     |
| Cookies        | Funcionales               | Más seguras      |
| Backend        | Expuesto                  | Oculto           |
| Seguridad      | Básica                    | Completa         |
| Performance    | Similar                   | Mejor (CDN)      |

---

## ✅ Checklist de Migración

- [ ] Crear todos los proxies en `/app/api/auth/*`
- [ ] Actualizar `authLogin.ts` con rutas relativas
- [ ] Actualizar `api.ts` con ruta relativa para refresh
- [ ] Configurar variables de entorno
- [ ] Habilitar HTTPS
- [ ] Implementar CSP
- [ ] Agregar rate limiting
- [ ] Probar todo el flujo de auth
- [ ] Probar auto-refresh
- [ ] Probar logout

---

## 🐛 Debugging en Producción

Si el auto-refresh no funciona:

1. Verificar que `/api/auth/refresh-token` responde correctamente
2. Verificar que las cookies se están actualizando
3. Revisar logs del navegador (Network → Cookies)
4. Verificar que `credentials: 'include'` está en todas las peticiones

Console logs útiles:

```typescript
console.log('Cookies:', req.cookies.getAll())
console.log('Set-Cookie headers:', res.headers.getSetCookie())
```
