SET SQL_SAFE_UPDATES = 0;

-- Borrar reservas específicas que causan conflicto
DELETE FROM parking_reservations WHERE id IN (8, 10);

-- Ahora crear las nuevas reservas
INSERT INTO parking_reservations (
  spot_id, 
  vehicle_id, 
  operator_id, 
  agency_id,
  external_booking_id,
  expected_in, 
  expected_out, 
  status
) VALUES
(5, 9, (SELECT id FROM users LIMIT 1), 1, 'BK-2025-001', 
 CONCAT(CURDATE(), ' 10:00:00'), 
 CONCAT(DATE_ADD(CURDATE(), INTERVAL 3 DAY), ' 15:00:00'), 
 'pending'),

(1, 10, (SELECT id FROM users LIMIT 1), 2, 'AB-2025-045',
 CONCAT(CURDATE(), ' 11:30:00'), 
 CONCAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), ' 15:00:00'), 
 'pending'),

(3, 11, (SELECT id FROM users LIMIT 1), NULL, NULL,
 CONCAT(CURDATE(), ' 14:00:00'), 
 CONCAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), ' 15:00:00'), 
 'pending'),

(4, 12, (SELECT id FROM users LIMIT 1), 3, 'EX-2025-789',
 CONCAT(CURDATE(), ' 16:00:00'), 
 CONCAT(DATE_ADD(CURDATE(), INTERVAL 2 DAY), ' 15:00:00'), 
 'pending');

-- Sesión ocupada en plaza 6
INSERT INTO parking_sessions (
  spot_id, 
  vehicle_id, 
  operator_id,
  check_in, 
  check_out, 
  status
) VALUES
(6, 9, (SELECT id FROM users LIMIT 1),
 CONCAT(CURDATE(), ' 09:00:00'),
 CONCAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), ' 15:00:00'),
 'occupied');

-- Reserva con conflicto en plaza 6
INSERT INTO parking_reservations (
  spot_id, 
  vehicle_id, 
  operator_id, 
  expected_in, 
  expected_out, 
  status
) VALUES
(6, 10, (SELECT id FROM users LIMIT 1),
 CONCAT(CURDATE(), ' 12:00:00'), 
 CONCAT(DATE_ADD(CURDATE(), INTERVAL 4 DAY), ' 15:00:00'), 
 'pending');

SET SQL_SAFE_UPDATES = 1;

-- Verificar resultado
SELECT r.id, ps.spot_number, pl.level_code, v.licence_plate, r.expected_in, r.status
FROM parking_reservations r
JOIN parking_spots ps ON r.spot_id = ps.id
JOIN parking_levels pl ON ps.level_id = pl.id
JOIN parking_vehicles v ON r.vehicle_id = v.id
WHERE r.status = 'pending' AND DATE(r.expected_in) = CURDATE();

-- Ver check-ins pendientes para hoy
SELECT 
  r.id,
  ps.spot_number,
  pl.level_code,
  c.full_name as customer_name,
  v.vehicle_type,
  v.licence_plate,
  r.expected_in,
  r.expected_out,
  DATEDIFF(DATE(r.expected_out), DATE(r.expected_in)) as days,
  ag.name as agency_name,
  -- Verificar si está ocupada
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM parking_sessions s 
      WHERE s.spot_id = r.spot_id 
        AND s.status IN ('reserved', 'occupied')
        AND s.check_in <= NOW()
        AND IFNULL(s.check_out, '9999-12-31 23:59:59') >= NOW()
    ) THEN 'OCUPADA ⚠️'
    ELSE 'DISPONIBLE ✅'
  END as estado_plaza
FROM parking_reservations r
JOIN parking_spots ps ON r.spot_id = ps.id
JOIN parking_levels pl ON ps.level_id = pl.id
JOIN parking_vehicles v ON r.vehicle_id = v.id
JOIN customers c ON v.owner_id = c.id
LEFT JOIN agencies ag ON r.agency_id = ag.id
WHERE r.status = 'pending' 
  AND DATE(r.expected_in) = CURDATE()
ORDER BY r.expected_in;


-- 4. Crear clientes de prueba
INSERT INTO customers (full_name, phone, email) VALUES
('Juan Pérez García', '+34612345678', 'juan.perez@email.com'),
('María González López', '+34698765432', 'maria.gonzalez@email.com'),
('Carlos Martínez Ruiz', '+34645123789', 'carlos.martinez@email.com'),
('Ana Rodríguez Sanz', '+34677889900', 'ana.rodriguez@email.com');

-- 5. Crear vehículos
INSERT INTO parking_vehicles (licence_plate, vehicle_type, owner_id) VALUES
('1234ABC', 'Toyota Corolla', 1),
('5678DEF', 'BMW X5', 2),
('9012GHI', 'Mercedes C200', 3),
('3456JKL', 'Audi A4', 4);