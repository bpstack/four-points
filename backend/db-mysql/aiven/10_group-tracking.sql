-- =========================================================
-- GROUP TRACKING MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de seguimiento de grupos hoteleros
-- Autor: stackBP
-- Fecha: 2025
-- Base de datos: hotel_db
-- Versión: 2.1 - AIVEN (utf8mb4_0900_ai_ci)
-- =========================================================

USE hotel_db;

-- =========================================================
-- SAFETY: Drop tables en orden inverso (respetando FK)
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS group_history;
DROP TABLE IF EXISTS group_payments;
DROP TABLE IF EXISTS group_status;
DROP TABLE IF EXISTS group_rooms;
DROP TABLE IF EXISTS group_contacts;
DROP TABLE IF EXISTS hotel_groups;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- INSERTAR ROL: group-admin
-- =========================================================
INSERT IGNORE INTO roles (name) VALUES ('group-admin');

-- =========================================================
-- TABLA 1: hotel_groups
-- =========================================================
CREATE TABLE `hotel_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Nombre del grupo',
  `agency` varchar(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Agencia intermediaria',
  `arrival_date` date NOT NULL COMMENT 'Fecha de llegada',
  `departure_date` date NOT NULL COMMENT 'Fecha de salida',
  `status` enum('pending','confirmed','in_progress','completed','cancelled') COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT 'Estado general del grupo',
  `total_amount` decimal(10,2) DEFAULT NULL COMMENT 'Importe total del grupo (puede ser NULL al inicio)',
  `currency` varchar(3) COLLATE utf8mb4_0900_ai_ci DEFAULT 'EUR' COMMENT 'Moneda del grupo',
  `notes` text COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas libres sobre el grupo',
  `created_by` char(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó el grupo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` char(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que hizo la última modificación',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_arrival_date` (`arrival_date`),
  KEY `idx_departure_date` (`departure_date`),
  KEY `idx_status` (`status`),
  KEY `idx_agency` (`agency`),
  CONSTRAINT `hotel_groups_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `hotel_groups_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Información principal de grupos';

-- =========================================================
-- TABLA 2: group_contacts
-- =========================================================
CREATE TABLE `group_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `contact_name` varchar(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Nombre del contacto',
  `contact_email` varchar(150) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Email del contacto',
  `contact_phone` varchar(20) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Teléfono del contacto',
  `is_primary` tinyint(1) DEFAULT '0' COMMENT 'Contacto principal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_is_primary` (`is_primary`),
  CONSTRAINT `group_contacts_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Contactos de cada grupo (1-2 por grupo)';

-- =========================================================
-- TABLA 3: group_rooms
-- =========================================================
CREATE TABLE `group_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `room_type` enum('single','double_bed','twin_beds') COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de habitación',
  `quantity` int NOT NULL DEFAULT '0' COMMENT 'Número de habitaciones de este tipo',
  `guests_per_room` int NOT NULL DEFAULT '1' COMMENT 'Personas por habitación',
  `notes` text COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas sobre este tipo de habitación',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_room_type` (`group_id`,`room_type`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_room_type` (`room_type`),
  CONSTRAINT `group_rooms_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Habitaciones reservadas por cada grupo';

-- =========================================================
-- TABLA 4: group_status
-- =========================================================
CREATE TABLE `group_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL COMMENT '1 status por grupo',
  `booking_confirmed` tinyint(1) DEFAULT '0' COMMENT 'Bloqueo confirmado',
  `booking_confirmed_date` datetime DEFAULT NULL,
  `contract_signed` tinyint(1) DEFAULT '0' COMMENT 'Contrato firmado',
  `contract_signed_date` datetime DEFAULT NULL,
  `rooming_status` enum('pending','requested','received') COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending',
  `rooming_requested_date` datetime DEFAULT NULL COMMENT 'Cuándo se solicitó',
  `rooming_received_date` datetime DEFAULT NULL COMMENT 'Cuándo se recibió',
  `balance_status` enum('pending','requested','partial','paid') COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending',
  `balance_requested_date` datetime DEFAULT NULL,
  `balance_paid_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_id` (`group_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_rooming_status` (`rooming_status`),
  KEY `idx_balance_status` (`balance_status`),
  CONSTRAINT `group_status_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Estados administrativos de cada grupo';

-- =========================================================
-- TABLA 5: group_payments
-- =========================================================
CREATE TABLE `group_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `payment_name` varchar(100) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Nombre del pago',
  `payment_order` int NOT NULL DEFAULT '1' COMMENT 'Orden del pago (1, 2, 3...)',
  `percentage` decimal(5,2) DEFAULT NULL COMMENT 'Porcentaje del total (NULL si es cantidad fija)',
  `amount` decimal(10,2) NOT NULL COMMENT 'Cantidad total a pagar',
  `amount_paid` decimal(10,2) DEFAULT '0.00' COMMENT 'Cantidad ya pagada (para pagos parciales)',
  `due_date` date NOT NULL COMMENT 'Fecha límite de pago',
  `status` enum('pending','requested','partial','paid') COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending',
  `status_updated_at` datetime DEFAULT NULL COMMENT 'Cuándo cambió el último estado',
  `notes` text COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas sobre el pago',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_order` (`payment_order`),
  CONSTRAINT `group_payments_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Pagos de cada grupo';

-- =========================================================
-- TABLA 6: group_history
-- =========================================================
CREATE TABLE `group_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `action` enum('created','updated','deleted','status_changed','payment_updated') COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de acción realizada',
  `table_affected` varchar(50) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Tabla afectada (hotel_groups, payments, group_status, etc.)',
  `record_id` int DEFAULT NULL COMMENT 'ID del registro afectado',
  `field_changed` varchar(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Campo modificado',
  `old_value` text COLLATE utf8mb4_0900_ai_ci COMMENT 'Valor anterior',
  `new_value` text COLLATE utf8mb4_0900_ai_ci COMMENT 'Valor nuevo',
  `changed_by` char(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que hizo el cambio',
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas opcionales sobre el cambio',
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_action` (`action`),
  KEY `idx_table_affected` (`table_affected`),
  CONSTRAINT `group_history_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de cambios de grupos para auditoría';

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT 'Tablas del módulo Groups creadas correctamente (AIVEN) ✅' AS resultado;
SHOW TABLES LIKE 'hotel_groups';
SHOW TABLES LIKE 'group%';

-- Verificar rol insertado
SELECT * FROM roles WHERE name = 'group-admin';
