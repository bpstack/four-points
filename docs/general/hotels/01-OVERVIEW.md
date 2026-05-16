# Arquitectura Multi-Hotel

## 1. Visión General

Este documento describe la estrategia para convertir Four-Points de una aplicación mono-hotel a una plataforma multi-tenant capaz de servir múltiples hoteles independientes.

### 1.1 Objetivo

Permitir que múltiples hoteles utilicen la misma instancia de la aplicación, donde cada hotel tiene:
- Sus propios usuarios y recepcionistas
- Sus propios datos (reservas, parking, caja, etc.)
- Sus propias configuraciones
- Aislamiento total de datos entre hoteles

### 1.2 Beneficios

- **Escalabilidad**: Un solo deployment para todos los hoteles
- **Mantenimiento**: Actualizaciones centralizadas
- **Costos**: Reducción de infraestructura
- **Aislamiento**: Datos de cada hotel completamente separados
- **Multi-tenancy**: Soporte para subdominios (hotel1.app.com, hotel2.app.com)

### 1.3 Enfoque Elegido: Multi-Tenancy por Base de Datos Compartida

Se utilizará el patrón de **shared database, separate schema** donde:
- Una sola base de datos MySQL (Aiven)
- Tabla `hoteles` almacena la información de cada hotel
- Todas las tablas operativas tienen `hotel_id` como foreign key
- Consultas filtran automáticamente por el hotel del usuario autenticado

---

## 2. Estructura de Base de Datos (Aiven)

### 2.1 Tabla Principal: `hoteles`

```sql
CREATE TABLE hoteles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSON,
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    moneda VARCHAR(3) DEFAULT 'EUR',
    idioma VARCHAR(10) DEFAULT 'es',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.2 Tabla `users` (modificada)

```sql
ALTER TABLE users
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_users_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE SET NULL;
```

---

## 3. Tablas que SÍ son multi-hotel

Todas estas tablas necesitan `hotel_id`:

| Módulo | Tablas |
|--------|--------|
| **Logbook** | `logbooks`, `logbook_comments`, `logbook_history` |
| **Parking** | `parking_spots`, `parking_vehicles`, `parking_bookings`, `parking_availability` |
| **Groups** | `hotel_groups`, `group_contacts`, `group_history` |
| **Cashier** | `cashier_shifts`, `cashier_vouchers`, `cashier_history`, `cashier_daily` |
| **Maintenance** | `maintenance_reports`, `maintenance_history` |
| **Messages** | `conversations` |
| **Notifications** | `notifications` |
| **Blacklist** | `blacklist_entries` |
| **Backoffice** | `bo_invoices`, `bo_suppliers`, `bo_assets`, `bo_invoice_history` |

---

## 4. Tablas que NO son multi-hotel

Estos datos permanecen globales y no necesitan `hotel_id`:

- `users` - Ya tiene `hotel_id` como FK
- `roles` - Configuración global de roles
- `departments` - Departamentos globales
- `payment_methods` - Catálogo global
- `parking_rates` - Tarifas globales
- `bo_categories` - Categorías globales
- `cashier_payments`, `cashier_denominations`, `cashier_shift_users`, `cashier_shift_vouchers`
- `group_rooms`, `group_status`, `group_payments`
- `maintenance_images`
- `conversation_participants`, `messages`
- `notification_recipients`

---

## 5. Componentes Clave

### 5.1 Capa de Backend

- **Middleware de Hotel**: Extrae `hotel_id` de la sesión del usuario
- **HotelDB Helper**: Filtra automáticamente queries por `hotel_id`
- **Repositories**: Actualizados para usar el helper

### 5.2 Capa de Frontend

- **HotelContext**: Estado global del hotel activo
- **API Client**: Incluir `x-hotel-id` en headers
- **React Query Keys**: Incluir `hotelId` para cache isolation

---

## 6. Principios de Diseño

### 6.1 Principio del Aislamiento Automático

Ningún developer debe recordar añadir `WHERE hotel_id = ?` manualmente. El sistema debe:

1. Extraer `hotel_id` del usuario autenticado
2. Inyectarlo en el request
3. Los repositories lo usan automáticamente con `HotelDB.withHotel()`

### 6.2 Principio de la Compatibilidad hacia Atrás

La migración debe ser gradual:
- Hotels existentes se migran a la nueva estructura
- Nuevos hotels usan la nueva estructura
- Código legacy sigue funcionando durante la transición

### 6.3 Principio de la Consistencia

- El `hotel_id` debe ser inmutable durante un request
- Si un usuario pertenece a múltiples hoteles, debe poder cambiar entre ellos
- Las caches de React Query deben invalidar al cambiar de hotel

---

## 7. Casos de Uso

### 7.1 Hotel Existente

```typescript
// Usuario "admin" del Hotel "Four Points"
const user = await authenticate('admin', 'password');
// user.hotel_id = 1 (Four Points)
// Todas las queries filtran por hotel_id = 1
```

### 7.2 Usuario Multi-Hotel

```typescript
// Usuario que trabaja en dos hoteles
const user = await authenticate('recepcionista', 'password');
// user.hotels = [1, 2] (pertenece a dos hoteles)
// Frontend muestra selector de hotel
// Al cambiar, se actualiza el contexto global
```

### 7.3 API Request

```
GET /api/logbooks
├─ Header: Cookie: hotel_session=xxx
├─ Middleware extrae user.hotel_id = 1
├─ Repository usa HotelDB.withHotel('SELECT * FROM logbooks')
└─ Query: SELECT * FROM logbooks WHERE hotel_id = 1
```

---

## 8. Cambios en la Arquitectura

### 8.1 Backend

```
Request HTTP
    │
    ▼
┌─────────────────────────┐
│  Auth Middleware        │  Verifica sesión (users.id es CHAR(36))
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Hotel Middleware       │  Extrae hotel_id
│  hotel-middleware.ts    │  Injecta en req.hotelId
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Controller             │  Pasa req al repository
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Repository             │  Usa HotelDB.withHotel()
│  logbook-repository.ts  │  Filtra automáticamente
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Database (Aiven)       │  WHERE hotel_id = ?
└─────────────────────────┘
```

### 8.2 Frontend

```
┌─────────────────────────────────────────────────────┐
│  HotelContext                                       │
│  - hotel: { id, nombre, slug }                      │
│  - hotels: [{ id, nombre, slug }, ...]              │
│  - switchHotel(hotelId)                             │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  API Client                                          │
│  - Headers: { x-hotel-id: hotel.id }                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  React Query                                         │
│  - Keys: ['logbooks', { hotelId: 1 }]               │
│  - Cache isolation por hotel                        │
└─────────────────────────────────────────────────────┘
```

---

## 9. Próximos Pasos

Consultar los documentos específicos para cada área:

- [Arquitectura de Base de Datos](./02-DATABASE.md) - Schema SQL para Aiven
- [Cambios en el Backend](./03-BACKEND.md) - Middleware, helpers, repositories
- [Cambios en el Frontend](./04-FRONTEND.md) - Context, API, React Query
- [Estrategia de Migración](./05-MIGRATION-STRATEGY.md) - Fases y rollback
- [Roadmap de Implementación](./06-ROADMAP.md) - Día a día
- [Operaciones](./OPERATIONS.md) - Gestión post-implementación
