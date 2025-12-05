-- =========================================================
-- Sistema de conciliación diaria entre Recepción y Pisos
-- VERSIÓN COMPLETA CON NUEVOS REASONS
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
-- REACTIVAR SAFE MODE
-- =========================================================
SET SQL_SAFE_UPDATES = 1;

-- =========================================================
-- VERIFICACIÓN: Ver todas las tablas
-- =========================================================
SELECT '📊 VERIFICACIÓN DE TABLAS' AS resultado;
SHOW TABLES LIKE 'conciliation%';

-- =========================================================
-- VERIFICACIÓN: Estructura de cada tabla
-- =========================================================
SELECT '📋 ESTRUCTURA: conciliation_summary' AS resultado;
DESCRIBE conciliation_summary;

SELECT '📋 ESTRUCTURA: conciliation_reception' AS resultado;
DESCRIBE conciliation_reception;

SELECT '📋 ESTRUCTURA: conciliation_housekeeping' AS resultado;
DESCRIBE conciliation_housekeeping;

-- =========================================================
-- VERIFICACIÓN: Ver las foreign keys
-- =========================================================
SELECT '🔗 FOREIGN KEYS' AS resultado;
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
  AND TABLE_NAME LIKE 'conciliation%'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- =========================================================
-- RESUMEN DE REASONS Y DIRECTIONS
-- =========================================================
SELECT '
=========================================================
📋 RECEPTION REASONS (5 total)
=========================================================
✅ base_rooms        → ADD     (Habitaciones Base)
❌ no_show           → SUBTRACT (No Show)
✅ room_change       → ADD     (Cambio de Habitación)
✅ gratuity          → ADD     (Gratuitas) [NUEVO]
✅ other             → ADD     (Otro)

=========================================================
🧹 HOUSEKEEPING REASONS (7 total)
=========================================================
✅ cleaned           → ADD     (Limpiadas)
✅ do_not_disturb    → ADD     (No Molestar)
❌ ooo_cleaned       → SUBTRACT (Limpiadas que estaban OOO) [NUEVO]
❌ pending_cleaned   → SUBTRACT (Limpiadas LS día anterior) [NUEVO]
✅ pending_to_clean  → ADD     (Hab. LS pendientes) [NUEVO]
✅ room_clean        → ADD     (Habitación encontrada limpia) [NUEVO]
✅ other             → ADD     (Otro)
=========================================================
' AS 'RESUMEN DE CONFIGURACIÓN';

SELECT '✅✅✅ ESQUEMA DE CONCILIACIÓN RECREADO CORRECTAMENTE ✅✅✅' AS resultado;


-- =========================================================
-- Tabla para almacenar el STATUS de resúmenes mensuales
-- Los TOTALES se calculan dinámicamente, esta tabla solo guarda metadata
-- =========================================================
USE hotel_db;

-- =========================================================
-- CREAR TABLA: conciliation_monthly_summary
-- =========================================================
CREATE TABLE conciliation_monthly_summary (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  year             INT NOT NULL,
  month            INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status           ENUM('draft', 'confirmed', 'closed') DEFAULT 'draft',
  
  -- Auditoría de cierre
  closed_by        CHAR(36) NULL,
  closed_at        DATETIME NULL,
  
  -- Timestamps
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE KEY unique_year_month (year, month),
  
  CONSTRAINT fk_monthly_closed_by FOREIGN KEY (closed_by)
    REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- ÍNDICES PARA PERFORMANCE
-- =========================================================
CREATE INDEX idx_monthly_year_month ON conciliation_monthly_summary(year, month);
CREATE INDEX idx_monthly_status     ON conciliation_monthly_summary(status);

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '✅ Tabla conciliation_monthly_summary creada correctamente' AS resultado;

DESCRIBE conciliation_monthly_summary;

SELECT '
=========================================================
📊 TABLA: conciliation_monthly_summary
=========================================================
Propósito: Almacenar el STATUS de cada mes (draft/confirmed/closed)
Los TOTALES se calculan dinámicamente consultando conciliation_summary
Cada mes puede tener solo UN registro (UNIQUE constraint)
Solo ADMIN puede cerrar un mes
=========================================================
' AS 'INFORMACIÓN';



-- =========================================================
-- Sistema de conciliación diaria entre Recepción y Pisos
-- VERSIÓN COMPLETA PARA AIVEN (utf8mb4_0900_ai_ci)
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
  
  created_by           CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  updated_by           CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
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
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_conciliation_date       ON conciliation_summary(date);
CREATE INDEX idx_conciliation_status     ON conciliation_summary(status);
CREATE INDEX idx_conciliation_deleted_at ON conciliation_summary(deleted_at);

SELECT '✅ Tabla conciliation_summary creada' AS resultado;

-- =========================================================
-- TABLA DESGLOSE: ENTRADAS DE RECEPCIÓN
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
  
  created_by       CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  updated_by       CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL DEFAULT NULL,
  
  CONSTRAINT fk_reception_conciliation FOREIGN KEY (conciliation_id)
    REFERENCES conciliation_summary(id) ON DELETE CASCADE,
    
  CONSTRAINT fk_reception_created_by FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
    
  CONSTRAINT fk_reception_updated_by FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_reception_conciliation ON conciliation_reception(conciliation_id);
CREATE INDEX idx_reception_deleted_at   ON conciliation_reception(deleted_at);

SELECT '✅ Tabla conciliation_reception creada' AS resultado;

-- =========================================================
-- TABLA DESGLOSE: ENTRADAS DE PISOS (HOUSEKEEPING)
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
  
  created_by       CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  updated_by       CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL DEFAULT NULL,
  
  CONSTRAINT fk_housekeeping_conciliation FOREIGN KEY (conciliation_id)
    REFERENCES conciliation_summary(id) ON DELETE CASCADE,
    
  CONSTRAINT fk_housekeeping_created_by FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
    
  CONSTRAINT fk_housekeeping_updated_by FOREIGN KEY (updated_by)
    REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_housekeeping_conciliation ON conciliation_housekeeping(conciliation_id);
CREATE INDEX idx_housekeeping_deleted_at   ON conciliation_housekeeping(deleted_at);

SELECT '✅ Tabla conciliation_housekeeping creada' AS resultado;

-- =========================================================
-- TABLA: RESUMEN MENSUAL (solo metadata/status)
-- =========================================================
CREATE TABLE conciliation_monthly_summary (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  year             INT NOT NULL,
  month            INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status           ENUM('draft', 'confirmed', 'closed') DEFAULT 'draft',
  
  closed_by        CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  closed_at        DATETIME NULL,
  
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_year_month (year, month),
  
  CONSTRAINT fk_monthly_closed_by FOREIGN KEY (closed_by)
    REFERENCES users(id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_monthly_status ON conciliation_monthly_summary(status);

SELECT '✅ Tabla conciliation_monthly_summary creada' AS resultado;

-- =========================================================
-- REACTIVAR SAFE MODE
-- =========================================================
SET SQL_SAFE_UPDATES = 1;

-- =========================================================
-- VERIFICACIÓN COMPLETA
-- =========================================================
SELECT '📊 VERIFICACIÓN DE TABLAS' AS resultado;
SHOW TABLES LIKE 'conciliation%';

SELECT '📋 ESTRUCTURA: conciliation_summary' AS resultado;
DESCRIBE conciliation_summary;

SELECT '📋 ESTRUCTURA: conciliation_reception' AS resultado;
DESCRIBE conciliation_reception;

SELECT '📋 ESTRUCTURA: conciliation_housekeeping' AS resultado;
DESCRIBE conciliation_housekeeping;

SELECT '📋 ESTRUCTURA: conciliation_monthly_summary' AS resultado;
DESCRIBE conciliation_monthly_summary;

SELECT '🔗 FOREIGN KEYS' AS resultado;
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
  AND TABLE_NAME LIKE 'conciliation%'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT '✅✅✅ ESQUEMA DE CONCILIACIÓN COMPLETO CREADO EN AIVEN ✅✅✅' AS resultado;

✅ Todas las columnas CHAR(36) tienen CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
✅ Todas las tablas usan CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
