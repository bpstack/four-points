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

7) SSR/Prerender — **[completado]**
- ✅ Groups migrado a SSR: Server Action + Client Component con initialData.
- ✅ Parking Dashboard migrado a SSR: Server Action + Client Component con React Query.

8) Logbooks — **[completado]**
- Migrado a React Query con `useLogbooks` hook.
- Queries con claves por fecha, mutations para CRUD de entries y comments.

9) Tipado estricto apiClient — **[completado]**
- Genéricos cambiados de `<T = any>` a `<T = unknown>` para type-safety.
- Todos los consumidores actualizados con tipos explícitos.

10) NextAuth/proxy — **[completado]**
- Middleware activado para protección de rutas.
- Migrado de `middleware.ts` a `proxy.ts` (Next.js 16 convention).
- `baseline-browser-mapping` actualizado a última versión.

## Siguientes pasos concretos
- [x] Crear `env.ts` y sustituir referencias.
- [x] Añadir validaciones en Route Handlers de auth.
- [x] Limpiar `apiClient` para cookies-only.
- [x] Migrar Back Office a React Query.
- [x] Migrar Parking a React Query.
- [x] Normalizar CRLF→LF y añadir `.editorconfig`/`.gitattributes`.
- [x] Corregir bugs: handlePdfEditorSave, logout cookies, MOCK_DATA, useMemo deps.
- [x] Migrar Maintenance a React Query.
- [x] SSR Groups - Server Component con Server Action.
- [x] SSR Parking Dashboard - Server Component con Server Action.
- [x] Migrar Logbooks a React Query.
- [x] Tipar apiClient con genéricos `unknown` y actualizar consumidores.
- [x] Migrar middleware.ts a proxy.ts (Next.js 16).
- [x] Actualizar baseline-browser-mapping.
- [ ] Migrar módulos restantes a React Query: Messages, Notifications, Dashboard principal.

## Notas rápidas
- `.editorconfig` y `.gitattributes` añadidos para prevenir CRLF futuros.
- Lint: 0 errores, 0 warnings (limpio).
- Build: pasa correctamente, rutas dinámicas correctamente marcadas.
- Handlers legacy en `app/api/auth/_backup_httponly_cookies/*` se mantienen solo como referencia.

## Log de decisiones
- Rama de trabajo: `improve`.
- Estrategia: primero base (env, auth handlers, cookies-only) luego optimización de fetch (React Query/lazy).
- 22-dic: Bugs críticos corregidos, CRLF normalizado.
- 22-dic: Maintenance lista migrada a React Query.
- 22-dic: Groups y Parking Dashboard migrados a SSR.
- 22-dic: Logbooks migrado a React Query con hook `useLogbooks`.
- 22-dic: apiClient tipado con `unknown` en lugar de `any`, todos los consumidores actualizados.
- 22-dic: Migrado middleware.ts → proxy.ts para cumplir con Next.js 16 convention.
