# Hoja de ruta "improve"

Estado actual: ramas creadas (`improve`), pendientes de ejecutar tareas.

## Prioridades inmediatas
1) Unificar variables de entorno
- Crear helper `frontend/app/lib/env.ts` con `API_BASE_URL` y `SERVER_API_BASE_URL`.
- Reemplazar uso de `process.env.*` en frontend (lib y route handlers) por el helper.
- Ajustar `.env.example` si aplica.

2) Endurecer Route Handlers de auth (`frontend/app/api/auth/*/route.ts`)
- Validar método permitido por ruta (POST/GET).
- Responder 401 si faltan cookies (`access_token`/`refresh_token`).
- Propagar error del backend con mensaje claro; controlar origen (opcional, lista blanca).

3) Estrategia de tokens
- `apiClient`: eliminar ramas de `localStorage`; usar solo cookies HttpOnly y refresh vía `/api/auth/refresh-token`.
- `backofficeApi.downloadValidatedInvoicesZip`: eliminar lectura de `localStorage` y delegar en cookies.

4) Back Office (reduce avalanchas de fetch)
- Evitar cargar todas las pestañas en SSR + refetch cliente sin cache.
- Migrar tabs a React Query con `staleTime` adecuado y cargar datos por tab (lazy).
- Reutilizar datos iniciales via `HydrationBoundary` si procede.

5) Parking/Maintenance
- Replicar patrón React Query + lazy para cortar fetch repetidos (observado en DevTools: muchas 304/condicionales).

6) SSR/Prerender
- Identificar dashboards críticos a prerender (parking status, grupos) y plan de fetch server + hydration.

7) NextAuth/middleware
- Decidir si se activa; si no, documentar estado y pasos.

## Siguientes pasos concretos
- [ ] Crear `env.ts` y sustituir referencias en `frontend/app/lib/apiClient.ts`, `backofficeApi.ts`, `maintenanceApi.ts`, y Route Handlers.
- [ ] Añadir validaciones en Route Handlers de auth (método, cookies, errores claros).
- [ ] Limpiar `apiClient` y `downloadValidatedInvoicesZip` para cookies-only.
- [ ] Diseñar migración Back Office a React Query (claves, queries por tab, invalidaciones) y aplicar al menos a tab pendiente.

## Notas rápidas
- No hay `AGENTS.md` que restrinja cambios.
- Back Office server component (`dashboard/bo/page.tsx`) ya hace fetch paralelo; el problema es el cliente que vuelve a disparar peticiones sin cache.
- Imagen de referencia mostraba múltiples 304; objetivo: cache en cliente + lazy load.

## Log de decisiones
- Rama de trabajo: `improve`.
- Estrategia: primero base (env, auth handlers, cookies-only) luego optimización de fetch (React Query/lazy).
