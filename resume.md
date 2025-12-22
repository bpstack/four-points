# Diagnóstico Rama `improve` vs `main`

**Fecha:** 22 de Diciembre 2025  
**Rama analizada:** `improve`  
**Comparada con:** `main`

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Commits en `improve` (vs main) | 17 |
| Archivos modificados | ~200 |
| Estado | En progreso - fixes de tipos pendientes |

**Estado:** Middleware de auth activado. Logbooks migrado a React Query (hook creado). apiClient tipado con genéricos. Múltiples fixes de tipos en progreso - **BUILD NO PASA AÚN**.

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
| 17 | PENDIENTE | feat: migrate logbooks to react query + type fixes | Logbooks + fixes tipos |

---

## Sesión Actual (22-dic-2025 noche)

### Completado
1. **Middleware de Auth Activado**
   - Renombrado `middleware.ts.disabled` → `middleware.ts`
   - Quitado bypass `return NextResponse.next()`
   - Commit: `74d92f9`

2. **Logbooks - Hook React Query Creado**
   - Nuevo: `frontend/app/lib/logbooks/hooks/useLogbooks.ts`
   - Queries: entries por fecha, readers por entrada
   - Mutations: create, update, delete, toggleStatus, toggleRead, createComment, updateComment, deleteComment
   - Modificado: `LogbooksContainer.tsx` para usar el hook
   - Modificado: `LogbooksList.tsx` para recibir mutations como props

3. **apiClient Tipado con Genéricos**
   - `get<T>`, `post<T>`, `patch<T>`, `put<T>`, `delete<T>`, `postFormData<T>`
   - Elimina necesidad de type assertions en cada llamada

### En Progreso - FIXES DE TIPOS PENDIENTES

El build expuso múltiples errores de tipos que necesitan corrección:

| Archivo | Error | Estado |
|---------|-------|--------|
| `PaidInvoicesTabLazy.tsx` | `filters_applied` faltante, `keepPreviousData` deprecado | Corregido |
| `SettingsTab.tsx` | `onSuccess` deprecado en RQ v5, refactorizado a mutations | Corregido |
| `cashier/queries.ts` | Hooks sin tipado (`useShiftDetails`, `useDailyDetails`, `useVouchersHistory`) | Corregido |
| `cashier/types.ts` | `VouchersHistoryResponse` tipo añadido, `payment_method_name` requerido | Corregido |
| `groups/panels/ContactPanel.tsx` | Import `GroupContact` faltante | Corregido |
| `groups/tabs/ContactsTab.tsx` | Acceso incorrecto a `contactsData.contacts` | Corregido |
| `groups/tabs/RoomsTab.tsx` | Acceso incorrecto a `roomsData.rooms` | Corregido |
| `groups/tabs/StatusTab.tsx` | Acceso incorrecto a `statusData.status` | Corregido |
| `profile/reports/sections/CashierSection.tsx` | Tipos de respuesta API | Corregido |
| `profile/reports/sections/GroupsSection.tsx` | Tipos de respuesta API | Corregido |
| `profile/SettingsPanel.tsx` | `err?.message` y `err?.response` sin tipo | Corregido |
| `parking/ParkingDashboardClient.tsx` | `FullStatsResponse` import + initialData tipo | Corregido |
| `parking/status/ParkingStatusClient.tsx` | `loadParkingData` no existe en hook | Corregido |
| `parking/status/hooks/useParkingStatus.ts` | `availabilityData` tipo incompatible | Corregido |
| `backoffice/backofficeApi.ts` | `MonthlySummaryResponse` import faltante | Corregido |
| `blacklist/blacklistApi.ts` | `toISOString` en tipo `unknown` | Corregido |
| `ui/dashboard/nav-links.tsx` | `LinkIcon` tipo incorrecto | Corregido |

### Archivos Modificados (sin commit)

```
frontend/app/components/bo/tabs/PaidInvoicesTabLazy.tsx
frontend/app/components/bo/tabs/SettingsTab.tsx
frontend/app/components/groups/panels/ContactPanel.tsx
frontend/app/components/groups/tabs/ContactsTab.tsx
frontend/app/components/groups/tabs/RoomsTab.tsx
frontend/app/components/groups/tabs/StatusTab.tsx
frontend/app/components/logbooks/LogbooksContainer.tsx
frontend/app/components/logbooks/LogbooksList.tsx
frontend/app/components/profile/SettingsPanel.tsx
frontend/app/components/profile/reports/sections/CashierSection.tsx
frontend/app/components/profile/reports/sections/GroupsSection.tsx
frontend/app/dashboard/parking/components/ParkingDashboardClient.tsx
frontend/app/dashboard/parking/status/components/ParkingStatusClient.tsx
frontend/app/dashboard/parking/status/hooks/useParkingStatus.ts
frontend/app/lib/apiClient.ts
frontend/app/lib/backoffice/backofficeApi.ts
frontend/app/lib/blacklist/blacklistApi.ts
frontend/app/lib/cashier/queries.ts
frontend/app/lib/cashier/types.ts
frontend/app/lib/logbooks/hooks/useLogbooks.ts (NUEVO)
```

---

## Para Continuar

1. **Corregir error en `nav-links.tsx`** - `LinkIcon` tipo incorrecto
2. **Ejecutar build** hasta que pase
3. **Probar manualmente** logbooks en navegador
4. **Hacer commit** con todos los cambios

---

## Migración React Query - Estado Actual

### Módulos Migrados

| Módulo | Hook | Estado |
|--------|------|--------|
| BackOffice | Tabs Lazy | Completado |
| Parking | `useParkingStatus` | Completado |
| Maintenance | `useMaintenanceList` | Completado |
| Groups | SSR + initialData | Completado |
| Parking Dashboard | SSR + React Query | Completado |
| **Logbooks** | `useLogbooks` | **En progreso** |

### Módulos Pendientes
- Messages (Alta complejidad)
- Dashboard
- Notifications
- Conciliation
- Departments

---

*Última actualización: 22 de Diciembre 2025 - Sesión nocturna*
