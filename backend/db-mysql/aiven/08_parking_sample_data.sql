-- =============================================================================
-- ⚠️  FROZEN 2026-05-20 — DO NOT EDIT
-- =============================================================================
-- This file is part of the install base snapshot. All schema changes since
-- 2026-05-20 live in `scripts/AAAAMMDD_*.sql`. Editing this file breaks the
-- single-source-of-truth invariant. See MIGRATIONS_POLICY.md.
-- =============================================================================

-- =========================================================
-- 08_parking_sample_data.sql (AIVEN - OPCIONAL)
-- Datos de ejemplo: vehículos y reservas de prueba
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- ⚠️ Solo ejecutar en ambientes de desarrollo/testing
-- =========================================================
USE hotel_db;

-- ============================================
-- 50 VEHÍCULOS DE EJEMPLO
-- ============================================

INSERT INTO parking_vehicles (plate_number, owner_name, model) VALUES
('1234ABC', 'Juan García', 'Seat Ibiza'),
('5678DEF', 'María López', 'Renault Clio'),
('9012GHI', 'Pedro Martínez', 'Ford Focus'),
('3456JKL', 'Ana Sánchez', 'Volkswagen Golf'),
('7890MNO', 'Carlos Ruiz', 'Toyota Corolla'),
('2345PQR', 'Laura Fernández', 'Peugeot 308'),
('6789STU', 'Miguel Torres', 'Opel Astra'),
('0123VWX', 'Elena Romero', 'Nissan Qashqai'),
('4567YZA', 'David Jiménez', 'Hyundai i30'),
('8901BCD', 'Sara Moreno', 'Mazda 3'),
('1357EFG', 'Jorge Navarro', 'Seat Leon'),
('2468HIJ', 'Carmen Díaz', 'Renault Megane'),
('3579KLM', 'Antonio Gil', 'Ford Fiesta'),
('4680NOP', 'Isabel Vargas', 'Volkswagen Polo'),
('5791QRS', 'Manuel Castro', 'Toyota Yaris'),
('6802TUV', 'Pilar Ortiz', 'Peugeot 208'),
('7913WXY', 'Francisco Rubio', 'Opel Corsa'),
('8024ZAB', 'Rosa Serrano', 'Nissan Micra'),
('9135CDE', 'Luis Blanco', 'Hyundai Tucson'),
('0246FGH', 'Teresa Suárez', 'Mazda CX-5'),
('1470IJK', 'Javier Vega', 'BMW Serie 3'),
('2581LMN', 'Patricia Mendoza', 'Audi A4'),
('3692OPQ', 'Alberto Campos', 'Mercedes Clase C'),
('4703RST', 'Cristina Iglesias', 'Volvo XC60'),
('5814UVW', 'Raúl Crespo', 'Lexus IS'),
('6925XYZ', 'Marta Fuentes', 'Jaguar XE'),
('7036ABC', 'Sergio Pascual', 'Alfa Romeo Giulia'),
('8147DEF', 'Beatriz Santana', 'Porsche Macan'),
('9258GHI', 'Óscar Domínguez', 'Land Rover Discovery'),
('0369JKL', 'Lucía Ramos', 'Range Rover Evoque'),
('1480MNO', 'Andrés Herrera', 'Kia Sportage'),
('2591PQR', 'Silvia Aguilar', 'Mazda CX-3'),
('3602STU', 'Pablo Cortés', 'Suzuki Vitara'),
('4713VWX', 'Lucía Gallego', 'Mitsubishi ASX'),
('5824YZA', 'Iván Méndez', 'Jeep Compass'),
('6935BCD', 'Verónica Prieto', 'Fiat 500X'),
('7046EFG', 'Adrián Peña', 'Mini Cooper'),
('8157HIJ', 'Rocío Lozano', 'Smart ForFour'),
('9268KLM', 'Marcos Sanz', 'Citroën C3'),
('0379NOP', 'Natalia Cabrera', 'DS 3 Crossback'),
('1490QRS', 'Rubén Marín', 'Dacia Duster'),
('2501TUV', 'Gloria Ferrer', 'Skoda Octavia'),
('3612WXY', 'Héctor Caballero', 'Seat Ateca'),
('4723ZAB', 'Mónica León', 'Renault Captur'),
('5834CDE', 'Víctor Parra', 'Ford Kuga'),
('6945FGH', 'Amparo Vidal', 'Volkswagen Tiguan'),
('7056IJK', 'Emilio Santos', 'Toyota RAV4'),
('8167LMN', 'Dolores Molina', 'Peugeot 3008'),
('9278OPQ', 'César Bravo', 'Opel Crossland'),
('0389RST', 'Concepción Soler', 'Nissan Juke');

SELECT CONCAT('Insertados ', COUNT(*), ' vehículos de ejemplo') AS resultado
FROM parking_vehicles;

-- ============================================
-- RESERVAS DE EJEMPLO
-- ⚠️ Requiere que exista al menos un usuario
-- ============================================

-- Obtener un usuario válido
SET @user_id = (SELECT id FROM users LIMIT 1);

-- Verificar que existe un usuario
SELECT 
    CASE 
        WHEN @user_id IS NULL THEN 'ERROR: No hay usuarios. Crea un usuario primero.'
        ELSE CONCAT('Usuario encontrado: ', @user_id)
    END AS verificacion;

-- RESERVAS ACTIVAS (checked_in)
INSERT INTO parking_bookings (
    spot_id, vehicle_id, operator_id, created_by,
    expected_checkin, expected_checkout,
    actual_checkin, status,
    total_amount, payment_amount, payment_method,
    payment_reference, payment_date, booking_source
) VALUES
(1, 1, @user_id, @user_id, CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 2 DAY, CURDATE() - INTERVAL 2 DAY, 'checked_in', 51.00, 51.00, 'card', 'TXN-001', CURDATE() - INTERVAL 2 DAY, 'direct'),
(3, 2, @user_id, @user_id, CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 1 DAY, CURDATE() - INTERVAL 1 DAY, 'checked_in', 27.00, 27.00, 'cash', NULL, CURDATE() - INTERVAL 1 DAY, 'direct'),
(5, 3, @user_id, @user_id, CURDATE() - INTERVAL 3 DAY, CURDATE() + INTERVAL 3 DAY, CURDATE() - INTERVAL 3 DAY, 'checked_in', 75.00, 75.00, 'card', 'TXN-002', CURDATE() - INTERVAL 3 DAY, 'booking_com'),
(8, 4, @user_id, @user_id, CURDATE(), CURDATE() + INTERVAL 4 DAY, CURDATE(), 'checked_in', 51.00, 51.00, 'transfer', 'TRANS-001', CURDATE(), 'booking_com');

-- RESERVAS FUTURAS (reserved)
INSERT INTO parking_bookings (
    spot_id, vehicle_id, operator_id, created_by,
    expected_checkin, expected_checkout,
    status, total_amount, payment_amount, payment_method,
    payment_reference, payment_date, booking_source
) VALUES
(2, 5, @user_id, @user_id, CURDATE() + INTERVAL 1 DAY, CURDATE() + INTERVAL 4 DAY, 'reserved', 39.00, 39.00, 'transfer', 'TRANS-003', CURDATE(), 'booking_com'),
(4, 6, @user_id, @user_id, CURDATE() + INTERVAL 1 DAY, CURDATE() + INTERVAL 8 DAY, 'reserved', 84.00, NULL, NULL, NULL, NULL, 'agency_other'),
(6, 7, @user_id, @user_id, CURDATE() + INTERVAL 2 DAY, CURDATE() + INTERVAL 5 DAY, 'reserved', 39.00, 39.00, 'card', 'TXN-006', CURDATE(), 'direct'),
(7, 8, @user_id, @user_id, CURDATE() + INTERVAL 3 DAY, CURDATE() + INTERVAL 7 DAY, 'reserved', 51.00, 51.00, 'card', 'TXN-007', CURDATE(), 'expedia'),
(9, 9, @user_id, @user_id, CURDATE() + INTERVAL 3 DAY, CURDATE() + INTERVAL 6 DAY, 'reserved', 39.00, NULL, NULL, NULL, NULL, 'direct'),
(10, 10, @user_id, @user_id, CURDATE() + INTERVAL 2 DAY, CURDATE() + INTERVAL 4 DAY, 'reserved', 27.00, 27.00, 'card', 'TXN-008', CURDATE(), 'direct');

SELECT CONCAT('Insertadas ', COUNT(*), ' reservas de ejemplo') AS resultado
FROM parking_bookings;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT '========================================' AS separador;
SELECT 'DATOS DE EJEMPLO INSERTADOS (Aiven)' AS resultado;
SELECT '========================================' AS separador;

-- Resumen
SELECT 'Vehículos' AS componente, COUNT(*) AS total FROM parking_vehicles
UNION ALL
SELECT 'Reservas', COUNT(*) FROM parking_bookings;

-- Resumen reservas por estado
SELECT 
    status AS estado,
    COUNT(*) AS cantidad,
    CONCAT('EUR ', FORMAT(SUM(total_amount), 2)) AS ingresos
FROM parking_bookings
GROUP BY status;

SELECT '========================================' AS separador;
SELECT 'Base de datos lista para pruebas (Aiven)' AS mensaje;
SELECT '========================================' AS separador;
