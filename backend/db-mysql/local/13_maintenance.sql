-- =========================================================
-- MAINTENANCE MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de gestión de reportes de mantenimiento
-- Versión: LOCAL (utf8mb4_unicode_ci)
-- =========================================================

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS maintenance_history;
DROP TABLE IF EXISTS maintenance_images;
DROP TABLE IF EXISTS maintenance_reports;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA: maintenance_reports
-- =========================================================
CREATE TABLE `maintenance_reports` (
  `id` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ID formato DDMMYY-XXX',
  `report_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `title` VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_type` ENUM('room', 'common_area', 'exterior', 'facilities', 'other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_description` VARCHAR(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_number` VARCHAR(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `room_out_of_service` BOOLEAN DEFAULT FALSE,
  `priority` ENUM('low', 'medium', 'high', 'urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `status` ENUM('reported', 'assigned', 'in_progress', 'waiting', 'completed', 'closed', 'canceled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reported',
  `assigned_to` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_type` ENUM('internal', 'external') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_company_name` VARCHAR(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_contact` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `closed_at` DATETIME DEFAULT NULL,
  `resolution_notes` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `deleted_at` DATETIME DEFAULT NULL,
  `deleted_by` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_maintenance_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_maintenance_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_maintenance_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_maintenance_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_location_type` (`location_type`),
  KEY `idx_room_number` (`room_number`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_status_priority` (`status`, `priority`),
  KEY `idx_deleted_status` (`is_deleted`, `status`),
  KEY `idx_location_room` (`location_type`, `room_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: maintenance_images
-- =========================================================
CREATE TABLE `maintenance_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `report_id` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` INT UNSIGNED NOT NULL,
  `mime_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_id` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auto_delete_on_close` BOOLEAN DEFAULT TRUE,
  `uploaded_by` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_image_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_image_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  KEY `idx_report_id` (`report_id`),
  KEY `idx_uploaded_at` (`uploaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: maintenance_history
-- =========================================================
CREATE TABLE `maintenance_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `report_id` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` ENUM('created', 'status_changed', 'priority_changed', 'updated', 'assigned', 'resolved', 'closed', 'deleted', 'restored') COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_changed` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_value` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_value` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_history_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  KEY `idx_report_id` (`report_id`),
  KEY `idx_action` (`action`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_report_changed_at` (`report_id`, `changed_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '✅ Tablas maintenance creadas (LOCAL)' AS resultado;
SHOW TABLES LIKE 'maintenance%';
