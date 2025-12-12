-- =========================================================
-- BLACKLIST MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de gestión de huéspedes con mala conducta
-- Autor: stackBP
-- Fecha: 2025
-- Base de datos: hotel_db
-- Versión: 1.0
-- =========================================================

-- =========================================================
-- VERSIÓN LOCAL (utf8mb4_unicode_ci)
-- =========================================================

USE hotel_db;

-- Safety: Drop table si existe
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS blacklist_entries;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA: blacklist_entries
-- =========================================================
CREATE TABLE `blacklist_entries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  
  -- Datos del huésped
  `guest_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre completo del huésped',
  `document_type` ENUM('DNI', 'PASSPORT', 'NIE', 'OTHER') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo de documento',
  `document_number` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Número de documento (uppercase)',
  
  -- Fechas de estancia
  `check_in_date` DATE NOT NULL COMMENT 'Fecha de entrada',
  `check_out_date` DATE NOT NULL COMMENT 'Fecha de salida',
  
  -- Detalles del incidente
  `reason` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Motivo de inclusión en blacklist',
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM' COMMENT 'Nivel de gravedad',
  `comments` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Comentarios adicionales del recepcionista',
  
  -- Imágenes (URLs de Cloudinary en JSON array)
  `images` JSON NOT NULL COMMENT 'Array de URLs de imágenes ["url1", "url2", ...]',
  
  -- Estado y soft delete
  `status` ENUM('ACTIVE', 'DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE' COMMENT 'Estado del registro',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Fecha de eliminación (soft delete)',
  `deleted_by` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Usuario que eliminó',
  
  -- Auditoría
  `created_by` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Usuario que creó el registro',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Historial de cambios (JSON array)
  `audit_trail` JSON DEFAULT NULL COMMENT 'Historial de modificaciones [{action, changed_by, timestamp, changes}]',
  
  PRIMARY KEY (`id`),
  
  -- Foreign Keys
  CONSTRAINT `fk_blacklist_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_blacklist_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  
  -- Índices para búsquedas
  KEY `idx_document_number` (`document_number`),
  KEY `idx_guest_name` (`guest_name`(100)),
  KEY `idx_severity` (`severity`),
  KEY `idx_status` (`status`),
  KEY `idx_check_in_date` (`check_in_date`),
  KEY `idx_check_out_date` (`check_out_date`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  
  -- Índice compuesto para búsquedas frecuentes
  KEY `idx_status_severity` (`status`, `severity`),
  KEY `idx_status_created_at` (`status`, `created_at` DESC)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de huéspedes con mala conducta';

-- =========================================================
-- VERIFICACIÓN LOCAL
-- =========================================================
SELECT 'Tabla blacklist_entries creada correctamente (LOCAL) ✅' AS resultado;
DESCRIBE blacklist_entries;


-- =========================================================
-- =========================================================
-- VERSIÓN AIVEN (utf8mb4_0900_ai_ci)
-- =========================================================
-- =========================================================

/*
-- Ejecutar este bloque en Aiven (comentar el bloque anterior)

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS blacklist_entries;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `blacklist_entries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  
  -- Datos del huésped
  `guest_name` VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Nombre completo del huésped',
  `document_type` ENUM('DNI', 'PASSPORT', 'NIE', 'OTHER') COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de documento',
  `document_number` VARCHAR(20) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Número de documento (uppercase)',
  
  -- Fechas de estancia
  `check_in_date` DATE NOT NULL COMMENT 'Fecha de entrada',
  `check_out_date` DATE NOT NULL COMMENT 'Fecha de salida',
  
  -- Detalles del incidente
  `reason` TEXT COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Motivo de inclusión en blacklist',
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'MEDIUM' COMMENT 'Nivel de gravedad',
  `comments` TEXT COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Comentarios adicionales del recepcionista',
  
  -- Imágenes (URLs de Cloudinary en JSON array)
  `images` JSON NOT NULL COMMENT 'Array de URLs de imágenes ["url1", "url2", ...]',
  
  -- Estado y soft delete
  `status` ENUM('ACTIVE', 'DELETED') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'ACTIVE' COMMENT 'Estado del registro',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Fecha de eliminación (soft delete)',
  `deleted_by` CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que eliminó',
  
  -- Auditoría
  `created_by` CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Usuario que creó el registro',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Historial de cambios (JSON array)
  `audit_trail` JSON DEFAULT NULL COMMENT 'Historial de modificaciones [{action, changed_by, timestamp, changes}]',
  
  PRIMARY KEY (`id`),
  
  -- Foreign Keys
  CONSTRAINT `fk_blacklist_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_blacklist_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  
  -- Índices para búsquedas
  KEY `idx_document_number` (`document_number`),
  KEY `idx_guest_name` (`guest_name`(100)),
  KEY `idx_severity` (`severity`),
  KEY `idx_status` (`status`),
  KEY `idx_check_in_date` (`check_in_date`),
  KEY `idx_check_out_date` (`check_out_date`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status_severity` (`status`, `severity`),
  KEY `idx_status_created_at` (`status`, `created_at` DESC)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Registro de huéspedes con mala conducta';

SELECT 'Tabla blacklist_entries creada correctamente (AIVEN) ✅' AS resultado;
DESCRIBE blacklist_entries;

*/


-- =========================================================
-- ESTRUCTURA DEL AUDIT_TRAIL (JSON)
-- =========================================================
/*
El campo audit_trail almacena un array JSON con este formato:

[
  {
    "action": "CREATE",
    "changed_by": "uuid-del-usuario",
    "changed_by_username": "sara",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "changes": null
  },
  {
    "action": "UPDATE",
    "changed_by": "uuid-del-usuario",
    "changed_by_username": "admin",
    "timestamp": "2025-01-16T14:20:00.000Z",
    "changes": {
      "severity": { "old": "MEDIUM", "new": "HIGH" },
      "reason": { "old": "Ruido excesivo", "new": "Ruido excesivo y daños" }
    }
  },
  {
    "action": "DELETE",
    "changed_by": "uuid-del-usuario",
    "changed_by_username": "sara",
    "timestamp": "2025-01-17T09:00:00.000Z",
    "changes": null
  },
  {
    "action": "RESTORE",
    "changed_by": "uuid-del-usuario",
    "changed_by_username": "admin",
    "timestamp": "2025-01-18T11:00:00.000Z",
    "changes": null
  }
]

Acciones posibles: CREATE, UPDATE, DELETE, RESTORE
*/


-- =========================================================
-- DATOS DE EJEMPLO (opcional, para testing)
-- =========================================================
/*
INSERT INTO blacklist_entries (
  guest_name, document_type, document_number,
  check_in_date, check_out_date,
  reason, severity, comments,
  images, created_by, audit_trail
) VALUES (
  'Juan Pérez García',
  'DNI',
  '12345678A',
  '2025-01-10',
  '2025-01-15',
  'Huésped causó daños en la habitación 302. Rompió el espejo del baño y manchó las cortinas.',
  'HIGH',
  'Se le cobró el depósito completo. No se recomienda volver a alojar.',
  '["https://res.cloudinary.com/demo/image/upload/sample1.jpg", "https://res.cloudinary.com/demo/image/upload/sample2.jpg"]',
  '498d5939-b714-4d18-bcac-f79db198dd90',
  '[{"action": "CREATE", "changed_by": "498d5939-b714-4d18-bcac-f79db198dd90", "changed_by_username": "sara", "timestamp": "2025-01-15T10:30:00.000Z", "changes": null}]'
);

SELECT 'Datos de ejemplo insertados ✅' AS resultado;
*/

