# CLAUDE.md — Parking (frontend)

> UI del módulo de parking. Backend documentado en `backend/services/parking/CLAUDE.md`. **Este módulo es la referencia interna del proyecto para patrones responsive** — cuando dudes cómo hacer una tabla wide o un dashboard mobile-friendly en otro módulo, mira aquí primero.

## Estructura

```
frontend/app/dashboard/parking/
   ├── layout.tsx                  (8 líneas — wrapper)
   ├── page.tsx                    (58 líneas — Server Component: SSR pre-fetch del dashboard de hoy)
   ├── loading.tsx                 (skeleton)
   ├── error.tsx                   (error boundary)
   ├── actions/
   │   └── getParkingDashboardStats.ts  (71 líneas — server action para SSR)
   ├── components/
   │   └── ParkingDashboardClient.tsx   (cliente que recibe las stats pre-fetched)
   ├── bookings/
   │   ├── page.tsx                (lista de bookings — SSR del page 0)
   │   ├── new/page.tsx            (formulario de nueva reserva)
   │   └── [code]/page.tsx         (detalle de una booking por booking_code)
   └── status/
       ├── layout.tsx
       ├── page.tsx
       ├── components/
       │   ├── ParkingStatusClient.tsx  (orquestador real-time)
       │   ├── ParkingTable.tsx         (tabla de plazas por planta)
       │   ├── ParkingNavigator.tsx     (selector planta -2 / -3)
       │   ├── StatusPanels.tsx         (paneles laterales de KPIs)
       │   └── modals/                  (5 modales: CheckIn, CheckOut, Cancel, Overdue, BaseModal)
       ├── hooks/
       │   └── useParkingStatus.ts      (hook con polling de estado)
       └── utils/
           └── statusBadges.tsx

frontend/app/components/parking/
   ├── BookingsListClient.tsx      (1336 líneas — la lista de bookings con filtros, quick filters,
   │                                paginación, búsqueda, exportar; el componente más grande del módulo)
   ├── BookingsListClient.tsx      → wrapped por bookings/page.tsx
   ├── ActionDropdown.tsx          (acciones por fila de booking)
   ├── StatusBadge.tsx             (badge para BookingStatus)
   ├── VehicleSearchModal.tsx      (modal de búsqueda con autocomplete)
   ├── helpers/
   │   ├── constants.ts            (enums duplicados del backend — sync rule)
   │   ├── date-formatters.ts
   │   └── index.ts
   └── bookings/
       ├── BookingDetailClient.tsx (688 líneas — la página de detalle)
       ├── BookingHeader.tsx
       ├── EditBookingModal.tsx    (567 líneas)
       ├── CheckInModal.tsx
       ├── CheckOutModal.tsx
       ├── PaymentModal.tsx
       └── InfoCard.tsx

frontend/app/lib/parking/
   ├── queries.ts                  (313 líneas — apiClient calls, ningún hook React Query aquí)
   ├── types.ts                    (367 líneas — todos los DTOs)
   ├── actions.ts                  (71 líneas — server actions adicionales)
   └── index.ts
```

## Rutas (URL → componente)

| URL | Componente / fuente |
|---|---|
| `/dashboard/parking` | `page.tsx` (Server, SSR stats) → `ParkingDashboardClient.tsx` |
| `/dashboard/parking/bookings` | `bookings/page.tsx` (Server, SSR lista) → `BookingsListClient.tsx` |
| `/dashboard/parking/bookings/new` | `bookings/new/page.tsx` (formulario create) |
| `/dashboard/parking/bookings/:code` | `bookings/[code]/page.tsx` → `BookingDetailClient.tsx` |
| `/dashboard/parking/status` | `status/page.tsx` → `ParkingStatusClient.tsx` (real-time view) |

**Nota:** `/dashboard/parking` (root) es el **dashboard de KPIs/stats**. `/status` es la **vista en tiempo real de la ocupación** (mapa de plazas por planta). Son vistas distintas y complementarias.

## Tres vistas principales

### 1. Dashboard (`/dashboard/parking`)

Pantalla de entrada del módulo. Server Component que pre-fetcha las stats del día con `getParkingDashboardStats()`, las inyecta como prop al cliente. Renderiza:

- KPIs del día (ocupación, ingresos, llegadas, salidas).
- Listas de pending check-ins y check-outs.
- Charts de tendencias (próximamente).

Pre-fetch SSR es **intencional**: la primera carga sin spinner es lo que diferencia este módulo. Si añades más vistas pre-fetcheables, sigue el patrón `actions/` + Server Component.

### 2. Bookings list (`/dashboard/parking/bookings`)

`BookingsListClient.tsx` (1336 líneas — el más grande del módulo). Características:

- **Filtros combinables:** estado, fecha, source, búsqueda por matrícula/dueño.
- **Quick filters compuestos:** `arrivals_pending`, `arrivals_inside`, `arrivals_total`, `departures_pending`, `departures_completed`, `departures_total`. Mapean a combinaciones de `status` + `date` ya pre-armadas para el usuario.
- **Paginación:** server-side; `limit`/`offset` + `PaginationInfo`.
- **`ActionDropdown`** por fila con acciones contextuales según el estado actual del booking.
- **Crear nuevo** desde botón `+ Nueva reserva` → navega a `/bookings/new`.

### 3. Status real-time (`/dashboard/parking/status`)

Vista de **estado de ocupación** por planta. Diferente filosofía: no es una tabla de bookings, es un **mapa de plazas**.

- `ParkingNavigator` para alternar entre planta `-2` y `-3`.
- `ParkingTable` para renderizar cada plaza con su estado (free / occupied / reserved / overdue).
- `StatusPanels` lateral con KPIs del momento.
- `useParkingStatus` (hook con polling cada N segundos para mantener la vista fresca).
- 5 modales: CheckIn, CheckOut, Cancel, Overdue, BaseModal.

## ⚠️ Patrón responsive — referencia del proyecto

Este módulo es el **referente interno** del proyecto para responsive. Si necesitas un patrón equivalente en otro módulo, replícalo desde aquí.

### Tablas wide con scroll horizontal

```tsx
<div className="overflow-x-auto">
  <table className="min-w-[1200px] w-full">
    {/* ... */}
  </table>
</div>
```

`overflow-x-auto` en el wrapper, `min-w-[Xpx]` en la tabla. Width proporcional al número de columnas. En desktop ocupa el contenedor; en mobile scrollea sin colapsar columnas.

### Headers con `flex-wrap`

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <h1>...</h1>
  <div className="flex flex-wrap gap-2">
    {/* botones / filtros */}
  </div>
</div>
```

En mobile los botones bajan a la siguiente línea sin romper el layout. Probado con 1-6 elementos en el header.

### Modales mobile-friendly

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="w-full max-w-2xl overflow-y-auto max-h-[90vh] bg-surface rounded-xl">
    {/* contenido */}
  </div>
</div>
```

`overflow-y-auto max-h-[90vh]` en el contenedor interno garantiza scroll cuando el contenido es largo y la viewport es corta.

### Grids responsive

```tsx
<div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
  {/* ... */}
</div>
```

1 columna en mobile/tablet, 2 en desktop XL. Si necesitas 3 paneles, `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`. **No uses `lg:`** salvo necesidad — el módulo está calibrado para los breakpoints `md` y `xl` específicamente.

## React Query — `lib/parking/queries.ts`

`parkingApi` es un objeto plano con métodos por endpoint (`parkingApi.listSpots()`, `parkingApi.getBookings(...)`, etc.). **No hay hooks** prearmados — cada componente usa `useQuery` directamente con la key que quiera.

Patrón típico en cliente:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['parking', 'bookings', filters],
  queryFn: () => parkingApi.getBookings(filters),
})
```

**No hay `parkingKeys` factory** (a diferencia de scheduling). Los componentes hardcodean las keys. Esto es estilo, no error — funciona porque el módulo no tiene una jerarquía tan compleja de invalidaciones. Si la complejidad crece, considera extraer una factory equivalente a `schedulingKeys`.

## Enums duplicados — sync rule

`frontend/app/components/parking/helpers/constants.ts` contiene la copia frontend de los enums del backend:

- `BookingStatus` (5 valores)
- `BookingSource` (5 valores)
- `PaymentMethod` (4 valores)
- `SpotType` (6 valores)
- Mapeos a labels y badge tones

**Si el backend añade un valor, actualiza ambos lados en el mismo commit.** Si dejas el frontend desfasado, las bookings con el nuevo valor aparecerán sin badge o con label en blanco. Sin error visible — solo UI rota silenciosa.

## Auth

Toda la subruta `/dashboard/parking/*` requiere autenticación + rol distinto de mantenimiento (el backend bloquea, y el dashboard layout asume usuario logueado). No hay restricción admin-only — recepcionistas usan el módulo a diario.

## Gotchas conocidos

1. **`BookingsListClient.tsx` con 1336 líneas.** Está al límite de necesitar split. Si vas a tocar features no triviales (nuevos filtros, ordenación, exportación), considera extraer subcomponentes antes de añadir más LOC. No es prioridad pero está en el radar.
2. **`EditBookingModal.tsx` con 567 líneas.** Mismo aviso, menor escala.
3. **`booking_code` vs `id` en URLs:** las URLs públicas usan `code`, jamás `id`. Mantén esta invariante si añades nuevas rutas paramétricas.
4. **Status view + dashboard son distintos.** No fundas la UI: el dashboard es agregaciones, el status es ocupación en tiempo real con mapa de plazas. Si te piden "ver estado del parking" pregunta cuál de las dos.
5. **Polling del status:** `useParkingStatus` hace polling. Si en el futuro se añade WebSocket / SSE para invalidar push-based, **respetar el patrón de invalidación de React Query** — no metas state local paralelo.
6. **No hay frontend de facturas.** La generación PDF está apagada en el backend (TODO). Si activas, hay que hacer la UI de listado/descarga de facturas — no existe nada todavía.

## Referencias cruzadas

- `backend/services/parking/CLAUDE.md` — backend completo del módulo.
- `frontend/app/components/parking/helpers/constants.ts` — copia frontend de los enums.
- `frontend/app/components/parking/` — componentes shared del módulo (lista, badges, dropdowns, modales de bookings).
