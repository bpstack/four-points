# Quick Reference - Multi-Hotel

## Atajos Rápidos

### Backend

```typescript
// Obtener hotel_id en middleware
req.hotelId          // number | undefined
req.hotel            // { id, nombre, slug, settings } | undefined

// Query con filtro automático
const db = new HotelDB(req);
await db.query({ query: 'SELECT * FROM logbooks', requireHotel: true });

// Query sin filtro (datos globales)
await db.queryGlobal('SELECT * FROM roles');
```

### Frontend

```typescript
// Usar hotel activo
const { hotel, hotels, switchHotel } = useHotel();

// API con hotel (auto-envía x-hotel-id)
api.get('/api/logbooks');

// React Query
useQuery({
  queryKey: ['logbooks', { hotelId: hotel?.id }],
  queryFn: () => api.get('/api/logbooks'),
});
```

---

## Nombres de Tablas (Aiven)

| Módulo | Tabla | Necesita hotel_id |
|--------|-------|-------------------|
| Core | `users` | SÍ (ya tiene) |
| Core | `roles` | NO (global) |
| Core | `departments` | NO (global) |
| Logbook | `logbooks` | SÍ |
| Logbook | `logbook_comments` | SÍ |
| Logbook | `logbook_history` | SÍ |
| Parking | `parking_spots` | SÍ |
| Parking | `parking_vehicles` | SÍ |
| Parking | `parking_bookings` | SÍ |
| Parking | `parking_availability` | SÍ |
| Parking | `parking_rates` | NO (global) |
| Groups | `hotel_groups` | SÍ |
| Groups | `group_contacts` | SÍ |
| Groups | `group_history` | SÍ |
| Cashier | `cashier_shifts` | SÍ |
| Cashier | `cashier_vouchers` | SÍ |
| Cashier | `cashier_history` | SÍ |
| Cashier | `cashier_daily` | SÍ |
| Cashier | `payment_methods` | NO (global) |
| Maintenance | `maintenance_reports` | SÍ |
| Maintenance | `maintenance_history` | SÍ |
| Messages | `conversations` | SÍ |
| Messages | `messages` | NO (por conversación) |
| Notifications | `notifications` | SÍ |
| Blacklist | `blacklist_entries` | SÍ |
| Backoffice | `bo_invoices` | SÍ |
| Backoffice | `bo_suppliers` | SÍ |
| Backoffice | `bo_assets` | SÍ |
| Backoffice | `bo_categories` | NO (global) |

---

## Cambios por Archivo

### Backend

| Archivo | Cambio |
|---------|--------|
| `index.ts` | + hotelMiddleware |
| `middlewares/hotel-middleware.ts` | **NUEVO** |
| `config/db-hotel.ts` | **NUEVO** |
| `models/hotel.ts` | **NUEVO** |
| `repositories/logbook/logbook-repository.ts` | + HotelDB |
| `repositories/parking/parking-repository.ts` | + HotelDB |
| `repositories/cashier/cashier-*.ts` | + HotelDB |
| `repositories/group/group-*.ts` | + HotelDB |
| `repositories/maintenance/maintenance-repository.ts` | + HotelDB |
| `repositories/backoffice/backoffice-repository.ts` | + HotelDB |
| `repositories/messages/message-repository.ts` | + HotelDB |
| `repositories/notifications/notification-repository.ts` | + HotelDB |
| `repositories/blacklist/blacklist-repository.ts` | + HotelDB |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `stores/hotel-context.tsx` | **NUEVO** |
| `lib/api-client.ts` | + x-hotel-id header |
| `lib/query-keys.ts` | + hotelId en keys |
| `components/hotel-selector.tsx` | **NUEVO** |
| `hooks/use-logbooks.ts` | + useHotel() |
| `hooks/use-parking.ts` | + useHotel() |
| `hooks/use-cashier.ts` | + useHotel() |
| `hooks/use-groups.ts` | + useHotel() |
| `hooks/use-maintenance.ts` | + useHotel() |
| `hooks/use-backoffice.ts` | + useHotel() |

---

## SQL Cheatsheet

```sql
-- Crear hotel
INSERT INTO hoteles (nombre, slug) VALUES ('Hotel', 'hotel-slug');

-- Ver hoteles
SELECT * FROM hoteles;

-- Asignar usuario a hotel
UPDATE users SET hotel_id = 2 WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Ver usuarios de hotel específico
SELECT id, username, email FROM users WHERE hotel_id = 2;

-- Ver datos filtrados por hotel
SELECT * FROM logbooks WHERE hotel_id = 2;

-- Ver conteo por hotel
SELECT 
  h.nombre,
  (SELECT COUNT(*) FROM users WHERE hotel_id = h.id) AS users,
  (SELECT COUNT(*) FROM logbooks WHERE hotel_id = h.id) AS logbooks
FROM hoteles h;
```

---

## Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `hotel_id is null` | Usuario sin hotel | Asignar hotel_id |
| `Operación requiere hotel activo` | Faltó middleware | Verificar middleware en index.ts |
| `ER_NO_REFERENCED_ROW_2` | Hotel no existe | Crear hotel primero |
| Datos mezclados | Faltó withHotel() | Usar HotelDB helper |

---

## Testing Rápido

```bash
# 1. Verificar middleware
curl -b cookies.txt http://localhost:4000/api/test/hotel

# 2. Verificar filtro
curl -b cookies.txt http://localhost:4000/api/logbooks | jq '. | length'

# 3. Verificar DB
mysql -h aiven-host -u user -p hotel_db -e "SELECT * FROM hoteles;"
```

---

## React Query Keys

```typescript
// Wrong ❌
queryKey: ['logbooks']

// Correct ✅
queryKey: ['logbooks', { hotelId: hotel?.id }]

// Wrong ❌
queryKey: ['parking', 'spots']

// Correct ✅
queryKey: ['parking', 'spots', { hotelId: hotel?.id }]
```

---

## Commands

```bash
# Backup antes de migración (Aiven)
mysqldump -h aiven-host -u user -p hotel_db > backup.sql

# Ejecutar migración
mysql -h aiven-host -u user -p hotel_db < db-mysql/aiven/99_multi_hotel_migration.sql

# Rollback
mysql -h aiven-host -u user -p hotel_db < db-mysql/aiven/99_multi_hotel_rollback.sql

# Verificar migración
mysql -h aiven-host -u user -p hotel_db -e "SELECT COUNT(*) FROM hoteles; SELECT COUNT(*) FROM users WHERE hotel_id IS NOT NULL;"
```

---

## Archivos Clave

```
backend/
├── index.ts                          # Añadir middleware
├── middlewares/
│   └── hotel-middleware.ts           # NUEVO
├── config/
│   ├── db.ts                         # Exportar HotelDB
│   └── db-hotel.ts                   # NUEVO
├── models/
│   └── hotel.ts                      # NUEVO
└── repositories/
    ├── logbook/logbook-repository.ts
    ├── parking/parking-repository.ts
    ├── cashier/cashier-repository.ts
    ├── group/group-repository.ts
    └── maintenance/maintenance-repository.ts

frontend/
├── stores/
│   └── hotel-context.tsx             # NUEVO
├── lib/
│   ├── api-client.ts                 # + header x-hotel-id
│   └── query-keys.ts                 # + hotelId en keys
├── components/
│   └── hotel-selector.tsx            # NUEVO
└── hooks/
    ├── use-logbooks.ts
    ├── use-parking.ts
    └── use-cashier.ts
```

---

## Links

- [README](./README.md)
- [Overview](./01-OVERVIEW.md)
- [Database](./02-DATABASE.md)
- [Backend](./03-BACKEND.md)
- [Frontend](./04-FRONTEND.md)
- [Migration](./05-MIGRATION-STRATEGY.md)
- [Roadmap](./06-ROADMAP.md)
- [Operations](./OPERATIONS.md)
