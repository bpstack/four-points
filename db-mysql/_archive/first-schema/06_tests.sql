
USE hotel_db;



-- 1. VERIFICACIÓN ESTRUCTURAL BÁSICA
-- 1.1 Verificar todas las tablas existentes
SELECT TABLE_NAME, TABLE_ROWS, TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'hotel_db'
ORDER BY TABLE_NAME;

-- 1.2 Verificar estructura de tablas críticas
SHOW COLUMNS FROM parking_reservations;
SHOW COLUMNS FROM parking_sessions;
SHOW COLUMNS FROM parking_spots;
SHOW COLUMNS FROM parking_vehicles;
SHOW COLUMNS FROM customers;


-- 2. VERIFICACIÓN DE RELACIONES Y FOREIGN KEYS

-- 2.1 Todas las constraints foreign key
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- 2.2 Verificar integridad referencial específica
SELECT 
    'parking_reservations → parking_spots' as relacion,
    COUNT(*) as total_reservas,
    SUM(CASE WHEN ps.id IS NULL THEN 1 ELSE 0 END) as spots_inexistentes
FROM parking_reservations r
LEFT JOIN parking_spots ps ON r.spot_id = ps.id;

SELECT 
    'parking_reservations → parking_vehicles' as relacion,
    COUNT(*) as total_reservas,
    SUM(CASE WHEN v.id IS NULL THEN 1 ELSE 0 END) as vehicles_inexistentes
FROM parking_reservations r
LEFT JOIN parking_vehicles v ON r.vehicle_id = v.id;

SELECT 
    'parking_vehicles → customers' as relacion,
    COUNT(*) as total_vehicles,
    SUM(CASE WHEN c.id IS NULL THEN 1 ELSE 0 END) as customers_inexistentes
FROM parking_vehicles v
LEFT JOIN customers c ON v.owner_id = c.id;

-- 3. VERIFICACIÓN DE DATOS CRÍTICOS

-- 3.1 Estado general del parking
SELECT 
    pl.level_code,
    COUNT(ps.id) as total_spots,
    COUNT(DISTINCT s.spot_id) as spots_ocupadas_sesiones,
    COUNT(DISTINCT r.spot_id) as spots_reservadas,
    COUNT(ps.id) - COUNT(DISTINCT s.spot_id) - COUNT(DISTINCT r.spot_id) as spots_libres
FROM parking_levels pl
LEFT JOIN parking_spots ps ON pl.id = ps.level_id
LEFT JOIN parking_sessions s ON s.spot_id = ps.id 
    AND s.status IN ('occupied', 'reserved')
    AND (s.check_out IS NULL OR s.check_out > NOW())
LEFT JOIN parking_reservations r ON r.spot_id = ps.id 
    AND r.status IN ('pending', 'reserved', 'occupied')
    AND CURDATE() BETWEEN DATE(r.expected_in) AND DATE(r.expected_out)
GROUP BY pl.level_code;

-- 3.2 Reservas por estado
SELECT 
    status,
    COUNT(*) as cantidad,
    MIN(expected_in) as entrada_mas_antigua,
    MAX(expected_in) as entrada_mas_reciente
FROM parking_reservations
GROUP BY status
ORDER BY cantidad DESC;

-- 3.3 Sesiones activas
SELECT 
    status,
    COUNT(*) as cantidad,
    AVG(TIMESTAMPDIFF(HOUR, check_in, COALESCE(check_out, NOW()))) as horas_promedio
FROM parking_sessions
WHERE status IN ('occupied', 'reserved')
GROUP BY status;

-- 4. VERIFICACIÓN DE CONSISTENCIA TEMPORAL

-- 4.1 Reservas con fechas inconsistentes
SELECT 
    id,
    expected_in,
    expected_out,
    DATEDIFF(expected_out, expected_in) as dias,
    status
FROM parking_reservations
WHERE expected_out < expected_in
   OR DATEDIFF(expected_out, expected_in) > 365
   OR DATEDIFF(expected_out, expected_in) < 0;

-- 4.2 Sesiones con check-out anterior a check-in
SELECT 
    id,
    spot_id,
    check_in,
    check_out,
    TIMESTAMPDIFF(HOUR, check_in, check_out) as horas,
    status
FROM parking_sessions
WHERE check_out IS NOT NULL AND check_out < check_in;

-- 4.3 Reservas sin sesión asociada cuando deberían tenerla
SELECT 
    r.id,
    r.status,
    r.expected_in,
    r.session_id
FROM parking_reservations r
WHERE r.status = 'occupied' AND r.session_id IS NULL;

-- 5. VERIFICACIÓN DE DISPONIBILIDAD

-- 5.1 Conflictos de disponibilidad
SELECT 
    s1.id as session1_id,
    s1.spot_id,
    s1.check_in as session1_in,
    s1.check_out as session1_out,
    s2.id as session2_id, 
    s2.check_in as session2_in,
    s2.check_out as session2_out
FROM parking_sessions s1
JOIN parking_sessions s2 ON s1.spot_id = s2.spot_id 
    AND s1.id < s2.id
    AND s1.status IN ('occupied', 'reserved')
    AND s2.status IN ('occupied', 'reserved')
    AND (
        (s1.check_in BETWEEN s2.check_in AND COALESCE(s2.check_out, '9999-12-31')) OR
        (COALESCE(s1.check_out, '9999-12-31') BETWEEN s2.check_in AND COALESCE(s2.check_out, '9999-12-31')) OR
        (s2.check_in BETWEEN s1.check_in AND COALESCE(s1.check_out, '9999-12-31'))
    )
LIMIT 10;

-- 5.2 Reservas que se solapan
SELECT 
    r1.id as reserva1_id,
    r1.spot_id,
    r1.expected_in as reserva1_in,
    r1.expected_out as reserva1_out,
    r2.id as reserva2_id,
    r2.expected_in as reserva2_in, 
    r2.expected_out as reserva2_out
FROM parking_reservations r1
JOIN parking_reservations r2 ON r1.spot_id = r2.spot_id 
    AND r1.id < r2.id
    AND r1.status IN ('pending', 'reserved', 'occupied')
    AND r2.status IN ('pending', 'reserved', 'occupied')
    AND (
        (r1.expected_in BETWEEN r2.expected_in AND r2.expected_out) OR
        (r1.expected_out BETWEEN r2.expected_in AND r2.expected_out) OR
        (r2.expected_in BETWEEN r1.expected_in AND r1.expected_out)
    );
    
    -- 6. VERIFICACIÓN DE DATOS MAESTROS
    
    -- 6.1 Usuarios y roles
SELECT 
    u.username,
    u.email,
    r.name as rol,
    COUNT(pr.id) as reservas_creadas,
    COUNT(ps.id) as sesiones_creadas
FROM users u
LEFT JOIN user_role ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN parking_reservations pr ON pr.operator_id = u.id
LEFT JOIN parking_sessions ps ON ps.operator_id = u.id
GROUP BY u.id, u.username, u.email, r.name;

-- 6.2 Vehículos y clientes
SELECT 
    c.full_name,
    c.phone,
    COUNT(v.id) as total_vehicles,
    GROUP_CONCAT(v.licence_plate) as matriculas
FROM customers c
LEFT JOIN parking_vehicles v ON c.id = v.owner_id
GROUP BY c.id, c.full_name, c.phone
HAVING COUNT(v.id) = 0 OR COUNT(DISTINCT v.licence_plate) != COUNT(v.id);

-- 6.3 Agencias y reservas externas
SELECT 
    a.name as agencia,
    COUNT(r.id) as total_reservas,
    COUNT(DISTINCT r.external_booking_id) as booking_ids_unicos,
    MIN(r.expected_in) as reserva_mas_antigua,
    MAX(r.expected_in) as reserva_mas_reciente
FROM agencies a
LEFT JOIN parking_reservations r ON a.id = r.agency_id
GROUP BY a.id, a.name;

-- 7. VERIFICACIÓN DE ÍNDICES Y RENDIMIENTO

-- 7.1 Índices existentes
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'hotel_db'
AND TABLE_NAME IN ('parking_reservations', 'parking_sessions', 'parking_spots', 'parking_vehicles')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 7.2 Consultas que podrían beneficiarse de índices
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'hotel_db'
AND TABLE_NAME IN ('parking_reservations', 'parking_sessions')
AND COLUMN_NAME IN ('status', 'check_in', 'check_out', 'expected_in', 'expected_out')
AND (IS_NULLABLE = 'YES' OR DATA_TYPE IN ('datetime', 'timestamp'));

-- 8. REPORTE FINAL DE SALUD DEL SISTEMA
-- 8.1 Resumen ejecutivo
SELECT 
    'Tablas' as categoria,
    COUNT(*) as valor,
    'Total de tablas en el sistema' as descripcion
FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'hotel_db'
UNION ALL
SELECT 
    'Reservas activas',
    COUNT(*),
    'Reservas pending/reserved/occupied'
FROM parking_reservations WHERE status IN ('pending', 'reserved', 'occupied')
UNION ALL
SELECT 
    'Sesiones activas', 
    COUNT(*),
    'Sesiones occupied/reserved'
FROM parking_sessions WHERE status IN ('occupied', 'reserved')
UNION ALL
SELECT 
    'Plazas totales',
    COUNT(*),
    'Total de plazas de parking'
FROM parking_spots
UNION ALL
SELECT 
    'Clientes registrados',
    COUNT(*),
    'Clientes en el sistema'
FROM customers
UNION ALL
SELECT 
    'Vehículos registrados',
    COUNT(*),
    'Vehículos en el sistema'
FROM parking_vehicles;

# Para ejecutar el test:
# Abrimos terminal
# cd "E:\Programming\03_Utils\database\hotel_db\creating scripts for DB"
# Get-Content 06_tests.sql | mysql -u dz -p hotel_db

SELECT status, COUNT(*) FROM parking_sessions GROUP BY status;

-- Verificar estado final
SELECT 
    'Sesiones activas:' as Estado,
    COUNT(*) as Cantidad 
FROM parking_sessions 
WHERE status = 'occupied'

UNION ALL

SELECT 
    'Reservas occupied con session_id',
    COUNT(*)
FROM parking_reservations 
WHERE status = 'occupied' AND session_id IS NOT NULL;


-- PROBLEMAS QUE TENDREMOS DE RESERVAS CORRUPTAS 
-- Buscar reservas corruptas


-- 🧠 EN RESUMEN:
-- Check-in: Convierte reserva 'pending' → sesión 'occupied'

-- Check-out: Cambia sesión 'occupied' → 'completed'


DESCRIBE parking_reservations;
SELECT *
FROM parking_reservations
WHERE status IN ('pending', 'reserved', 'occupied');