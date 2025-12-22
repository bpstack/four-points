# Hoja de ruta "improve"

Estado actual: rama `improve` con correcciones aplicadas, lista para continuar.

## Prioridades inmediatas (estado 22-dic-2025)
1) Unificar variables de entorno — **[completado]**
- Helper `frontend/app/lib/env.ts` creado y consumido; `.env.example` simplificado.

2) Endurecer Route Handlers de auth — **[completado]**
- Validaciones de origen permitido y cookies; manejo de errores consistente.
- Eliminadas validaciones de método redundantes (App Router ya lo maneja).

3) Estrategia de tokens — **[completado]**
- `apiClient` y descargas usan solo cookies HttpOnly; sin `localStorage`.

4) Back Office (reduce avalanchas de fetch) — **[completado]**
- Tabs `Pending/Paid/Suppliers/Settings` migradas a versiones Lazy con React Query y `staleTime`.
- MOCK_DATA eliminado, bugs corregidos, lint normalizado.

5) Parking — **[completado]**
- Migrado a React Query con claves por fecha e invalidaciones.
- Función `loadParkingData` no usada eliminada.

6) Maintenance — **[completado]**
- Lista migrada a React Query con `useMaintenanceList` hook.
- Queries con claves `['maintenance', 'list', filters]` y `staleTime: 2min`.
- Mutations: create, update, updateStatus, updatePriority, delete, restore con invalidaciones.
- Store Zustand se mantiene para vista de detalle (ReportDetailClient).

7) SSR/Prerender — **[en progreso]** ← ACTUAL
- Planear prerender para dashboards críticos (parking, grupos) y pasar `dehydratedState`.
- ✅ Groups migrado a SSR: Server Action + Client Component con initialData.
- ✅ Parking Dashboard migrado a SSR: Server Action + Client Component con React Query.

8) NextAuth/middleware — **[pendiente]**
- Decidir activación o documentar pasos si se descarta.

## Siguientes pasos concretos (22-dic-2025)
- [x] Crear `env.ts` y sustituir referencias en `frontend/app/lib/apiClient.ts`, `backofficeApi.ts`, `maintenanceApi.ts`, y Route Handlers.
- [x] Añadir validaciones en Route Handlers de auth (origen, cookies, errores claros).
- [x] Limpiar `apiClient` y `downloadValidatedInvoicesZip` para cookies-only.
- [x] Migrar Back Office a React Query (tabs lazy con initialData, staleTime, invalidaciones).
- [x] Migrar Parking a React Query.
- [x] Normalizar CRLF→LF y añadir `.editorconfig`/`.gitattributes`.
- [x] Corregir bugs: handlePdfEditorSave, logout cookies, MOCK_DATA, useMemo deps.
- [x] **Migrar Maintenance a React Query** siguiendo patrón de parking.
  - Creado `useMaintenanceList.ts` con query + mutations.
  - Refactorizado `MaintenanceListClient.tsx` para usar el hook.
  - Eliminado estado local `useState/loadReports` reemplazado por React Query.
- [x] **SSR Groups** - Server Component con Server Action `getGroups`.
  - Creado `frontend/app/dashboard/groups/actions/getGroups.ts`.
  - Creado `frontend/app/components/groups/GroupsListClient.tsx` con React Query + initialData.
  - Refactorizado `groups/page.tsx` a Server Component.
- [x] **SSR Parking Dashboard** - Server Component con Server Action.
  - Creado `frontend/app/dashboard/parking/actions/getParkingDashboardStats.ts`.
  - Creado `frontend/app/dashboard/parking/components/ParkingDashboardClient.tsx` (~780 líneas).
  - Refactorizado `parking/page.tsx` a Server Component (pre-fetch "today" stats).
- [ ] Evaluar NextAuth/middleware y documentar decisión.

## Maintenance – plan React Query (completado)
- ✅ Creado hook `useMaintenanceList` en `app/components/maintenance/hooks/useMaintenanceList.ts`.
- ✅ Query keys factory: `maintenanceKeys.list(filters)`, `maintenanceKeys.detail(id)`.
- ✅ Mutations con invalidación: create, update, updateStatus, updatePriority, delete, restore.
- ✅ `staleTime: 2min`, `gcTime: 5min`, `refetchOnWindowFocus: false`.
- ✅ `MaintenanceListClient.tsx` refactorizado para usar el hook con `initialData` de SSR.
- Nota: Store Zustand permanece para vista de detalle individual (scope separado).

## Notas rápidas
- `.editorconfig` y `.gitattributes` añadidos para prevenir CRLF futuros.
- Lint: 34 errores de variables no usadas (deuda técnica preexistente), 99 warnings.
- Handlers legacy en `app/api/auth/_backup_httponly_cookies/*` se mantienen solo como referencia.

## Log de decisiones
- Rama de trabajo: `improve`.
- Estrategia: primero base (env, auth handlers, cookies-only) luego optimización de fetch (React Query/lazy).
- 22-dic: Bugs críticos corregidos, CRLF normalizado, listo para migrar Maintenance.
- 22-dic: Maintenance lista migrada a React Query. Store Zustand se mantiene para detalle.
- 22-dic: Groups migrado a SSR con Server Action + Client Component.
- 22-dic: Parking Dashboard migrado a SSR con Server Action + Client Component + React Query.
