# Parking

Reservas del aparcamiento del hotel. Pantallas bajo `/dashboard/parking`.
Visión general del proyecto en [`../general/README.md`](../general/README.md).

## Qué problema resuelve

El hotel alquila plazas de garaje a sus clientes por días. Hay que saber qué
plaza está libre en cada fecha, no reservar dos veces la misma, registrar
quién entra y sale, y cobrar lo que corresponde. El módulo lleva el calendario
de cada plaza, el ciclo de vida de cada reserva y el cobro, con un mapa del
garaje en tiempo real y estadísticas de ocupación.

## Quién lo usa

Todos los roles **menos `mantenimiento`**. Cualquier usuario con acceso crea,
edita, cobra y cierra reservas. Solo un `admin` puede borrar un vehículo.

## Qué puede hacer

- **Panel** (`/dashboard/parking`): ocupación, entradas y salidas previstas y
  plazas libres de hoy, de otro día o de un rango de fechas.
- **Mapa de estado** (`/dashboard/parking/status`): cada plaza de cada planta
  con su situación (libre, reservada, ocupada) y acciones directas: entrada,
  salida, cancelar, no presentado y reservas vencidas.
- **Listado de reservas** (`/dashboard/parking/bookings`): búsqueda por texto,
  estado, rango de fechas y filtros rápidos del día (entradas, salidas,
  dentro…), con paginación. El backend admite además filtrar por plaza,
  matrícula, titular u origen, pero la pantalla no lo ofrece.
- **Nueva reserva**: plaza, vehículo (se busca por matrícula o titular, o se da
  de alta), fechas previstas, origen (directa, Booking, Expedia, Airbnb,
  agencia), referencia externa y notas. El precio se calcula solo, pero se puede
  fijar a mano. **Hoy el origen y la referencia externa se pierden al crear** la
  reserva (queda «directa»); solo se guardan si después se edita.
- **Detalle de una reserva** (`/dashboard/parking/bookings/<código>`): editar
  fechas o plaza, registrar entrada y salida, cobrar y borrar.

## Qué datos maneja

Cinco tablas (`backend/db-mysql/aiven/04_parking_tables.sql`):

- **`parking_spots`**: las plazas — planta (`-2` o `-3`), número, tipo y si
  está activa. Hoy son 20: 10 por planta.
- **`parking_vehicles`**: matrícula, titular, modelo y notas. Un vehículo se
  reutiliza entre reservas.
- **`parking_bookings`**: la reserva — código, plaza, vehículo, fechas previstas
  y reales, estado, importe, cobro (importe, método, referencia, fecha), origen
  y quién la creó y modificó.
- **`parking_rates`**: precio según el **número de días**, de 1 a 30. No depende
  del tipo de plaza.
- **`parking_availability`**: un **calendario precalculado**, con una fila por
  plaza y día que dice si está libre y qué reserva la ocupa.

Parte de la lógica vive **en la base de datos**: los triggers de
`05_parking_functions_triggers.sql` generan el código de reserva y mantienen el
calendario al día.

## Qué reglas cumple

**Estados de una reserva**

```
reserved ──► checked_in ──► completed
    │             │
    ├──► canceled ◄┘
    └──► no_show
```

- La entrada solo se registra en una reserva `reserved`, y la salida en una
  `checked_in`. Cancelar vale para ambas; «no presentado», solo para
  `reserved`.
- Solo se puede **borrar** una reserva `reserved`. El borrado es definitivo.
- Una reserva **vencida** es la que sigue `checked_in` después de su salida
  prevista.

**Disponibilidad**

- Una reserva ocupa su plaza desde el día de entrada hasta el día anterior a la
  salida. Al crearla o moverla, si algún día ya está ocupado, el backend la
  rechaza; al crearla, un trigger de la BD lo comprueba otra vez.
- Al pasar a `completed`, `canceled` o `no_show`, los días se liberan solos.
- El calendario solo cubre las fechas que se han generado de antemano
  (procedimiento `generate_availability`).

**Precio**

- Se cuentan días de calendario entre la entrada y la salida previstas, con un
  mínimo de 1: entrar el día 25 a las 23:00 y salir el 26 a las 10:00 es 1 día.
- El precio sale de `parking_rates` para ese número de días. Hay paquetes: 7
  días cuestan menos que 6, y 30 menos que 29. A partir de 31 días no hay
  tarifa y se cobran 15 € por día.
- Al cobrar se guarda lo pagado aparte del importe calculado, con método
  (efectivo, tarjeta, transferencia, agencia) y referencia.

**Otros**

- El código de reserva lo genera la BD: `PK-AAAAMMDD-NNNN` (fecha de creación y
  número del día). Es lo que se ve en las URL; el `id` interno no se muestra.
- Quien crea o modifica una reserva se toma de la sesión, no de lo que envía el
  navegador.
- Los listados devuelven 50 reservas por defecto y 500 como máximo.

## Cómo viaja la información

```
page.tsx (servidor) ─► getParkingDashboardStats ─► GET /api/parking/stats
ParkingStatusClient ─► useParkingStatus (React Query) ─┐
BookingsListClient / BookingDetailClient ──────────────┼─► parkingApi (queries.ts) ─► apiClient
                                                       │
                   /api/parking/{spots,vehicles,bookings,stats}
                                        │
      parking · bookings · stats controllers ─► repositorios ─► MySQL
                                                                  │
                                              triggers ─► parking_availability
```

1. El panel se carga en el servidor (acción `getParkingDashboardStats`) y llega
   ya con los datos del día.
2. El mapa de estado pide plazas, reservas, vencidas y estadísticas con React
   Query. **No se refresca solo**: cada acción vuelve a pedir los datos, pero los
   cambios que hace otra persona no aparecen hasta recargar.
3. Crear, mover, cerrar o cancelar una reserva escribe en `parking_bookings`
   dentro de una transacción; los triggers actualizan el calendario en la misma
   operación.
4. `/api/parking/stats` funciona en tres modos: sin parámetros (hoy), con
   `date` (un día) o con `startDate` y `endDate` (un rango, sin entradas y
   salidas pendientes).
