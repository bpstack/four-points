-- =========================================================
-- Sistema de conciliación diaria entre Recepción y Pisos
-- VERSIÓN LOCAL (utf8mb4_unicode_ci)
-- =========================================================
USE hotel_db;

-- =========================================================
-- DESACTIVAR SAFE MODE PARA PERMITIR BORRADO
-- =========================================================
SET SQL_SAFE_UPDATES = 0;

-- =========================================================
-- BORRAR TABLAS EXISTENTES (en orden correcto por FK)
-- =========================================================
DROP TABLE IF EXISTS conciliation_housekeeping;
DROP TABLE IF EXISTS conciliation_reception;
DROP TABLE IF EXISTS conciliation_monthly_summary;
DROP TABLE IF EXISTS conciliation_summary;

SELECT '✅ Tablas antiguas eliminadas correctamente' AS resultado;

-- =========================================================
-- TABLA PRINCIPAL: RESUMEN DIARIO DE CONCILIACIÓN
-- =========================================================
CREATE TABLE conciliation_summary (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  date                 DATE NOT NULL UNIQUE,
  total_reception      INT DEFAULT 0,
  total_housekeeping   INT DEFAULT 0,
  difference           INT GENERATED ALWAYS AS (total_housekeeping - total_reception) STORED,
  notes                TEXT NULL,
  
  created_by           CHAR(36) NULL,
  updated_by           CHAR(36) NULL,
  department_id        INT NULL,
  status               ENUM('draft', 'confirmed', 'closed') DEFAULT 'draft',
  
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           DATETIME NULL DEFAULT NULL,
  
  CONSTRAINT fk_conciliation_created_by FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
    
  CONSTRAINT fk_conciliation_updated_by FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL,
    
  CONSTRAINT fk_conciliation_department FOREIGN KEY (department_id)
    REFERENCES departments(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_conciliation_date       ON conciliation_summary(date);
CREATE INDEX idx_conciliation_status     ON conciliation_summary(status);
CREATE INDEX idx_conciliation_deleted_at ON conciliation_summary(deleted_at);

SELECT '✅ Tabla conciliation_summary creada' AS resultado;

-- =========================================================
-- TABLA DESGLOSE: ENTRADAS DE RECEPCIÓN
-- Reasons: base_rooms, no_show, room_change, gratuity, other
-- =========================================================
CREATE TABLE conciliation_reception (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  conciliation_id  INT NOT NULL,
  reason           ENUM(
    'base_rooms',
    'no_show',
    'room_change',
    'gratuity',
    'other'
  ) NOT NULL,
  direction        ENUM('add', 'subtract') NOT NULL DEFAULT 'add',
  value            INT DEFAULT 0,
  room_number      VARCHAR(255) NULL,
  notes            TEXT NULL,
  
  created_by       CHAR(36) NULL,
  updated_by       CHAR(36) NULL,
  
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL DEFAULT NULL,
  
  CONSTRAINT fk_reception_conciliation FOREIGN KEY (conciliation_id)
    REFERENCES conciliation_summary(id) ON DELETE CASCADE,
    
  CONSTRAINT fk_reception_created_by FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
    
  CONSTRAINT fk_reception_updated_by FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reception_conciliation ON conciliation_reception(conciliation_id);
CREATE INDEX idx_reception_deleted_at   ON conciliation_reception(deleted_at);

SELECT '✅ Tabla conciliation_reception creada con 5 reasons' AS resultado;

-- =========================================================
-- TABLA DESGLOSE: ENTRADAS DE PISOS (HOUSEKEEPING)
-- Reasons: cleaned, do_not_disturb, ooo_cleaned, pending_cleaned, 
--          pending_to_clean, room_clean, other
-- =========================================================
CREATE TABLE conciliation_housekeeping (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  conciliation_id  INT NOT NULL,
  reason           ENUM(
    'cleaned',
    'do_not_disturb',
    'ooo_cleaned',
    'pending_cleaned',
    'pending_to_clean',
    'room_clean',
    'other'
  ) NOT NULL,
  direction        ENUM('add', 'subtract') NOT NULL DEFAULT 'add',
  value            INT DEFAULT 0,
  room_number      VARCHAR(255) NULL,
  notes            TEXT NULL,
  
  created_by       CHAR(36) NULL,
  updated_by       CHAR(36) NULL,
  
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL DEFAULT NULL,
  
  CONSTRAINT fk_housekeeping_conciliation FOREIGN KEY (conciliation_id)
    REFERENCES conciliation_summary(id) ON DELETE CASCADE,
    
  CONSTRAINT fk_housekeeping_created_by FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
    
  CONSTRAINT fk_housekeeping_updated_by FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_housekeeping_conciliation ON conciliation_housekeeping(conciliation_id);
CREATE INDEX idx_housekeeping_deleted_at   ON conciliation_housekeeping(deleted_at);

SELECT '✅ Tabla conciliation_housekeeping creada con 7 reasons' AS resultado;

-- =========================================================
-- TABLA: RESUMEN MENSUAL (solo metadata/status)
-- =========================================================
CREATE TABLE conciliation_monthly_summary (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  year             INT NOT NULL,
  month            INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status           ENUM('draft', 'confirmed', 'closed') DEFAULT 'draft',
  
  closed_by        CHAR(36) NULL,
  closed_at        DATETIME NULL,
  
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_year_month (year, month),
  
  CONSTRAINT fk_monthly_closed_by FOREIGN KEY (closed_by)
    REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_monthly_year_month ON conciliation_monthly_summary(year, month);
CREATE INDEX idx_monthly_status     ON conciliation_monthly_summary(status);

SELECT '✅ Tabla conciliation_monthly_summary creada' AS resultado;

-- =========================================================
-- REACTIVAR SAFE MODE
-- =========================================================
SET SQL_SAFE_UPDATES = 1;

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '📊 VERIFICACIÓN DE TABLAS' AS resultado;
SHOW TABLES LIKE 'conciliation%';

SELECT '✅✅✅ ESQUEMA DE CONCILIACIÓN LOCAL CREADO ✅✅✅' AS resultado;
