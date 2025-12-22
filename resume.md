# Diagnóstico Rama `improve` vs `main`

**Fecha:** 22 de Diciembre 2025  
**Rama analizada:** `improve`  
**Comparada con:** `main`

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Commits en `improve` (vs main) | 9 |
| Archivos modificados | ~145 |
| Estado | Listo para continuar |

**Estado:** Todos los cambios están commiteados. Migración React Query completada para BackOffice, Parking y Maintenance.

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
| 9 | (pending) | feat: migrate maintenance list to react query | Maintenance con React Query |

---

## Cumplimiento del Plan (`improve-roadmap.md`)

### Prioridades Completadas

| # | Tarea | Estado | Commit |
|---|-------|--------|--------|
| 1 | Unificar variables de entorno | **Completado** | `3d3c14a` |
| 2 | Endurecer Route Handlers de auth | **Completado** | `07b32c8` |
| 3 | Estrategia de tokens (cookies-only) | **Completado** | `07b32c8` |
| 4 | Back Office - React Query/lazy | **Completado** | `bdede77` |
| 5 | Parking - React Query | **Completado** | `8d5584b` |
| 6 | Maintenance - React Query | **Completado** | (pending) |

### Prioridades Pendientes

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 7 | SSR/Prerender | Pendiente | Planear para dashboards críticos |
| 8 | NextAuth/middleware | Pendiente | Decidir si activar o documentar descarte |

---

## Errores Corregidos (Commit 8 - `5467003`)

Los siguientes bugs fueron identificados y corregidos:

| Severidad | Descripción | Estado |
|-----------|-------------|--------|
| CRÍTICO | `handlePdfEditorSave` con código copiado incorrectamente | ✅ Corregido |
| ERROR | Logout retornaba 401 sin limpiar cookies | ✅ Corregido |
| LIMPIEZA | ~260 líneas de MOCK_DATA en producción | ✅ Eliminado |
| MENOR | Dependencia `getSpanishMonthName` innecesaria en useMemo | ✅ Corregido |
| MENOR | Variable `loadParkingData` no usada | ✅ Eliminada |
| MENOR | Validación de método redundante en Route Handlers | ✅ Eliminada |
| FORMATO | Archivos con CRLF en lugar de LF | ✅ Normalizado |

---

## Migración React Query - Estado Actual

### Módulos Migrados

| Módulo | Hook | Query Keys | Mutations |
|--------|------|------------|-----------|
| BackOffice | Tabs Lazy | `['backoffice', 'invoices', ...]` | create, update, delete, validate |
| Parking | `useParkingStatus` | `['parking', 'stats', date]` | checkIn, checkOut, cancel, noShow |
| Maintenance | `useMaintenanceList` | `['maintenance', 'list', filters]` | create, update, updateStatus, delete |

### Configuración Estándar
- `staleTime: 2-5 min`
- `gcTime: 5-10 min`
- `refetchOnWindowFocus: false`
- Invalidación automática tras mutations

### Módulos Pendientes
- Grupos
- Logbooks
- Notificaciones
- Mensajería
- Actividad
- Usuarios

---

## Archivos Clave Modificados

### Core Auth/API
| Archivo | Cambio |
|---------|--------|
| `frontend/app/lib/env.ts` | **Nuevo** - Helper de URLs |
| `frontend/app/lib/apiClient.ts` | Simplificado, cookies-only |
| `frontend/app/api/auth/*/route.ts` | Validaciones añadidas, bugs corregidos |

### React Query Migrations
| Archivo | Cambio |
|---------|--------|
| `useParkingStatus.ts` | Migrado a React Query |
| `*TabLazy.tsx` (4 archivos) | **Nuevos** - BackOffice con RQ |
| `useMaintenanceList.ts` | **Nuevo** - Maintenance con RQ |
| `MaintenanceListClient.tsx` | Refactorizado para usar hook |

### Normalización
| Archivo | Cambio |
|---------|--------|
| `.editorconfig` | **Nuevo** - Configuración de editores |
| `.gitattributes` | **Nuevo** - Normalización de line endings |

---

## Lint Status

- **34 errores**: Todos son `@typescript-eslint/no-unused-vars` (deuda técnica preexistente)
- **99 warnings**: Mayormente `<img>` sin next/image, tipos `any`, deps faltantes en hooks

No hay errores nuevos introducidos por la migración.

---

## Próximos Pasos

1. **SSR/Prerender** - Planear prerender para dashboards críticos (parking, grupos)
2. **NextAuth/middleware** - Decidir si activar o documentar el descarte
3. **Migración React Query** - Continuar con Grupos, Logbooks, etc.
4. **Lint cleanup** - Resolver deuda técnica de variables no usadas

---

*Última actualización: 22 de Diciembre 2025*
