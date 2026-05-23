# CLAUDE.md — Parking (backend)

> Backend del módulo de parking del hotel: reservas, vehículos, plazas, estadísticas y analítica. La UI tiene su propio archivo en `frontend/app/dashboard/parking/CLAUDE.md`. Este documento cubre el contrato HTTP, la lógica de bookings, los estados y los gotchas del lado servidor.

## Propósito

Gestiona las plazas de parking del hotel (dos niveles `-2` y `-3`), sus tipos, las reservas, los vehículos, y los check-in/check-out. Sirve también el dashboard de estado en tiempo real, estadísticas históricas y analítica de tendencias.

## Estructura

```
backend/services/parking/
   └── invoicePdfService.ts        (136 líneas — TODO comentado: facturación PDF futura
                                    con almacenamiento local o S3. NO está activo.)

backend/controllers/parking/
   ├── parking.controller.ts        (457 líneas — spots + vehicles CRUD + búsqueda)
   ├── bookings.controller.ts       (843 líneas — el core: listar, crear, editar,
   │                                  check-in, check-out, cancel, no-show, overdue)
   ├── stats.controller.ts          (629 líneas — dashboard stats con modo fecha única
   │                                  vs rango)
   └── analytics.controller.ts      (379 líneas — tendencias, comparativas, recomendaciones)

backend/repositories/parking/
   ├── parking.repository.ts        (328 líneas — spots, vehicles, invoice metadata)
   ├── bookings.repository.ts       (1102 líneas — bookings con joins; el más denso)
   └── stats.repository.ts          (718 líneas — agregaciones para stats/analytics)

backend/routes/parking/
   ├── parking.routes.ts            (46 líneas — /spots, /vehicles)
   ├── bookings.routes.ts           (159 líneas — /bookings, /bookings/:code, /overdue)
   ├── stats.routes.ts              (74 líneas — /stats, /stats/pending-checkins, /stats/pending-checkouts)
   └── analytics.routes.ts          (101 líneas — /stats/analytics/trends, etc.)
```

## Tablas en BD

| Tabla | Propósito |
|---|---|
| `parking_spots` | Plazas físicas: número, level_code (-2/-3), spot_type, disponibilidad |
| `parking_vehicles` | Vehículos registrados (matrícula, dueño, tipo). Compartidos entre bookings |
| `parking_bookings` | Reservas: spot, vehículo, fechas esperadas, real, estado, source, payment, total |
| `parking_invoices` | Facturas asociadas (futuro — la generación PDF está apagada) |
| `parking_rates` | Tarifas por tipo de plaza / período (consultado para cálculo de `total_amount`) |

**`booking_code`:** las bookings se identifican públicamente por un `booking_code` (string corto, p.ej. `BK-0042`) además del `id` numérico. Las rutas de detalle usan `:code`, no `:id`. Importante porque el frontend nunca expone `id` al usuario.

## Estados y enums (sincronización backend ↔ frontend)

Los siguientes valores se duplican en `frontend/app/components/parking/helpers/constants.ts`. Si añades uno, **actualiza ambos lados**.

### Booking status

| Estado | Significado |
|---|---|
| `reserved` | Reserva creada, esperando llegada |
| `checked_in` | Vehículo entró, está usando la plaza |
| `completed` | Vehículo salió correctamente |
| `canceled` | Reserva cancelada (no aplica el slot) |
| `no_show` | Cliente no apareció en la fecha esperada |

### Booking source

`direct`, `booking_com`, `expedia`, `airbnb`, `agency_other`.

### Payment method

`cash`, `card`, `transfer`, `agency`.

### Spot types

`normal`, `ancha`, `mas_ancha`, `esquina`, `accesible`, `estrecha_bicis`. **Drive el cálculo de tarifa** vía `parking_rates`.

### Levels

`-2` y `-3` (cadenas de un dígito con signo). Hardcoded en el dominio; añadir un nivel implicaría migración + cambios en UI/queries.

## Flujo principal — booking lifecycle

```
CREATE BOOKING                      EDIT
   ↓                                 ↓
{ status: 'reserved' }              (cualquier campo si el booking no se ha
   ↓                                 cerrado; algunos campos como spot_id
   ↓                                 disparan re-validation de disponibilidad)
CHECK-IN                             
   ↓ (POST /bookings/:code/checkin)
{ status: 'checked_in', actual_checkin = NOW() }
   ↓
CHECK-OUT
   ↓ (POST /bookings/:code/checkout, calcula total final si difiere)
{ status: 'completed', actual_checkout = NOW(), payment_method, ... }

ALTERNATIVAS:
   reserved → canceled  (POST /bookings/:code/cancel)
   reserved → no_show   (cron o manual)
```

**Cálculo de `total_amount`:** se hace al crear y se puede recalcular en check-out si las fechas reales difieren. Usa la tarifa de `parking_rates` para el `spot_type`. El cálculo de días considera el día completo: si llegas el 25 a las 23:00 y sales el 26 a las 10:00, son **2 días naturales**, no 0.5. Ver `_calculateBookingDays()` en `bookings.repository.ts`.

**Disponibilidad:** antes de crear o mover un booking, se verifica que el spot no esté ocupado en el rango `[expected_checkin, expected_checkout)`. Solapamientos se rechazan con 409.

## Stats y analytics

### `/stats` — modo doble

`GET /api/parking/stats` opera en **3 modos** según query params:

1. **Sin params** → stats del día de hoy + occupancy + pending checkins/checkouts + availability.
2. **`?date=YYYY-MM-DD`** → mismos campos para un día específico (pasado o futuro).
3. **`?startDate=...&endDate=...`** → stats + occupancy **consolidados** (promedios, máx, mín) para el rango. **No incluye** pending checkins/checkouts/availability (esos solo aplican a un día concreto).

Documentado inline en `stats.routes.ts` con casos de uso. Si la UI cambia, leer los comentarios ahí — están bien mantenidos.

### `/stats/analytics/trends`

Tendencias en últimos N días (default 7). Devuelve ocupación promedio por planta, pico máximo, mínimo, dirección de tendencia (`increasing` / `declining` / `stable`) y recomendaciones automáticas. Útil para detectar plantas infrautilizadas o picos recurrentes.

## Endpoints

| Método y ruta | Propósito |
|---|---|
| **Spots & Vehicles (`/api/parking`)** | |
| `GET /spots` | Lista de plazas |
| `GET /spots/available` | Plazas disponibles ahora |
| `GET /vehicles` / `POST /vehicles` | Buscar / crear vehículo |
| `GET /vehicles/search` | Búsqueda con autocomplete |
| `PUT /vehicles/:id` | Editar vehículo |
| `DELETE /vehicles/:id` | Borrar (admin-only via `isAdmin`) |
| **Bookings (`/api/parking/bookings`)** | |
| `GET /` | Listar (filtros: status, date, spot_id, vehicle_id, plate_number, owner_name, booking_source) |
| `POST /` | Crear booking |
| `GET /:code` | Detalle por booking_code |
| `PUT /:code` | Editar booking |
| `POST /:code/checkin` | Marcar entrada efectiva |
| `POST /:code/checkout` | Marcar salida + pago |
| `POST /:code/cancel` | Cancelar |
| `POST /:code/no-show` | No-show |
| `GET /overdue/list` | Bookings con `expected_checkout` pasado y aún `checked_in` |
| **Stats (`/api/parking/stats`)** | |
| `GET /` | Dashboard stats (3 modos: hoy / día / rango) |
| `GET /pending-checkins` | Lista de bookings esperando entrar hoy (o `?date=...`) |
| `GET /pending-checkouts` | Lista esperando salir hoy |
| **Analytics (`/api/parking/stats/analytics`)** | |
| `GET /trends` | Tendencias de ocupación últimos N días |

Toda la subruta tras `authenticateToken` + `excludeMantenimiento`. Mantenimiento no entra al módulo. Algunas mutaciones específicas requieren `isAdmin` (ej: `DELETE /vehicles/:id`).

**Convención de orden en routes:** rutas específicas (`/overdue/list`) van **antes** de las paramétricas (`/:code`) para que Express no las capture mal. Mantén ese orden si modificas.

## Patrones del módulo

### Controllers en clase

A diferencia del resto del backend (funciones exportadas sueltas), `bookings.controller.ts`, `stats.controller.ts` y `analytics.controller.ts` se exportan como **clase con métodos estáticos** (`ParkingBookingsController.getBookings`, etc.). Es un patrón heredado del primer scaffold del módulo. **No es bug ni deuda urgente**: funciona, está consistente. Si añades un controller nuevo aquí, seguir el patrón clase para mantener coherencia interna.

### Date handling

Las fechas en backend usan `getTodayMadrid()` de `config/date-utils.js` para fechas locales del hotel (importante para "hoy" en stats — el hotel opera Madrid time, no UTC). Las fechas de booking se almacenan como `DATETIME` MySQL en hora local Madrid.

### Filtros y paginación

`GET /bookings` acepta múltiples filtros combinables (vía AND). Paginación con `limit` + `offset`, devuelve `PaginationInfo` con `total`, `page`, `totalPages`. Coordinado con el frontend que paginariza el grid.

## PDF facturación — **inactivo**

`invoicePdfService.ts` está **completamente comentado**. Era el placeholder para facturación con almacenamiento dual (local o S3 según `STORAGE.TYPE`). Si en algún momento se activa, descomentar y:

1. Instalar `pdfkit` y `aws-sdk` (o reemplazar con un servicio externo).
2. Definir `STORAGE.TYPE` en `config.ts` (`'local'` o `'s3'`).
3. Configurar AWS region + credenciales si es S3.
4. Conectar `parking_invoices` con generación al check-out.

No es prioridad ahora. Si el cliente no lo pide, no lo actives.

## Gotchas conocidos

1. **`booking_code` vs `id`:** las URLs públicas usan `code`, las llaves de BD usan `id`. No los confundas — el frontend nunca debe ver `id`.
2. **Día completo en cálculo de tarifa:** llegada a las 23:00 + salida a las 10:00 = 2 días. No 0.5. Si se decide cambiar a horas, hay que tocar `_calculateBookingDays()` y todos los tests que dependen del comportamiento día-natural.
3. **3 modos del `/stats`:** documentar bien antes de extender. Añadir un 4º modo sin razón clara complica al consumidor.
4. **Orden de rutas:** `/overdue/list` antes que `/:code`. Si reordenas, valida con curl.
5. **Hora Madrid hardcoded:** todo asume Madrid time. Multi-tenant con diferentes zonas horarias necesitaría refactor (no en el horizonte cercano).
6. **Enums duplicados frontend ↔ backend:** lista en `helpers/constants.ts` del frontend. Mantener sincronizado.

## Referencias cruzadas

- `frontend/app/dashboard/parking/CLAUDE.md` — la UI del módulo.
- `frontend/app/components/parking/helpers/constants.ts` — la copia frontend de los enums.
- `backend/models/parking/index.ts` — todos los tipos TS del módulo.
