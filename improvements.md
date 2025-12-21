# Plan de mejoras prioritarias

## Checklist general (orden sugerido)
1. Unificar variables de entorno (helper + uso único en front/route handlers).
2. Endurecer Route Handlers (método, cookies requeridas, origen permitido, mensajes claros).
3. Eliminar `localStorage` del `apiClient` y depender solo de cookies.
4. Decidir si se activará NextAuth + middleware y planificarlo.
5. Revisar qué vistas deben prerenderizarse (SSR/SSG) antes de cargar datos pesados en el cliente.
6. Migrar módulos a React Query, siguiendo el orden de prioridades (grupos → parking → …).

## Resumen “estado actual vs. objetivo”
| Tema | Cómo está hoy | Objetivo |
| --- | --- | --- |
| URLs/entornos | Cada archivo usa una env distinta (`NEXT_PUBLIC_API_URL`, `BACKEND_URL`, etc.). | Helper único con `API_BASE_URL` y actualización masiva de `fetch`.
| Route Handlers | Proxy directo al backend sin validar método/origen/cookies. | Validaciones básicas + mensajes claros antes de reenviar la petición.
| Tokens | `apiClient` mezcla cookies y `localStorage` en dev. | Solo cookies HttpOnly; `localStorage` eliminado.
| NextAuth | Dependencia instalada pero inactiva (`middleware.ts.disabled`). | Definir si se activa (y cuándo) para unificar auth.
| SSR/Prerender | Muchas vistas críticas 100% cliente (`useEffect` pesado). | Identificar dashboards críticos y precargar datos en server.
| React Query | Solo conciliación/cashier usan React Query; resto estado manual. | Migrar módulos clave, aprovechar cache y mutations.

## 1. Fundamentos de Next.js a estabilizar

> Antes de migrar más módulos a React Query, conviene cerrar estos puntos porque afectan seguridad, SSR y consistencia general. Explico cada concepto de forma más coloquial para que sea sencillo de seguir.

### 1.1 Consistencia de URLs y entornos
- **Qué es**: ahora mismo existen varias variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BACKEND_URL`, `BACKEND_URL`, `API_URL`). Cada archivo usa una diferente para llamar al backend. Si olvidas actualizar una, el frontend puede apuntar a otro servidor.
- **Cómo estandarizarlo**:
  1. Añade en `.env` solo dos variables claras. Ejemplo:
     - `NEXT_PUBLIC_API_URL=http://localhost:4000` (la usará todo el código cliente y server).
     - Si prefieres separar, añade `NEXT_SERVER_API_URL=http://localhost:4000` para código que corre solo en el servidor de Next.
  2. Crea un helper `frontend/app/lib/env.ts` con algo como:
     ```ts
     export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
     export const SERVER_API_BASE_URL = process.env.NEXT_SERVER_API_URL || API_BASE_URL
     ```
  3. En todos los archivos que hoy usan `process.env.*` (ej. `app/lib/groups/queries.ts`, `app/api/auth/login/route.ts`), importa el helper y usa `API_BASE_URL` o `SERVER_API_BASE_URL` según corresponda.
  4. Resultado: un único punto de verdad para cambiar URLs entre dev/staging/prod y cero riesgos de inconsistencias.

### 1.2 Route Handlers y validaciones
- **Qué son**: los archivos bajo `app/api/.../route.ts` actúan como mini-API en el frontend. Por ejemplo, `app/api/auth/login/route.ts` recibe credenciales desde la UI y las reenvía al backend. Cualquier petición externa también podría pegarle.
- **Mejoras necesarias** (aplica a `login`, `logout`, `refresh`, `me`, `register`):
  1. **Valida método**: añade al inicio `if (req.method !== 'POST') return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })` (o `GET` para la ruta `me`).
  2. **Revisa cookies/tokens**: antes de llamar al backend, verifica que exista la cookie obligatoria (`access_token` para `/me`, `/logout`; `refresh_token` para `/refresh`). Si falta, responde con 401 y evita tocar el backend.
  3. **Controla origen** (opcional pero recomendable en prod): usa `const origin = req.headers.get('origin')` y compara con una lista blanca (misma que en CORS). Si no coincide, responde 403.
  4. **Mensajes claros**: si el backend responde con error, propaga el mensaje pero añade contexto. Ej.: `return NextResponse.json({ error: data.error ?? 'Error autenticando' }, { status: backendRes.status })`.
- Con esto, los route handlers dejan de ser un simple proxy y actúan como primera línea de defensa.

### 1.3 Estrategia única de tokens/cookies
- **Situación actual**: `app/lib/apiClient.ts` intenta guardar tokens en `localStorage` (modo dev) y también usa cookies HttpOnly (modo prod). Son dos fuentes distintas.
- **Recomendado**: quedarte solo con cookies HttpOnly como propone Next. Así todo pasa por los Route Handlers y no hay riesgo de que un token viejo se quede en `localStorage`.
- **Cómo hacerlo paso a paso**:
  1. **Confirmar CORS**: en `backend/index.ts` ya se permite `http://localhost:3000` y `credentials: true`. No necesitas cambios.
  2. **Confirmar cookies**: en `controllers/auth/auth-controllers.ts` las cookies usan `secure` solo en prod y no fijan `domain` en dev, por lo que se comparten entre `localhost:3000` y `localhost:4000`.
  3. **Limpiar `apiClient`** (`frontend/app/lib/apiClient.ts`): elimina las secciones que leen/escriben `localStorage` y deja que siempre confíe en las cookies (el `fetch` ya incluye `credentials: 'include'`).
  4. **Prueba manual**: arranca backend (`pnpm dev` en `backend/`) y frontend (`pnpm dev` en `frontend/`). Haz login desde `http://localhost:3000`, abre DevTools → Application → Cookies → `http://localhost` y verifica que existen `access_token` y `refresh_token`. Refresca la página y comprueba que sigues autenticado.
  5. **Verificar refresh**: borra la cookie `access_token` y navega por la app. El `apiClient` debería llamar a `/api/auth/refresh-token` y obtener nuevas cookies sin necesidad de `localStorage`.

### 1.4 Candidatos a SSR/prerender
- **Qué significa**: SSR/SSG (prerender) es cuando Next obtiene los datos en el servidor y envía HTML ya lleno. Muchas pantallas bajo `app/dashboard/**` son `use client` y esperan a que el navegador pida la info después.
- **Dónde mirar**: `useParkingStatus` (en `app/dashboard/parking/status/hooks/...`) y el store `useGroupStore.ts` podrían beneficiarse de traer parte de los datos en el server para que el dashboard cargue con información desde el primer render. Luego puedes hidratar React Query con `HydrationBoundary`.

### 1.5 NextAuth/middleware
- El repo trae `next-auth` y un `middleware.ts.disabled`. NextAuth + middleware es la forma oficial de proteger rutas y obtener sesión en App Router. Si planeas usarlo, conviene activarlo antes de refactors como React Query, porque cambiaría cómo obtienes el usuario actual.

---

## 2. Resumen “estado actual vs. objetivo” (detalle por tema)
| Tema | Situación actual | Resultado esperado | Acciones clave |
| --- | --- | --- | --- |
| Env vars | variables mezcladas (`NEXT_PUBLIC_API_URL`, `BACKEND_URL`, `API_URL`). | Helper `env.ts` con `API_BASE_URL`, usado en todo fetch. | Crear helper, actualizar imports en `app/lib/**` y `app/api/**`.
| Route Handlers | Sin validación de método ni cookies previas. | Ruta valida método, cookies y origen antes de pegar al backend. | Editar `app/api/auth/*/route.ts`.
| Tokens | `apiClient` escribe en `localStorage` en dev. | Solo cookies HttpOnly, mismo flujo dev/prod. | Limpiar `apiClient`, probar login/refresh.
| NextAuth | Instalado pero sin uso real. | Decidir si se activa (y planearlo). | Revisar `middleware.ts.disabled`, rutas protegidas.
| SSR | Dashboards 100% cliente. | Identificar vistas a prerender (useParkingStatus, grupos). | Diseñar fetch en server + Hydration.
| React Query | Solo conciliación/cashier lo usan. | Migración gradual (grupos → parking → …). | Hooks `useQuery`/`useMutation`, invalidaciones.

---

# React Query Migration Opportunities

## Context
- El frontend ya incluye `@tanstack/react-query`, pero solo se emplea en `app/lib/conciliation/queries.ts` y `app/lib/cashier/queries.ts`.
- El resto de módulos mantiene hooks personalizados con `apiClient`, estados locales o stores de Zustand para manejar loading, errores y reintentos.
- `apiClient` ya resuelve autenticación y refresh de tokens, por lo que puede reutilizarse dentro de React Query sin cambios.
- Comentarios internos señalan una migración gradual pendiente.

## Módulos prioritarios y motivos

### 1. Grupos (`app/lib/groups/*` + `app/stores/useGroupStore.ts`)
- **Patrón actual**: almacena datos remotos (grupo, pagos, contactos, habitaciones, status) directamente en Zustand y ejecuta llamadas manuales `refresh*`.
- **Problema**: duplicación de caches, manejo manual de loaders y errores, difícil invalidar datos tras mutaciones y riesgo de inconsistencias.
- **Beneficio con React Query**:
  - Cache por `groupId` y por entidad (payments, rooms, contacts).
  - `useMutation` + `invalidateQueries` elimina necesidad de `refresh*` y reduce la store a puro estado de UI.
  - Refetch automático cuando se vuelve al foco o al cambiar parámetros.

### 2. Parking (`app/lib/parking/queries.ts` + `app/dashboard/parking/status/hooks/useParkingStatus.ts`)
- **Patrón actual**: hook `useParkingStatus` hace múltiples peticiones secuenciales con `useState`/`useEffect` y controla loaders y toasts manualmente.
- **Problema**: cargas bloqueantes, ausencia de cache por fecha, lógica extensa para derivar disponibilidad.
- **Beneficio con React Query**:
  - Dividir en queries independientes (`stats`, `bookings`, `overdue`, `spots`) con claves basadas en `selectedDate`.
  - `select` para derivar `activeDateBookings` y mapear spots.
  - Mutaciones (`checkIn`, `cancel`, etc.) con invalidación centralizada.

### 3. Logbooks (`app/lib/logbooks/queries.ts`)
- **Patrón actual**: API de funciones async sin caching; componentes manejan `loading/error` y duplican datos en estado local.
- **Beneficio**:
  - Query keys por filtros (prioridad, depto, autor, día) y sincronización entre listados, lectores y comentarios.
  - Reintentos automáticos y refetch tras mutaciones (crear, resolver, comentarios).

### 4. Notificaciones (`app/lib/notifications/useNotifications.ts` + `app/stores/useNotificationStore.ts`)
- **Patrón actual**: hook personalizado que setea manualmente `loading/error`, vuelve a pedir contador y mantiene datos en Zustand.
- **Beneficio**:
  - Reemplazar con `useQuery` para listado y contador; `useMutation` para marcar o eliminar.
  - Configurar polling o refetch on window focus.

### 5. Mensajería (`app/lib/messaging/queries.ts`)
- **Patrón actual**: funciones async independientes usadas desde componentes con `useEffect` y estados locales.
- **Beneficio**:
  - Caches por conversación, `useInfiniteQuery` para mensajes paginados, invalidación tras enviar/editar/eliminar.
  - Mejor control de `unreadCount` con revalidaciones automáticas.

### 6. Otros módulos (actividad, usuarios, mantenimiento)
- **Patrón actual**: funciones async similares; carecen de cache y repiten manejo de estados.
- **Beneficio**: estandarizar el acceso a datos y facilitar SSR/Hydration en el futuro.

## Beneficios generales de migrar a React Query
- Cache y sincronización automática: evita refrescos manuales y mantiene vistas coherentes.
- Estados estandarizados (`isLoading`, `isError`, `dataUpdatedAt`, `refetch`) sin reimplementarlos.
- Invalidez selectiva tras mutaciones con `queryClient.invalidateQueries`.
- Refetch en segundo plano y reintentos configurables.
- Manejo centralizado de errores con `onError`/`onSettled`, integrable con toasts.
- Datos derivados mediante `select`, reduciendo lógica en componentes.
- Preparación para SSR/Server Components mediante `dehydrate`/`HydrationBoundary`.

## Plan sugerido de adopción
1. **Configurar provider global**: asegurar `QueryClientProvider`, `Hydrate` y, opcionalmente, `ReactQueryDevtools` en `app/layout.tsx`.
2. **Migrar por dominio** (alto ROI primero):
   - Grupos → Parking → Logbooks → Notificaciones → Mensajería → Resto (actividad, usuarios, mantenimiento).
3. **Patrón de migración**:
   - Definir `queryKeys` por dominio (similar a `conciliationKeys`).
   - Convertir funciones `api` en hooks `useXQuery`/`useXMutation`.
   - Sustituir `useEffect` + estado remoto por llamadas a hooks React Query.
   - Mantener Zustand solo para estado UI.
4. **Documentar convenciones**: nombre de hooks, tiempos de `staleTime`, uso de `select`, estrategias de invalidación.

## Próximos pasos opcionales
- Elaborar plan detallado de migración para el dominio de grupos (mapear pantallas y hooks impactados).
- Revisar integración de React Query en layout principal y en Server Components para aprovechar `prefetch` cuando sea posible.
- Definir métricas de éxito (reducción de llamadas repetidas, tiempos de refresco de dashboards).
