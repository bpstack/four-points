# Diagnóstico Rama `improve` vs `main`

**Fecha:** 22 de Diciembre 2025  
**Rama analizada:** `improve`  
**Comparada con:** `main`

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Commits en `improve` (vs main) | 18+ |
| Archivos modificados | ~170 |
| Estado | **BUILD PASA, LINT LIMPIO** |

**Estado:** Middleware de auth activado. Logbooks migrado a React Query. apiClient tipado con genéricos `unknown`. Todos los errores de TypeScript corregidos.

---

## Commits Realizados

| # | Hash | Mensaje | Propósito |
|---|------|---------|-----------|
| 1 | `9f57852` | chore: track improvements roadmap docs | Documentación del plan |
| 2 | `3d3c14a` | chore: unify api env and harden auth routes | Helper `env.ts` + URLs unificadas |
| 3 | `22d0437` | fix: wire pending invoice delete dialog and update roadmap | Fix bug `deleteDialogOpen` |
| 4 | `07b32c8` | feat: harden auth flows and move to cookies-only | Eliminar localStorage, validaciones auth |
| 5 | `8d5584b` | feat: migrate parking status to react query | Parking con React Query |
| 6 | `bdede77` | feat: migrate backoffice tabs to react query lazy | BackOffice tabs lazy + React Query |
| 7 | `416892e` | refactor: ui and data layer cleanups across modules | Limpieza general |
| 8 | `5467003` | fix: critical bugs and normalize CRLF to LF | Bugs corregidos, CRLF normalizado |
| 9 | `104f997` | feat: migrate maintenance list to react query | Maintenance con React Query |
| 10 | `04f8835` | feat: migrate Groups and Parking Dashboard to SSR | SSR con Server Actions |
| 11 | `8742c15` | docs: update resume with SSR migrations progress | Actualización documentación |
| 12 | `36fa4c5` | fix: resolve all 35 lint errors (unused vars, CRLF, prettier) | Lint cleanup - errores |
| 13 | `7c01056` | fix: resolve lint warnings (exhaustive-deps, no-explicit-any) | Lint cleanup - warnings |
| 14 | `1315c93` | docs: update resume with lint cleanup progress | Actualización documentación |
| 15 | `cdc179f` | fix: suppress no-img-element warnings and fix remaining any types | Lint cleanup - final |
| 16 | `74d92f9` | feat: enable auth middleware for route protection | Middleware activado |
| 17 | `7baa8cd` | feat: migrate logbooks to react query + fix typescript errors | Logbooks + fixes tipos |
| 18 | PENDIENTE | fix: strict typing for apiClient and fix all type errors | apiClient `unknown` + todos los fixes |

---

## Sesión Actual (22-dic-2025)

### Completado en esta sesión

1. **Corrección de errores de Prettier** (13 errores → 0)
   - Archivos formateados automáticamente con `pnpm lint --fix`

2. **Tipado estricto del apiClient**
   - Cambiado genéricos de `<T = any>` a `<T = unknown>`
   - Elimina warnings de `@typescript-eslint/no-explicit-any`

3. **Actualización de todos los consumidores del apiClient**
   - `LogbooksList.tsx`: Mutations tipadas con `unknown`
   - `useLogbooks.ts`: Query de readers tipada
   - `LogbooksSection.tsx`: Tipos explícitos en respuestas
   - `MaintenanceSection.tsx`: Tipos explícitos en respuestas
   - `OverviewSection.tsx`: Tipos explícitos en respuestas
   - `SettingsPanel.tsx`: Tipos explícitos para usuarios
   - `cashier/queries.ts`: Queries tipadas (history, stats, monthly, dashboard)
   - `MonthlyReport.tsx`: Cast a `unknown` para tipos internos
   - `authService.ts`: Tipo explícito para `/me`
   - `conciliation/queries.ts`: Queries y mutations tipadas
   - `messaging/queries.ts`: createConversation tipada
   - `notifications/useNotifications.ts`: Tipos de Notification importados

### Estado Final

| Aspecto | Estado |
|---------|--------|
| Build | ✅ Pasa |
| TypeScript | ✅ Sin errores |
| Lint | ✅ 0 errores, 0 warnings |
| Rutas dinámicas | ✅ Correctamente marcadas (`ƒ`) |

---

## Migración React Query - Estado Actual

### Módulos Migrados

| Módulo | Hook | Estado |
|--------|------|--------|
| BackOffice | Tabs Lazy | ✅ Completado |
| Parking | `useParkingStatus` | ✅ Completado |
| Maintenance | `useMaintenanceList` | ✅ Completado |
| Groups | SSR + initialData | ✅ Completado |
| Parking Dashboard | SSR + React Query | ✅ Completado |
| Logbooks | `useLogbooks` | ✅ Completado |
| Cashier | Queries tipadas | ✅ Completado |
| Conciliation | Queries tipadas | ✅ Completado |

### Módulos Pendientes
- Messages (Alta complejidad - considerar para siguiente fase)
- Notifications (Migrar a React Query)
- Dashboard principal

---

## Archivos Modificados (esta sesión)

```
frontend/app/components/bo/tabs/SettingsTab.tsx
frontend/app/components/cashier/reports/MonthlyReport.tsx
frontend/app/components/groups/panels/ContactPanel.tsx
frontend/app/components/logbooks/LogbooksList.tsx
frontend/app/components/profile/SettingsPanel.tsx
frontend/app/components/profile/reports/sections/CashierSection.tsx
frontend/app/components/profile/reports/sections/GroupsSection.tsx
frontend/app/components/profile/reports/sections/LogbooksSection.tsx
frontend/app/components/profile/reports/sections/MaintenanceSection.tsx
frontend/app/components/profile/reports/sections/OverviewSection.tsx
frontend/app/dashboard/parking/components/ParkingDashboardClient.tsx
frontend/app/lib/apiClient.ts
frontend/app/lib/auth/authService.ts
frontend/app/lib/cashier/queries.ts
frontend/app/lib/conciliation/queries.ts
frontend/app/lib/logbooks/hooks/useLogbooks.ts
frontend/app/lib/messaging/queries.ts
frontend/app/lib/notifications/useNotifications.ts
```

---

## Warnings de Build (no bloqueantes)

1. **middleware deprecated**: Next.js 16 recomienda usar "proxy" en lugar de "middleware"
2. **baseline-browser-mapping**: Datos de más de 2 meses, actualizar con `npm i baseline-browser-mapping@latest -D`
3. **SSR cookies**: Las rutas `/dashboard/groups` y `/dashboard/parking` usan cookies y se marcan como dinámicas (comportamiento esperado)

---

## Para Continuar

1. ✅ Hacer commit de los cambios actuales
2. Evaluar el warning de middleware deprecated
3. Migrar Messages/Notifications a React Query (siguiente fase)

---

## Bug Crítico Solucionado: Loop Infinito en Refresh Token

**Fecha de resolución:** 22 de Diciembre 2025  
**Tiempo de investigación:** Prolongado  
**Severidad:** Crítica (bloqueaba la aplicación)

### Síntomas

- La aplicación entraba en un loop infinito de requests
- El navegador se quedaba colgado haciendo llamadas continuas al servidor
- Ocurría cuando el access token expiraba y se intentaba renovar

### Causa Raíz

El problema tenía **dos causas combinadas**:

#### 1. Discrepancia en la ruta del endpoint

| Componente | Ruta configurada | Ruta correcta |
|------------|------------------|---------------|
| Backend | `/api/auth/refresh-token` | - |
| Frontend (apiClient) | `/api/auth/refresh` | `/api/auth/refresh-token` |

El frontend llamaba a `/api/auth/refresh` que **no existía** en el backend. Esto retornaba un error (404 o 401), lo que disparaba otro intento de refresh, creando el loop.

#### 2. Sin mecanismo de circuit breaker

No había límite de reintentos. Cada fallo de refresh disparaba otro intento indefinidamente.

#### 3. Verificación incorrecta de cookies HttpOnly

Se usaba `hasRefreshToken()` que verificaba `document.cookie`, pero las **cookies HttpOnly NO son visibles desde JavaScript**. Esto causaba comportamiento impredecible.

### Solución Implementada

**Archivo modificado:** `frontend/app/lib/apiClient.ts`

#### 1. Corrección de la ruta

```typescript
// ANTES (incorrecto)
const refreshUrl = `${API_BASE_URL}/api/auth/refresh`

// DESPUÉS (correcto)
const refreshUrl = `${API_BASE_URL}/api/auth/refresh-token`
```

#### 2. Circuit breaker con contador de intentos

```typescript
let refreshAttempts = 0
const MAX_REFRESH_ATTEMPTS = 3

const resetRefreshAttempts = () => {
  refreshAttempts = 0
}

// En el handler de 401:
if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
  console.log('[apiClient] ⛔ Máximo de intentos de refresh alcanzado')
  refreshAttempts = 0
  clearAuthCookiesAndRedirect()
  throw new Error('Max refresh attempts reached')
}

refreshAttempts++
```

#### 3. Reset del contador en refresh exitoso

```typescript
await refreshSession()
resetRefreshAttempts() // Reset counter on success
```

#### 4. Eliminación de hasRefreshToken()

```typescript
// ANTES: Verificaba cookies que no podía ver
if (isClient && response.status === 401 && !skipRefresh && hasRefreshToken()) {

// DESPUÉS: Siempre intenta refresh, el backend valida la cookie
if (isClient && response.status === 401 && !skipRefresh && !isAuthRoute) {
```

#### 5. Actualización de rutas excluidas del auto-refresh

```typescript
// ANTES
url.includes('/auth/refresh')

// DESPUÉS
url.includes('/auth/refresh-token')
```

#### 6. Logging para debugging

```typescript
console.log('[apiClient] 🔄 Intentando refresh token...')
console.log('[apiClient] 🔑 Recibido 401, intentando refresh... (intento', refreshAttempts + 1, 'de', MAX_REFRESH_ATTEMPTS, ')')
console.log('[apiClient] ✅ Refresh exitoso')
console.log('[apiClient] ❌ Refresh falló:', refreshResponse.status)
```

### Lecciones Aprendidas

1. **Verificar siempre la consistencia de rutas** entre frontend y backend
2. **Las cookies HttpOnly no son accesibles desde JavaScript** - no intentar verificarlas con `document.cookie`
3. **Siempre implementar circuit breakers** en operaciones que pueden fallar y reintentar
4. **Agregar logging detallado** en flujos de autenticación para facilitar debugging
5. **El refresh token debe manejarse de forma defensiva** - asumir que puede fallar

### Verificación de la Solución

La ruta correcta del backend se puede confirmar en:
```
backend/routes/auth/auth-routes.ts:28
router.post('/refresh-token', refreshToken)
```

---

## Funcionalidad Avatar de Perfil (22-dic-2025)

### Implementación Completada

Se añadió la funcionalidad para que los usuarios puedan subir, cambiar y eliminar su foto de perfil (avatar).

### Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `backend/db-mysql/aiven/18_user_avatar.sql` | Migración SQL para añadir campos avatar_url y avatar_public_id |
| `backend/db-mysql/local/18_user_avatar.sql` | Misma migración para entorno local |

### Archivos Modificados

#### Backend

| Archivo | Cambios |
|---------|---------|
| `backend/models/auth/index.ts` | Añadidos campos `avatar_url` y `avatar_public_id` a tipos User, UserRow, UserWithRole |
| `backend/repositories/auth/user-repository.ts` | Añadido `avatar_url` a todas las queries SELECT; nuevos métodos: `updateAvatar()`, `deleteAvatar()`, `getAvatarPublicId()` |
| `backend/controllers/auth/auth-controllers.ts` | Nuevos controllers: `uploadAvatar`, `deleteAvatar`; importado CloudinaryService |
| `backend/routes/auth/auth-routes.ts` | Nuevas rutas: `POST /me/avatar` y `DELETE /me/avatar`; configuración multer (máx 2MB) |

#### Frontend

| Archivo | Cambios |
|---------|---------|
| `frontend/app/lib/logbooks/types.ts` | Añadido `avatar_url?: string \| null` al tipo User |
| `frontend/app/lib/auth/useAuth.tsx` | Añadido `avatar_url: null` al DEV_USER |
| `frontend/app/components/profile/ProfileSidebar.tsx` | UI completa para subir/cambiar/eliminar avatar con preview y menú dropdown |
| `frontend/app/components/layout/ProfileDropdown.tsx` | Muestra avatar en el header si existe |

### Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/me/avatar` | Subir/actualizar avatar (multipart/form-data) |
| DELETE | `/api/auth/me/avatar` | Eliminar avatar |

### Características

- **Límite de tamaño**: 2MB máximo
- **Formatos soportados**: JPEG, PNG, WebP, GIF
- **Almacenamiento**: Cloudinary (carpeta `avatars/`)
- **Optimización**: Cloudinary aplica compresión automática y límite de 1200x1200px
- **Limpieza automática**: Al cambiar avatar, se elimina el anterior de Cloudinary

### Para Desplegar

1. Ejecutar migración SQL en la base de datos:
   ```sql
   -- Ejecutar en MySQL
   ALTER TABLE users
     ADD COLUMN avatar_url VARCHAR(500) NULL DEFAULT NULL,
     ADD COLUMN avatar_public_id VARCHAR(255) NULL DEFAULT NULL;
   ```

2. Reiniciar backend para cargar los nuevos endpoints

---

*Última actualización: 22 de Diciembre 2025*
