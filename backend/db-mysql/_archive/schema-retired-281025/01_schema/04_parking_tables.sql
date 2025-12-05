-- ============================================
-- RECONSTRUCCIÓN SISTEMA PARKING - UTF-8
-- ============================================
-- Este script elimina solo las tablas de parking
-- y las reconstruye desde cero manteniendo users
-- ============================================

-- FORZAR UTF-8 COMPLETO
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';

-- Verificamos la databse

USE hotel_db;

-- Mostrar configuración actual
SELECT 
    '🔧 Configuración UTF-8 Activa' AS info,
    @@character_set_client AS client_charset,
    @@character_set_connection AS connection_charset,
    @@collation_connection AS collation;

-- ============================================
-- PASO 1: BACKUP DE SEGURIDAD (RECOMENDADO)
-- ============================================
-- Ejecuta esto en CMD ANTES de continuar:
-- mysqldump -u dz -p --no-tablespaces hotel_db > backup_pre_rebuild.sql

SELECT '⚠️  ASEGÚRATE DE HABER HECHO BACKUP ANTES DE CONTINUAR' AS warning;
SELECT 'Comando: mysqldump -u dz -p --no-tablespaces hotel_db > backup_pre_rebuild.sql' AS backup_cmd;

-- ============================================
-- PASO 2: VERIFICAR TABLA USERS EXISTE
-- ============================================
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla users existe - Continuamos'
        ELSE '❌ ERROR: Tabla users NO existe - DETENER'
    END AS check_users
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'hotel_db' 
  AND TABLE_NAME = 'users';

-- ============================================
-- PASO 3: DESACTIVAR FOREIGN KEYS
-- ============================================
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- PASO 4: ELIMINAR TABLAS PARKING + AUXILIARES
-- ============================================
-- Tablas auxiliares (si existen)
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS agencies;

-- Tablas parking (hijas primero)
DROP TABLE IF EXISTS parking_payments;
DROP TABLE IF EXISTS parking_invoices;
DROP TABLE IF EXISTS parking_sessions;
DROP TABLE IF EXISTS parking_reservations;
DROP TABLE IF EXISTS parking_availability;
DROP TABLE IF EXISTS parking_vehicles;
DROP TABLE IF EXISTS parking_spots;
DROP TABLE IF EXISTS parking_spot_types;
DROP TABLE IF EXISTS parking_levels;
DROP TABLE IF EXISTS parking_rates;

-- NO TOCAMOS: users, roles (son core)

SELECT '✅ Tablas eliminadas' AS status;

-- ============================================
-- PASO 5: ELIMINAR FUNCIONES/PROCEDIMIENTOS/TRIGGERS
-- ============================================

-- Funciones (viejas + nuevas por precaución)
DROP FUNCTION IF EXISTS calculate_parking_price;
DROP FUNCTION IF EXISTS check_availability;
DROP FUNCTION IF EXISTS get_total_availability;
DROP FUNCTION IF EXISTS normalize_checkin_time;
DROP FUNCTION IF EXISTS normalize_checkout_time;

-- Procedimientos
DROP PROCEDURE IF EXISTS generate_availability;
DROP PROCEDURE IF EXISTS get_available_spots;
DROP PROCEDURE IF EXISTS get_pending_checkins;
DROP PROCEDURE IF EXISTS daily_maintenance;

-- Triggers (viejos + nuevos por precaución)
DROP TRIGGER IF EXISTS trg_update_availability_on_reservation;
DROP TRIGGER IF EXISTS trg_free_availability_on_status_change;
DROP TRIGGER IF EXISTS trg_validate_session_insert;
DROP TRIGGER IF EXISTS trg_validate_reservation_insert;
DROP TRIGGER IF EXISTS trg_update_availability_on_booking;
DROP TRIGGER IF EXISTS trg_validate_booking_insert;

SELECT '✅ Funciones, procedimientos y triggers eliminados' AS status;

-- ============================================
-- PASO 6: CREAR NUEVA ESTRUCTURA
-- ============================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TARIFAS
CREATE TABLE parking_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  days INT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description VARCHAR(100),
  INDEX idx_days (days)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. RESERVAS / BOOKINGS
CREATE TABLE parking_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  spot_id INT NOT NULL,
  vehicle_id INT NULL, -- CAMBIADO: NOT NULL → NULL
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- FKs: spot RESTRICT (no borrar plazas con reservas), vehicle/operator SET NULL (preservar reserva)
  CONSTRAINT fk_booking_spot FOREIGN KEY (spot_id) 
    REFERENCES parking_spots(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_vehicle FOREIGN KEY (vehicle_id) 
    REFERENCES parking_vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_operator FOREIGN KEY (operator_id) 
    REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_booking_search (spot_id, status, expected_checkin, expected_checkout),
  INDEX idx_status (status),
  INDEX idx_dates (expected_checkin, expected_checkout),
  INDEX idx_operator (operator_id),
  INDEX idx_booking_source (booking_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Reservas con integridad flexible: spot RESTRICT, vehicle/operator SET NULL para preservar historial';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Tablas creadas correctamente' AS status;

-- ============================================
-- PASO 7: INSERTAR DATOS INICIALES
-- ============================================

-- PLAZAS: Planta -2 (10 plazas)
INSERT INTO parking_spots (level_code, spot_number, spot_type) VALUES
('-2', 1, 'normal'),
('-2', 2, 'ancha'),
('-2', 3, 'mas_ancha'),
('-2', 4, 'normal'),
('-2', 5, 'esquina'),
('-2', 6, 'accesible'),
('-2', 7, 'normal'),
('-2', 8, 'normal'),
('-2', 9, 'estrecha_bicis'),
('-2', 10, 'normal');

-- PLAZAS: Planta -3 (10 plazas)
INSERT INTO parking_spots (level_code, spot_number, spot_type) VALUES
('-3', 1, 'normal'),
('-3', 2, 'ancha'),
('-3', 3, 'mas_ancha'),
('-3', 4, 'normal'),
('-3', 5, 'esquina'),
('-3', 6, 'accesible'),
('-3', 7, 'normal'),
('-3', 8, 'normal'),
('-3', 9, 'estrecha_bicis'),
('-3', 10, 'normal');

SELECT CONCAT('✅ Insertadas ', COUNT(*), ' plazas de parking') AS status
FROM parking_spots;

-- TARIFAS (30 días)
INSERT INTO parking_rates (days, price, description) VALUES
(1,  15.00,  '1 día'),
(2,  27.00,  '2 días'),
(3,  39.00,  '3 días'),
(4,  51.00,  '4 días'),
(5,  63.00,  '5 días'),
(6,  75.00,  '6 días'),
(7,  70.00,  '7 días'),
(8,  80.00,  '8 días'),
(9,  90.00,  '9 días'),
(10, 100.00, '10 días'),
(11, 110.00, '11 días'),
(12, 120.00, '12 días'),
(13, 130.00, '13 días'),
(14, 140.00, '14 días'),
(15, 150.00, '15 días'),
(16, 160.00, '16 días'),
(17, 170.00, '17 días'),
(18, 180.00, '18 días'),
(19, 190.00, '19 días'),
(20, 200.00, '20 días'),
(21, 210.00, '21 días'),
(22, 220.00, '22 días'),
(23, 230.00, '23 días'),
(24, 240.00, '24 días'),
(25, 250.00, '25 días'),
(26, 260.00, '26 días'),
(27, 270.00, '27 días'),
(28, 280.00, '28 días'),
(29, 290.00, '29 días'),
(30, 250.00, '30 días');

SELECT CONCAT('✅ Insertadas ', COUNT(*), ' tarifas') AS status
FROM parking_rates;

-- ============================================
-- PASO 8: CREAR FUNCIONES
-- ============================================

DELIMITER $$

-- Verificar disponibilidad de una plaza
CREATE FUNCTION check_availability(
    p_spot_id INT,
    p_date_from DATE,
    p_date_to DATE
) RETURNS TINYINT(1)
READS SQL DATA
BEGIN
    DECLARE v_unavailable INT;
    
    SELECT COUNT(*) INTO v_unavailable
    FROM parking_availability
    WHERE spot_id = p_spot_id
      AND date >= p_date_from
      AND date < p_date_to
      AND is_available = FALSE;
    
    RETURN IF(v_unavailable = 0, 1, 0);
END$$

-- Obtener total de plazas disponibles en una fecha
CREATE FUNCTION get_total_availability(p_date DATE) RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_available INT;
    
    SELECT COUNT(*) INTO v_available
    FROM parking_availability
    WHERE date = p_date AND is_available = TRUE;
    
    RETURN IFNULL(v_available, 0);
END$$

DELIMITER ;

SELECT '✅ Funciones creadas' AS status;

-- ============================================
-- PASO 9: CREAR PROCEDIMIENTOS
-- ============================================

DELIMITER $$

-- Generar disponibilidad para 365 días
CREATE PROCEDURE generate_availability()
BEGIN
    DECLARE v_spot_id INT;
    DECLARE v_date DATE;
    DECLARE v_end_date DATE;
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_total INT DEFAULT 0;
    
    DECLARE spot_cursor CURSOR FOR SELECT id FROM parking_spots;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET v_date = CURDATE();
    SET v_end_date = DATE_ADD(CURDATE(), INTERVAL 365 DAY);
    
    OPEN spot_cursor;
    spot_loop: LOOP
        FETCH spot_cursor INTO v_spot_id;
        IF done THEN LEAVE spot_loop; END IF;
        
        SET v_date = CURDATE();
        WHILE v_date <= v_end_date DO
            INSERT IGNORE INTO parking_availability (spot_id, date, is_available)
            VALUES (v_spot_id, v_date, TRUE);
            SET v_total = v_total + 1;
            SET v_date = DATE_ADD(v_date, INTERVAL 1 DAY);
        END WHILE;
    END LOOP;
    CLOSE spot_cursor;
    
    SELECT CONCAT('✅ Generados ', v_total, ' registros de disponibilidad') AS resultado;
END$$

-- Obtener plazas disponibles
CREATE PROCEDURE get_available_spots(
    IN p_date_from DATE,
    IN p_date_to DATE,
    IN p_level_code VARCHAR(10)
)
BEGIN
    DECLARE v_days INT;
    SET v_days = DATEDIFF(p_date_to, p_date_from);
    
    SELECT 
        ps.id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        COUNT(DISTINCT pa.date) AS total_dias,
        COUNT(*) AS dias_disponibles,
        (SELECT price FROM parking_rates WHERE days = v_days) AS precio_estimado
    FROM parking_spots ps
    INNER JOIN parking_availability pa ON ps.id = pa.spot_id
        AND pa.date >= p_date_from 
        AND pa.date < p_date_to 
        AND pa.is_available = TRUE
    WHERE (p_level_code IS NULL OR ps.level_code = p_level_code)
      AND ps.is_active = TRUE
    GROUP BY ps.id, ps.spot_number, ps.level_code, ps.spot_type
    HAVING dias_disponibles = total_dias
    ORDER BY ps.level_code, ps.spot_number;
END$$

-- Obtener check-ins pendientes
CREATE PROCEDURE get_pending_checkins(IN p_date DATE)
BEGIN
    SELECT 
        b.id AS booking_id,
        ps.spot_number,
        ps.level_code AS planta,
        v.owner_name AS cliente,
        v.plate_number AS matricula,
        b.expected_checkin AS entrada_esperada,
        b.expected_checkout AS salida_esperada,
        DATEDIFF(b.expected_checkout, b.expected_checkin) AS dias,
        (SELECT price FROM parking_rates WHERE days = DATEDIFF(b.expected_checkout, b.expected_checkin)) AS precio,
        b.booking_source AS agencia,
        b.external_booking_id AS codigo_externo,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM parking_bookings b2 
                WHERE b2.spot_id = b.spot_id 
                  AND b2.status = 'checked_in'
                  AND DATE(b2.actual_checkin) <= p_date
                  AND (b2.actual_checkout IS NULL OR DATE(b2.actual_checkout) >= p_date)
            ) THEN 1
            ELSE 0
        END AS plaza_ocupada
    FROM parking_bookings b
    INNER JOIN parking_spots ps ON b.spot_id = ps.id
    INNER JOIN parking_vehicles v ON b.vehicle_id = v.id
    WHERE b.status = 'reserved'
      AND DATE(b.expected_checkin) = p_date
    ORDER BY b.expected_checkin;
END$$

DELIMITER ;

SELECT '✅ Procedimientos creados' AS status;

-- ============================================
-- PASO 10: CREAR TRIGGERS
-- ============================================

DELIMITER $$

CREATE TRIGGER trg_update_availability_on_booking
AFTER INSERT ON parking_bookings
FOR EACH ROW
BEGIN
    IF NEW.status IN ('reserved', 'checked_in') THEN
        UPDATE parking_availability
        SET is_available = FALSE, 
            booking_id = NEW.id
        WHERE spot_id = NEW.spot_id
          AND date >= DATE(NEW.expected_checkin) 
          AND date < DATE(NEW.expected_checkout);
    END IF;
END$$

CREATE TRIGGER trg_free_availability_on_status_change
AFTER UPDATE ON parking_bookings
FOR EACH ROW
BEGIN
    IF OLD.status IN ('reserved', 'checked_in') 
       AND NEW.status IN ('completed', 'canceled', 'no_show') THEN
        UPDATE parking_availability
        SET is_available = TRUE, 
            booking_id = NULL
        WHERE spot_id = NEW.spot_id
          AND date >= DATE(OLD.expected_checkin) 
          AND date < DATE(OLD.expected_checkout);
    END IF;
END$$

CREATE TRIGGER trg_validate_booking_insert
BEFORE INSERT ON parking_bookings
FOR EACH ROW
BEGIN
    DECLARE v_unavailable_count INT;
    
    SELECT COUNT(*) INTO v_unavailable_count
    FROM parking_availability
    WHERE spot_id = NEW.spot_id
      AND date >= DATE(NEW.expected_checkin)
      AND date < DATE(NEW.expected_checkout)
      AND is_available = FALSE;
    
    IF v_unavailable_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La plaza no está disponible en las fechas seleccionadas';
    END IF;
END$$

-- 4. TRIGGER PARA ACTUALIZAR FECHAS
CREATE TRIGGER trg_update_availability_on_date_change
AFTER UPDATE ON parking_bookings
FOR EACH ROW
BEGIN
    IF (OLD.expected_checkin != NEW.expected_checkin 
        OR OLD.expected_checkout != NEW.expected_checkout
        OR OLD.spot_id != NEW.spot_id)
       AND NEW.status IN ('reserved', 'checked_in') THEN
        
        UPDATE parking_availability
        SET is_available = TRUE, 
            booking_id = NULL
        WHERE spot_id = OLD.spot_id
          AND date >= DATE(OLD.expected_checkin) 
          AND date <= DATE(OLD.expected_checkout) -- ✅ CAMBIO: < por <=
          AND booking_id = OLD.id;
        
        UPDATE parking_availability
        SET is_available = FALSE, 
            booking_id = NEW.id
        WHERE spot_id = NEW.spot_id
          AND date >= DATE(NEW.expected_checkin) 
          AND date <= DATE(NEW.expected_checkout); -- ✅ CAMBIO: < por <=
    END IF;
END$$

DELIMITER ;

SELECT '✅ Triggers creados (incluyendo actualización de fechas)' AS status;

DELIMITER ;

SELECT '✅ Triggers creados' AS status;

-- ============================================
-- PASO 11: GENERAR DISPONIBILIDAD INICIAL
-- ============================================
CALL generate_availability();

-- ============================================
-- PASO 12: REACTIVAR FOREIGN KEYS
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ Foreign keys reactivadas' AS status;

-- ============================================
-- PASO 13: VERIFICACIÓN FINAL
-- ============================================

SELECT '========================================' AS separador;
SELECT '✅ RECONSTRUCCIÓN COMPLETADA' AS resultado;
SELECT '========================================' AS separador;

-- Verificar tablas
SELECT 
    'Tablas parking' AS componente,
    COUNT(*) AS total
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hotel_db'
  AND TABLE_NAME LIKE 'parking_%';

-- Verificar funciones
SELECT 
    'Funciones' AS componente,
    COUNT(*) AS total
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db' 
  AND ROUTINE_TYPE = 'FUNCTION';

-- Verificar procedimientos
SELECT 
    'Procedimientos' AS componente,
    COUNT(*) AS total
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db' 
  AND ROUTINE_TYPE = 'PROCEDURE';

-- Verificar triggers
SELECT 
    'Triggers' AS componente,
    COUNT(*) AS total
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'hotel_db';

-- Verificar datos
SELECT 'Plazas parking' AS componente, COUNT(*) AS total FROM parking_spots
UNION ALL
SELECT 'Tarifas' AS componente, COUNT(*) AS total FROM parking_rates
UNION ALL
SELECT 'Disponibilidad' AS componente, COUNT(*) AS total FROM parking_availability;

-- Verificar UTF-8
SELECT 
    'Encoding' AS componente,
    CONCAT(@@character_set_database, ' / ', @@collation_database) AS configuracion;

-- Verificar FKs críticas
SELECT 
    'Foreign Keys' AS componente,
    COUNT(*) AS total
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
  AND TABLE_NAME = 'parking_bookings'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT '========================================' AS separador;
SELECT '🎉 Sistema listo para usar' AS mensaje;
SELECT '========================================' AS separador;