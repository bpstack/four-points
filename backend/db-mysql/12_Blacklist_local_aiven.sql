-- =========================================================
-- BLACKLIST MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripcion: Sistema de gestion de huespedes con mala conducta
-- Autor: stackBP
-- Fecha: 2025
-- Base de datos: hotel_db
-- Version: 1.0
-- =========================================================

-- =========================================================
-- VERSION LOCAL (utf8mb4_unicode_ci)
-- =========================================================

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS blacklist_entries;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE blacklist_entries (
  id INT NOT NULL AUTO_INCREMENT,
  guest_name VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  document_type ENUM('DNI', 'PASSPORT', 'NIE', 'OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  document_number VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  reason TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  comments TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  images JSON NOT NULL,
  status ENUM('ACTIVE', 'DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  deleted_at DATETIME DEFAULT NULL,
  deleted_by CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_by CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  audit_trail JSON DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_blacklist_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_blacklist_deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL,
  KEY idx_document_number (document_number),
  KEY idx_guest_name (guest_name(100)),
  KEY idx_severity (severity),
  KEY idx_status (status),
  KEY idx_check_in_date (check_in_date),
  KEY idx_check_out_date (check_out_date),
  KEY idx_created_by (created_by),
  KEY idx_created_at (created_at),
  KEY idx_status_severity (status, severity),
  KEY idx_status_created_at (status, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tabla blacklist_entries creada (LOCAL)' AS resultado;


-- =========================================================
-- VERSION AIVEN (utf8mb4_0900_ai_ci)
-- =========================================================
-- Ejecutar este bloque en Aiven
-- Version limpia sin comentarios problematicos

USE hotel_db;

SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS blacklist_entries;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE blacklist_entries (
  id INT NOT NULL AUTO_INCREMENT,
  guest_name VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  document_type ENUM('DNI', 'PASSPORT', 'NIE', 'OTHER') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  document_number VARCHAR(20) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  reason TEXT COLLATE utf8mb4_0900_ai_ci NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'MEDIUM',
  comments TEXT COLLATE utf8mb4_0900_ai_ci NOT NULL,
  images JSON NOT NULL,
  status ENUM('ACTIVE', 'DELETED') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'ACTIVE',
  deleted_at DATETIME DEFAULT NULL,
  deleted_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  created_by CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  audit_trail JSON DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_blacklist_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_blacklist_deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL,
  KEY idx_document_number (document_number),
  KEY idx_guest_name (guest_name(100)),
  KEY idx_severity (severity),
  KEY idx_status (status),
  KEY idx_check_in_date (check_in_date),
  KEY idx_check_out_date (check_out_date),
  KEY idx_created_by (created_by),
  KEY idx_created_at (created_at),
  KEY idx_status_severity (status, severity),
  KEY idx_status_created_at (status, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT 'Tabla blacklist_entries creada (AIVEN)' AS resultado;
