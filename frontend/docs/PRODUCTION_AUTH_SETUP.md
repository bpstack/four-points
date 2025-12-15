# Sistema de Autenticación Four-Points

> **Actualizado**: Diciembre 2024
> **Estado**: FUNCIONAL Y PROBADO
> **Dominio**: four-points.stackbp.es

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCCIÓN                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Browser                                                                │
│      │                                                                   │
│      │ Cookies: domain=.four-points.stackbp.es                          │
│      │ (compartidas entre subdominios)                                  │
│      │                                                                   │
│      ├────────────────────┬────────────────────┐                        │
│      │                    │                    │                        │
│      ▼                    ▼                    │                        │
│  ┌────────────┐    ┌────────────┐              │                        │
│  │  Vercel    │    │  Render    │              │                        │
│  │            │    │            │              │                        │
│  │ four-      │───▶│ api.four-  │              │                        │
│  │ points.    │    │ points.    │              │                        │
│  │ stackbp.es │    │ stackbp.es │              │                        │
│  │            │    │            │              │                        │
│  │ (Frontend) │    │ (Backend)  │──────────────┼──▶ MySQL (Aiven)       │
│  └────────────┘    └────────────┘              │                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ventajas de esta arquitectura

| Beneficio | Descripción |
|-----------|-------------|
| **Sin CORS complicado** | Subdominios del mismo dominio |
| **Cookies compartidas** | `domain=.four-points.stackbp.es` funciona en ambos |
| **HttpOnly seguro** | JavaScript no puede leer los tokens |
| **Sin proxies** | Frontend llama directamente al backend |
| **Safari compatible** | No hay problemas de third-party cookies |

---

## Configuración de Dominios

### DNS (en tu proveedor de dominio)

```
four-points.stackbp.es      →  CNAME  →  cname.vercel-dns.com
api.four-points.stackbp.es  →  CNAME  →  four-points-backend.onrender.com
```

### Vercel (Frontend)

1. Ve a Project Settings → Domains
2. Añade: `four-points.stackbp.es`
3. Vercel te dará el CNAME a configurar

### Render (Backend)

1. Ve a tu Web Service → Settings → Custom Domains
2. Añade: `api.four-points.stackbp.es`
3. Render te dará el CNAME a configurar

---

## Configuración de Tokens

### Duración (backend/services/auth/tokenService.ts)

```typescript
const ACCESS_TOKEN_EXPIRY = '15m'  // 15 minutos
const REFRESH_TOKEN_EXPIRY = '7d'  // 7 días
```

### Cookies (backend/controllers/auth/auth-controllers.ts)

```typescript
const COOKIE_DOMAIN = '.four-points.stackbp.es'

const cookieOptions = {
  httpOnly: true,                    // JS no puede leer
  secure: true,                      // Solo HTTPS
  sameSite: 'lax',                   // Protección CSRF
  domain: COOKIE_DOMAIN,             // Compartida entre subdominios
  path: '/',
}
```

---

## Variables de Entorno

### Backend (Render)

```env
NODE_ENV=production
COOKIE_DOMAIN=.four-points.stackbp.es

# Base de datos (Aiven)
DB_HOST=mysql-xxxxx.aiven.io
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=xxxxx
DB_NAME=four_points

# JWT
SECRET_JWT_KEY=tu-clave-secreta-minimo-32-caracteres
```

### Frontend (Vercel)

```env
# No necesita variables especiales - las URLs están hardcodeadas
# para mayor seguridad y simplicidad
```

---

## Archivos Clave

### Frontend

| Archivo | Propósito |
|---------|-----------|
| `app/lib/apiClient.ts` | Cliente HTTP con auto-refresh |
| `app/lib/auth/authService.ts` | Login/logout/me |
| `app/lib/auth/useAuth.tsx` | React Context de auth |

### Backend

| Archivo | Propósito |
|---------|-----------|
| `controllers/auth/auth-controllers.ts` | Login, refresh, logout, me |
| `services/auth/tokenService.ts` | Generar/verificar JWT |
| `middlewares/authenticateToken.ts` | Verificar token en requests |
| `middlewares/roleCheck.ts` | Verificar roles |
| `index.ts` | CORS configuración |

---

## Flujo de Autenticación

### Login

```
1. Usuario ingresa credenciales
   │
   ▼
2. POST https://api.four-points.stackbp.es/api/auth/login
   │
   ▼
3. Backend valida credenciales
   │
   ▼
4. Backend genera tokens y configura cookies:
   Set-Cookie: access_token=xxx; HttpOnly; Secure; Domain=.four-points.stackbp.es
   Set-Cookie: refresh_token=xxx; HttpOnly; Secure; Domain=.four-points.stackbp.es
   │
   ▼
5. Browser guarda cookies automáticamente
   │
   ▼
6. Usuario autenticado ✅
```

### Request Autenticado

```
1. Usuario hace acción (ej: ver logbook)
   │
   ▼
2. apiClient hace fetch con credentials: 'include'
   │
   ▼
3. Browser envía cookies automáticamente
   │
   ▼
4. Backend lee access_token de cookie
   │
   ▼
5. Si válido → responde con datos
   Si expirado → responde 401
```

### Auto-Refresh (cuando access_token expira)

```
1. Request recibe 401
   │
   ▼
2. apiClient detecta 401 + tiene refresh_token
   │
   ▼
3. POST /api/auth/refresh-token (con cookie refresh_token)
   │
   ▼
4. Backend verifica refresh_token
   │
   ├─▶ Válido: genera nuevos tokens, actualiza cookies
   │   │
   │   ▼
   │   apiClient reintenta request original → éxito ✅
   │
   └─▶ Inválido/expirado: limpia cookies
       │
       ▼
       Redirige a /login
```

---

## Sistema de Roles

### Roles Disponibles

| ID | Nombre | Acceso |
|----|--------|--------|
| 1 | recepcionista | Todo excepto admin y grupos |
| 2 | admin | Todo |
| 3 | mantenimiento | **SOLO** /api/maintenance |
| 6 | group-admin | Todo excepto admin |

### Restricción del Rol Mantenimiento

El rol `mantenimiento` solo puede acceder a `/api/maintenance`. Todas las demás rutas usan el middleware `excludeMantenimiento`:

```typescript
// backend/middlewares/roleCheck.ts
export const excludeMantenimiento = (req, res, next) => {
  if (req.user.role === 'mantenimiento') {
    return res.status(403).json({
      error: 'Tu rol solo tiene acceso al módulo de mantenimiento'
    })
  }
  next()
}
```

### Rutas Protegidas

| Módulo | Middleware |
|--------|------------|
| /api/logbook | authenticateToken + excludeMantenimiento |
| /api/blacklist | authenticateToken + excludeMantenimiento |
| /api/parking | authenticateToken + excludeMantenimiento |
| /api/cashier | authenticateToken + excludeMantenimiento |
| /api/conciliation | authenticateToken + excludeMantenimiento |
| /api/departments | authenticateToken + excludeMantenimiento |
| /api/groups | authenticateToken + canManageGroups |
| /api/notifications | authenticateToken + canViewGroups |
| /api/maintenance | authenticateToken + canAccessMaintenance |
| /api/auth/users | authenticateToken + isAdmin |

---

## Console Logs para Debugging

### apiClient.ts

```
[apiClient] GET https://api.four-points.stackbp.es/api/logbook
[apiClient] Response: 200

// Cuando token expira:
[apiClient] Response: 401
[apiClient] 🔄 Token expirado, intentando refresh...
[apiClient] Enviando refresh token...
[apiClient] Refresh response: 200
[apiClient] ✅ Token refrescado
[apiClient] Reintentando request original...
[apiClient] Reintento: 200
```

### authService.ts

```
[authLogin.login] Iniciando para: usuario (PROD)
[authLogin.login] Login exitoso: usuario

[authLogin.me] Obteniendo usuario actual... (PROD)
[authLogin.me] Usuario obtenido: usuario

[authLogin.logout] Cerrando sesión... (PROD)
[authLogin.logout] Sesión cerrada
```

---

## Checklist de Deploy

### 1. DNS

- [ ] Configurar `four-points.stackbp.es` → Vercel
- [ ] Configurar `api.four-points.stackbp.es` → Render
- [ ] Esperar propagación DNS (hasta 48h, usualmente minutos)

### 2. Render (Backend)

- [ ] Crear Web Service desde repositorio
- [ ] Root Directory: `backend`
- [ ] Build Command: `pnpm install && pnpm build`
- [ ] Start Command: `pnpm start`
- [ ] Variables de entorno:
  - [ ] `NODE_ENV=production`
  - [ ] `COOKIE_DOMAIN=.four-points.stackbp.es`
  - [ ] `SECRET_JWT_KEY=...`
  - [ ] Variables de DB (Aiven)
- [ ] Custom Domain: `api.four-points.stackbp.es`

### 3. Vercel (Frontend)

- [ ] Importar proyecto desde repositorio
- [ ] Root Directory: `frontend`
- [ ] Framework Preset: Next.js
- [ ] Custom Domain: `four-points.stackbp.es`

### 4. Verificación

- [ ] Abrir `https://four-points.stackbp.es`
- [ ] Hacer login
- [ ] Verificar cookies en DevTools:
  - Application → Cookies
  - Deben aparecer `access_token` y `refresh_token`
  - Con `HttpOnly: true` y `Domain: .four-points.stackbp.es`
- [ ] Navegar por la app
- [ ] Esperar 15 min para probar auto-refresh (o cambiar temporalmente a `10s`)
- [ ] Probar logout

---

## Troubleshooting

### Cookies no se envían

**Síntoma**: 401 en todas las requests después de login

**Verificar**:
1. DNS configurado correctamente
2. HTTPS activo en ambos subdominios
3. `credentials: 'include'` en fetch
4. `COOKIE_DOMAIN` correcto en backend

### CORS error

**Síntoma**: `Access-Control-Allow-Origin` error en consola

**Verificar**:
1. `https://four-points.stackbp.es` está en `allowedOrigins` del backend
2. Backend desplegado con los cambios

### Refresh loop infinito

**Síntoma**: Múltiples requests a `/refresh-token`

**Verificar**:
1. El endpoint `/api/auth/refresh-token` funciona
2. `skipRefresh: true` se pasa en el reintento
3. Cola de requests (`failedQueue`) se procesa correctamente

### Login funciona pero /me falla

**Síntoma**: Login OK, pero inmediatamente dice "no autenticado"

**Verificar**:
1. Cookie se configuró con el dominio correcto
2. El navegador no está bloqueando cookies
3. Probar en modo incógnito

---

## Desarrollo Local

En desarrollo, el sistema usa:
- Backend: `http://localhost:4000`
- Tokens en `localStorage` (más fácil para debugging)
- Cookies sin `domain` (solo localhost)

Para probar producción localmente:
```bash
# Backend
NODE_ENV=production pnpm dev

# Frontend
NODE_ENV=production pnpm dev
```

---

## Historial de Cambios

### Diciembre 2024 - Arquitectura Simplificada

- ✅ Migrado a subdominios (`four-points.stackbp.es` + `api.four-points.stackbp.es`)
- ✅ Eliminados API Routes proxy (ya no necesarios)
- ✅ Cookies HttpOnly con `domain: .four-points.stackbp.es`
- ✅ CORS configurado para el dominio de producción
- ✅ Sistema de roles con restricción de `mantenimiento`
- ✅ Auto-refresh de JWT funcionando
