-- =========================================================
-- MAINTENANCE MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de gestión de reportes de mantenimiento
-- Autor: stackBP
-- Fecha: 2025
-- Base de datos: hotel_db
-- Versión: 1.0
-- =========================================================

-- =========================================================
-- VERSIÓN LOCAL (utf8mb4_unicode_ci)
-- =========================================================

USE hotel_db;

-- Safety: Drop tables si existen (orden inverso por FKs)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS maintenance_history;
DROP TABLE IF EXISTS maintenance_images;
DROP TABLE IF EXISTS maintenance_reports;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA: maintenance_reports
-- Tabla principal de reportes de mantenimiento
-- =========================================================
CREATE TABLE `maintenance_reports` (
  `id` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ID formato DDMMYY-XXX (ej: 120625-001)',
  
  -- Información básica
  `report_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha del reporte',
  `title` VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Título del reporte (3-150 chars)',
  `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción detallada (min 10 chars)',
  
  -- Ubicación
  `location_type` ENUM('room', 'common_area', 'exterior', 'facilities', 'other') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo de ubicación',
  `location_description` VARCHAR(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción específica de ubicación',
  `room_number` VARCHAR(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Número de habitación (si aplica)',
  `room_out_of_service` BOOLEAN DEFAULT FALSE COMMENT 'Habitación fuera de servicio',
  
  -- Estado y prioridad
  `priority` ENUM('low', 'medium', 'high', 'urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium' COMMENT 'Prioridad del reporte',
  `status` ENUM('reported', 'assigned', 'in_progress', 'waiting', 'completed', 'closed', 'canceled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reported' COMMENT 'Estado del flujo de trabajo',
  
  -- Asignación
  `assigned_to` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'UUID del usuario asignado (interno)',
  `assigned_type` ENUM('internal', 'external') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tipo de asignación',
  `external_company_name` VARCHAR(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nombre de empresa externa',
  `external_contact` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Contacto de empresa externa',
  
  -- Timestamps de flujo de trabajo
  `started_at` DATETIME DEFAULT NULL COMMENT 'Fecha de inicio del trabajo',
  `resolved_at` DATETIME DEFAULT NULL COMMENT 'Fecha de resolución',
  `closed_at` DATETIME DEFAULT NULL COMMENT 'Fecha de cierre/cancelación',
  `resolution_notes` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Notas de resolución',
  
  -- Soft delete
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Flag de eliminación suave',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Fecha de eliminación',
  `deleted_by` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Usuario que eliminó',
  
  -- Auditoría
  `created_by` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Usuario que creó el reporte',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Último usuario que modificó',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  
  -- Foreign Keys
  CONSTRAINT `fk_maintenance_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_maintenance_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_maintenance_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_maintenance_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  
  -- Índices para búsquedas
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_location_type` (`location_type`),
  KEY `idx_room_number` (`room_number`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_is_deleted` (`is_deleted`),
  
  -- Índices compuestos para búsquedas frecuentes
  KEY `idx_status_priority` (`status`, `priority`),
  KEY `idx_deleted_status` (`is_deleted`, `status`),
  KEY `idx_location_room` (`location_type`, `room_number`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reportes de mantenimiento del hotel';


-- =========================================================
-- TABLA: maintenance_images
-- Imágenes asociadas a reportes
-- =========================================================
CREATE TABLE `maintenance_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `report_id` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ID del reporte (DDMMYY-XXX)',
  
  -- Información del archivo
  `file_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre original del archivo',
  `file_path` VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL de Cloudinary o path',
  `file_size` INT UNSIGNED NOT NULL COMMENT 'Tamaño en bytes',
  `mime_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo MIME (image/jpeg, etc)',
  `public_id` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Public ID de Cloudinary',
  
  -- Configuración
  `auto_delete_on_close` BOOLEAN DEFAULT TRUE COMMENT 'Eliminar imagen al cerrar reporte',
  
  -- Auditoría
  `uploaded_by` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Usuario que subió la imagen',
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  
  -- Foreign Keys
  CONSTRAINT `fk_image_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_image_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  
  -- Índices
  KEY `idx_report_id` (`report_id`),
  KEY `idx_uploaded_at` (`uploaded_at`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Imágenes de reportes de mantenimiento';


-- =========================================================
-- TABLA: maintenance_history
-- Historial de cambios de reportes
-- =========================================================
CREATE TABLE `maintenance_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `report_id` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ID del reporte (DDMMYY-XXX)',
  
  -- Información del cambio
  `action` ENUM('created', 'status_changed', 'priority_changed', 'updated', 'assigned', 'resolved', 'closed', 'deleted', 'restored') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo de acción',
  `field_changed` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Campo modificado',
  `old_value` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Valor anterior',
  `new_value` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Valor nuevo',
  `notes` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Notas del cambio',
  
  -- Auditoría
  `changed_by` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Usuario que realizó el cambio',
  `changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  
  -- Foreign Keys
  CONSTRAINT `fk_history_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  
  -- Índices
  KEY `idx_report_id` (`report_id`),
  KEY `idx_action` (`action`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_report_changed_at` (`report_id`, `changed_at` DESC)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de cambios en reportes de mantenimiento';


-- =========================================================
-- VERIFICACIÓN LOCAL
-- =========================================================
SELECT 'Tablas de maintenance creadas correctamente (LOCAL)' AS resultado;
SHOW TABLES LIKE 'maintenance%';


-- =========================================================
-- VERSIÓN AIVEN (utf8mb4_0900_ai_ci)
-- =========================================================
-- Ejecutar este bloque en Aiven
-- Versión limpia sin comentarios problematicos

USE hotel_db;

SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS maintenance_history;
DROP TABLE IF EXISTS maintenance_images;
DROP TABLE IF EXISTS maintenance_reports;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE maintenance_reports (
  id VARCHAR(12) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  report_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  title VARCHAR(150) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  description TEXT COLLATE utf8mb4_0900_ai_ci NOT NULL,
  location_type ENUM('room', 'common_area', 'exterior', 'facilities', 'other') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  location_description VARCHAR(200) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  room_number VARCHAR(10) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  room_out_of_service BOOLEAN DEFAULT FALSE,
  priority ENUM('low', 'medium', 'high', 'urgent') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'medium',
  status ENUM('reported', 'assigned', 'in_progress', 'waiting', 'completed', 'closed', 'canceled') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'reported',
  assigned_to CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  assigned_type ENUM('internal', 'external') COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  external_company_name VARCHAR(150) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  external_contact VARCHAR(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  started_at DATETIME DEFAULT NULL,
  resolved_at DATETIME DEFAULT NULL,
  closed_at DATETIME DEFAULT NULL,
  resolution_notes TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at DATETIME DEFAULT NULL,
  deleted_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  created_by CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_maintenance_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_maintenance_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_maintenance_deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL,
  KEY idx_status (status),
  KEY idx_priority (priority),
  KEY idx_location_type (location_type),
  KEY idx_room_number (room_number),
  KEY idx_assigned_to (assigned_to),
  KEY idx_created_by (created_by),
  KEY idx_report_date (report_date),
  KEY idx_is_deleted (is_deleted),
  KEY idx_status_priority (status, priority),
  KEY idx_deleted_status (is_deleted, status),
  KEY idx_location_room (location_type, room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE maintenance_images (
  id INT NOT NULL AUTO_INCREMENT,
  report_id VARCHAR(12) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  file_name VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  file_path VARCHAR(500) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  mime_type VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  public_id VARCHAR(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  auto_delete_on_close BOOLEAN DEFAULT TRUE,
  uploaded_by CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_image_report FOREIGN KEY (report_id) REFERENCES maintenance_reports (id) ON DELETE CASCADE,
  CONSTRAINT fk_image_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT,
  KEY idx_report_id (report_id),
  KEY idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE maintenance_history (
  id INT NOT NULL AUTO_INCREMENT,
  report_id VARCHAR(12) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  action ENUM('created', 'status_changed', 'priority_changed', 'updated', 'assigned', 'resolved', 'closed', 'deleted', 'restored') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  field_changed VARCHAR(50) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  old_value TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  new_value TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  notes TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  changed_by CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_history_report FOREIGN KEY (report_id) REFERENCES maintenance_reports (id) ON DELETE CASCADE,
  CONSTRAINT fk_history_changed_by FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE RESTRICT,
  KEY idx_report_id (report_id),
  KEY idx_action (action),
  KEY idx_changed_at (changed_at),
  KEY idx_report_changed_at (report_id, changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT 'Tablas maintenance creadas (AIVEN)' AS resultado;
SHOW TABLES LIKE 'maintenance%';
