# Parking Module - Four Points

Documentación técnica del módulo de parking. Esto es para recordar dónde está cada cosa y cómo funciona todo.

---

## Estructura de archivos

El módulo está dividido en tres partes principales:

```
frontend/app/
├── components/parking/           # Componentes reutilizables
│   ├── bookings/                 # Componentes específicos de reservas
│   │   ├── BookingDetailClient   # Vista detalle completa
│   │   ├── BookingHeader         # Header con acciones
│   │   ├── CheckInModal          # Modal check-in
│   │   ├── CheckOutModal         # Modal check-out con pago
│   │   ├── EditBookingModal      # Edición (tabs: general/plaza/vehículo)
│   │   └── InfoCard              # Cards de info + InfoRow
│   ├── helpers/
│   │   ├── constants.ts          # STATUS_CONFIG, PAYMENT_METHODS, etc
│   │   └── date-formatters.ts    # formatDate, formatDateShort, formatTime...
│   ├── ActionDropdown.tsx        # Menú acciones (usa Portal)
│   ├── BookingsListClient.tsx    # Lista principal (~1250 líneas, el más gordo)
│   ├── StatusBadge.tsx           # Badge de estado con colores
│   └── VehicleSearchModal.tsx    # Buscador de vehículos con historial
│
├── lib/parking/                  # Lógica de datos
│   ├── actions.ts                # Server Actions (getBookings)
│   ├── queries.ts                # API client (parkingApi)
│   └── types.ts                  # Tipos TypeScript
│
└── dashboard/parking/            # Páginas (solo páginas, nada más)
    ├── page.tsx                  # Dashboard principal
    ├── bookings/
    │   ├── page.tsx              # Lista de reservas
    │   ├── new/page.tsx          # Nueva reserva (BookingWizard)
    │   └── [code]/page.tsx       # Detalle de reserva
    └── status/                   # Control de parking (vista de plazas)
        ├── page.tsx
        ├── hooks/useParkingStatus.ts
        └── components/           # Componentes específicos de status
```

---

## Flujo de datos

### Server Actions vs API Client

Hay dos formas de obtener datos:

1. **Server Actions** (`lib/parking/actions.ts`) - Para Server Components
   - `getBookings(filters)` - Se usa en `bookings/page.tsx`
   - Lee el token de cookies directamente (server-side)

2. **API Client** (`lib/parking/queries.ts`) - Para Client Components
   - `parkingApi.getAllBookings()`, `parkingApi.checkInBooking()`, etc
   - Usa fetch con el token del localStorage

La idea es que las páginas (Server Components) usan actions para la carga inicial, y luego los Client Components usan el API client para operaciones interactivas (check-in, check-out, etc).

### Ejemplo: Lista de reservas

```
bookings/page.tsx (Server Component)
    │
    ├── Lee searchParams de la URL (status, date, search...)
    ├── Llama getBookings(filters) → Server Action
    └── Pasa initialBookings a BookingsListClient
            │
            └── BookingsListClient (Client Component)
                    ├── Muestra datos iniciales
                    ├── Filtros modifican la URL (no recargan)
                    └── Acciones llaman parkingApi.* directamente
```

---

## Estados de reserva

```typescript
type BookingStatus = 'reserved' | 'checked_in' | 'completed' | 'canceled' | 'no_show'
```

| Estado | Label | Color | Acciones disponibles |
|--------|-------|-------|---------------------|
| `reserved` | Reservado | Azul | check-in, editar, cancelar, no-show |
| `checked_in` | Ocupado | Púrpura | check-out, cancelar |
| `completed` | Completado | Verde | ninguna |
| `canceled` | Cancelado | Gris | eliminar |
| `no_show` | No presentado | Naranja | eliminar |

Los colores están definidos en `helpers/constants.ts` → `STATUS_CONFIG`.

---

## Componentes principales

### BookingsListClient

El componente más grande (~1250 líneas). Es la lista principal de reservas.

**Props:**
```typescript
{
  initialBookings: ParkingBooking[]  // Datos del servidor
  initialTotal: number
}
```

**Filtros que maneja:**
- `status` - Estado de la reserva
- `dateFilter` - Ayer/Hoy/Mañana
- `search` - Búsqueda por código, cliente, matrícula, plaza
- `filter` - Filtros compuestos del dashboard (arrivals_pending, departures_total, etc)

Todos los filtros van en la URL, así que puedes compartir links con filtros aplicados.

**Modales integrados:**
- Check-in (inline, no usa el componente separado)
- Check-out (inline)
- Actualizar reserva (inline)

Los modales inline son más simples que los componentes separados. Los separados (`CheckInModal`, `CheckOutModal`, `EditBookingModal`) se usan en el detalle de reserva donde hay más espacio y funcionalidad.

### ActionDropdown

Menú de acciones que aparece en cada fila. Usa `createPortal` para renderizar fuera de la tabla y evitar problemas de overflow/z-index.

```typescript
onAction: (action: string, booking: ParkingBooking) => void
```

Las acciones son strings: `'checkin'`, `'checkout'`, `'edit'`, `'cancel'`, `'noshow'`.

### StatusBadge

Simple pero importante. Recibe un status y muestra el badge con el color correcto.

```tsx
<StatusBadge status={booking.status} size="sm" />
```

### BookingDetailClient

Vista completa de una reserva. Organizado en grid de 2 columnas (izquierda info principal, derecha pago y metadata).

Usa `InfoCard` para agrupar información:
- Plaza de Parking
- Vehículo
- Programación (fechas check-in/out)
- Pago
- Info de Reserva (origen, ID externo)
- Operador
- Registro (timestamps)

### VehicleSearchModal

Modal para buscar vehículos. Muestra el historial de reservas de cada vehículo encontrado. Útil para ver si un cliente ha venido antes.

---

## Helpers

### date-formatters.ts

```typescript
formatDate(date, includeTime?, includeSeconds?)  // "28/10/2025 14:30"
formatDateShort(date)                             // "28 oct 2025"
formatTime(date)                                  // "14:30"
formatDateTimeLocal(date)                         // "2025-10-28T14:30" (para inputs)
isSameDay(date1, date2)                           // boolean
```

### constants.ts

```typescript
STATUS_CONFIG      // Colores y labels por estado
BOOKING_SOURCES    // { direct, booking_com, expedia, airbnb, agency_other }
PAYMENT_METHODS    // { cash, card, transfer, agency }
SPOT_TYPES         // { normal, ancha, mas_ancha, esquina, accesible, estrecha_bicis }
```

---

## API Client (parkingApi)

Todos los métodos están en `lib/parking/queries.ts`. Devuelven Promises.

### Plazas

```typescript
parkingApi.getAllSpots()
parkingApi.getSpotsByLevel(level)
parkingApi.getAvailableSpotsByDate(date)
parkingApi.getAvailableSpotsByRange({ start_date, end_date })
```

### Vehículos

```typescript
parkingApi.createVehicle(data)
parkingApi.getAllVehicles()
parkingApi.searchVehicles(term)      // mínimo 2 caracteres
parkingApi.getVehicleByPlate(plate)
```

### Reservas

```typescript
parkingApi.createBooking(data)
parkingApi.getAllBookings(filters?)
parkingApi.getBookingByCode(code)    // PK-YYYYMMDD-####
parkingApi.updateBooking(code, data)
parkingApi.deleteBooking(code)

// Operaciones de estado
parkingApi.checkInBooking(code, data?)
parkingApi.checkOutBooking(code, data?)
parkingApi.cancelBooking(code, notes?)
parkingApi.markBookingNoShow(code, notes?)

// Especiales
parkingApi.getOverdueBookings()      // Reservas con checkout pasado
```

### Estadísticas

```typescript
parkingApi.getStats(date?)
parkingApi.getOccupancy(date?)
parkingApi.getPendingCheckins(date?)
parkingApi.getPendingCheckouts(date?)
parkingApi.getFullStats(date?)
parkingApi.getStatsByRange(startDate, endDate)
```

---

## Tipos importantes

### ParkingBooking

El tipo principal. Tiene toda la info de una reserva:

```typescript
{
  id: number
  booking_code: string              // "PK-20251024-0001"
  status: BookingStatus
  
  spot: {
    id: number
    level: string                   // "-2", "-3"
    number: string                  // "01", "15"
    type: string                    // "normal", "ancha"...
  }
  
  vehicle: {
    id: number
    plate: string
    owner: string
    model?: string
  } | null
  
  schedule: {
    expected_checkin: string        // ISO date
    expected_checkout: string
    actual_checkin?: string
    actual_checkout?: string
    planned_days: number
    actual_days?: number
  }
  
  payment: {
    total_amount: number
    paid_amount: number
    pending_amount: number
    method?: string
    reference?: string
    date?: string
  }
  
  booking_info: {
    source: string                  // "direct", "booking_com"...
    external_id?: string
  }
  
  operator?: { id, username }
  timestamps: {
    created_at: string
    updated_at: string
    created_by?: { id, username }
    updated_by?: { id, username }
  }
  
  notes?: string
}
```

### DTOs

Para crear/actualizar:

```typescript
// Crear reserva
CreateBookingDto {
  spot_id: number
  vehicle_id?: number
  expected_checkin: string
  expected_checkout: string
  total_amount?: number
  source?: string
  external_id?: string
  notes?: string
}

// Check-in
CheckInDto {
  actual_checkin?: string           // Por defecto: ahora
  notes?: string
}

// Check-out
CheckOutDto {
  actual_checkout?: string
  payment_amount?: number
  payment_method?: string           // "cash", "card"...
  payment_reference?: string
  notes?: string
}
```

---

## Páginas

### /dashboard/parking

Dashboard principal. Muestra:

- Selector de período (Hoy / Semana / Mes)
- Estadísticas de llegadas y salidas
- Ocupación actual
- Resumen del período
- Acciones rápidas

Carga datos con `parkingApi.getFullStats()` o `getStatsByRange()` según el período seleccionado.

### /dashboard/parking/bookings

Lista de reservas. Es un Server Component que carga datos iniciales y los pasa a `BookingsListClient`.

### /dashboard/parking/bookings/new

Wizard para crear reservas. Usa el componente `BookingWizard` (está en otro lado, no en el módulo de parking).

### /dashboard/parking/bookings/[code]

Detalle de una reserva. El `[code]` es el booking_code (ej: `PK-20251024-0001`).

### /dashboard/parking/status

Control de parking en tiempo real. Vista de todas las plazas organizadas por nivel con estados.

Tiene su propio hook `useParkingStatus` que maneja:
- Estado de las plazas
- Reservas activas
- Reservas retrasadas (overdue)
- Modales de acciones
- Loading states

---

## Backend

El backend está en `backend/` con la estructura típica:

```
routes/parking/     → Define endpoints
controllers/parking/ → Lógica de request/response
repositories/parking/ → Queries a la DB
models/parking/     → Tipos y DTOs
validations/parking/ → Schemas Zod
```

### Endpoints principales

```
GET    /api/parking/bookings              Lista con filtros
POST   /api/parking/bookings              Crear reserva
GET    /api/parking/bookings/:code        Por código
PUT    /api/parking/bookings/:code        Actualizar
DELETE /api/parking/bookings/:code        Eliminar

PUT    /api/parking/bookings/:code/checkin
PUT    /api/parking/bookings/:code/checkout
PUT    /api/parking/bookings/:code/cancel
PUT    /api/parking/bookings/:code/no-show

GET    /api/parking/bookings/overdue/list

GET    /api/parking/spots
GET    /api/parking/spots/available

GET    /api/parking/vehicles
POST   /api/parking/vehicles
GET    /api/parking/vehicles/search

GET    /api/parking/stats
GET    /api/parking/stats/occupancy
GET    /api/parking/stats/pending-checkins
GET    /api/parking/stats/pending-checkouts
```

Todos los endpoints requieren autenticación (`authenticateToken` middleware) excepto los públicos que no hay.

---

## Cosas a tener en cuenta

### Formato del booking_code

`PK-YYYYMMDD-####` donde `####` es un número secuencial del día. Lo genera el backend automáticamente.

### Filtros compuestos (quickFilter)

En `BookingsListClient` hay filtros "compuestos" que combinan estado + fecha:

```typescript
type QuickFilter =
  | 'arrivals_pending'    // reserved + entrada hoy
  | 'arrivals_inside'     // checked_in (todos)
  | 'arrivals_total'      // reserved entrada hoy + checked_in
  | 'departures_pending'  // checked_in + salida hoy
  | 'departures_completed' // completed hoy
  | 'departures_total'    // checked_in salida hoy + completed hoy
```

Estos vienen del dashboard cuando haces click en las tarjetas de estadísticas.

### Portales para dropdowns

`ActionDropdown` y `QuickFilterDropdown` usan `createPortal` para renderizar fuera de su contenedor. Esto evita problemas de z-index y overflow en tablas.

### Modales inline vs componentes

`BookingsListClient` tiene modales inline (check-in, check-out, actualizar) que son más simples.

Los componentes separados (`CheckInModal`, `CheckOutModal`, `EditBookingModal`) tienen más funcionalidad y se usan en `BookingDetailClient`.

### URL como estado

Los filtros de la lista de reservas se guardan en la URL. Esto permite:
- Compartir links con filtros aplicados
- Navegar con el botón atrás
- Bookmarkear búsquedas frecuentes

---

## Cómo añadir cosas

### Nuevo campo en reserva

1. Añadir tipo en `lib/parking/types.ts`
2. Si viene del backend, actualizar el DTO correspondiente
3. Mostrar en `BookingDetailClient` usando `InfoRow`
4. Si es editable, añadir a `EditBookingModal`

### Nueva acción

1. Añadir método en `lib/parking/queries.ts` (parkingApi)
2. Añadir la acción en `ActionDropdown` (array `ACTIONS_BY_STATUS`)
3. Manejar en `handleAction` del componente que lo use

### Nuevo filtro

1. Añadir el tipo en `BookingsListClient` (StatusFilter, DateQuickFilter, etc)
2. Añadir el control en el JSX (select, input...)
3. Actualizar `updateUrlWithFilters` para incluirlo
4. Actualizar el `useEffect` de filtrado local

---

## Troubleshooting

### El dropdown se corta por la tabla

Asegúrate de que usa `createPortal`. Si no, el `overflow: hidden` de la tabla lo corta.

### Los filtros no se aplican

Revisa que `updateUrlWithFilters` incluya todos los filtros actuales. Es fácil olvidar pasar uno y que se pierda.

### Check-in/out no funciona

Revisa que el estado de la reserva permita esa acción. Solo `reserved` puede hacer check-in, solo `checked_in` puede hacer check-out.

### Fechas raras

Las fechas vienen en ISO del backend. Usa los helpers de `date-formatters.ts` para mostrarlas. No formatees manualmente.

---

Última actualización: Diciembre 2024
