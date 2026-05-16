# Arquitectura de Base de Datos Multi-Hotel

## 1. Nueva Tabla: `hoteles`

```sql
USE hotel_db;

CREATE TABLE hoteles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'Identificador único para subdominios',
    settings JSON DEFAULT NULL COMMENT 'Configuraciones específicas del hotel',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    moneda VARCHAR(3) DEFAULT 'EUR',
    idioma VARCHAR(10) DEFAULT 'es',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## 2. Modificación de Tabla `users`

```sql
-- Añadir hotel_id a users (Aiven usa CHAR(36) para ids)
ALTER TABLE users
ADD COLUMN hotel_id INT UNSIGNED DEFAULT NULL,
ADD CONSTRAINT fk_users_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE SET NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_users_hotel ON users(hotel_id);

-- Actualizar usuarios existentes (hotel_id = 1 para el hotel principal)
UPDATE users SET hotel_id = 1 WHERE id > 0;

-- Hacer NOT NULL después de la migración
ALTER TABLE users MODIFY hotel_id INT UNSIGNED NOT NULL DEFAULT 1;
```

---

## 3. Tablas Operativas (Añadir hotel_id)

### 3.1 Logbook

```sql
ALTER TABLE logbooks
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_logbooks_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE logbook_comments
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_logbook_comments_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE logbook_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_logbook_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.2 Parking

```sql
ALTER TABLE parking_spots
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_spots_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE parking_vehicles
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_vehicles_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE parking_bookings
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_bookings_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE parking_availability
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_availability_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.3 Groups (hotel_groups)

```sql
ALTER TABLE hotel_groups
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_hotel_groups_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE group_contacts
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_group_contacts_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE group_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_group_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.4 Cashier

```sql
ALTER TABLE cashier_shifts
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_shifts_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE cashier_vouchers
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_vouchers_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE cashier_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE cashier_daily
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_daily_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.5 Maintenance

```sql
ALTER TABLE maintenance_reports
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_maintenance_reports_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE maintenance_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_maintenance_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.6 Messages

```sql
ALTER TABLE conversations
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_conversations_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.7 Notifications

```sql
ALTER TABLE notifications
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_notifications_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.8 Blacklist

```sql
ALTER TABLE blacklist_entries
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_blacklist_entries_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

### 3.9 Backoffice

```sql
ALTER TABLE bo_invoices
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_invoices_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE bo_suppliers
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_suppliers_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE bo_assets
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_assets_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE bo_invoice_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_invoice_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;
```

---

## 4. Tablas Globales (SIN hotel_id)

Estas tablas NO necesitan `hotel_id`:

| Tabla | Razón |
|-------|-------|
| `users` | Ya tiene `hotel_id` como FK |
| `roles` | Configuración global |
| `departments` | Configuración global |
| `payment_methods` | Catálogo global |
| `parking_rates` | Tarifas globales |
| `bo_categories` | Categorías globales |

---

## 5. Script de Migración Completo (Aiven)

Guardar en: `backend/db-mysql/aiven/99_multi_hotel_migration.sql`

```sql
-- ============================================
-- MIGRACIÓN A ARQUITECTURA MULTI-HOTEL (Aiven)
-- ============================================
-- Importante: Usar COLLATE utf8mb4_0900_ai_ci
-- Importante: users.id es CHAR(36)
-- ============================================

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. Crear tabla hoteles
-- ============================================
CREATE TABLE IF NOT EXISTS hoteles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSON,
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    moneda VARCHAR(3) DEFAULT 'EUR',
    idioma VARCHAR(10) DEFAULT 'es',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- 2. Insertar hotel por defecto (Four Points)
-- ============================================
INSERT INTO hoteles (id, nombre, slug, settings) VALUES 
(1, 'Four Points Hotel', 'four-points', '{"parking": {"total_spaces": 150}}')
ON DUPLICATE KEY UPDATE nombre = nombre;

-- ============================================
-- 3. Añadir hotel_id a users
-- ============================================
ALTER TABLE users
ADD COLUMN hotel_id INT UNSIGNED DEFAULT NULL,
ADD CONSTRAINT fk_users_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE SET NULL;

UPDATE users SET hotel_id = 1 WHERE hotel_id IS NULL;

ALTER TABLE users MODIFY hotel_id INT UNSIGNED NOT NULL DEFAULT 1;
CREATE INDEX idx_users_hotel ON users(hotel_id);

-- ============================================
-- 4. Añadir hotel_id a tablas logbook
-- ============================================
ALTER TABLE logbooks
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_logbooks_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE logbook_comments
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_logbook_comments_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE logbook_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_logbook_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 5. Añadir hotel_id a tablas parking
-- ============================================
ALTER TABLE parking_spots
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_spots_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE parking_vehicles
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_vehicles_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE parking_bookings
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_bookings_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE parking_availability
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_parking_availability_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 6. Añadir hotel_id a tablas groups
-- ============================================
ALTER TABLE hotel_groups
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_hotel_groups_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE group_contacts
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_group_contacts_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE group_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_group_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 7. Añadir hotel_id a tablas cashier
-- ============================================
ALTER TABLE cashier_shifts
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_shifts_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE cashier_vouchers
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_vouchers_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE cashier_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE cashier_daily
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_cashier_daily_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 8. Añadir hotel_id a tablas maintenance
-- ============================================
ALTER TABLE maintenance_reports
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_maintenance_reports_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE maintenance_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_maintenance_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 9. Añadir hotel_id a messages
-- ============================================
ALTER TABLE conversations
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_conversations_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 10. Añadir hotel_id a notifications
-- ============================================
ALTER TABLE notifications
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_notifications_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 11. Añadir hotel_id a blacklist
-- ============================================
ALTER TABLE blacklist_entries
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_blacklist_entries_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ============================================
-- 12. Añadir hotel_id a backoffice
-- ============================================
ALTER TABLE bo_invoices
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_invoices_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE bo_suppliers
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_suppliers_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE bo_assets
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_assets_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

ALTER TABLE bo_invoice_history
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_bo_invoice_history_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT '✅ Migración multi-hotel completada' AS resultado;
SELECT COUNT(*) AS hoteles FROM hoteles;
SELECT COUNT(*) AS users FROM users WHERE hotel_id IS NOT NULL;
```

---

## 6. Resumen de Cambios por Tabla (Aiven)

| Tabla | Cambio | FK a hoteles | Prioridad |
|-------|--------|--------------|-----------|
| `hoteles` | Nueva | - | Alta |
| `users` | + hotel_id | fk_users_hotel | Alta |
| `logbooks` | + hotel_id | fk_logbooks_hotel | Alta |
| `logbook_comments` | + hotel_id | fk_logbook_comments_hotel | Alta |
| `logbook_history` | + hotel_id | fk_logbook_history_hotel | Media |
| `parking_spots` | + hotel_id | fk_parking_spots_hotel | Alta |
| `parking_vehicles` | + hotel_id | fk_parking_vehicles_hotel | Media |
| `parking_bookings` | + hotel_id | fk_parking_bookings_hotel | Alta |
| `parking_availability` | + hotel_id | fk_parking_availability_hotel | Media |
| `hotel_groups` | + hotel_id | fk_hotel_groups_hotel | Alta |
| `group_contacts` | + hotel_id | fk_group_contacts_hotel | Media |
| `group_history` | + hotel_id | fk_group_history_hotel | Media |
| `cashier_shifts` | + hotel_id | fk_cashier_shifts_hotel | Alta |
| `cashier_vouchers` | + hotel_id | fk_cashier_vouchers_hotel | Alta |
| `cashier_history` | + hotel_id | fk_cashier_history_hotel | Media |
| `cashier_daily` | + hotel_id | fk_cashier_daily_hotel | Media |
| `maintenance_reports` | + hotel_id | fk_maintenance_reports_hotel | Alta |
| `maintenance_history` | + hotel_id | fk_maintenance_history_hotel | Media |
| `conversations` | + hotel_id | fk_conversations_hotel | Baja |
| `notifications` | + hotel_id | fk_notifications_hotel | Baja |
| `blacklist_entries` | + hotel_id | fk_blacklist_entries_hotel | Baja |
| `bo_invoices` | + hotel_id | fk_bo_invoices_hotel | Media |
| `bo_suppliers` | + hotel_id | fk_bo_suppliers_hotel | Media |
| `bo_assets` | + hotel_id | fk_bo_assets_hotel | Baja |
| `bo_invoice_history` | + hotel_id | fk_bo_invoice_history_hotel | Baja |

**Tablas SIN cambios:** `roles`, `departments`, `payment_methods`, `parking_rates`, `bo_categories`, `cashier_payments`, `cashier_denominations`, `cashier_shift_users`, `cashier_shift_vouchers`, `group_rooms`, `group_status`, `group_payments`, `maintenance_images`, `conversation_participants`, `messages`, `notification_recipients`

---

## 7. Validación post-migración

```sql
-- Verificar que todas las tablas tienen hotel_id
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE COLUMN_NAME = 'hotel_id' 
  AND TABLE_SCHEMA = 'hotel_db';

-- Ver foreign keys a hoteles
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
  AND REFERENCED_TABLE_NAME = 'hoteles';

-- Contar registros por hotel
SELECT h.nombre, COUNT(*) as total
FROM hoteles h
LEFT JOIN users u ON u.hotel_id = h.id
GROUP BY h.id;
```

---

## 8. Notas de Seguridad

1. **Backups**: Realizar backup completo antes de ejecutar la migración
2. **Downtime**: La migración puede requerir downtime de 5-10 minutos
3. **Rollback**: Guardar script de rollback por si hay problemas
4. **Testing**: Probar en base de datos de desarrollo primero
5. **Indexes**: Crear índices después de añadir columnas para mejor performance
