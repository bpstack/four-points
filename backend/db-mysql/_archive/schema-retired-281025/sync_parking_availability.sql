--  Mantener usando parking_availability pero asegurar sincronización
-- Crear un procedimiento que sincronice diariamente:

DELIMITER $$

DROP PROCEDURE IF EXISTS sync_parking_availability$$

CREATE PROCEDURE sync_parking_availability()
BEGIN
    DECLARE affected_rows INT DEFAULT 0;
    DECLARE start_time TIMESTAMP DEFAULT NOW();
    
    -- Iniciar transacción para consistencia
    START TRANSACTION;
    
    -- Paso 1: Resetear disponibilidades futuras
    UPDATE parking_availability 
    SET is_available = 1, booking_id = NULL
    WHERE date >= CURDATE();
    
    SET affected_rows = ROW_COUNT();
    
    -- Paso 2: Marcar plazas ocupadas
    UPDATE parking_availability pa
    JOIN parking_bookings pb ON pa.spot_id = pb.spot_id
        AND pa.date >= DATE(pb.expected_checkin)
        AND pa.date < DATE(pb.expected_checkout)
        AND pb.status IN ('reserved', 'checked_in')
    SET pa.is_available = 0, pa.booking_id = pb.id;
    
    SET affected_rows = affected_rows + ROW_COUNT();
    
    -- Confirmar cambios
    COMMIT;
    
    -- Opcional: Registrar en log
    INSERT INTO system_logs (action, details, created_at)
    VALUES (
        'PARKING_SYNC',
        CONCAT('Sincronización completada. Registros afectados: ', affected_rows, 
            '. Tiempo: ', TIMESTAMPDIFF(MICROSECOND, start_time, NOW()), 'μs'),
        NOW()
    );
    
    -- Retornar resultado
    SELECT 
        affected_rows AS registros_actualizados,
        TIMESTAMPDIFF(MICROSECOND, start_time, NOW()) AS tiempo_microsegundos,
        'Sincronización completada' AS mensaje;
END$$

DELIMITER ;


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