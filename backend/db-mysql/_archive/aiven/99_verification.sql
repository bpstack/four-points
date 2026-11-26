-- =============================================================================
-- ⚠️  FROZEN 2026-05-20 — DO NOT EDIT
-- =============================================================================
-- This file is part of the install base snapshot. All schema changes since
-- 2026-05-20 live in `scripts/AAAAMMDD_*.sql`. Editing this file breaks the
-- single-source-of-truth invariant. See MIGRATIONS_POLICY.md.
-- =============================================================================

-- =========================================================
-- 99_verification.sql
-- Script de verificación completa del sistema
-- =========================================================
USE hotel_db;

SELECT '========================================' AS separador;
SELECT '🔍 VERIFICACIÓN DEL SISTEMA' AS titulo;
SELECT '========================================' AS separador;

-- ============================================
-- 1. TABLAS
-- ============================================
SELECT 'TABLAS' AS componente;

SELECT 
    TABLE_NAME AS tabla,
    TABLE_ROWS AS filas_aprox,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS tamano_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hotel_db'
ORDER BY TABLE_NAME;

-- ============================================
-- 2. FUNCIONES
-- ============================================
SELECT '' AS separador;
SELECT 'FUNCIONES' AS componente;

SELECT 
    ROUTINE_NAME AS funcion,
    ROUTINE_TYPE AS tipo
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db' 
AND ROUTINE_TYPE = 'FUNCTION';

-- ============================================
-- 3. PROCEDIMIENTOS
-- ============================================
SELECT '' AS separador;
SELECT 'PROCEDIMIENTOS' AS componente;

SELECT 
    ROUTINE_NAME AS procedimiento,
    ROUTINE_TYPE AS tipo
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db' 
AND ROUTINE_TYPE = 'PROCEDURE';

-- ============================================
-- 4. TRIGGERS
-- ============================================
SELECT '' AS separador;
SELECT 'TRIGGERS' AS componente;

SELECT 
    TRIGGER_NAME AS trigger_nombre,
    EVENT_MANIPULATION AS evento,
    EVENT_OBJECT_TABLE AS tabla,
    ACTION_TIMING AS momento
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'hotel_db'
ORDER BY EVENT_OBJECT_TABLE, ACTION_TIMING;

-- ============================================
-- 5. FOREIGN KEYS
-- ============================================
SELECT '' AS separador;
SELECT 'FOREIGN KEYS' AS componente;

SELECT 
    TABLE_NAME AS tabla,
    CONSTRAINT_NAME AS fk_nombre,
    COLUMN_NAME AS columna,
    REFERENCED_TABLE_NAME AS tabla_referenciada,
    REFERENCED_COLUMN_NAME AS columna_referenciada
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- ============================================
-- 6. DATOS PARKING
-- ============================================
SELECT '' AS separador;
SELECT 'DATOS PARKING' AS componente;

SELECT 'Plazas de parking' AS dato, COUNT(*) AS total FROM parking_spots
UNION ALL
SELECT 'Tarifas configuradas', COUNT(*) FROM parking_rates
UNION ALL
SELECT 'Vehículos registrados', COUNT(*) FROM parking_vehicles
UNION ALL
SELECT 'Reservas totales', COUNT(*) FROM parking_bookings
UNION ALL
SELECT 'Disponibilidad (registros)', COUNT(*) FROM parking_availability
UNION ALL
SELECT 'Reservas activas (checked_in)', COUNT(*) FROM parking_bookings WHERE status = 'checked_in'
UNION ALL
SELECT 'Reservas pendientes (reserved)', COUNT(*) FROM parking_bookings WHERE status = 'reserved'
UNION ALL
SELECT 'Reservas completadas', COUNT(*) FROM parking_bookings WHERE status = 'completed';

-- ============================================
-- 7. OCUPACIÓN HOY
-- ============================================
SELECT '' AS separador;
SELECT 'OCUPACIÓN HOY' AS componente;

SELECT 
    COUNT(CASE WHEN is_available = TRUE THEN 1 END) AS plazas_disponibles,
    COUNT(CASE WHEN is_available = FALSE THEN 1 END) AS plazas_ocupadas,
    COUNT(*) AS total_plazas,
    CONCAT(ROUND(COUNT(CASE WHEN is_available = FALSE THEN 1 END) * 100.0 / COUNT(*), 2), '%') AS porcentaje_ocupacion
FROM parking_availability
WHERE date = CURDATE();

-- ============================================
-- 8. INTEGRIDAD
-- ============================================
SELECT '' AS separador;
SELECT 'INTEGRIDAD DE DATOS' AS componente;

-- Verificar bookings sin booking_code
SELECT 
    'Bookings sin código' AS verificacion,
    COUNT(*) AS total
FROM parking_bookings
WHERE booking_code IS NULL
UNION ALL

-- Verificar plazas inactivas
SELECT 
    'Plazas inactivas' AS verificacion,
    COUNT(*) AS total
FROM parking_spots
WHERE is_active = 0
UNION ALL

-- Verificar disponibilidad sin plaza
SELECT 
    'Disponibilidad huérfana' AS verificacion,
    COUNT(*) AS total
FROM parking_availability pa
LEFT JOIN parking_spots ps ON pa.spot_id = ps.id
WHERE ps.id IS NULL
UNION ALL

-- Verificar reservas con fechas inconsistentes
SELECT 
    'Reservas con fechas incorrectas' AS verificacion,
    COUNT(*) AS total
FROM parking_bookings
WHERE expected_checkin >= expected_checkout;

-- ============================================
-- 9. ÚLTIMAS RESERVAS
-- ============================================
SELECT '' AS separador;
SELECT 'ÚLTIMAS 5 RESERVAS' AS componente;

SELECT 
    id,
    booking_code,
    spot_id,
    status,
    expected_checkin,
    expected_checkout,
    created_at
FROM parking_bookings
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- RESULTADO FINAL
-- ============================================
SELECT '========================================' AS separador;
SELECT '✅ VERIFICACIÓN COMPLETADA' AS resultado;
SELECT '========================================' AS separador;
