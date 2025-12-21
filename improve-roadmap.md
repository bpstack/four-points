# Hoja de ruta "improve"

Estado actual: ramas creadas (`improve`), pendientes de ejecutar tareas.

## Prioridades inmediatas (estado 21-dic-2025)
1) Unificar variables de entorno — **[completado]**
- Helper `frontend/app/lib/env.ts` creado y consumido; `.env.example` simplificado.

2) Endurecer Route Handlers de auth — **[completado]**
- Validaciones de método, origen permitido y cookies; manejo de errores consistente.

3) Estrategia de tokens — **[completado]**
- `apiClient` y descargas usan solo cookies HttpOnly; sin `localStorage`.

4) Back Office (reduce avalanchas de fetch) — **[en progreso]**
- Tabs `Pending/Paid/Suppliers/Settings` migradas a versiones Lazy con React Query y `staleTime`; falta cerrar lint/QA.

5) Parking/Maintenance — **[parcial]**
- Parking migrado a React Query con claves por fecha e invalidaciones; pendiente aplicar patrón en Maintenance.

6) SSR/Prerender — **[pendiente]**
- Planear prerender para dashboards críticos (parking, grupos) y pasar `dehydratedState`.

7) NextAuth/middleware — **[pendiente]**
- Decidir activación o documentar pasos si se descarta.

## Siguientes pasos concretos (backup 21-dic-2025)
- [x] Crear `env.ts` y sustituir referencias en `frontend/app/lib/apiClient.ts`, `backofficeApi.ts`, `maintenanceApi.ts`, y Route Handlers.
- [x] Añadir validaciones en Route Handlers de auth (método, cookies, errores claros).
- [x] Limpiar `apiClient` y `downloadValidatedInvoicesZip` para cookies-only.
- [x] Diseñar migración Back Office a React Query (claves, queries por tab, invalidaciones) y aplicar al menos a tab pendiente (ahora tabs lazy).
- [ ] Finalizar lint/QA de tabs Back Office y parking (hay 30 errores/99 warnings pendientes en lint).
- [ ] Migrar Maintenance a React Query siguiendo patrón de parking.
- [ ] Planificar/implementar SSR o prerender en dashboards seleccionados.
- [ ] Evaluar NextAuth/middleware y documentar decisión.

## Back Office – plan React Query/lazy
- Ajustar queries por tab (pending/paid/suppliers/settings) con `queryKey` que incluya paginación/filtros y `keepPreviousData: true`.
- Usar `initialData`/`staleTime` coherente con SSR y evitar refetch al cambiar de tab (`refetchOnMount:false`, `refetchOnWindowFocus:false`).
- Mutaciones (validate/reject/upload/batch pay/revert) deben invalidar solo las claves afectadas por tab/página.
- Prefetch de página siguiente/anterior en cambio de paginación para UX fluido.
- Confirmar que export/download usan el `apiClient`/cookies (ya actualizado `downloadValidatedInvoicesZip`).

## Parking – plan React Query/SSR
- Reemplazar `useParkingStatus` con React Query (queries: `fullStats(selectedDate)`, `bookings(active)`, `overdue`, `spots`).
- Claves por fecha (`['parking','stats',date]`, `['parking','bookings',date]`) y `select` para derivar `spotsWithStatus` y `activeDateBookings` sin loops de estado.
- Mutaciones (`checkIn/out`, `cancel`, `noShow`, `delete`, `update`) invalidan claves por fecha; usar `isFetching` en lugar de loaders manuales.
- Considerar SSR/hydration para status inicial: fetch server y pasar `dehydratedState` al client (layout/status).
- Reducir toasts duplicados y manejo de errores con helper/ApiError.

## Notas rápidas
- No hay `AGENTS.md` que restrinja cambios.
- Back Office server component (`dashboard/bo/page.tsx`) ya hace fetch paralelo; el problema es el cliente que vuelve a disparar peticiones sin cache.
- Imagen de referencia mostraba múltiples 304; objetivo: cache en cliente + lazy load.
- Handlers legacy en `app/api/auth/_backup_httponly_cookies/*` se mantienen solo como referencia.

## Log de decisiones
- Rama de trabajo: `improve`.
- Estrategia: primero base (env, auth handlers, cookies-only) luego optimización de fetch (React Query/lazy).
