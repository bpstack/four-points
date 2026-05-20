-- =============================================================================
-- ⚠️  FROZEN 2026-05-20 — DO NOT EDIT
-- =============================================================================
-- This file is part of the install base snapshot. All schema changes since
-- 2026-05-20 live in `scripts/AAAAMMDD_*.sql`. Editing this file breaks the
-- single-source-of-truth invariant. See MIGRATIONS_POLICY.md.
-- =============================================================================

-- =========================================================
-- 04_parking_tables.sql (AIVEN)
-- Tablas del sistema de parking con booking_code integrado
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================
USE hotel_db;

-- 1. PLAZAS DE PARKING
CREATE TABLE parking_spots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  level_code VARCHAR(10) NOT NULL,
  spot_number INT NOT NULL,
  spot_type ENUM('normal', 'ancha', 'mas_ancha', 'esquina', 'accesible', 'estrecha_bicis') DEFAULT 'normal',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  UNIQUE KEY unique_spot (level_code, spot_number),
  INDEX idx_level (level_code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. VEHÍCULOS
CREATE TABLE parking_vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  model VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plate (plate_number),
  INDEX idx_owner (owner_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. TARIFAS
CREATE TABLE parking_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  days INT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description VARCHAR(100),
  INDEX idx_days (days)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. RESERVAS / BOOKINGS (CON booking_code, created_by, updated_by)
CREATE TABLE parking_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_code VARCHAR(20) NULL,
  spot_id INT NOT NULL,
  vehicle_id INT NULL,
  operator_id CHAR(36) NULL,
  expected_checkin DATETIME NOT NULL,
  expected_checkout DATETIME NOT NULL,
  actual_checkin DATETIME NULL,
  actual_checkout DATETIME NULL,
  status ENUM('reserved', 'checked_in', 'completed', 'canceled', 'no_show') DEFAULT 'reserved',
  total_amount DECIMAL(10,2) NULL,
  payment_amount DECIMAL(10,2) NULL,
  payment_method ENUM('cash', 'card', 'transfer', 'agency') NULL,
  payment_reference VARCHAR(100) NULL,
  payment_date TIMESTAMP NULL,
  booking_source ENUM('direct', 'booking_com', 'expedia', 'airbnb', 'agency_other') DEFAULT 'direct',
  external_booking_id VARCHAR(64) NULL,
  notes TEXT NULL,
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_booking_spot FOREIGN KEY (spot_id) 
    REFERENCES parking_spots(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_vehicle FOREIGN KEY (vehicle_id) 
    REFERENCES parking_vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_operator FOREIGN KEY (operator_id) 
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_created_by FOREIGN KEY (created_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_updated_by FOREIGN KEY (updated_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  UNIQUE KEY unique_booking_code (booking_code),
  INDEX idx_booking_search (spot_id, status, expected_checkin, expected_checkout),
  INDEX idx_status (status),
  INDEX idx_dates (expected_checkin, expected_checkout),
  INDEX idx_operator (operator_id),
  INDEX idx_booking_source (booking_source),
  INDEX idx_booking_code (booking_code),
  INDEX idx_created_by (created_by),
  INDEX idx_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='Reservas con integridad flexible: spot RESTRICT, vehicle/operator SET NULL';

-- 5. DISPONIBILIDAD
CREATE TABLE parking_availability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  spot_id INT NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  booking_id INT NULL,
  
  UNIQUE KEY unique_spot_date (spot_id, date),
  FOREIGN KEY (spot_id) REFERENCES parking_spots(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES parking_bookings(id) ON DELETE SET NULL,
  
  INDEX idx_date (date),
  INDEX idx_available (is_available),
  INDEX idx_spot_date (spot_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT 'Tablas parking creadas correctamente (Aiven)' AS resultado;
