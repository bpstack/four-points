-- ============================================
-- ACTUALIZACIÓN PARKING BOOKINGS - 24-10-25
-- Añade: booking_code, created_by, updated_by
-- ============================================

USE hotel_db;

-- ============================================
-- PASO 1: HACER BACKUP (CRÍTICO)
-- ============================================
-- Ejecuta esto ANTES en la terminal:
-- mysqldump -u dz -p --no-tablespaces hotel_db parking_bookings > backup_bookings_$(date +%Y%m%d).sql

SELECT '⚠️  ASEGÚRATE DE TENER BACKUP DE parking_bookings' AS warning;

-- ============================================
-- PASO 2: VERIFICAR ESTADO ACTUAL
-- ============================================
SELECT 
    '📊 Bookings existentes' AS info,
    COUNT(*) AS total
FROM parking_bookings;

-- Verificar tipo de operator_id (debe ser CHAR(36))
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'hotel_db'
AND TABLE_NAME = 'parking_bookings'
AND COLUMN_NAME = 'operator_id';

-- ============================================
-- PASO 3: AÑADIR COLUMNAS
-- ============================================

-- Añadir booking_code (UNIQUE, puede ser NULL al inicio)
ALTER TABLE parking_bookings
ADD COLUMN booking_code VARCHAR(20) NULL AFTER id;

-- Añadir auditoría (created_by, updated_by)
ALTER TABLE parking_bookings
ADD COLUMN created_by CHAR(36) NULL AFTER notes,
ADD COLUMN updated_by CHAR(36) NULL AFTER created_by;

SELECT '✅ Columnas añadidas' AS status;

-- ============================================
-- PASO 4: AÑADIR ÍNDICES
-- ============================================

-- Índice para booking_code (búsquedas rápidas)
CREATE INDEX idx_booking_code ON parking_bookings(booking_code);

-- Índices para auditoría
CREATE INDEX idx_created_by ON parking_bookings(created_by);
CREATE INDEX idx_updated_by ON parking_bookings(updated_by);

SELECT '✅ Índices creados' AS status;

-- ============================================
-- PASO 5: AÑADIR FOREIGN KEYS
-- ============================================

-- FK para created_by
ALTER TABLE parking_bookings
ADD CONSTRAINT fk_booking_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- FK para updated_by
ALTER TABLE parking_bookings
ADD CONSTRAINT fk_booking_updated_by 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

SELECT '✅ Foreign Keys creadas' AS status;

-- ============================================
-- PASO 6: CREAR TRIGGER PARA booking_code
-- ============================================

DELIMITER $$

-- Eliminar trigger si existe (por si re-ejecutas el script)
DROP TRIGGER IF EXISTS trg_generate_booking_code$$

CREATE TRIGGER trg_generate_booking_code
BEFORE INSERT ON parking_bookings
FOR EACH ROW
BEGIN
    DECLARE next_number INT;
    DECLARE date_part VARCHAR(8);
    
    -- Formato de fecha: YYYYMMDD
    SET date_part = DATE_FORMAT(NOW(), '%Y%m%d');
    
    -- Obtener el siguiente número para hoy
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(booking_code, -4) AS UNSIGNED)
    ), 0) + 1
    INTO next_number
    FROM parking_bookings
    WHERE booking_code LIKE CONCAT('PK-', date_part, '-%');
    
    -- Generar código: PK-20251024-0001
    SET NEW.booking_code = CONCAT(
        'PK-',
        date_part,
        '-',
        LPAD(next_number, 4, '0')
    );
END$$

DELIMITER ;

SELECT '✅ Trigger creado' AS status;

-- ============================================
-- PASO 7: GENERAR CÓDIGOS PARA BOOKINGS EXISTENTES
-- ============================================
-- ⚠️ CRÍTICO: Solo si ya tienes reservas en la tabla

-- Contar bookings sin código
SELECT 
    '⚠️  Bookings sin código' AS info,
    COUNT(*) AS total
FROM parking_bookings
WHERE booking_code IS NULL;

-- Generar códigos basados en created_at
SET @counter = 0;

UPDATE parking_bookings
SET booking_code = CONCAT(
    'PK-',
    DATE_FORMAT(created_at, '%Y%m%d'),
    '-',
    LPAD((@counter := @counter + 1), 4, '0')
)
WHERE booking_code IS NULL
ORDER BY created_at ASC;

SELECT '✅ Códigos generados para bookings existentes' AS status;

-- ============================================
-- PASO 8: HACER booking_code UNIQUE
-- ============================================
-- ⚠️ Solo después de que todos tengan código

ALTER TABLE parking_bookings
ADD UNIQUE KEY unique_booking_code (booking_code);

SELECT '✅ Constraint UNIQUE añadida' AS status;

-- ============================================
-- PASO 9: VERIFICACIÓN FINAL
-- ============================================

-- Mostrar estructura actualizada
DESCRIBE parking_bookings;

-- Verificar que todos tienen código
SELECT 
    'Verificación' AS check_type,
    COUNT(*) AS total,
    SUM(CASE WHEN booking_code IS NULL THEN 1 ELSE 0 END) AS sin_codigo,
    SUM(CASE WHEN booking_code IS NOT NULL THEN 1 ELSE 0 END) AS con_codigo
FROM parking_bookings;

-- Verificar foreign keys
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
  AND TABLE_NAME = 'parking_bookings'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Verificar triggers
SELECT 
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    ACTION_TIMING
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'hotel_db'
  AND EVENT_OBJECT_TABLE = 'parking_bookings'
ORDER BY ACTION_TIMING, TRIGGER_NAME;

-- Verificar índices
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'hotel_db'
  AND TABLE_NAME = 'parking_bookings'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================
-- RESULTADO FINAL
-- ============================================
SELECT '========================================' AS separador;
SELECT '✅ ACTUALIZACIÓN COMPLETADA' AS resultado;
SELECT '========================================' AS separador;

-- Mostrar ejemplo de booking actualizado
SELECT 
    id,
    booking_code,
    spot_id,
    vehicle_id,
    operator_id,
    created_by,
    updated_by,
    status,
    created_at
FROM parking_bookings
ORDER BY created_at DESC
LIMIT 3;

SELECT COUNT(*) AS con_codigo
FROM parking_bookings
WHERE booking_code IS NOT NULL;
-- Resultado esperado: 20


SELECT 
    id,
    booking_code,
    DATE(created_at) AS fecha,
    status,
    CONCAT(
        'Planta ', 
        (SELECT level_code FROM parking_spots WHERE id = spot_id)
    ) AS ubicacion
FROM parking_bookings
ORDER BY created_at DESC;



----------- TESTING ANTES DE TOCAR CÓDIGO


-- Crear reserva de prueba AHORA (24 de octubre)
INSERT INTO parking_bookings (
    spot_id, 
    vehicle_id, 
    operator_id,
    expected_checkin, 
    expected_checkout,
    status,
    total_amount,
    created_by
) VALUES (
    1,  -- Plaza 1
    1,  -- Vehículo 1
    (SELECT id FROM users LIMIT 1),  -- Primer usuario
    '2025-10-25 14:00:00',  -- Mañana
    '2025-10-27 11:00:00',  -- Pasado mañana
    'reserved',
    27.00,
    (SELECT id FROM users LIMIT 1)
);

SELECT 
    id,
    booking_code,
    status,
    DATE(created_at) AS fecha_creacion,
    TIME(created_at) AS hora_creacion
FROM parking_bookings
ORDER BY id DESC
LIMIT 1;


-- Ahora SÍ debería devolver:**

-- id: 24
-- booking_code: PK-20251024-0001  ← HOY + contador 0001
-- fecha_creacion: 2025-10-24
-- hora_creacion: 19:46:xx