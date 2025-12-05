DESCRIBE parking_reservations;
DESCRIBE parking_spots;
DESCRIBE parking_levels;

SET SQL_SAFE_UPDATES = 0;

-- 1. LIMPIAR TABLAS EN ORDEN
DELETE FROM parking_sessions;
DELETE FROM parking_reservations;
DELETE FROM parking_vehicles;
DELETE FROM customers;

-- 2. REINICIAR AUTO-INCREMENTOS
ALTER TABLE parking_sessions AUTO_INCREMENT = 1;
ALTER TABLE parking_reservations AUTO_INCREMENT = 1;
ALTER TABLE parking_vehicles AUTO_INCREMENT = 1;
ALTER TABLE customers AUTO_INCREMENT = 1;

-- 3. INSERTAR CUSTOMERS
INSERT INTO customers (full_name, phone, email, operator_id) VALUES
('Juan Pérez', '+34123456789', 'juan@email.com', '1326f291-b0e2-4b42-9d0a-76e55cf5731f'),
('María García', '+34987654321', 'maria@email.com', 'd243f152-af14-4a7e-9fef-f147b4092e07'),
('Carlos López', '+34111222333', 'carlos@email.com', '1326f291-b0e2-4b42-9d0a-76e55cf5731f'),
('Ana Rodríguez', '+34444555666', 'ana@email.com', '0b50d7a1-3171-4bda-af48-f92ac40d7077'),
('David Martínez', '+34777888999', 'david@email.com', '40681b81-4c97-42e5-9e02-10e6018ce0d7'),
('Laura Fernández', '+34111111111', 'laura@email.com', '922a8962-7893-4716-99f7-4f576db9e508'),
('Pedro Sánchez', '+34222222222', 'pedro@email.com', '0366dafe-c2f6-43c0-9f1d-500f5fc3dd55');

-- 4. INSERTAR VEHÍCULOS
INSERT INTO parking_vehicles (licence_plate, vehicle_type, owner_id, operator_id) VALUES
('1234ABC', 'BMW X5', 1, '1326f291-b0e2-4b42-9d0a-76e55cf5731f'),
('5678DEF', 'AUDI A4', 2, 'd243f152-af14-4a7e-9fef-f147b4092e07'),
('9012GHI', 'MERCEDES C', 3, '1326f291-b0e2-4b42-9d0a-76e55cf5731f'),
('3456JKL', 'VOLKSWAGEN GOLF', 4, '0b50d7a1-3171-4bda-af48-f92ac40d7077'),
('7890MNO', 'SEAT LEON', 5, '40681b81-4c97-42e5-9e02-10e6018ce0d7'),
('1111PPP', 'RENAULT CLIO', 6, '922a8962-7893-4716-99f7-4f576db9e508'),
('2222RRR', 'FORD FOCUS', 7, '0366dafe-c2f6-43c0-9f1d-500f5fc3dd55'),
('3333SSS', 'OPEL CORSA', 1, '1326f291-b0e2-4b42-9d0a-76e55cf5731f'),
('4444TTT', 'TOYOTA COROLLA', 2, 'd243f152-af14-4a7e-9fef-f147b4092e07');

-- 5. INSERTAR RESERVAS CON IDs REALES DE SPOTS
INSERT INTO parking_reservations (spot_id, vehicle_id, operator_id, agency_id, external_booking_id, expected_in, expected_out, status) VALUES
-- PLANTA P-2 (IDs 1-10) - HOY - CON AGENCIA
(1, 1, '1326f291-b0e2-4b42-9d0a-76e55cf5731f', 1, 'BK-2025-001', NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 4 HOUR, 'occupied'),
(2, 2, 'd243f152-af14-4a7e-9fef-f147b4092e07', 2, 'BK-2025-002', NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 5 HOUR, 'occupied'),
(3, 3, '1326f291-b0e2-4b42-9d0a-76e55cf5731f', 3, 'BK-2025-003', NOW() + INTERVAL 1 HOUR, NOW() + INTERVAL 6 HOUR, 'pending'),
(4, 4, '0b50d7a1-3171-4bda-af48-f92ac40d7077', 1, 'BK-2025-004', NOW() + INTERVAL 3 HOUR, NOW() + INTERVAL 8 HOUR, 'pending'),

-- PLANTA P-2 (IDs 1-10) - FUTURO
(5, 5, '40681b81-4c97-42e5-9e02-10e6018ce0d7', 2, 'BK-2025-005', NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 5 DAY, 'reserved'),
(6, 6, '922a8962-7893-4716-99f7-4f576db9e508', 3, 'BK-2025-006', NOW() + INTERVAL 2 DAY, NOW() + INTERVAL 7 DAY, 'reserved'),

-- PLANTA P-3 (IDs 16-25) - FUTURO
(16, 7, '0366dafe-c2f6-43c0-9f1d-500f5fc3dd55', NULL, NULL, NOW() + INTERVAL 3 DAY, NOW() + INTERVAL 5 DAY, 'reserved'),
(17, 8, '1326f291-b0e2-4b42-9d0a-76e55cf5731f', NULL, NULL, NOW() + INTERVAL 5 DAY, NOW() + INTERVAL 10 DAY, 'reserved'),

-- MEZCLA
(7, 9, 'd243f152-af14-4a7e-9fef-f147b4092e07', 1, 'BK-2025-008', NOW() + INTERVAL 7 DAY, NOW() + INTERVAL 14 DAY, 'pending'),
(18, 1, '1326f291-b0e2-4b42-9d0a-76e55cf5731f', NULL, NULL, NOW() + INTERVAL 10 DAY, NOW() + INTERVAL 12 DAY, 'reserved'),

-- EXTRAS
(8, 2, 'd243f152-af14-4a7e-9fef-f147b4092e07', 2, 'BK-2025-009', NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 2 DAY, 'pending'),
(19, 4, '0b50d7a1-3171-4bda-af48-f92ac40d7077', NULL, 'BK-2025-010', NOW() + INTERVAL 4 DAY, NOW() + INTERVAL 6 DAY, 'reserved');

-- 6. INSERTAR SESIONES
INSERT INTO parking_sessions (spot_id, vehicle_id, operator_id, check_in, status) VALUES
(1, 1, '1326f291-b0e2-4b42-9d0a-76e55cf5731f', NOW() - INTERVAL 2 HOUR, 'occupied'),
(2, 2, 'd243f152-af14-4a7e-9fef-f147b4092e07', NOW() - INTERVAL 1 HOUR, 'occupied');

-- 7. ACTUALIZAR reservas occupied con sus session_ids
UPDATE parking_reservations 
SET session_id = 1 
WHERE id = 1;

UPDATE parking_reservations 
SET session_id = 2 
WHERE id = 2;


SET SQL_SAFE_UPDATES = 1;

-- 1. Verificar Customers:
-- sql
SELECT id, full_name, operator_id FROM customers;
-- Debes ver: 7 clientes con nombres y operator_ids válidos

-- 2. Verificar Vehículos:
-- sql
SELECT v.id, v.licence_plate, v.vehicle_type, c.full_name as owner 
FROM parking_vehicles v 
LEFT JOIN customers c ON v.owner_id = c.id;
-- Debes ver: 9 vehículos con dueños asignados

-- 3. Verificar Reservas:
-- sql
SELECT 
  r.id,
  r.spot_id,
  r.status,
  r.expected_in,
  r.expected_out,
  v.licence_plate,
  c.full_name as customer,
  u.username as operator,
  a.name as agency
FROM parking_reservations r
LEFT JOIN parking_vehicles v ON r.vehicle_id = v.id
LEFT JOIN customers c ON v.owner_id = c.id
LEFT JOIN users u ON r.operator_id = u.id
LEFT JOIN agencies a ON r.agency_id = a.id
ORDER BY r.expected_in;
-- Debes ver: 10 reservas con estados variados y fechas coherentes

-- 4. Verificar Sesiones Activas:
-- sql
SELECT 
  s.id,
  s.spot_id,
  s.check_in,
  s.status,
  v.licence_plate,
  c.full_name as customer,
  r.id as reservation_id
FROM parking_sessions s
LEFT JOIN parking_vehicles v ON s.vehicle_id = v.id
LEFT JOIN customers c ON v.owner_id = c.id
LEFT JOIN parking_reservations r ON s.id = r.session_id
WHERE s.status = 'occupied';
-- Debes ver: 2 sesiones activas asociadas a reservas

-- 5. Verificar Consistencia:
-- sql
-- Reservas que deberían ser "occupied" pero no tienen sesión
SELECT r.id, r.expected_in, r.status 
FROM parking_reservations r 
WHERE r.status = 'occupied' 
AND r.session_id IS NULL;

-- Sesiones sin reserva asociada
SELECT s.id, s.spot_id, s.check_in
FROM parking_sessions s
LEFT JOIN parking_reservations r ON s.id = r.session_id
WHERE r.id IS NULL;

-- Ver todos los spots disponibles
SELECT id, spot_number, level_id 
FROM parking_spots 
ORDER BY level_id, spot_number;

--  Ver todas las reservas con su información completa
SELECT 
  r.id,
  r.spot_id,
  s.spot_number,
  l.level_code,
  r.status,
  r.expected_in,
  r.expected_out,
  v.licence_plate,
  c.full_name as customer,
  a.name as agency,
  r.session_id
FROM parking_reservations r
LEFT JOIN parking_spots s ON r.spot_id = s.id
LEFT JOIN parking_levels l ON s.level_id = l.id
LEFT JOIN parking_vehicles v ON r.vehicle_id = v.id
LEFT JOIN customers c ON v.owner_id = c.id
LEFT JOIN agencies a ON r.agency_id = a.id
ORDER BY r.expected_in;

-- Verificar distribución por planta
SELECT 
  l.level_code,
  COUNT(*) as total_reservas,
  SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) as ocupadas,
  SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pendientes,
  SUM(CASE WHEN r.status = 'reserved' THEN 1 ELSE 0 END) as reservadas
FROM parking_reservations r
LEFT JOIN parking_spots s ON r.spot_id = s.id
LEFT JOIN parking_levels l ON s.level_id = l.id
GROUP BY l.level_code;

-- 1. Ver TODAS las agencias registradas
SELECT id, name, created_at 
FROM agencies 
ORDER BY id;

-- Ver vehículos disponibles para reservas
SELECT v.id, v.licence_plate, c.full_name as owner
FROM parking_vehicles v
LEFT JOIN customers c ON v.owner_id = c.id;

-- 1. Ver todos los vehículos
SELECT * FROM parking_vehicles;

-- 2. Contar cuántos vehículos tienes
SELECT COUNT(*) as total_vehicles FROM parking_vehicles;

-- 3. Ver vehículos con información del cliente
SELECT 
  v.id,
  v.licence_plate,
  v.vehicle_type,
  v.brand,
  v.model,
  v.color,
  c.full_name as owner_name
FROM parking_vehicles v
LEFT JOIN customers c ON v.owner_id = c.id;

SELECT * FROM customers;
SELECT * FROM parking_vehicles;