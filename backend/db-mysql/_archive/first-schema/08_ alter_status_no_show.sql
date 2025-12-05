-- =========================================================
-- MIGRACIÓN COMPLETA: Sistema de Reservas con no_show
-- =========================================================
USE hotel_db;

-- Desactivar safe mode temporalmente para la migración
SET SQL_SAFE_UPDATES = 0;

-- =========================================================
-- PASO 1: ELIMINAR TRIGGERS EXISTENTES
-- =========================================================
DROP TRIGGER IF EXISTS trg_check_reservation_availability;
DROP TRIGGER IF EXISTS trg_check_reservation_update;
DROP TRIGGER IF EXISTS trg_check_session_availability;
DROP TRIGGER IF EXISTS trg_auto_complete_session;

-- =========================================================
-- PASO 2: MIGRAR DATOS EXISTENTES
-- =========================================================

-- Convertir 'pending' a 'reserved'
UPDATE parking_reservations 
SET status = 'reserved' 
WHERE status = 'pending';

-- Limpiar cualquier valor no válido
UPDATE parking_reservations 
SET status = 'reserved' 
WHERE status NOT IN ('reserved', 'occupied', 'completed', 'canceled', 'no_show');

-- =========================================================
-- PASO 3: MODIFICAR ESTRUCTURA DE TABLAS
-- =========================================================

-- Actualizar ENUM de parking_reservations
ALTER TABLE parking_reservations
MODIFY COLUMN status ENUM('reserved', 'occupied', 'completed', 'canceled', 'no_show')
DEFAULT 'reserved';

-- Asegurar que parking_sessions también tenga los status correctos
ALTER TABLE parking_sessions
MODIFY COLUMN status ENUM('reserved', 'occupied', 'completed', 'canceled')
DEFAULT 'reserved';

-- =========================================================
-- PASO 4: FUNCIÓN AUXILIAR PARA NORMALIZAR HORAS
-- =========================================================

DELIMITER $$

-- Función para ajustar fechas a la hora de check-in (15:00)
DROP FUNCTION IF EXISTS normalize_checkin_time$$
CREATE FUNCTION normalize_checkin_time(dt DATETIME)
RETURNS DATETIME
DETERMINISTIC
BEGIN
  -- Si la hora es antes de 15:00, mantener la fecha pero ajustar a 15:00
  -- Si es 15:00 o después, ajustar a 15:00 de ese día
  RETURN DATE_ADD(DATE(dt), INTERVAL 15 HOUR);
END$$

-- Función para ajustar fechas a la hora de check-out (15:00)
DROP FUNCTION IF EXISTS normalize_checkout_time$$
CREATE FUNCTION normalize_checkout_time(dt DATETIME)
RETURNS DATETIME
DETERMINISTIC
BEGIN
  -- Siempre ajustar a las 15:00 del día indicado
  RETURN DATE_ADD(DATE(dt), INTERVAL 15 HOUR);
END$$

DELIMITER ;

-- =========================================================
-- PASO 5: TRIGGER PARA INSERTAR RESERVAS
-- =========================================================

DELIMITER $$

CREATE TRIGGER trg_check_reservation_availability
BEFORE INSERT ON parking_reservations
FOR EACH ROW
BEGIN
  DECLARE normalized_in DATETIME;
  DECLARE normalized_out DATETIME;
  
  -- Normalizar las fechas de entrada/salida a las 15:00
  SET normalized_in = normalize_checkin_time(NEW.expected_in);
  SET normalized_out = normalize_checkout_time(NEW.expected_out);
  
  -- Actualizar los valores normalizados
  SET NEW.expected_in = normalized_in;
  SET NEW.expected_out = normalized_out;
  
  -- 1. Verificar superposición con RESERVAS activas
  IF EXISTS (
    SELECT 1
    FROM parking_reservations r
    WHERE r.spot_id = NEW.spot_id
      AND r.id != IFNULL(NEW.id, 0)
      AND r.status IN ('reserved', 'occupied')
      AND (
        -- Superposición: inicio de nueva dentro de existente
        (normalized_in >= r.expected_in AND normalized_in < r.expected_out)
        OR
        -- Superposición: fin de nueva dentro de existente
        (normalized_out > r.expected_in AND normalized_out <= r.expected_out)
        OR
        -- Superposición: nueva engloba a existente
        (normalized_in <= r.expected_in AND normalized_out >= r.expected_out)
      )
  ) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'La plaza ya está reservada en ese intervalo de fechas.';
  END IF;
  
  -- 2. Verificar superposición con SESIONES activas
  IF EXISTS (
    SELECT 1
    FROM parking_sessions s
    WHERE s.spot_id = NEW.spot_id
      AND s.status IN ('reserved', 'occupied')
      AND (
        -- Sesión sin check_out (aún ocupada)
        (s.check_out IS NULL AND normalized_in < IFNULL(s.check_out, '9999-12-31 23:59:59'))
        OR
        -- Sesión con check_out definido
        (s.check_out IS NOT NULL AND (
          (normalized_in >= s.check_in AND normalized_in < s.check_out)
          OR
          (normalized_out > s.check_in AND normalized_out <= s.check_out)
          OR
          (normalized_in <= s.check_in AND normalized_out >= s.check_out)
        ))
      )
  ) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'La plaza está ocupada por una sesión activa en ese intervalo.';
  END IF;
END$$

DELIMITER ;

-- =========================================================
-- PASO 6: TRIGGER PARA ACTUALIZAR RESERVAS
-- =========================================================

DELIMITER $$

CREATE TRIGGER trg_check_reservation_update
BEFORE UPDATE ON parking_reservations
FOR EACH ROW
BEGIN
  DECLARE normalized_in DATETIME;
  DECLARE normalized_out DATETIME;
  
  -- Solo verificar disponibilidad si cambian fechas o plaza
  IF (OLD.expected_in != NEW.expected_in 
      OR OLD.expected_out != NEW.expected_out 
      OR OLD.spot_id != NEW.spot_id)
     AND NEW.status IN ('reserved', 'occupied')
  THEN
    
    SET normalized_in = normalize_checkin_time(NEW.expected_in);
    SET normalized_out = normalize_checkout_time(NEW.expected_out);
    
    SET NEW.expected_in = normalized_in;
    SET NEW.expected_out = normalized_out;
    
    -- Verificar superposición con otras reservas
    IF EXISTS (
      SELECT 1
      FROM parking_reservations r
      WHERE r.spot_id = NEW.spot_id
        AND r.id != NEW.id
        AND r.status IN ('reserved', 'occupied')
        AND (
          (normalized_in >= r.expected_in AND normalized_in < r.expected_out)
          OR
          (normalized_out > r.expected_in AND normalized_out <= r.expected_out)
          OR
          (normalized_in <= r.expected_in AND normalized_out >= r.expected_out)
        )
    ) THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'La plaza ya está reservada en ese intervalo.';
    END IF;
    
    -- Verificar superposición con sesiones
    IF EXISTS (
      SELECT 1
      FROM parking_sessions s
      WHERE s.spot_id = NEW.spot_id
        AND s.status IN ('reserved', 'occupied')
        AND (
          (s.check_out IS NULL AND normalized_in < IFNULL(s.check_out, '9999-12-31 23:59:59'))
          OR
          (s.check_out IS NOT NULL AND (
            (normalized_in >= s.check_in AND normalized_in < s.check_out)
            OR
            (normalized_out > s.check_in AND normalized_out <= s.check_out)
            OR
            (normalized_in <= s.check_in AND normalized_out >= s.check_out)
          ))
        )
    ) THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'La plaza está ocupada en ese intervalo.';
    END IF;
  END IF;
END$$

DELIMITER ;

-- =========================================================
-- PASO 7: TRIGGER PARA SESIONES (CHECK-IN/CHECK-OUT)
-- =========================================================

DELIMITER $$

CREATE TRIGGER trg_check_session_availability
BEFORE INSERT ON parking_sessions
FOR EACH ROW
BEGIN
  DECLARE normalized_in DATETIME;
  
  SET normalized_in = normalize_checkin_time(NEW.check_in);
  SET NEW.check_in = normalized_in;
  
  -- Verificar que no haya otras sesiones activas en la misma plaza
  IF EXISTS (
    SELECT 1
    FROM parking_sessions s
    WHERE s.spot_id = NEW.spot_id
      AND s.id != IFNULL(NEW.id, 0)
      AND s.status IN ('reserved', 'occupied')
      AND s.check_out IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Ya existe una sesión activa en esta plaza.';
  END IF;
END$$

DELIMITER ;

-- =========================================================
-- PASO 8: TRIGGER PARA LIBERAR PLAZA AL CHECK-OUT
-- =========================================================

DELIMITER $$

CREATE TRIGGER trg_auto_complete_session
BEFORE UPDATE ON parking_sessions
FOR EACH ROW
BEGIN
  -- Si se hace check-out, marcar como completed
  IF OLD.check_out IS NULL AND NEW.check_out IS NOT NULL THEN
    SET NEW.status = 'completed';
    
    -- Normalizar hora de check-out
    SET NEW.check_out = normalize_checkout_time(NEW.check_out);
    
    -- Actualizar la reserva asociada si existe
    IF NEW.id IS NOT NULL THEN
      UPDATE parking_reservations
      SET status = 'completed'
      WHERE session_id = NEW.id
        AND status = 'occupied';
    END IF;
  END IF;
END$$

DELIMITER ;

-- =========================================================
-- PASO 9: PROCEDIMIENTO PARA MARCAR NO_SHOW
-- =========================================================

DELIMITER $$

-- Procedimiento para ejecutar diariamente a las 14:55
DROP PROCEDURE IF EXISTS mark_no_show_reservations$$

CREATE PROCEDURE mark_no_show_reservations()
BEGIN
  DECLARE current_check_time DATETIME;
  
  -- Hora actual del sistema
  SET current_check_time = NOW();
  
  -- Marcar como no_show las reservas que:
  -- 1. Tienen status 'reserved'
  -- 2. Su expected_in (normalizado a 15:00) ya pasó
  -- 3. No tienen sesión iniciada
  UPDATE parking_reservations r
  SET r.status = 'no_show',
      r.updated_at = current_check_time
  WHERE r.status = 'reserved'
    AND r.expected_in <= current_check_time
    AND NOT EXISTS (
      SELECT 1 
      FROM parking_sessions s 
      WHERE s.id = r.session_id 
        AND s.status IN ('occupied', 'completed')
    );
    
  -- Log de cuántas reservas se marcaron
  SELECT ROW_COUNT() as reservas_marcadas_no_show;
END$$

DELIMITER ;

-- =========================================================
-- PASO 10: EVENT SCHEDULER (AUTOMATIZACIÓN DIARIA)
-- =========================================================

-- Activar el scheduler si no está activo
SET GLOBAL event_scheduler = ON;

-- Crear evento para marcar no_show diariamente a las 14:55
DROP EVENT IF EXISTS daily_mark_no_show;

CREATE EVENT daily_mark_no_show
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE(), ' 14:55:00')
DO
  CALL mark_no_show_reservations();

-- =========================================================
-- VERIFICACIONES FINALES
-- =========================================================

-- ✅ Verificar migración de datos
SELECT 
  status,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM parking_reservations), 2) as porcentaje
FROM parking_reservations 
GROUP BY status
ORDER BY cantidad DESC;

-- ✅ Verificar triggers creados
SELECT 
  TRIGGER_NAME,
  EVENT_MANIPULATION,
  EVENT_OBJECT_TABLE,
  ACTION_TIMING
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'hotel_db'
  AND EVENT_OBJECT_TABLE IN ('parking_reservations', 'parking_sessions')
ORDER BY EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION;

-- ✅ Verificar ENUM actualizado
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'hotel_db' 
  AND TABLE_NAME IN ('parking_reservations', 'parking_sessions')
  AND COLUMN_NAME = 'status';

-- ✅ Verificar evento programado
SELECT 
  EVENT_NAME,
  EVENT_TYPE,
  EXECUTE_AT,
  INTERVAL_VALUE,
  INTERVAL_FIELD,
  STATUS
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = 'hotel_db';

-- ✅ Verificar funciones creadas
SELECT 
  ROUTINE_NAME,
  ROUTINE_TYPE,
  DATA_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db'
ORDER BY ROUTINE_TYPE, ROUTINE_NAME;

-- =========================================================
-- QUERIES DE PRUEBA (COMENTADAS - DESCOMENTAR PARA USAR)
-- =========================================================

/*
-- Probar normalización de horas
SELECT 
  '2025-10-15 10:30:00' as original,
  normalize_checkin_time('2025-10-15 10:30:00') as normalizado_checkin,
  normalize_checkout_time('2025-10-15 18:45:00') as normalizado_checkout;

-- Ver reservas que serían marcadas como no_show
SELECT 
  r.id,
  r.expected_in,
  r.expected_out,
  r.status,
  s.check_in as session_checkin,
  CASE 
    WHEN r.expected_in <= NOW() AND NOT EXISTS (
      SELECT 1 FROM parking_sessions s2 
      WHERE s2.id = r.session_id AND s2.status IN ('occupied', 'completed')
    ) THEN 'Sería marcado como no_show'
    ELSE 'OK'
  END as analisis
FROM parking_reservations r
LEFT JOIN parking_sessions s ON s.id = r.session_id
WHERE r.status = 'reserved'
ORDER BY r.expected_in;

-- Ejecutar manualmente el procedimiento de no_show (para pruebas)
CALL mark_no_show_reservations();
*/

-- =========================================================
-- REACTIVAR SAFE MODE
-- =========================================================
SET SQL_SAFE_UPDATES = 1;

SHOW VARIABLES LIKE 'event_scheduler';