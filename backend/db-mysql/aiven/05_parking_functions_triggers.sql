-- =========================================================
-- 05_parking_functions_triggers.sql (AIVEN)
-- Funciones y Triggers del sistema de parking
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================
USE hotel_db;

-- ============================================
-- FUNCIONES
-- ============================================

DELIMITER $$

-- Verificar disponibilidad de una plaza
DROP FUNCTION IF EXISTS check_availability$$
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
DROP FUNCTION IF EXISTS get_total_availability$$
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

SELECT 'Funciones creadas (Aiven)' AS status;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER $$

-- 1. GENERAR BOOKING_CODE AUTOMÁTICAMENTE
DROP TRIGGER IF EXISTS trg_generate_booking_code$$
CREATE TRIGGER trg_generate_booking_code
BEFORE INSERT ON parking_bookings
FOR EACH ROW
BEGIN
    DECLARE next_number INT;
    DECLARE date_part VARCHAR(8);
    
    -- Formato: PK-YYYYMMDD-0001
    SET date_part = DATE_FORMAT(NOW(), '%Y%m%d');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(booking_code, -4) AS UNSIGNED)
    ), 0) + 1
    INTO next_number
    FROM parking_bookings
    WHERE booking_code LIKE CONCAT('PK-', date_part, '-%');
    
    SET NEW.booking_code = CONCAT(
        'PK-',
        date_part,
        '-',
        LPAD(next_number, 4, '0')
    );
END$$

-- 2. ACTUALIZAR DISPONIBILIDAD AL CREAR RESERVA
DROP TRIGGER IF EXISTS trg_update_availability_on_booking$$
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

-- 3. LIBERAR DISPONIBILIDAD AL CAMBIAR ESTADO
DROP TRIGGER IF EXISTS trg_free_availability_on_status_change$$
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

-- 4. VALIDAR DISPONIBILIDAD ANTES DE INSERTAR
DROP TRIGGER IF EXISTS trg_validate_booking_insert$$
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

-- 5. ACTUALIZAR DISPONIBILIDAD AL CAMBIAR FECHAS
DROP TRIGGER IF EXISTS trg_update_availability_on_date_change$$
CREATE TRIGGER trg_update_availability_on_date_change
AFTER UPDATE ON parking_bookings
FOR EACH ROW
BEGIN
    IF (OLD.expected_checkin != NEW.expected_checkin 
        OR OLD.expected_checkout != NEW.expected_checkout
        OR OLD.spot_id != NEW.spot_id)
    AND NEW.status IN ('reserved', 'checked_in') THEN
        
        -- Liberar fechas antiguas
        UPDATE parking_availability
        SET is_available = TRUE, 
            booking_id = NULL
        WHERE spot_id = OLD.spot_id
        AND date >= DATE(OLD.expected_checkin) 
        AND date < DATE(OLD.expected_checkout)
        AND booking_id = OLD.id;
        
        -- Ocupar fechas nuevas
        UPDATE parking_availability
        SET is_available = FALSE, 
            booking_id = NEW.id
        WHERE spot_id = NEW.spot_id
        AND date >= DATE(NEW.expected_checkin) 
        AND date < DATE(NEW.expected_checkout);
    END IF;
END$$

DELIMITER ;

SELECT 'Triggers creados (Aiven)' AS status;
