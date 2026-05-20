-- =============================================================================
-- ⚠️  FROZEN 2026-05-20 — DO NOT EDIT
-- =============================================================================
-- This file is part of the install base snapshot. All schema changes since
-- 2026-05-20 live in `scripts/AAAAMMDD_*.sql`. Editing this file breaks the
-- single-source-of-truth invariant. See MIGRATIONS_POLICY.md.
-- =============================================================================

-- =========================================================
-- 06_parking_procedures.sql (AIVEN)
-- Procedimientos almacenados del sistema de parking
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================
USE hotel_db;

DELIMITER $$

-- ============================================
-- 1. GENERAR DISPONIBILIDAD INICIAL
-- ============================================
DROP PROCEDURE IF EXISTS generate_availability$$
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
    
    SELECT CONCAT('Generados ', v_total, ' registros de disponibilidad') AS resultado;
END$$


-- Ejecutar después de la sincronización para verificar
SELECT 
    'Bookings Activas' as tipo,
    COUNT(DISTINCT spot_id) as total
FROM parking_bookings
WHERE DATE(expected_checkin) <= CURDATE()
    AND DATE(expected_checkout) >= CURDATE()
    AND status IN ('reserved', 'checked_in')
UNION ALL
SELECT 
    'Plazas Ocupadas en Availability' as tipo,
    COUNT(*) as total
FROM parking_availability
WHERE date = CURDATE()
    AND is_available = 0;

-- ============================================
-- 2. OBTENER PLAZAS DISPONIBLES
-- ============================================
DROP PROCEDURE IF EXISTS get_available_spots$$
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

-- ============================================
-- 3. OBTENER CHECK-INS PENDIENTES
-- ============================================
DROP PROCEDURE IF EXISTS get_pending_checkins$$
CREATE PROCEDURE get_pending_checkins(IN p_date DATE)
BEGIN
    SELECT 
        b.id AS booking_id,
        b.booking_code,
        ps.spot_number,
        ps.level_code AS planta,
        v.owner_name AS cliente,
        v.plate_number AS matricula,
        b.expected_checkin AS entrada_esperada,
        b.expected_checkout AS salida_esperada,
        DATEDIFF(b.expected_checkout, b.expected_checkin) AS dias,
        b.total_amount AS precio,
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
    LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
    WHERE b.status = 'reserved'
    AND DATE(b.expected_checkin) = p_date
    ORDER BY b.expected_checkin;
END$$

-- ============================================
-- 4. SINCRONIZAR DISPONIBILIDAD
-- ============================================
DROP PROCEDURE IF EXISTS sync_parking_availability$$
CREATE PROCEDURE sync_parking_availability()
BEGIN
    DECLARE affected_rows INT DEFAULT 0;
    DECLARE start_time TIMESTAMP DEFAULT NOW();
    
    START TRANSACTION;
    
    -- Paso 1: Resetear disponibilidades futuras
    UPDATE parking_availability 
    SET is_available = 1, booking_id = NULL
    WHERE date >= CURDATE();
    
    SET affected_rows = ROW_COUNT();
    
    -- Paso 2: Marcar plazas ocupadas
    UPDATE parking_availability pa
    INNER JOIN parking_bookings pb ON pa.spot_id = pb.spot_id
        AND pa.date >= DATE(pb.expected_checkin)
        AND pa.date < DATE(pb.expected_checkout)
        AND pb.status IN ('reserved', 'checked_in')
    SET pa.is_available = 0, pa.booking_id = pb.id;
    
    SET affected_rows = affected_rows + ROW_COUNT();
    
    COMMIT;
    
    -- Retornar resultado
    SELECT 
        affected_rows AS registros_actualizados,
        TIMESTAMPDIFF(MICROSECOND, start_time, NOW()) AS tiempo_microsegundos,
        'Sincronización completada' AS mensaje;
END$$

-- ============================================
-- 5. MANTENIMIENTO DIARIO
-- ============================================
DROP PROCEDURE IF EXISTS daily_parking_maintenance$$
CREATE PROCEDURE daily_parking_maintenance()
BEGIN
    DECLARE v_expired_bookings INT DEFAULT 0;
    
    START TRANSACTION;
    
    -- Marcar como no_show las reservas vencidas
    UPDATE parking_bookings
    SET status = 'no_show',
        updated_at = NOW()
    WHERE status = 'reserved'
    AND DATE(expected_checkin) < CURDATE()
    AND actual_checkin IS NULL;
    
    SET v_expired_bookings = ROW_COUNT();
    
    -- Sincronizar disponibilidad
    CALL sync_parking_availability();
    
    COMMIT;
    
    SELECT 
        v_expired_bookings AS reservas_expiradas,
        'Mantenimiento completado' AS mensaje;
END$$

DELIMITER ;

SELECT 'Procedimientos creados (Aiven)' AS status;
