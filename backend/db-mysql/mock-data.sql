-- =========================================================
-- MOCK DATA - Four-Points
-- =========================================================
-- Vacía los datos de los módulos y carga unos pocos registros ficticios en
-- cada uno, con fechas relativas a hoy, para que ninguna pantalla salga vacía.
--
-- NO TOCA: usuarios, roles, departamentos, métodos de pago, plazas y tarifas
-- de parking, categorías de backoffice y F&B, todo el módulo de horarios
-- (scheduling_*) ni la configuración del checklist.
--
-- NO CREA USUARIOS: usa los que ya existen, por rol. Necesita al menos un
-- usuario `admin` activo; si no lo hay, se para antes de borrar nada. Los
-- demás roles que falten se sustituyen por ese admin.
--
-- Todos los nombres, documentos, matrículas, correos y teléfonos son
-- inventados. Las imágenes y PDF ya subidos a Cloudinary no se borran.
--
-- Uso: mysql ... <base de datos> < mock-data.sql
-- =========================================================

-- ---------------------------------------------------------
-- Usuarios existentes por rol
-- ---------------------------------------------------------
SET @admin := (
  SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'admin' AND u.is_active = 1
  ORDER BY (u.username = 'admin') DESC, u.created_at, u.id LIMIT 1
);
SET @recep1 := COALESCE((
  SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'recepcionista' AND u.is_active = 1
  ORDER BY u.created_at, u.id LIMIT 1
), @admin);
SET @recep2 := COALESCE((
  SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'recepcionista' AND u.is_active = 1
  ORDER BY u.created_at, u.id LIMIT 1 OFFSET 1
), @recep1);
SET @mant := COALESCE((
  SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'mantenimiento' AND u.is_active = 1
  ORDER BY u.created_at, u.id LIMIT 1
), @admin);
SET @groups := COALESCE((
  SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
  WHERE r.name = 'group-admin' AND u.is_active = 1
  ORDER BY u.created_at, u.id LIMIT 1
), @admin);

DROP PROCEDURE IF EXISTS mock_require_admin;
DELIMITER $$
CREATE PROCEDURE mock_require_admin()
BEGIN
  IF @admin IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'mock-data: no hay ningún usuario admin activo; no se ha borrado nada';
  END IF;
END$$
DELIMITER ;
CALL mock_require_admin();
DROP PROCEDURE mock_require_admin;

-- ---------------------------------------------------------
-- Catálogos por nombre (los ids cambian entre instalaciones).
-- Un departamento que no exista queda en NULL; un método de pago que no
-- exista no genera pagos.
-- ---------------------------------------------------------
SET @dep_pisos    := (SELECT id FROM departments WHERE name = 'pisos' LIMIT 1);
SET @dep_mant     := (SELECT id FROM departments WHERE name = 'mantenimiento' LIMIT 1);
SET @dep_reservas := (SELECT id FROM departments WHERE name = 'reservas' LIMIT 1);
SET @dep_clientes := (SELECT id FROM departments WHERE name = 'clientes' LIMIT 1);
SET @dep_grupos   := (SELECT id FROM departments WHERE name = 'grupos' LIMIT 1);

SET @pm_card     := (SELECT id FROM payment_methods WHERE UPPER(name) LIKE '%TARJETA%' LIMIT 1);
SET @pm_bacs     := (SELECT id FROM payment_methods WHERE UPPER(name) LIKE '%BACS%' LIMIT 1);
SET @pm_web      := (SELECT id FROM payment_methods WHERE UPPER(name) LIKE '%WEB%' LIMIT 1);
SET @pm_transfer := (SELECT id FROM payment_methods WHERE UPPER(name) LIKE '%TRANSFER%' LIMIT 1);

SET @cat_rep  := (SELECT id FROM bo_categories WHERE department = 'REPARACIONES Y MATERIALES' LIMIT 1);
SET @cat_lav  := (SELECT id FROM bo_categories WHERE department LIKE 'LAVANDER%' LIMIT 1);
SET @cat_ame  := (SELECT id FROM bo_categories WHERE department = 'AMENITIES' LIMIT 1);
SET @cat_elec := (SELECT id FROM bo_categories WHERE department = 'ELECTRICIDAD' LIMIT 1);
SET @cat_agua := (SELECT id FROM bo_categories WHERE department = 'AGUA' LIMIT 1);

-- Todo lo que sigue se aplica entero o no se aplica
START TRANSACTION;

-- ---------------------------------------------------------
-- 1. Vaciar los datos de los módulos
-- ---------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM messages;
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM notification_recipients;
DELETE FROM notifications;

DELETE FROM bo_invoice_history;
DELETE FROM bo_invoices;
DELETE FROM bo_suppliers;
DELETE FROM bo_assets;

DELETE FROM maintenance_history;
DELETE FROM maintenance_images;
DELETE FROM maintenance_reports;

DELETE FROM blacklist_entries;

DELETE FROM cashier_history;
DELETE FROM cashier_shift_vouchers;
DELETE FROM cashier_denominations;
DELETE FROM cashier_payments;
DELETE FROM cashier_shift_users;
DELETE FROM cashier_vouchers;
DELETE FROM cashier_daily;
DELETE FROM cashier_shifts;

DELETE FROM conciliation_housekeeping;
DELETE FROM conciliation_reception;
DELETE FROM conciliation_monthly_summary;
DELETE FROM conciliation_summary;

DELETE FROM group_history;
DELETE FROM group_payments;
DELETE FROM group_status;
DELETE FROM group_rooms;
DELETE FROM group_contacts;
DELETE FROM hotel_groups;

UPDATE parking_availability SET is_available = TRUE, booking_id = NULL;
DELETE FROM parking_availability WHERE date < CURDATE();
DELETE FROM parking_bookings;
DELETE FROM parking_vehicles;

DELETE FROM logbook_history;
DELETE FROM logbook_reads;
DELETE FROM logbook_comments;
DELETE FROM logbooks;

DELETE FROM checklist_event_log;
DELETE FROM checklist_step_attachments;
DELETE FROM checklist_step_comments;
DELETE FROM checklist_step_state;
DELETE FROM checklist_runs;

DELETE FROM fnb_daily_revenue;

-- demo_activity_log solo existe en las BD con el usuario demo instalado
SET @has_demo_log := (SELECT COUNT(*) FROM information_schema.tables
                      WHERE table_schema = DATABASE() AND table_name = 'demo_activity_log');
SET @sql := IF(@has_demo_log > 0, 'DELETE FROM demo_activity_log', 'DO 0');
PREPARE clear_demo_log FROM @sql;
EXECUTE clear_demo_log;
DEALLOCATE PREPARE clear_demo_log;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------
-- 2. Logbook
-- ---------------------------------------------------------
INSERT INTO logbooks (id, author_id, message, importance_level, department_id, date, is_solved, solved_at, solved_by, created_at) VALUES
  (1, @recep1, 'Huésped de la 302 pide salida tardía hasta las 14:00. Confirmado con dirección.', 'media', @dep_reservas, CURDATE(), 1, NOW(), @recep1, NOW() - INTERVAL 3 HOUR),
  (2, @recep1, 'Mañana a las 10:00 llega el grupo Congreso Tecnología. Preparar bebida de bienvenida.', 'alta', @dep_grupos, CURDATE(), 0, NULL, NULL, NOW() - INTERVAL 2 HOUR),
  (3, @recep2, 'Avería en el ascensor de servicio. El técnico viene mañana a primera hora.', 'urgente', @dep_mant, CURDATE(), 0, NULL, NULL, NOW() - INTERVAL 1 HOUR),
  (4, @recep2, 'Cliente habitual en la 501: almohadas extra y periódico cada mañana.', 'alta', @dep_clientes, CURDATE() - INTERVAL 1 DAY, 0, NULL, NULL, NOW() - INTERVAL 1 DAY),
  (5, @recep1, 'Quejas de ruido en la planta 4 por obras en el edificio de al lado. Se ofrece cambio de habitación.', 'media', @dep_clientes, CURDATE() - INTERVAL 1 DAY, 1, NOW() - INTERVAL 20 HOUR, @admin, NOW() - INTERVAL 1 DAY),
  (6, @recep2, 'El aire acondicionado de la 205 no enfría. Huésped trasladado a la 207.', 'alta', @dep_mant, CURDATE() - INTERVAL 2 DAY, 1, NOW() - INTERVAL 1 DAY, @mant, NOW() - INTERVAL 2 DAY),
  (7, @recep1, 'Objetos olvidados en la 118: cargador y un libro. Guardados en objetos perdidos.', 'baja', @dep_pisos, CURDATE() - INTERVAL 2 DAY, 0, NULL, NULL, NOW() - INTERVAL 2 DAY),
  (8, @admin, 'Recordatorio: inspección de seguridad contra incendios el viernes.', 'alta', @dep_reservas, CURDATE() - INTERVAL 3 DAY, 0, NULL, NULL, NOW() - INTERVAL 3 DAY);

INSERT INTO logbook_comments (logbook_id, user_id, comment, department_id, created_at) VALUES
  (1, @recep2, 'Confirmado con el huésped: sale a las 14:00.', @dep_reservas, NOW() - INTERVAL 2 HOUR),
  (2, @groups, 'Bebida de bienvenida encargada para 45 personas.', @dep_grupos, NOW() - INTERVAL 1 HOUR),
  (3, @mant, 'Técnico confirmado para mañana a las 8:00.', @dep_mant, NOW() - INTERVAL 30 MINUTE),
  (6, @mant, 'Aire reparado. La 205 vuelve a estar disponible.', @dep_mant, NOW() - INTERVAL 1 DAY);

INSERT INTO logbook_history (logbook_id, editor_id, department_id, type, action, new_content, created_at)
SELECT id, author_id, department_id, 'logbook', 'create', message, created_at FROM logbooks;

INSERT INTO logbook_reads (logbook_id, user_id, read_at) VALUES
  (1, @admin, NOW() - INTERVAL 2 HOUR),
  (3, @admin, NOW() - INTERVAL 30 MINUTE),
  (4, @recep1, NOW() - INTERVAL 20 HOUR);

-- ---------------------------------------------------------
-- 3. Parking (el código de reserva y el calendario los ponen los triggers)
-- ---------------------------------------------------------
CALL generate_availability();

INSERT INTO parking_vehicles (id, plate_number, owner_name, model, notes) VALUES
  (1, '0001AAA', 'Cliente Ejemplo Uno', 'Utilitario', 'Cliente habitual'),
  (2, '0002BBB', 'Cliente Ejemplo Dos', 'Compacto', NULL),
  (3, '0003CCC', 'Cliente Ejemplo Tres', 'Berlina', 'Prefiere plaza ancha'),
  (4, '0004DDD', 'Cliente Ejemplo Cuatro', 'Compacto', NULL),
  (5, '0005FFF', 'Cliente Ejemplo Cinco', 'Eléctrico', 'Necesita cargador'),
  (6, '0006GGG', 'Cliente Ejemplo Seis', 'Familiar', NULL),
  (7, '0007HHH', 'Cliente Ejemplo Siete', 'Todoterreno', 'Vehículo grande');

INSERT INTO parking_bookings (spot_id, vehicle_id, operator_id, expected_checkin, expected_checkout, actual_checkin, actual_checkout, status, total_amount, payment_amount, payment_method, payment_date, booking_source, created_by) VALUES
  (1, 1, @recep1, CURDATE() - INTERVAL 2 DAY + INTERVAL 12 HOUR, CURDATE() + INTERVAL 3 DAY + INTERVAL 12 HOUR, CURDATE() - INTERVAL 2 DAY + INTERVAL 13 HOUR, NULL, 'checked_in', 75.00, 75.00, 'card', NOW() - INTERVAL 2 DAY, 'direct', @recep1),
  (3, 2, @recep2, CURDATE() - INTERVAL 1 DAY + INTERVAL 12 HOUR, CURDATE() + INTERVAL 2 DAY + INTERVAL 12 HOUR, CURDATE() - INTERVAL 1 DAY + INTERVAL 16 HOUR, NULL, 'checked_in', 45.00, 45.00, 'cash', NOW() - INTERVAL 1 DAY, 'booking_com', @recep2),
  (5, 3, @recep1, CURDATE() + INTERVAL 12 HOUR, CURDATE() + INTERVAL 7 DAY + INTERVAL 12 HOUR, CURDATE() + INTERVAL 13 HOUR, NULL, 'checked_in', 105.00, NULL, NULL, NULL, 'direct', @recep1),
  (7, 4, @recep2, CURDATE() + INTERVAL 1 DAY + INTERVAL 12 HOUR, CURDATE() + INTERVAL 4 DAY + INTERVAL 12 HOUR, NULL, NULL, 'reserved', 45.00, NULL, NULL, NULL, 'expedia', @recep2),
  (11, 5, @recep1, CURDATE() + INTERVAL 2 DAY + INTERVAL 12 HOUR, CURDATE() + INTERVAL 5 DAY + INTERVAL 12 HOUR, NULL, NULL, 'reserved', 45.00, NULL, NULL, NULL, 'direct', @recep1),
  (2, 6, @recep2, CURDATE() - INTERVAL 10 DAY + INTERVAL 12 HOUR, CURDATE() - INTERVAL 7 DAY + INTERVAL 12 HOUR, CURDATE() - INTERVAL 10 DAY + INTERVAL 14 HOUR, CURDATE() - INTERVAL 7 DAY + INTERVAL 11 HOUR, 'completed', 45.00, 45.00, 'card', NOW() - INTERVAL 7 DAY, 'direct', @recep2),
  (4, 7, @recep1, CURDATE() - INTERVAL 8 DAY + INTERVAL 12 HOUR, CURDATE() - INTERVAL 6 DAY + INTERVAL 12 HOUR, CURDATE() - INTERVAL 8 DAY + INTERVAL 15 HOUR, CURDATE() - INTERVAL 6 DAY + INTERVAL 10 HOUR, 'completed', 30.00, 30.00, 'cash', NOW() - INTERVAL 6 DAY, 'booking_com', @recep1);

-- ---------------------------------------------------------
-- 4. Grupos
-- ---------------------------------------------------------
INSERT INTO hotel_groups (id, name, agency, arrival_date, departure_date, status, total_amount, currency, notes, created_by) VALUES
  (1, 'Congreso Tecnología', 'Agencia Ejemplo Congresos', CURDATE() + INTERVAL 1 DAY, CURDATE() + INTERVAL 4 DAY, 'confirmed', 12500.00, 'EUR', 'Grupo de 45 personas. Necesitan sala de reuniones.', @groups),
  (2, 'Viaje Cultural Sénior', 'Agencia Ejemplo Viajes', CURDATE() + INTERVAL 7 DAY, CURDATE() + INTERVAL 9 DAY, 'pending', 4800.00, 'EUR', 'Grupo de 24 personas. Preferencia por plantas bajas.', @groups),
  (3, 'Boda Ejemplo', NULL, CURDATE() + INTERVAL 30 DAY, CURDATE() + INTERVAL 32 DAY, 'confirmed', 8900.00, 'EUR', 'Suite nupcial y 15 dobles para invitados.', @groups),
  (4, 'Equipo Deportivo Juvenil', 'Agencia Ejemplo Deportes', CURDATE() + INTERVAL 21 DAY, CURDATE() + INTERVAL 23 DAY, 'pending', 3200.00, 'EUR', '16 jugadores y 4 técnicos. Desayuno temprano a las 7:00.', @groups),
  (5, 'Jornadas Sanitarias', 'Agencia Ejemplo Eventos', CURDATE() - INTERVAL 5 DAY, CURDATE() - INTERVAL 2 DAY, 'completed', 9500.00, 'EUR', 'Grupo terminado sin incidencias.', @groups);

INSERT INTO group_contacts (group_id, contact_name, contact_email, contact_phone, is_primary) VALUES
  (1, 'Contacto Congreso', 'congreso@example.com', '+34 600 000 001', 1),
  (1, 'Contacto Congreso Suplente', 'congreso.suplente@example.com', '+34 600 000 002', 0),
  (2, 'Contacto Viajes', 'viajes@example.com', '+34 600 000 003', 1),
  (3, 'Contacto Boda', 'boda@example.com', '+34 600 000 004', 1),
  (4, 'Contacto Deportes', 'deportes@example.com', '+34 600 000 005', 1),
  (5, 'Contacto Eventos', 'eventos@example.com', '+34 600 000 006', 1);

INSERT INTO group_rooms (group_id, room_type, quantity, guests_per_room) VALUES
  (1, 'single', 10, 1), (1, 'double_bed', 15, 2), (1, 'twin_beds', 5, 2),
  (2, 'double_bed', 12, 2),
  (3, 'double_bed', 16, 2),
  (4, 'twin_beds', 8, 2), (4, 'double_bed', 2, 2),
  (5, 'single', 20, 1), (5, 'double_bed', 10, 2);

INSERT INTO group_status (group_id, booking_confirmed, booking_confirmed_date, contract_signed, contract_signed_date, rooming_status, rooming_requested_date, rooming_received_date, balance_status) VALUES
  (1, 1, NOW() - INTERVAL 30 DAY, 1, NOW() - INTERVAL 25 DAY, 'received', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 5 DAY, 'partial'),
  (2, 1, NOW() - INTERVAL 10 DAY, 0, NULL, 'requested', NOW() - INTERVAL 2 DAY, NULL, 'pending'),
  (3, 1, NOW() - INTERVAL 45 DAY, 1, NOW() - INTERVAL 40 DAY, 'received', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 15 DAY, 'partial'),
  (4, 1, NOW() - INTERVAL 7 DAY, 0, NULL, 'pending', NULL, NULL, 'pending'),
  (5, 1, NOW() - INTERVAL 60 DAY, 1, NOW() - INTERVAL 55 DAY, 'received', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 12 DAY, 'paid');

INSERT INTO group_payments (group_id, payment_name, payment_order, percentage, amount, amount_paid, due_date, status) VALUES
  (1, 'Depósito inicial', 1, 30.00, 3750.00, 3750.00, CURDATE() - INTERVAL 20 DAY, 'paid'),
  (1, 'Segundo pago', 2, 40.00, 5000.00, 2500.00, CURDATE() + INTERVAL 7 DAY, 'partial'),
  (1, 'Pago final', 3, 30.00, 3750.00, 0.00, CURDATE() + INTERVAL 14 DAY, 'pending'),
  (2, 'Depósito', 1, 50.00, 2400.00, 0.00, CURDATE() + INTERVAL 3 DAY, 'requested'),
  (2, 'Resto', 2, 50.00, 2400.00, 0.00, CURDATE() + INTERVAL 6 DAY, 'pending'),
  (3, 'Señal', 1, 20.00, 1780.00, 1780.00, CURDATE() - INTERVAL 30 DAY, 'paid'),
  (3, 'Pago final', 2, 80.00, 7120.00, 3000.00, CURDATE() + INTERVAL 25 DAY, 'partial'),
  (4, 'Pago único', 1, 100.00, 3200.00, 0.00, CURDATE() + INTERVAL 14 DAY, 'pending'),
  (5, 'Pago completo', 1, 100.00, 9500.00, 9500.00, CURDATE() - INTERVAL 10 DAY, 'paid');

INSERT INTO group_history (group_id, action, table_affected, record_id, changed_by, changed_at, notes)
SELECT id, 'created', 'hotel_groups', id, created_by, created_at, 'Grupo creado' FROM hotel_groups;

-- ---------------------------------------------------------
-- 5. Caja: ayer cerrado entero; hoy, noche cerrada y mañana abierta.
-- Esperado = fondo + cobros en efectivo - vales pendientes.
-- ---------------------------------------------------------
INSERT INTO cashier_shifts (id, shift_date, shift_type, status, initial_fund, income, cash_counted, cash_expected, difference, payments_total, grand_total, opened_by, closed_by_id, closed_at) VALUES
  (1, CURDATE() - INTERVAL 1 DAY, 'night', 'closed', 200.00, 150.00, 350.00, 350.00, 0.00, 290.00, 440.00, @recep2, @recep2, NOW() - INTERVAL 1 DAY),
  (2, CURDATE() - INTERVAL 1 DAY, 'morning', 'closed', 200.00, 420.00, 615.00, 620.00, -5.00, 890.00, 1310.00, @recep1, @recep1, NOW() - INTERVAL 1 DAY),
  (3, CURDATE() - INTERVAL 1 DAY, 'afternoon', 'closed', 200.00, 310.00, 510.00, 510.00, 0.00, 540.00, 850.00, @recep2, @recep2, NOW() - INTERVAL 1 DAY),
  (4, CURDATE() - INTERVAL 1 DAY, 'closing', 'closed', 200.00, 90.00, 290.00, 290.00, 0.00, 220.00, 310.00, @recep1, @recep1, NOW() - INTERVAL 1 DAY),
  (5, CURDATE(), 'night', 'closed', 200.00, 120.00, 300.00, 300.00, 0.00, 150.00, 270.00, @recep2, @recep2, NOW() - INTERVAL 3 HOUR),
  (6, CURDATE(), 'morning', 'open', 200.00, 0.00, 0.00, 180.00, 0.00, 0.00, 0.00, @recep1, NULL, NULL);

INSERT IGNORE INTO cashier_shift_users (shift_id, user_id, is_primary) VALUES
  (1, @recep2, 1), (2, @recep1, 1), (2, @recep2, 0), (3, @recep2, 1),
  (4, @recep1, 1), (5, @recep2, 1), (6, @recep1, 1);

INSERT INTO cashier_payments (shift_id, payment_method_id, amount)
SELECT p.shift_id, p.method_id, p.amount FROM (
            SELECT 1 shift_id, @pm_card method_id, 190.00 amount
  UNION ALL SELECT 1, @pm_transfer, 100.00
  UNION ALL SELECT 2, @pm_card, 650.00
  UNION ALL SELECT 2, @pm_bacs, 140.00
  UNION ALL SELECT 2, @pm_web, 100.00
  UNION ALL SELECT 3, @pm_card, 380.00
  UNION ALL SELECT 3, @pm_transfer, 160.00
  UNION ALL SELECT 4, @pm_card, 220.00
  UNION ALL SELECT 5, @pm_card, 100.00
  UNION ALL SELECT 5, @pm_bacs, 50.00
) p WHERE p.method_id IS NOT NULL;

-- Totales de los turnos cerrados a partir de los pagos que se hayan creado
UPDATE cashier_shifts s
SET s.payments_total = (SELECT COALESCE(SUM(amount), 0) FROM cashier_payments WHERE shift_id = s.id),
    s.grand_total = s.income + (SELECT COALESCE(SUM(amount), 0) FROM cashier_payments WHERE shift_id = s.id);

-- Efectivo contado de los turnos cerrados, en billetes de 50 y 10 y monedas de 5
INSERT INTO cashier_denominations (shift_id, denomination, quantity)
SELECT id, 50.00, FLOOR(cash_counted / 50) FROM cashier_shifts WHERE status = 'closed';
INSERT INTO cashier_denominations (shift_id, denomination, quantity)
SELECT id, 10.00, FLOOR(MOD(cash_counted, 50) / 10) FROM cashier_shifts WHERE status = 'closed';
INSERT INTO cashier_denominations (shift_id, denomination, quantity)
SELECT id, 5.00, MOD(cash_counted, 10) / 5 FROM cashier_shifts WHERE status = 'closed';

-- Un vale ya justificado (ayer) y otro pendiente desde la noche de hoy
INSERT INTO cashier_vouchers (id, amount, reason, status, justified_at, created_at, created_by) VALUES
  (1, 15.00, 'Compra de material de oficina', 'justified', NOW() - INTERVAL 1 DAY + INTERVAL 2 HOUR, NOW() - INTERVAL 1 DAY, @recep1),
  (2, 20.00, 'Taxi para un huésped', 'pending', NULL, NOW() - INTERVAL 4 HOUR, @recep2);
INSERT INTO cashier_shift_vouchers (shift_id, voucher_id) VALUES (2, 1), (5, 2);

-- El trigger de cashier_shifts puede haber creado filas al ajustar los totales
DELETE FROM cashier_daily;
INSERT INTO cashier_daily (date, total_cash, total_card, total_bacs, total_web_payment, total_transfer, total_other, grand_total, status, closed_by, closed_at)
SELECT s.shift_date,
       SUM(s.income),
       COALESCE((SELECT SUM(p.amount) FROM cashier_payments p JOIN cashier_shifts x ON x.id = p.shift_id WHERE x.shift_date = s.shift_date AND p.payment_method_id = @pm_card), 0),
       COALESCE((SELECT SUM(p.amount) FROM cashier_payments p JOIN cashier_shifts x ON x.id = p.shift_id WHERE x.shift_date = s.shift_date AND p.payment_method_id = @pm_bacs), 0),
       COALESCE((SELECT SUM(p.amount) FROM cashier_payments p JOIN cashier_shifts x ON x.id = p.shift_id WHERE x.shift_date = s.shift_date AND p.payment_method_id = @pm_web), 0),
       COALESCE((SELECT SUM(p.amount) FROM cashier_payments p JOIN cashier_shifts x ON x.id = p.shift_id WHERE x.shift_date = s.shift_date AND p.payment_method_id = @pm_transfer), 0),
       0.00,
       SUM(s.grand_total),
       'closed', @admin, NOW() - INTERVAL 1 DAY + INTERVAL 1 HOUR
FROM cashier_shifts s
WHERE s.shift_date = CURDATE() - INTERVAL 1 DAY
GROUP BY s.shift_date;

INSERT INTO cashier_history (shift_id, action, table_affected, record_id, changed_by, changed_at, notes)
SELECT id, 'created', 'cashier_shifts', id, opened_by, created_at, 'Turno abierto' FROM cashier_shifts;

-- ---------------------------------------------------------
-- 6. Conciliación
-- ---------------------------------------------------------
INSERT INTO conciliation_summary (id, date, total_reception, total_housekeeping, notes, created_by, status) VALUES
  (1, CURDATE() - INTERVAL 2 DAY, 85, 87, 'Diferencia por dos no-shows', @recep1, 'closed'),
  (2, CURDATE() - INTERVAL 1 DAY, 92, 92, 'Cuadra', @recep2, 'closed'),
  (3, CURDATE(), 78, 0, 'Falta el conteo de pisos', @recep1, 'draft');

INSERT INTO conciliation_reception (conciliation_id, reason, direction, value, notes, created_by) VALUES
  (1, 'base_rooms', 'add', 87, 'Ocupación base', @recep1),
  (1, 'no_show', 'subtract', 2, 'Dos no-shows', @recep1),
  (2, 'base_rooms', 'add', 92, 'Ocupación base', @recep2),
  (3, 'base_rooms', 'add', 80, 'Ocupación base', @recep1),
  (3, 'no_show', 'subtract', 2, 'No-shows', @recep1);

INSERT INTO conciliation_housekeeping (conciliation_id, reason, direction, value, notes, created_by) VALUES
  (1, 'cleaned', 'add', 85, 'Habitaciones limpias', @recep1),
  (1, 'do_not_disturb', 'add', 2, 'No molestar', @recep1),
  (2, 'cleaned', 'add', 90, 'Habitaciones limpias', @recep2),
  (2, 'pending_cleaned', 'add', 2, 'Pendientes', @recep2);

-- ---------------------------------------------------------
-- 7. Lista negra (personas y documentos inventados)
-- ---------------------------------------------------------
INSERT INTO blacklist_entries (guest_name, document_type, document_number, check_in_date, check_out_date, reason, severity, comments, images, created_by) VALUES
  ('Huésped Ejemplo A', 'PASSPORT', 'XX0000001', CURDATE() - INTERVAL 60 DAY, CURDATE() - INTERVAL 57 DAY, 'Daños en la habitación', 'HIGH', 'Televisor roto y manchas en la moqueta. Factura pendiente de 450 €.', JSON_ARRAY(), @recep1),
  ('Huésped Ejemplo B', 'DNI', '00000000T', CURDATE() - INTERVAL 30 DAY, CURDATE() - INTERVAL 28 DAY, 'Comportamiento agresivo', 'CRITICAL', 'Insultos al personal de recepción.', JSON_ARRAY(), @recep2),
  ('Huésped Ejemplo C', 'PASSPORT', 'XX0000002', CURDATE() - INTERVAL 90 DAY, CURDATE() - INTERVAL 88 DAY, 'Impago', 'MEDIUM', 'Se fue sin pagar el minibar: 85 €.', JSON_ARRAY(), @recep1);

-- ---------------------------------------------------------
-- 8. Mantenimiento
-- ---------------------------------------------------------
SET @d0 := DATE_FORMAT(CURDATE(), '%d%m%y');
SET @d1 := DATE_FORMAT(CURDATE() - INTERVAL 1 DAY, '%d%m%y');
SET @d2 := DATE_FORMAT(CURDATE() - INTERVAL 2 DAY, '%d%m%y');

INSERT INTO maintenance_reports (id, report_date, title, description, location_type, location_description, room_number, room_out_of_service, priority, status, assigned_to, assigned_type, external_company_name, started_at, resolved_at, resolution_notes, created_by) VALUES
  (CONCAT(@d0, '-001'), NOW() - INTERVAL 3 HOUR, 'Fuga de agua en el baño', 'Gotea el grifo del lavabo', 'room', 'Baño de la habitación', '205', 0, 'high', 'in_progress', @mant, 'internal', NULL, NOW() - INTERVAL 2 HOUR, NULL, NULL, @recep1),
  (CONCAT(@d0, '-002'), NOW() - INTERVAL 2 HOUR, 'Bombilla fundida', 'No funciona la luz de la mesilla', 'room', 'Habitación', '312', 0, 'low', 'reported', NULL, NULL, NULL, NULL, NULL, NULL, @recep2),
  (CONCAT(@d0, '-003'), NOW() - INTERVAL 1 HOUR, 'El aire no enfría', 'El aire acondicionado echa aire caliente', 'room', 'Habitación', '418', 1, 'urgent', 'assigned', @mant, 'internal', NULL, NULL, NULL, NULL, @recep1),
  (CONCAT(@d1, '-001'), NOW() - INTERVAL 1 DAY, 'Puerta atascada', 'La puerta de la piscina no cierra bien', 'common_area', 'Zona de piscina', NULL, 0, 'medium', 'completed', @mant, 'internal', NULL, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 20 HOUR, 'Bisagra ajustada', @recep2),
  (CONCAT(@d2, '-001'), NOW() - INTERVAL 2 DAY, 'Revisión de ascensores', 'Mantenimiento preventivo mensual', 'facilities', 'Ascensores', NULL, 0, 'medium', 'waiting', NULL, 'external', 'Empresa Ejemplo Ascensores', NULL, NULL, NULL, @admin);

INSERT INTO maintenance_history (report_id, action, changed_by, changed_at)
SELECT id, 'created', created_by, report_date FROM maintenance_reports;
INSERT INTO maintenance_history (report_id, action, field_changed, old_value, new_value, changed_by, changed_at) VALUES
  (CONCAT(@d0, '-001'), 'assigned', 'assigned_to', NULL, @mant, @admin, NOW() - INTERVAL 150 MINUTE),
  (CONCAT(@d0, '-001'), 'status_changed', 'status', 'assigned', 'in_progress', @mant, NOW() - INTERVAL 2 HOUR),
  (CONCAT(@d1, '-001'), 'status_changed', 'status', 'in_progress', 'completed', @mant, NOW() - INTERVAL 20 HOUR);

-- ---------------------------------------------------------
-- 9. Backoffice (proveedores y facturas inventados, sin PDF)
-- Categorías buscadas por nombre al principio del script
-- ---------------------------------------------------------
INSERT INTO bo_suppliers (id, name, cif, default_category_id, periodicity, payment_method, email, is_active, created_by) VALUES
  (1, 'Proveedor Ejemplo Electricidad', 'A00000001', @cat_elec, 'monthly', 'direct_debit', 'facturas@electricidad.example', 1, @admin),
  (2, 'Proveedor Ejemplo Agua', 'B00000002', @cat_agua, 'bimonthly', 'direct_debit', 'clientes@agua.example', 1, @admin),
  (3, 'Proveedor Ejemplo Lavandería', 'B00000003', @cat_lav, 'monthly', 'transfer', 'admin@lavanderia.example', 1, @admin),
  (4, 'Proveedor Ejemplo Reparaciones', 'B00000004', @cat_rep, 'on_demand', 'transfer', 'info@reparaciones.example', 1, @admin),
  (5, 'Proveedor Ejemplo Amenities', 'A00000005', @cat_ame, 'quarterly', 'transfer', 'pedidos@amenities.example', 1, @admin);

INSERT INTO bo_invoices (id, invoice_number, supplier_id, category_id, amount_without_vat, amount_with_vat, vat_percentage, invoice_date, received_date, due_date, paid_date, status, payment_method, validated_by, validated_at, created_by) VALUES
  (1, 'ELEC-0001', 1, @cat_elec, 2450.00, 2964.50, 21.00, CURDATE() - INTERVAL 15 DAY, CURDATE() - INTERVAL 14 DAY, CURDATE() + INTERVAL 15 DAY, NULL, 'validated', 'direct_debit', @admin, NOW() - INTERVAL 10 DAY, @admin),
  (2, 'ELEC-0002', 1, @cat_elec, 2680.00, 3242.80, 21.00, CURDATE() - INTERVAL 5 DAY, CURDATE() - INTERVAL 4 DAY, CURDATE() + INTERVAL 25 DAY, NULL, 'pending', 'direct_debit', NULL, NULL, @admin),
  (3, 'AGUA-0001', 2, @cat_agua, 890.00, 979.00, 10.00, CURDATE() - INTERVAL 20 DAY, CURDATE() - INTERVAL 18 DAY, CURDATE() - INTERVAL 5 DAY, CURDATE() - INTERVAL 5 DAY, 'paid', 'direct_debit', @admin, NOW() - INTERVAL 15 DAY, @admin),
  (4, 'LAV-0089', 3, @cat_lav, 1250.00, 1512.50, 21.00, CURDATE() - INTERVAL 10 DAY, CURDATE() - INTERVAL 9 DAY, CURDATE() + INTERVAL 20 DAY, NULL, 'pending', 'transfer', NULL, NULL, @admin),
  (5, 'REP-0045', 4, @cat_rep, 650.00, 786.50, 21.00, CURDATE() - INTERVAL 8 DAY, CURDATE() - INTERVAL 7 DAY, CURDATE() + INTERVAL 22 DAY, NULL, 'validated', 'transfer', @admin, NOW() - INTERVAL 5 DAY, @admin),
  (6, 'AME-0001', 5, @cat_ame, 3200.00, 3872.00, 21.00, CURDATE() - INTERVAL 30 DAY, CURDATE() - INTERVAL 28 DAY, CURDATE() - INTERVAL 10 DAY, CURDATE() - INTERVAL 10 DAY, 'paid', 'transfer', @admin, NOW() - INTERVAL 20 DAY, @admin);

INSERT INTO bo_invoice_history (invoice_id, action, changed_by, changed_at)
SELECT id, 'created', created_by, received_date FROM bo_invoices;
INSERT INTO bo_invoice_history (invoice_id, action, field_changed, old_value, new_value, changed_by, changed_at)
SELECT id, 'validated', 'status', 'pending', 'validated', validated_by, validated_at FROM bo_invoices WHERE validated_at IS NOT NULL;
INSERT INTO bo_invoice_history (invoice_id, action, field_changed, old_value, new_value, changed_by, changed_at)
SELECT id, 'paid', 'status', 'validated', 'paid', @admin, paid_date FROM bo_invoices WHERE status = 'paid';

-- ---------------------------------------------------------
-- 10. F&B: ingresos de los últimos 30 días por categoría
-- ---------------------------------------------------------
INSERT INTO fnb_daily_revenue (date, category_code, amount)
WITH RECURSIVE days (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM days WHERE n < 30)
SELECT CURDATE() - INTERVAL d.n DAY, c.code,
       ROUND(base.amount * (0.75 + MOD(d.n * 7 + CAST(c.code AS UNSIGNED), 50) / 100), 2)
FROM days d
JOIN fnb_category c
JOIN (SELECT '21110' code, 900.00 amount UNION ALL SELECT '21124', 350.00
      UNION ALL SELECT '21120', 180.00 UNION ALL SELECT '21111', 620.00
      UNION ALL SELECT '21267', 240.00 UNION ALL SELECT '21112', 780.00
      UNION ALL SELECT '21307', 410.00) base ON base.code = c.code;

-- ---------------------------------------------------------
-- 11. Mensajería y notificaciones
-- ---------------------------------------------------------
INSERT INTO conversations (id, type, name, created_by) VALUES
  (1, 'dm', NULL, @admin),
  (2, 'group', 'Recepción', @admin);

INSERT IGNORE INTO conversation_participants (conversation_id, user_id, is_admin, is_active) VALUES
  (1, @admin, 1, 1), (1, @recep1, 0, 1),
  (2, @admin, 1, 1), (2, @recep1, 0, 1), (2, @recep2, 0, 1);

INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES
  (1, @admin, '¿Puedes revisar la conciliación de hoy antes de las 12?', NOW() - INTERVAL 2 HOUR),
  (1, @recep1, 'Sí, en cuanto pisos me pase el conteo.', NOW() - INTERVAL 1 HOUR),
  (2, @admin, 'Buenos días. Mañana llega el grupo Congreso Tecnología.', NOW() - INTERVAL 4 HOUR),
  (2, @recep2, 'Las llaves del grupo ya están preparadas.', NOW() - INTERVAL 2 HOUR);

INSERT INTO notifications (id, module, group_id, related_to, title, message, priority, status, scheduled_for, sent_at) VALUES
  (1, 'groups', 1, 'payment', 'Pago pendiente: Congreso Tecnología', 'El segundo pago de 5000 € vence en 7 días.', 'high', 'sent', NULL, NOW() - INTERVAL 1 DAY),
  (2, 'groups', 2, 'rooming', 'Rooming pendiente: Viaje Cultural Sénior', 'Faltan 7 días para la llegada y no hay rooming.', 'urgent', 'sent', NULL, NOW() - INTERVAL 5 HOUR),
  (3, 'groups', 4, 'arrival', 'Llegada próxima: Equipo Deportivo Juvenil', 'El grupo llega en 21 días. Revisar preparativos.', 'medium', 'pending', CURDATE() + INTERVAL 14 DAY, NULL),
  (4, 'system', NULL, 'general', 'Mantenimiento programado', 'La aplicación no estará disponible el domingo de 02:00 a 04:00.', 'low', 'sent', NULL, NOW() - INTERVAL 2 DAY);

INSERT IGNORE INTO notification_recipients (notification_id, user_id, is_read, read_at) VALUES
  (1, @groups, 1, NOW() - INTERVAL 20 HOUR), (1, @admin, 0, NULL),
  (2, @groups, 0, NULL), (2, @admin, 0, NULL),
  (3, @groups, 0, NULL),
  (4, @admin, 1, NOW() - INTERVAL 2 DAY), (4, @recep1, 1, NOW() - INTERVAL 1 DAY),
  (4, @recep2, 0, NULL), (4, @mant, 0, NULL);

-- ---------------------------------------------------------
-- Resumen
-- ---------------------------------------------------------
COMMIT;

SELECT 'logbooks' tabla, COUNT(*) filas FROM logbooks
UNION ALL SELECT 'parking_bookings', COUNT(*) FROM parking_bookings
UNION ALL SELECT 'hotel_groups', COUNT(*) FROM hotel_groups
UNION ALL SELECT 'cashier_shifts', COUNT(*) FROM cashier_shifts
UNION ALL SELECT 'conciliation_summary', COUNT(*) FROM conciliation_summary
UNION ALL SELECT 'blacklist_entries', COUNT(*) FROM blacklist_entries
UNION ALL SELECT 'maintenance_reports', COUNT(*) FROM maintenance_reports
UNION ALL SELECT 'bo_invoices', COUNT(*) FROM bo_invoices
UNION ALL SELECT 'fnb_daily_revenue', COUNT(*) FROM fnb_daily_revenue
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
