-- =========================================================
-- MOCK DATA SQL - Four Points Hotel PMS
-- =========================================================
-- Descripción: Script para limpiar BD y cargar datos de demo
-- PRESERVA: Usuario demo (demo-user-0000-0000-000000000001)
-- PRESERVA: Roles, departamentos, métodos de pago, 
--           parking_spots, parking_rates, bo_categories
-- =========================================================

USE hotel_db;

-- =========================================================
-- CONFIGURACIÓN INICIAL
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

SELECT '========================================' AS mensaje;
SELECT '🧹 LIMPIANDO BASE DE DATOS...' AS mensaje;
SELECT '========================================' AS mensaje;

-- =========================================================
-- PASO 1: DELETE DE TODAS LAS TABLAS (orden FK correcto)
-- Preservamos: roles, departments, parking_spots, 
--              parking_rates, payment_methods, bo_categories
-- =========================================================

-- Mensajería y Notificaciones x
DELETE FROM messages; 
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM notification_recipients;
DELETE FROM notifications;

-- Backoffice x
DELETE FROM bo_invoice_history;
DELETE FROM bo_invoices;
DELETE FROM bo_suppliers;
DELETE FROM bo_assets;
-- NO BORRAR: bo_categories (seed data)

-- Mantenimiento x
DELETE FROM maintenance_history;
DELETE FROM maintenance_images;
DELETE FROM maintenance_reports;

-- Blacklist x
DELETE FROM blacklist_entries;

-- Cashier x
DELETE FROM cashier_history;
DELETE FROM cashier_shift_vouchers;
DELETE FROM cashier_denominations;
DELETE FROM cashier_payments;
DELETE FROM cashier_shift_users;
DELETE FROM cashier_vouchers;
DELETE FROM cashier_daily;
DELETE FROM cashier_shifts;
-- NO BORRAR: payment_methods (seed data)

-- Conciliación x
DELETE FROM conciliation_housekeeping;
DELETE FROM conciliation_reception;
DELETE FROM conciliation_monthly_summary;
DELETE FROM conciliation_summary;

-- Groups x 
DELETE FROM group_history;
DELETE FROM group_payments;
DELETE FROM group_status;
DELETE FROM group_rooms;
DELETE FROM group_contacts;
DELETE FROM hotel_groups;

-- Parking x
DELETE FROM parking_availability;
DELETE FROM parking_bookings;
DELETE FROM parking_vehicles;
-- NO BORRAR: parking_spots (seed data)
-- NO BORRAR: parking_rates (seed data)

-- Logbooks
DELETE FROM logbook_history;
DELETE FROM logbook_reads;
DELETE FROM logbook_comments;
DELETE FROM logbooks;

-- Users (excepto demo)
DELETE FROM users WHERE id != 'demo-user-0000-0000-000000000001';

-- NO BORRAR: roles (seed data)
-- NO BORRAR: departments (seed data)

SELECT '✅ Tablas limpiadas (preservando seed data y demo user)' AS resultado;

-- =========================================================
-- PASO 2: INSERTAR DEPARTAMENTOS SI NO EXISTEN
-- =========================================================
INSERT IGNORE INTO departments (id, name) VALUES
  (1, 'Recepción'),
  (2, 'Mantenimiento'),
  (3, 'Pisos'),
  (4, 'Administración'),
  (5, 'Restauración');

SELECT '✅ Departamentos verificados' AS resultado;

-- =========================================================
-- PASO 3: USUARIOS MOCK
-- Contraseña de todos (solo para desarrollo local): Test1234!
-- =========================================================
INSERT INTO users (id, username, email, password, role_id, is_active) VALUES
  -- Admin
  ('mock-user-0001-0000-000000000001', 'admin', 'admin@four-points.local', '$2b$10$OvW63s62aNQt/MPvL1dip.w5//PkSXNkUTGDJdvKs89ZNm8ePeTBy', 2, 1),
  -- Recepcionistas
  ('mock-user-0002-0000-000000000001', 'carlos.garcia', 'carlos@four-points.local', '$2b$10$OvW63s62aNQt/MPvL1dip.w5//PkSXNkUTGDJdvKs89ZNm8ePeTBy', 1, 1),
  ('mock-user-0003-0000-000000000001', 'maria.lopez', 'maria@four-points.local', '$2b$10$OvW63s62aNQt/MPvL1dip.w5//PkSXNkUTGDJdvKs89ZNm8ePeTBy', 1, 1),
  ('mock-user-0004-0000-000000000001', 'pedro.martinez', 'pedro@four-points.local', '$2b$10$OvW63s62aNQt/MPvL1dip.w5//PkSXNkUTGDJdvKs89ZNm8ePeTBy', 1, 1),
  -- Mantenimiento
  ('mock-user-0005-0000-000000000001', 'juan.fernandez', 'juan@four-points.local', '$2b$10$OvW63s62aNQt/MPvL1dip.w5//PkSXNkUTGDJdvKs89ZNm8ePeTBy', 3, 1),
  -- Group Admin
  ('mock-user-0006-0000-000000000001', 'ana.torres', 'ana@four-points.local', '$2b$10$OvW63s62aNQt/MPvL1dip.w5//PkSXNkUTGDJdvKs89ZNm8ePeTBy', 6, 1);

SELECT '✅ Usuarios mock creados (6 usuarios)' AS resultado;

-- =========================================================
-- PASO 4: LOGBOOKS MOCK
-- =========================================================
INSERT INTO logbooks (author_id, message, importance_level, department_id, date, is_solved) VALUES
  ('mock-user-0002-0000-000000000001', 'Huésped de habitación 302 solicita late checkout hasta las 14:00. Confirmado con dirección.', 'media', 1, CURDATE(), 1),
  ('mock-user-0002-0000-000000000001', 'Grupo Viajes Sol llega mañana a las 10:00. Preparar welcome drink.', 'alta', 1, CURDATE(), 0),
  ('mock-user-0003-0000-000000000001', 'Avería en ascensor de servicio. Técnico viene mañana a primera hora.', 'urgente', 2, CURDATE(), 0),
  ('mock-user-0004-0000-000000000001', 'Cliente VIP Mr. Johnson en hab. 501. Preferencia: almohadas extra y periódico cada mañana.', 'alta', 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0),
  ('mock-user-0002-0000-000000000001', 'Queja de ruido en planta 4 por obras en edificio colindante. Informado cliente con descuento 10%.', 'media', 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1),
  ('mock-user-0003-0000-000000000001', 'Fallo en aire acondicionado hab. 205. Cliente reubicado a 207.', 'alta', 2, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 1),
  ('mock-user-0004-0000-000000000001', 'Objetos olvidados en hab. 118: cargador iPhone y libro. Guardado en lost&found.', 'baja', 1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 0),
  ('mock-user-0002-0000-000000000001', 'Recordatorio: Inspección de bomberos programada para el viernes.', 'alta', 4, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 0);
  
  
  -- Hay que verificar las ids porque no seran las mismas en cada ejecucion
  SELECT id, message FROM logbooks;

-- Comentarios en logbooks
INSERT INTO logbook_comments (logbook_id, user_id, comment, department_id) 
VALUES   
  (99, 'mock-user-0003-0000-000000000001', 'Confirmado con el huésped. Saldrá a las 14:00.', 1),   
  (100, 'mock-user-0004-0000-000000000001', 'Welcome drink preparado: 25 copas de cava.', 1),   
  (101, 'mock-user-0005-0000-000000000001', 'Técnico confirmado para mañana 8:00. Empresa: Ascensores Madrid.', 2),   
  (104, 'mock-user-0005-0000-000000000001', 'AC reparado. Hab. 205 disponible de nuevo.', 2);

SELECT '✅ Logbooks mock creados (8 entradas + 4 comentarios)' AS resultado;

-- =========================================================
-- PASO 5: PARKING - VEHÍCULOS Y RESERVAS
-- =========================================================
INSERT INTO parking_vehicles (plate_number, owner_name, model, notes) VALUES
  ('1234ABC', 'García Sánchez, Juan', 'Seat León', 'Cliente frecuente'),
  ('5678DEF', 'López Martín, María', 'Renault Clio', NULL),
  ('9012GHI', 'Fernández Ruiz, Pedro', 'Ford Focus', 'Preferencia plaza cubierta'),
  ('3456JKL', 'Torres Gil, Ana', 'VW Golf', NULL),
  ('7890MNO', 'Martínez Díaz, Carlos', 'Toyota Corolla', 'Coche eléctrico'),
  ('2345PQR', 'Rodríguez López, Laura', 'Peugeot 308', NULL),
  ('6789STU', 'Sánchez Moreno, Miguel', 'Opel Astra', NULL),
  ('0123VWX', 'Jiménez Romero, Elena', 'Nissan Qashqai', 'SUV grande');

-- Reservas de parking (activas y completadas)
INSERT INTO parking_bookings (booking_code, spot_id, vehicle_id, operator_id, expected_checkin, expected_checkout, actual_checkin, actual_checkout, status, total_amount, payment_amount, payment_method, booking_source, created_by) VALUES
  -- Reservas activas (checked_in)
  ('PK-001', 1, 1, 'mock-user-0002-0000-000000000001', DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_SUB(CURDATE(), INTERVAL 2 DAY), NULL, 'checked_in', 63.00, 63.00, 'card', 'direct', 'mock-user-0002-0000-000000000001'),
  ('PK-002', 3, 2, 'mock-user-0003-0000-000000000001', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), NULL, 'checked_in', 39.00, 39.00, 'cash', 'booking_com', 'mock-user-0003-0000-000000000001'),
  ('PK-003', 5, 3, 'mock-user-0002-0000-000000000001', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), CURDATE(), NULL, 'checked_in', 84.00, 84.00, 'transfer', 'direct', 'mock-user-0002-0000-000000000001'),
  -- Reservas futuras (reserved)
  ('PK-004', 7, 4, 'mock-user-0004-0000-000000000001', DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY), NULL, NULL, 'reserved', 39.00, NULL, NULL, 'expedia', 'mock-user-0004-0000-000000000001'),
  ('PK-005', 11, 5, 'mock-user-0002-0000-000000000001', DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), NULL, NULL, 'reserved', 39.00, NULL, NULL, 'direct', 'mock-user-0002-0000-000000000001'),
  -- Completadas
  ('PK-006', 2, 6, 'mock-user-0003-0000-000000000001', DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'completed', 39.00, 39.00, 'card', 'direct', 'mock-user-0003-0000-000000000001'),
  ('PK-007', 4, 7, 'mock-user-0002-0000-000000000001', DATE_SUB(CURDATE(), INTERVAL 8 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY), DATE_SUB(CURDATE(), INTERVAL 8 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'completed', 27.00, 27.00, 'cash', 'booking_com', 'mock-user-0002-0000-000000000001');

-- Regenerar disponibilidad
CALL generate_availability();

SELECT '✅ Parking mock creado (8 vehículos + 7 reservas)' AS resultado;

-- =========================================================
-- PASO 6: GRUPOS HOTELEROS
-- =========================================================
INSERT INTO hotel_groups (id, name, agency, arrival_date, departure_date, status, total_amount, currency, notes, created_by) VALUES
  (1, 'Congreso Tecnología 2025', 'Viajes Corporativos SA', DATE_ADD(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 18 DAY), 'confirmed', 12500.00, 'EUR', 'Grupo de 45 personas. Requieren sala de reuniones.', 'mock-user-0006-0000-000000000001'),
  (2, 'Tour Seniors Andalucía', 'Viajes Dorados', DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'pending', 4800.00, 'EUR', 'Grupo de 24 personas mayores. Preferencia plantas bajas.', 'mock-user-0006-0000-000000000001'),
  (3, 'Boda Martínez-García', NULL, DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 32 DAY), 'confirmed', 8900.00, 'EUR', 'Reserva habitación nupcial + 15 dobles para invitados.', 'mock-user-0006-0000-000000000001'),
  (4, 'Equipo Fútbol Juvenil', 'Deportes Viajes', DATE_ADD(CURDATE(), INTERVAL 21 DAY), DATE_ADD(CURDATE(), INTERVAL 23 DAY), 'pending', 3200.00, 'EUR', '16 jugadores + 4 staff. Necesitan desayuno temprano 7:00.', 'mock-user-0006-0000-000000000001'),
  (5, 'Seminario Médicos', 'MedTravel', DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'completed', 9500.00, 'EUR', 'Grupo finalizado sin incidencias.', 'mock-user-0006-0000-000000000001');

-- Contactos de grupos
INSERT INTO group_contacts (group_id, contact_name, contact_email, contact_phone, is_primary) VALUES
  (1, 'Roberto Sánchez', 'r.sanchez@techcongress.com', '+34 612 345 678', 1),
  (1, 'Laura Méndez', 'l.mendez@techcongress.com', '+34 698 765 432', 0),
  (2, 'Carmen Ruiz', 'carmen@viajesDorados.es', '+34 654 321 098', 1),
  (3, 'Isabel Martínez', 'isa.martinez@email.com', '+34 678 901 234', 1),
  (4, 'Antonio López', 'a.lopez@deportesviajes.com', '+34 645 678 901', 1),
  (5, 'Dr. Miguel Torres', 'm.torres@medtravel.com', '+34 632 109 876', 1);

-- Habitaciones de grupos
INSERT INTO group_rooms (group_id, room_type, quantity, guests_per_room) VALUES
  (1, 'single', 10, 1),
  (1, 'double_bed', 15, 2),
  (1, 'twin_beds', 5, 2),
  (2, 'double_bed', 12, 2),
  (3, 'double_bed', 16, 2),
  (4, 'twin_beds', 8, 2),
  (4, 'double_bed', 2, 2),
  (5, 'single', 20, 1),
  (5, 'double_bed', 10, 2);

-- Estado de grupos
INSERT INTO group_status (group_id, booking_confirmed, booking_confirmed_date, contract_signed, contract_signed_date, rooming_status, balance_status) VALUES
  (1, 1, DATE_SUB(CURDATE(), INTERVAL 30 DAY), 1, DATE_SUB(CURDATE(), INTERVAL 25 DAY), 'received', 'partial'),
  (2, 1, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 0, NULL, 'requested', 'pending'),
  (3, 1, DATE_SUB(CURDATE(), INTERVAL 45 DAY), 1, DATE_SUB(CURDATE(), INTERVAL 40 DAY), 'received', 'partial'),
  (4, 1, DATE_SUB(CURDATE(), INTERVAL 7 DAY), 0, NULL, 'pending', 'pending'),
  (5, 1, DATE_SUB(CURDATE(), INTERVAL 60 DAY), 1, DATE_SUB(CURDATE(), INTERVAL 55 DAY), 'received', 'paid');

-- Pagos de grupos
INSERT INTO group_payments (group_id, payment_name, payment_order, percentage, amount, amount_paid, due_date, status) VALUES
  (1, 'Depósito inicial', 1, 30.00, 3750.00, 3750.00, DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'paid'),
  (1, 'Segundo pago', 2, 40.00, 5000.00, 2500.00, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'partial'),
  (1, 'Pago final', 3, 30.00, 3750.00, 0.00, DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'pending'),
  (2, 'Depósito', 1, 50.00, 2400.00, 0.00, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'requested'),
  (2, 'Resto', 2, 50.00, 2400.00, 0.00, DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'pending'),
  (3, 'Señal', 1, 20.00, 1780.00, 1780.00, DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'paid'),
  (3, 'Pago final', 2, 80.00, 7120.00, 3000.00, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'partial'),
  (4, 'Pago único', 1, 100.00, 3200.00, 0.00, DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'pending'),
  (5, 'Pago completo', 1, 100.00, 9500.00, 9500.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'paid');

SELECT '✅ Grupos mock creados (5 grupos + contactos + habitaciones + pagos)' AS resultado;

-- =========================================================
-- PASO 7: CASHIER (TURNOS DE CAJA)
-- =========================================================
-- Crear turnos para los últimos 3 días
INSERT INTO cashier_shifts (shift_date, shift_type, status, initial_fund, income, cash_counted, cash_expected, payments_total, grand_total, opened_by, closed_by_id, closed_at) VALUES
  -- Hace 2 días - todos cerrados
  (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'night', 'closed', 200.00, 450.00, 200.00, 200.00, 320.00, 770.00, 'mock-user-0004-0000-000000000001', 'mock-user-0004-0000-000000000001', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'morning', 'closed', 200.00, 890.00, 200.00, 200.00, 650.00, 1540.00, 'mock-user-0002-0000-000000000001', 'mock-user-0002-0000-000000000001', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'afternoon', 'closed', 200.00, 560.00, 195.00, 200.00, 420.00, 980.00, 'mock-user-0003-0000-000000000001', 'mock-user-0003-0000-000000000001', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'closing', 'closed', 200.00, 320.00, 200.00, 200.00, 180.00, 500.00, 'mock-user-0004-0000-000000000001', 'mock-user-0004-0000-000000000001', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  -- Ayer - todos cerrados
  (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'night', 'closed', 200.00, 380.00, 200.00, 200.00, 290.00, 670.00, 'mock-user-0004-0000-000000000001', 'mock-user-0004-0000-000000000001', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'morning', 'closed', 200.00, 1250.00, 198.00, 200.00, 890.00, 2140.00, 'mock-user-0002-0000-000000000001', 'mock-user-0002-0000-000000000001', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'afternoon', 'closed', 200.00, 720.00, 200.00, 200.00, 540.00, 1260.00, 'mock-user-0003-0000-000000000001', 'mock-user-0003-0000-000000000001', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'closing', 'closed', 200.00, 410.00, 200.00, 200.00, 220.00, 630.00, 'mock-user-0004-0000-000000000001', 'mock-user-0004-0000-000000000001', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  -- Hoy - turno mañana en progreso
  (CURDATE(), 'night', 'closed', 200.00, 290.00, 200.00, 200.00, 150.00, 440.00, 'mock-user-0004-0000-000000000001', 'mock-user-0004-0000-000000000001', NOW()),
  (CURDATE(), 'morning', 'in_progress', 200.00, 680.00, 0.00, 200.00, 450.00, 1130.00, 'mock-user-0002-0000-000000000001', NULL, NULL);

-- Responsables de turnos
INSERT INTO cashier_shift_users (shift_id, user_id, is_primary) VALUES
  (1, 'mock-user-0004-0000-000000000001', 1),
  (2, 'mock-user-0002-0000-000000000001', 1),
  (3, 'mock-user-0003-0000-000000000001', 1),
  (4, 'mock-user-0004-0000-000000000001', 1),
  (5, 'mock-user-0004-0000-000000000001', 1),
  (6, 'mock-user-0002-0000-000000000001', 1),
  (6, 'mock-user-0003-0000-000000000001', 0),
  (7, 'mock-user-0003-0000-000000000001', 1),
  (8, 'mock-user-0004-0000-000000000001', 1),
  (9, 'mock-user-0004-0000-000000000001', 1),
  (10, 'mock-user-0002-0000-000000000001', 1);

-- Pagos electrónicos por turno
INSERT INTO cashier_payments (shift_id, payment_method_id, amount) VALUES
  (1, 1, 220.00), (1, 2, 50.00), (1, 4, 50.00),
  (2, 1, 450.00), (2, 3, 120.00), (2, 4, 80.00),
  (3, 1, 320.00), (3, 2, 100.00),
  (4, 1, 180.00),
  (5, 1, 190.00), (5, 4, 100.00),
  (6, 1, 650.00), (6, 2, 140.00), (6, 3, 100.00),
  (7, 1, 380.00), (7, 4, 160.00),
  (8, 1, 220.00),
  (9, 1, 100.00), (9, 2, 50.00),
  (10, 1, 350.00), (10, 3, 100.00);

SELECT '✅ Cashier mock creado (10 turnos + pagos)' AS resultado;

-- =========================================================
-- PASO 8: CONCILIACIÓN
-- =========================================================
INSERT INTO conciliation_summary (date, total_reception, total_housekeeping, notes, created_by, status) VALUES
  (DATE_SUB(CURDATE(), INTERVAL 2 DAY), 85, 87, 'Diferencia por 2 no-shows', 'mock-user-0002-0000-000000000001', 'closed'),
  (DATE_SUB(CURDATE(), INTERVAL 1 DAY), 92, 92, 'Cuadrado perfecto', 'mock-user-0003-0000-000000000001', 'closed'),
  (CURDATE(), 78, 0, 'Pendiente conteo pisos', 'mock-user-0002-0000-000000000001', 'draft');

INSERT INTO conciliation_reception (conciliation_id, reason, direction, value, notes, created_by) VALUES
  (1, 'base_rooms', 'add', 87, 'Ocupación base', 'mock-user-0002-0000-000000000001'),
  (1, 'no_show', 'subtract', 2, 'Dos no-shows', 'mock-user-0002-0000-000000000001'),
  (2, 'base_rooms', 'add', 92, 'Ocupación base', 'mock-user-0003-0000-000000000001'),
  (3, 'base_rooms', 'add', 80, 'Ocupación base', 'mock-user-0002-0000-000000000001'),
  (3, 'no_show', 'subtract', 2, 'No-shows', 'mock-user-0002-0000-000000000001');

INSERT INTO conciliation_housekeeping (conciliation_id, reason, direction, value, notes, created_by) VALUES
  (1, 'cleaned', 'add', 85, 'Habitaciones limpiadas', 'mock-user-0002-0000-000000000001'),
  (1, 'do_not_disturb', 'add', 2, 'DND', 'mock-user-0002-0000-000000000001'),
  (2, 'cleaned', 'add', 90, 'Habitaciones limpiadas', 'mock-user-0003-0000-000000000001'),
  (2, 'pending_cleaned', 'add', 2, 'Pendientes', 'mock-user-0003-0000-000000000001');

SELECT '✅ Conciliación mock creada (3 días)' AS resultado;

-- =========================================================
-- PASO 9: BLACKLIST
-- =========================================================
INSERT INTO blacklist_entries (guest_name, document_type, document_number, check_in_date, check_out_date, reason, severity, comments, images, created_by) VALUES
  ('John Smith', 'PASSPORT', 'AB123456', DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_SUB(CURDATE(), INTERVAL 57 DAY), 'Daños en habitación', 'HIGH', 'Rotura de TV y manchas en alfombra. Factura pendiente de 450€.', '[]', 'mock-user-0002-0000-000000000001'),
  ('María García Ruiz', 'DNI', '12345678A', DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 28 DAY), 'Comportamiento agresivo', 'CRITICAL', 'Agresión verbal a personal. Policía intervenida.', '[]', 'mock-user-0003-0000-000000000001'),
  ('Robert Johnson', 'PASSPORT', 'CD789012', DATE_SUB(CURDATE(), INTERVAL 90 DAY), DATE_SUB(CURDATE(), INTERVAL 88 DAY), 'Impago', 'MEDIUM', 'Marchó sin pagar minibar. Importe: 85€.', '[]', 'mock-user-0002-0000-000000000001');

SELECT '✅ Blacklist mock creada (3 entradas)' AS resultado;

-- =========================================================
-- PASO 10: MAINTENANCE
-- =========================================================
INSERT INTO maintenance_reports (id, report_date, title, description, location_type, location_description, room_number, room_out_of_service, priority, status, assigned_to, assigned_type, created_by) VALUES
  (CONCAT(DATE_FORMAT(CURDATE(), '%d%m%y'), '-001'), NOW(), 'Fuga de agua en baño', 'Goteo constante en grifo de lavabo', 'room', 'Baño habitación', '205', 0, 'high', 'in_progress', 'mock-user-0005-0000-000000000001', 'internal', 'mock-user-0002-0000-000000000001'),
  (CONCAT(DATE_FORMAT(CURDATE(), '%d%m%y'), '-002'), NOW(), 'Bombilla fundida', 'Luz de mesilla no funciona', 'room', 'Habitación', '312', 0, 'low', 'reported', NULL, NULL, 'mock-user-0003-0000-000000000001'),
  (CONCAT(DATE_FORMAT(CURDATE(), '%d%m%y'), '-003'), NOW(), 'AC no enfría', 'Aire acondicionado expulsa aire caliente', 'room', 'Habitación', '418', 1, 'urgent', 'assigned', 'mock-user-0005-0000-000000000001', 'internal', 'mock-user-0002-0000-000000000001'),
  (CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%d%m%y'), '-001'), DATE_SUB(NOW(), INTERVAL 1 DAY), 'Puerta atascada', 'Puerta de acceso a piscina no cierra bien', 'common_area', 'Zona piscina', NULL, 0, 'medium', 'completed', 'mock-user-0005-0000-000000000001', 'internal', 'mock-user-0004-0000-000000000001'),
  (CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '%d%m%y'), '-001'), DATE_SUB(NOW(), INTERVAL 2 DAY), 'Revisión ascensores', 'Mantenimiento preventivo mensual', 'facilities', 'Ascensores', NULL, 0, 'medium', 'waiting', NULL, 'external', 'mock-user-0001-0000-000000000001');

-- Historial de mantenimiento
INSERT INTO maintenance_history (report_id, action, field_changed, old_value, new_value, changed_by) VALUES
  (CONCAT(DATE_FORMAT(CURDATE(), '%d%m%y'), '-001'), 'created', NULL, NULL, NULL, 'mock-user-0002-0000-000000000001'),
  (CONCAT(DATE_FORMAT(CURDATE(), '%d%m%y'), '-001'), 'assigned', 'assigned_to', NULL, 'mock-user-0005-0000-000000000001', 'mock-user-0001-0000-000000000001'),
  (CONCAT(DATE_FORMAT(CURDATE(), '%d%m%y'), '-001'), 'status_changed', 'status', 'reported', 'in_progress', 'mock-user-0005-0000-000000000001'),
  (CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%d%m%y'), '-001'), 'created', NULL, NULL, NULL, 'mock-user-0004-0000-000000000001'),
  (CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%d%m%y'), '-001'), 'status_changed', 'status', 'in_progress', 'completed', 'mock-user-0005-0000-000000000001');

SELECT '✅ Maintenance mock creado (5 reportes)' AS resultado;

-- =========================================================
-- PASO 11: BACKOFFICE (PROVEEDORES Y FACTURAS)
-- =========================================================
-- Insertar proveedores con IDs fijos
INSERT INTO bo_suppliers (id, name, cif, default_category_id, periodicity, payment_method, email, is_active, created_by) VALUES
  (1001, 'Electricidad Nacional SA', 'A12345678', 13, 'monthly', 'direct_debit', 'facturas@elecnacional.es', 1, '550e8400-e29b-41d4-a716-446655440001'),
  (1002, 'Aguas del Sur', 'B87654321', 14, 'bimonthly', 'direct_debit', 'clientes@aguassur.es', 1, '550e8400-e29b-41d4-a716-446655440001'),
  (1003, 'Lavandería Industrial López', 'B11223344', 8, 'monthly', 'transfer', 'admin@lavanderialopez.com', 1, '550e8400-e29b-41d4-a716-446655440001'),
  (1004, 'Mantenimientos Técnicos SL', 'B55667788', 4, 'on_demand', 'transfer', 'info@mantectec.es', 1, '550e8400-e29b-41d4-a716-446655440001'),
  (1005, 'Amenities Hotel Supply', 'A99887766', 10, 'quarterly', 'transfer', 'orders@amenitieshotel.com', 1, '550e8400-e29b-41d4-a716-446655440001');

-- Facturas usando los IDs fijos de suppliers
INSERT INTO bo_invoices (invoice_number, supplier_id, category_id, amount_without_vat, amount_with_vat, vat_percentage, invoice_date, received_date, due_date, status, payment_method, created_by) VALUES
  ('ELEC-2025-001', 1001, 13, 2450.00, 2964.50, 21.00, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'validated', 'direct_debit', '550e8400-e29b-41d4-a716-446655440001'),
  ('ELEC-2025-002', 1001, 13, 2680.00, 3242.80, 21.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'pending', 'direct_debit', '550e8400-e29b-41d4-a716-446655440001'),
  ('AGU-12345', 1002, 14, 890.00, 979.00, 10.00, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 18 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'paid', 'direct_debit', '550e8400-e29b-41d4-a716-446655440001'),
  ('LAV-2025-089', 1003, 8, 1250.00, 1512.50, 21.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 9 DAY), DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'pending', 'transfer', '550e8400-e29b-41d4-a716-446655440001'),
  ('MT-2025-045', 1004, 4, 650.00, 786.50, 21.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY), DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 22 DAY), 'validated', 'transfer', '550e8400-e29b-41d4-a716-446655440001'),
  ('AME-Q1-2025', 1005, 10, 3200.00, 3872.00, 21.00, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 28 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'paid', 'transfer', '550e8400-e29b-41d4-a716-446655440001');

SELECT '✅ Backoffice mock creado (5 proveedores + 6 facturas)' AS resultado;

-- =========================================================
-- PASO 12: MENSAJERÍA
-- =========================================================
-- Conversación DM y grupo con usuario admin
INSERT INTO conversations (id, type, name, created_by) VALUES
  (1001, 'dm', NULL, '550e8400-e29b-41d4-a716-446655440001'),
  (1002, 'group', 'Recepción Mañana', '550e8400-e29b-41d4-a716-446655440001');

INSERT INTO conversation_participants (conversation_id, user_id, is_admin, is_active) VALUES
  (1001, '550e8400-e29b-41d4-a716-446655440001', 1, 1),
  (1002, '550e8400-e29b-41d4-a716-446655440001', 1, 1);

INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES
  (1001, '550e8400-e29b-41d4-a716-446655440001', 'Mensaje de prueba en DM', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (1001, '550e8400-e29b-41d4-a716-446655440001', 'Segundo mensaje de prueba', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (1002, '550e8400-e29b-41d4-a716-446655440001', 'Buenos días equipo. Recordad que hoy llega el grupo Viajes Sol.', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
  (1002, '550e8400-e29b-41d4-a716-446655440001', 'Las llaves están preparadas en el sobre del grupo.', DATE_SUB(NOW(), INTERVAL 2 HOUR));

SELECT '✅ Mensajería mock creada (2 conversaciones + 4 mensajes)' AS resultado;

-- =========================================================
-- PASO 13: NOTIFICACIONES
-- =========================================================
INSERT INTO notifications (module, group_id, related_to, title, message, priority, status, scheduled_for) VALUES
  ('groups', 1, 'payment', 'Pago pendiente - Congreso Tecnología', 'El segundo pago de 5000€ vence en 7 días', 'high', 'sent', NULL),
  ('groups', 2, 'rooming', 'Rooming pendiente - Tour Seniors', 'Faltan 5 días para llegada y no tenemos rooming', 'urgent', 'sent', NULL),
  ('groups', 4, 'arrival', 'Llegada próxima - Equipo Fútbol', 'El grupo llega en 21 días. Verificar preparativos.', 'medium', 'pending', DATE_ADD(CURDATE(), INTERVAL 14 DAY)),
  ('system', NULL, 'general', 'Mantenimiento programado', 'El sistema estará en mantenimiento el domingo de 02:00 a 04:00', 'low', 'sent', NULL);

INSERT INTO notification_recipients (notification_id, user_id, is_read, read_at) VALUES
  (1, 'mock-user-0006-0000-000000000001', 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (1, 'mock-user-0001-0000-000000000001', 0, NULL),
  (2, 'mock-user-0006-0000-000000000001', 0, NULL),
  (3, 'mock-user-0006-0000-000000000001', 0, NULL),
  (4, 'mock-user-0001-0000-000000000001', 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (4, 'mock-user-0002-0000-000000000001', 1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (4, 'mock-user-0003-0000-000000000001', 0, NULL),
  (4, 'mock-user-0004-0000-000000000001', 0, NULL);

SELECT '✅ Notificaciones mock creadas (4 notificaciones)' AS resultado;

-- =========================================================
-- FINALIZACIÓN
-- =========================================================
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

SELECT '========================================' AS mensaje;
SELECT '✅ MOCK DATA CARGADO CORRECTAMENTE' AS mensaje;
SELECT '========================================' AS mensaje;

-- Resumen
SELECT 'RESUMEN DE DATOS CARGADOS:' AS titulo;
SELECT 'Usuarios' AS tabla, COUNT(*) AS registros FROM users
UNION ALL SELECT 'Logbooks', COUNT(*) FROM logbooks
UNION ALL SELECT 'Logbook Comments', COUNT(*) FROM logbook_comments
UNION ALL SELECT 'Parking Vehicles', COUNT(*) FROM parking_vehicles
UNION ALL SELECT 'Parking Bookings', COUNT(*) FROM parking_bookings
UNION ALL SELECT 'Hotel Groups', COUNT(*) FROM hotel_groups
UNION ALL SELECT 'Group Payments', COUNT(*) FROM group_payments
UNION ALL SELECT 'Cashier Shifts', COUNT(*) FROM cashier_shifts
UNION ALL SELECT 'Conciliation', COUNT(*) FROM conciliation_summary
UNION ALL SELECT 'Blacklist', COUNT(*) FROM blacklist_entries
UNION ALL SELECT 'Maintenance', COUNT(*) FROM maintenance_reports
UNION ALL SELECT 'Suppliers', COUNT(*) FROM bo_suppliers
UNION ALL SELECT 'Invoices', COUNT(*) FROM bo_invoices
UNION ALL SELECT 'Conversations', COUNT(*) FROM conversations
UNION ALL SELECT 'Messages', COUNT(*) FROM messages
UNION ALL SELECT 'Notifications', COUNT(*) FROM notifications;

SELECT '========================================' AS mensaje;
SELECT 'Usuarios mock password: Test1234!' AS mensaje;
SELECT '========================================' AS mensaje;
