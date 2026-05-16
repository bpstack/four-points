# Variables de Entorno - Frontend Analysis

**Origen:** `backend/docs/ENV_VARS.md` y `frontend/docs/VERCEL_ENV_ANALYSIS.md`  
**Fecha:** Diciembre 2024  
**Última actualización:** Enero 2025

---

## Índice

1. [Tu Configuración Actual en Vercel](#1-tu-configuración-actual-en-vercel)
2. [¿Qué es el prefijo NEXT_PUBLIC_?](#2-qué-es-el-prefijo-next_public_)
3. [Análisis de Cada Variable](#3-análisis-de-cada-variable)
4. [¿Es un Problema de Seguridad?](#4-es-un-problema-de-seguridad)
5. [Cómo Funcionan los Entornos en Vercel](#5-cómo-funcionan-los-entornos-en-vercel)
6. [Propuesta de Mejoras (Buenas Prácticas)](#6-propuesta-de-mejoras-buenas-prácticas)
7. [Resumen Ejecutivo](#7-resumen-ejecutivo)

---

## 1. Tu Configuración Actual en Vercel

Actualmente tienes **4 variables** configuradas en Vercel, todas con el mismo valor y en "All Environments":

| Variable                  | Valor                                | Entorno          | Estado      |
| ------------------------- | ------------------------------------ | ---------------- | ----------- |
| `NEXT_PUBLIC_API_URL`     | `https://api.four-points.stackbp.es` | All Environments | ✅ Principal |
| `BACKEND_URL`             | `https://api.four-points.stackbp.es` | All Environments | ✅ Necesaria |
| `BACKEND_API_URL`         | `https://api.four-points.stackbp.es` | All Environments | ❌ No se usa |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.four-points.stackbp.es` | All Environments | ⚠️ Redundante |

**Problema identificado:** Tienes redundancia. Cuatro variables apuntando al mismo sitio.

---

## 2. ¿Qué es el prefijo NEXT_PUBLIC_?

En Next.js, el prefijo `NEXT_PUBLIC_` determina **DÓNDE** puede usarse una variable.

### ¿Qué es una variable?

Una variable es un "contenedor" que guarda un valor que puedes usar en tu código.

```javascript
// Variable que guarda la URL del backend
const backendUrl = "https://api.four-points.stackbp.es";

// Ahora puedes usarla en tu código
fetch(`${backendUrl}/api/auth/login`)
```

### El problema sin variables de entorno:

```javascript
// ❌ MALO: URL hardcodeada en el código
fetch("https://api.four-points.stackbp.es/api/auth/login")
```

**Problemas:**

- En local necesitas "http://localhost:4000"
- En producción "https://api.four-points.stackbp.es"
- Tienes que cambiar el código manualmente cada vez

### La solución: Variables de entorno

```javascript
// ✅ BUENO: URL desde variable de entorno
fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`)
```

**Ventajas:**

- En local: NEXT_PUBLIC_BACKEND_URL = "http://localhost:4000"
- En producción: NEXT_PUBLIC_BACKEND_URL = "https://api.four-points.stackbp.es"
- El código es el mismo, solo cambia la configuración

---

### Variables CON `NEXT_PUBLIC_`

```
NEXT_PUBLIC_API_URL=https://api.four-points.stackbp.es
```

- **Accesible en:** Browser (navegador del usuario) + Servidor
- **Visibilidad:** PÚBLICA - El usuario puede verla en DevTools (F12 → Network)
- **Uso típico:** Llamadas fetch() desde componentes React

### Variables SIN `NEXT_PUBLIC_`

```
BACKEND_URL=https://api.four-points.stackbp.es
```

- **Accesible en:** SOLO el servidor de Next.js
- **Visibilidad:** PRIVADA - El usuario NUNCA puede verla
- **Uso típico:** API Routes, Server Components, secretos

---

### Ejemplo Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR DEL USUARIO                         │
│                                                                      │
│   Tu componente React hace:                                          │
│   fetch(process.env.NEXT_PUBLIC_API_URL + '/api/parking')           │
│                                                                      │
│   El usuario abre DevTools y ve:                                     │
│   → Request a: https://api.four-points.stackbp.es/api/parking       │
│                                                                      │
│   ⚠️  La URL es VISIBLE para el usuario                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ Internet
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVIDOR DE VERCEL (Next.js)                    │
│                                                                      │
│   Tu API Route (app/api/auth/login/route.ts) hace:                  │
│   fetch(process.env.BACKEND_URL + '/api/auth/login')                │
│                                                                      │
│   El usuario NO puede ver esta llamada                               │
│   Solo ve: POST /api/auth/login (a tu frontend)                     │
│                                                                      │
│   ✅ La URL es INVISIBLE para el usuario                             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ Internet (servidor a servidor)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TU BACKEND (Express)                         │
│                  https://api.four-points.stackbp.es                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Análisis de Cada Variable

### 3.1 `NEXT_PUBLIC_API_URL` - LA PRINCIPAL (26 archivos)

**¿Qué es?** Variable pública para el navegador.

**¿Dónde se usa?** En 26 archivos del frontend:

| Archivo                                                    | Propósito                                  |
| ---------------------------------------------------------- | ------------------------------------------ |
| `app/lib/apiClient.ts`                                     | Cliente API principal con auto-refresh JWT |
| `app/lib/auth/authService.ts`                              | Servicio de autenticación                  |
| `app/lib/activity/queries.ts`                              | Queries de actividad                       |
| `app/lib/parking/actions.ts`                               | Actions de parking                         |
| `app/lib/backoffice/backofficeApi.ts`                      | API de backoffice                          |
| `app/lib/maintenance/maintenanceApi.ts`                    | API de mantenimiento                       |
| `app/lib/blacklist/blacklistApi.ts`                        | API de blacklist                           |
| `app/lib/cashier/queries.ts`                               | Queries de cajero                          |
| `app/lib/conciliation/queries.ts`                          | Queries de conciliación                    |
| `app/lib/messaging/queries.ts`                             | Queries de mensajería                      |
| `app/lib/notifications/useNotifications.ts`                | Hook de notificaciones                     |
| `app/components/notifications/GlobalNotificationModal.tsx` | Modal de notificaciones                    |
| `app/components/profile/SettingsPanel.tsx`                 | Panel de configuración                     |
| `app/components/profile/ProfileSidebar.tsx`                | Sidebar de perfil                          |
| `app/components/profile/reports/sections/*.tsx`            | Secciones de reportes (5 archivos)         |
| `app/dashboard/maintenance/actions/*.ts`                   | Actions de mantenimiento (7 archivos)      |
| `app/dashboard/blacklist/actions/*.ts`                     | Actions de blacklist (6 archivos)          |

**Ejemplo de uso en código:**

```typescript
// app/lib/apiClient.ts:27
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://four-points.onrender.com'
```

**Veredicto:** ✅ NECESARIA - Es la variable principal.

---

### 3.2 `NEXT_PUBLIC_BACKEND_URL` - DUPLICADA (5 archivos)

**¿Qué es?** Variable pública para el navegador (igual que la anterior).

**¿Dónde se usa?** En 5 archivos:

| Archivo                          | Propósito                |
| -------------------------------- | ------------------------ |
| `app/lib/parking/queries.ts`     | Queries de parking       |
| `app/lib/groups/queries.ts`      | Queries de grupos        |
| `app/lib/logbooks/queries.ts`    | Queries de bitácoras     |
| `app/lib/departments/queries.ts` | Queries de departamentos |
| `app/lib/users/queries.ts`       | Queries de usuarios      |

**Ejemplo de uso en código:**

```typescript
// app/lib/parking/queries.ts:27
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
```

**Veredicto:** ⚠️ REDUNDANTE - Hace exactamente lo mismo que `NEXT_PUBLIC_API_URL`. Deberían unificarse.

---

### 3.3 `BACKEND_URL` - PARA EL SERVIDOR (5 archivos)

**¿Qué es?** Variable privada, solo accesible desde el servidor de Next.js.

**¿Dónde se usa?** En 5 archivos de API Routes:

| Archivo                          | Propósito               |
| -------------------------------- | ----------------------- |
| `app/api/auth/login/route.ts`    | Proxy de login          |
| `app/api/auth/logout/route.ts`   | Proxy de logout         |
| `app/api/auth/me/route.ts`       | Proxy de usuario actual |
| `app/api/auth/refresh/route.ts`  | Proxy de refresh token  |
| `app/api/auth/register/route.ts` | Proxy de registro       |

**¿Por qué son API Routes (proxies)?**

Las API Routes de autenticación actúan como intermediarios:

```
┌──────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│   Browser    │ ---> │  /api/auth/login    │ ---> │  Tu Backend      │
│   (Usuario)  │      │  (Servidor Vercel)  │      │  (Express)       │
└──────────────┘      └─────────────────────┘      └──────────────────┘
       │                       │                           │
       │ Ve: POST /api/auth/login                          │
       │ (tu dominio de Vercel)                            │
       │                       │                           │
       │                       │ Hace: POST /api/auth/login
       │                       │ a https://api.four-points.stackbp.es
       │                       │ (el usuario NO ve esto)
```

Esto permite manejar cookies HttpOnly de forma segura.

**Ejemplo de uso en código:**

```typescript
// app/api/auth/login/route.ts:9
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'
```

**Veredicto:** ✅ NECESARIA - Usada correctamente para operaciones server-side.

---

### 3.4 `BACKEND_API_URL` - NO SE USA

**¿Qué es?** Una variable que tienes configurada en Vercel.

**¿Dónde se usa?** En NINGÚN archivo del código.

**Veredicto:** ❌ ELIMINAR - No tiene propósito, es basura en tu configuración.

---

## 4. ¿Es un Problema de Seguridad?

### Respuesta corta: NO

### Respuesta larga:

Tu URL `https://api.four-points.stackbp.es` es una **API pública**. Esto significa:

1. **Ya es visible para cualquiera** - Si alguien abre DevTools (F12 → Network), puede ver todas las llamadas a tu API
2. **Tu API tiene protección propia** - Usas JWT tokens, así que conocer la URL no da acceso a nada
3. **La URL no es un secreto** - Es como saber la dirección de un banco; saberla no te da acceso a las bóvedas

### ¿Cuándo SÍ sería un problema?

Si guardaras **secretos** en la URL:

```bash
# ESTO SÍ SERÍA PELIGROSO si fuera NEXT_PUBLIC_
BACKEND_URL=https://api.example.com?api_key=MI_SECRETO_123
```

En ese caso, NUNCA usarías `NEXT_PUBLIC_` porque el usuario vería el secreto.

### Tu situación actual

```
NEXT_PUBLIC_API_URL      = https://api.four-points.stackbp.es  ✅ Seguro
NEXT_PUBLIC_BACKEND_URL  = https://api.four-points.stackbp.es  ✅ Seguro (redundante)
BACKEND_URL              = https://api.four-points.stackbp.es  ✅ Seguro
BACKEND_API_URL          = https://api.four-points.stackbp.es  ✅ Seguro (no se usa)
```

**Conclusión:** No hay problema de seguridad. Solo hay redundancia.

---

## 5. Cómo Funcionan los Entornos en Vercel

Vercel tiene 3 tipos de entornos:

```
┌─────────────────────────────────────────────────────────────────────┐
│                            VERCEL                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PRODUCTION                                                          │
│  ├─ Se activa con: push a rama 'main'                               │
│  ├─ URLs: four-points.vercel.app, four-points.stackbp.es            │
│  └─ Usa variables marcadas como "Production"                        │
│                                                                      │
│  PREVIEW                                                             │
│  ├─ Se activa con: push a cualquier otra rama (ej: backoffice)      │
│  ├─ URL: four-points-fpx0im5tk-bpstacks-projects.vercel.app         │
│  └─ Usa variables marcadas como "Preview"                           │
│                                                                      │
│  DEVELOPMENT                                                         │
│  ├─ Se activa con: comando 'vercel dev' en tu máquina local         │
│  └─ Usa variables marcadas como "Development"                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### ¿Qué significa "All Environments"?

Cuando configuras una variable como **"All Environments"**, Vercel usa el **mismo valor** en Production, Preview y Development.

Tu configuración actual:

```
NEXT_PUBLIC_API_URL = https://api.four-points.stackbp.es  [All Environments]
```

Esto significa:

- En Production (four-points.stackbp.es) → usa `https://api.four-points.stackbp.es`
- En Preview (four-points-fpx0im5tk...) → usa `https://api.four-points.stackbp.es`
- En Development (vercel dev) → usa `https://api.four-points.stackbp.es`

### ¿Cuándo querrías valores diferentes por entorno?

Si tuvieras un backend de staging/testing:

| Variable              | Production                           | Preview                                      | Development             |
| --------------------- | ------------------------------------ | -------------------------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | `https://api.four-points.stackbp.es` | `https://api-staging.four-points.stackbp.es` | `http://localhost:4000` |

Pero como solo tienes un backend, "All Environments" está bien para ti.

---

## 6. Propuesta de Mejoras (Buenas Prácticas)

### Estado Actual vs Estado Óptimo

```
ESTADO ACTUAL (4 variables):                ESTADO ÓPTIMO (2 variables):
┌────────────────────────────┐              ┌────────────────────────────┐
│ NEXT_PUBLIC_API_URL     ✅ │              │ NEXT_PUBLIC_API_URL     ✅ │
│ NEXT_PUBLIC_BACKEND_URL ⚠️ │    ──────>   │ BACKEND_URL             ✅ │
│ BACKEND_URL             ✅ │              └────────────────────────────┘
│ BACKEND_API_URL         ❌ │
└────────────────────────────┘
```

### Cambios Propuestos

#### Paso 1: Eliminar en Vercel

- ❌ Eliminar `BACKEND_API_URL` (no se usa en ningún archivo)

#### Paso 2: Unificar en el Código (5 archivos)

Cambiar estos 5 archivos para que usen `NEXT_PUBLIC_API_URL` en lugar de `NEXT_PUBLIC_BACKEND_URL`:

| Archivo                          | Cambio                                            |
| -------------------------------- | ------------------------------------------------- |
| `app/lib/parking/queries.ts`     | `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL` |
| `app/lib/groups/queries.ts`      | `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL` |
| `app/lib/logbooks/queries.ts`    | `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL` |
| `app/lib/departments/queries.ts` | `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL` |
| `app/lib/users/queries.ts`       | `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL` |

#### Paso 3: Eliminar en Vercel (después de cambiar el código)

- ❌ Eliminar `NEXT_PUBLIC_BACKEND_URL` (ya no se usará)

### Configuración Final Recomendada en Vercel

| Variable              | Entorno          | Valor                                | Propósito                             |
| --------------------- | ---------------- | ------------------------------------ | ------------------------------------- |
| `NEXT_PUBLIC_API_URL` | All Environments | `https://api.four-points.stackbp.es` | Para el navegador (componentes React) |
| `BACKEND_URL`         | All Environments | `https://api.four-points.stackbp.es` | Para el servidor (API Routes)         |

### Beneficios de Esta Configuración

1. **Simplicidad** - Solo 2 variables en lugar de 4
2. **Claridad** - Cada variable tiene un propósito claro y único
3. **Mantenibilidad** - Menos lugares donde cambiar si la URL del backend cambia
4. **Buenas prácticas** - Separación clara entre variables públicas y privadas

### Actualizar `.env.example`

También deberías actualizar el archivo `.env.example` del frontend:

```env
# ==========================================
# VARIABLES DE ENTORNO - FRONTEND
# ==========================================

# URL del Backend - Para componentes del navegador (cliente)
# El prefijo NEXT_PUBLIC_ hace que sea accesible en el browser
NEXT_PUBLIC_API_URL=http://localhost:4000

# URL del Backend - Para API Routes (servidor)
# Sin prefijo = solo accesible en el servidor de Next.js
BACKEND_URL=http://localhost:4000
```

---

## 7. Resumen Ejecutivo

| Pregunta                               | Respuesta                                         |
| -------------------------------------- | ------------------------------------------------- |
| ¿Mi configuración actual funciona?     | ✅ Sí                                             |
| ¿Es insegura?                          | ✅ No, es segura                                  |
| ¿Está optimizada?                      | ⚠️ No, tiene redundancia                          |
| ¿Qué debería eliminar?                 | `BACKEND_API_URL` (no se usa)                     |
| ¿Qué debería unificar?                 | `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL` |
| ¿Cuántas variables necesito realmente? | 2: `NEXT_PUBLIC_API_URL` y `BACKEND_URL`          |

---

## Ver también

- `env_bars/aiven-setup.md` - Configuración MySQL Cloud
- `env_bars/database-configuration.md` - Configuración dual BD
- `backend/docs/config/server-setup.md` - Configuración del servidor
- `backend/docs/security/security-implementation.md` - Implementación de seguridad


