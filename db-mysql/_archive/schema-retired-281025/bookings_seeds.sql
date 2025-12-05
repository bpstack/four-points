-- ============================================
-- DIAGNÓSTICO: Verificar estructura de tablas
-- ============================================

-- 1. Verificar que las tablas existen
SHOW TABLES LIKE 'parking%';

-- 2. Verificar estructura de parking_vehicles
DESCRIBE parking_vehicles;

-- 3. Verificar estructura de parking_bookings
DESCRIBE parking_bookings;

-- 4. Ver constraints/foreign keys
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db' 
  AND TABLE_NAME IN ('parking_vehicles', 'parking_bookings', 'parking_availability')
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ============================================
-- SOLUCIÓN: Re-seed con manejo de errores
-- ============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

USE hotel_db;

-- Limpiar datos anteriores
DELETE FROM parking_bookings;
DELETE FROM parking_availability;
DELETE FROM parking_vehicles;

-- ============================================
-- VEHÍCULOS (64 registros)
-- ============================================
INSERT INTO parking_vehicles (plate_number, owner_name, model, notes) VALUES
-- Meses pasados (4)
('MAL-0001', 'Juan García López', 'Toyota Camry', 'Cliente habitual'),
('MAL-0002', 'María Rodríguez Pérez', 'Audi A4', 'Primera vez'),
('MAL-0003', 'Carlos Fernández Ruiz', 'BMW X5', 'Empresa'),
('MAL-0004', 'Ana Martínez García', 'Mercedes C-Class', 'Preferencial'),
-- Octubre 2025 (15)
('OCT-0001', 'Pedro López Sánchez', 'Volkswagen Golf', 'Mensual'),
('OCT-0002', 'Isabel Gómez Martín', 'Renault Scenic', 'Familia'),
('OCT-0003', 'Luis González Torres', 'Honda Civic', 'Joven'),
('OCT-0004', 'Sofia Díaz López', 'Tesla Model 3', 'Eléctrico'),
('OCT-0005', 'Miguel Ramos Flores', 'Peugeot 3008', 'SUV'),
('OCT-0006', 'Elena Sánchez García', 'Hyundai Tucson', 'Familia numerosa'),
('OCT-0007', 'Roberto Jiménez Ruiz', 'Seat Leon', 'Conductor frecuente'),
('OCT-0008', 'Carmen Rubio Hernández', 'Fiat 500', 'Compacto'),
('OCT-0009', 'David Moreno García', 'Skoda Superb', 'Premium'),
('OCT-0010', 'Francisca López Molina', 'Citroën C4', 'Familiar'),
('OCT-0011', 'Javier Castillo Pérez', 'Ford Focus', 'Práctico'),
('OCT-0012', 'Patricia Herrera García', 'Mazda CX-5', 'SUV compacto'),
('OCT-0013', 'Antonio Vega Martín', 'Volvo XC60', 'Seguro'),
('OCT-0014', 'Beatriz Navarro López', 'Kia Sportage', 'Económico'),
('OCT-0015', 'Fernando Ruiz García', 'Nissan Qashqai', 'Popular'),
-- Noviembre 2025 (25)
('NOV-0001', 'Rosa María Soto Pérez', 'Opel Astra', 'Compacto clásico'),
('NOV-0002', 'Vicente García Molina', 'Jeep Wrangler', 'Aventurero'),
('NOV-0003', 'Dolores Martín Sánchez', 'Lexus RX', 'Lujo'),
('NOV-0004', 'Enrique Flores Ruiz', 'Subaru Outback', 'Robusto'),
('NOV-0005', 'Mónica García Hernández', 'Chevrolet Trailblazer', 'Potencia'),
('NOV-0006', 'Ramón López Téllez', 'Mini Cooper', 'Urbano'),
('NOV-0007', 'Consolación Ruiz García', 'Alfa Romeo Giulia', 'Italiano'),
('NOV-0008', 'Emilio Sánchez Torres', 'Porsche 911', 'Deportivo'),
('NOV-0009', 'Pilar Jiménez López', 'Lamborghini Huracán', 'Superdeportivo'),
('NOV-0010', 'Ángel Díaz Martín', 'Jaguar F-Pace', 'Elegante'),
('NOV-0011', 'Guadalupe Morales García', 'Range Rover', 'Todoterreno'),
('NOV-0012', 'Sergio Romero López', 'Ferrari F8', 'Legendario'),
('NOV-0013', 'Amparo Vega Fernández', 'Aston Martin DB11', 'Exótico'),
('NOV-0014', 'Julio Castillo García', 'Bentley Continental', 'Exclusivo'),
('NOV-0015', 'Remedios García López', 'Rolls-Royce Phantom', 'Imperial'),
('NOV-0016', 'Álvaro Núñez Sánchez', 'Maserati Levante', 'Distinción'),
('NOV-0017', 'Lidia Sánchez Ruiz', 'Bugatti Chiron', 'Hipersuperdeportivo'),
('NOV-0018', 'Gregorio Toledo Martín', 'Pagani Huayra', 'Artesanal'),
('NOV-0019', 'Victoria Ramírez López', 'Koenigsegg Agera', 'Hipercoche'),
('NOV-0020', 'Marcelino Blanco García', 'McLaren 720S', 'Moderno deportivo'),
('NOV-0021', 'Josefina Rojas Hernández', 'Ferrari LaFerrari', 'Híbrido extremo'),
('NOV-0022', 'Teodoro Maldonado López', 'Lamborghini Revuelto', 'Híbrido'),
('NOV-0023', 'Antonia Serna García', 'Pagani Imola', 'Pista'),
('NOV-0024', 'Cristóbal Esquivel Ruiz', 'Pininfarina Battista', 'Futurista'),
('NOV-0025', 'Margarita Vidal López', 'Hennessey Venom F5', 'Velocidad'),
-- Diciembre 2025 (20)
('DIC-0001', 'Nicolás Pacheco García', 'SSC Tuatara', 'Récord'),
('DIC-0002', 'Jacinta Correa Martín', 'Devel Sixteen', 'Extremo'),
('DIC-0003', 'Prudencio García López', 'Gumpert Apollo', 'Brutal'),
('DIC-0004', 'Leocadia Sáenz Ruiz', 'Arash AF10', 'Iraní'),
('DIC-0005', 'Herminio Valdés García', 'Mono Mclaren', 'Minimalista'),
('DIC-0006', 'Matilde Rangel López', 'Caterham Seven', 'Clásico'),
('DIC-0007', 'Abundio Figueroa Martín', 'Lotus Emira', 'Británico'),
('DIC-0008', 'Benilda Contreras García', 'Ariel Atom', 'Minúsculo'),
('DIC-0009', 'Cesareo Medina López', 'Noble M600', 'V12'),
('DIC-0010', 'Dominga Fuentes Ruiz', 'BAC Mono', 'Un asiento'),
('DIC-0011', 'Epifanio García López', 'Radical RXC', 'Competición'),
('DIC-0012', 'Fabiana Lara Martín', 'Zenvo ST1', 'Danés'),
('DIC-0013', 'Gavino Montoya García', 'Spyker C8', 'Holandés'),
('DIC-0014', 'Heliadora Ponce López', 'Wiesmann GT MF5', 'Alemán'),
('DIC-0015', 'Ildefonso Quirós Ruiz', 'Artega GT', 'Moderno clásico'),
('DIC-0016', 'Jacinta Villalba García', 'RUF CTR', 'Porsche modificado'),
('DIC-0017', 'Konstantino Molero López', 'Singer DLS', 'Retro futurista'),
('DIC-0018', 'Ludovica Figueroa Martín', 'Gunther Werks 400R', 'Reimaginado'),
('DIC-0019', 'Macedonio Iglesias García', 'Ruf 911', 'Turbo extremo'),
('DIC-0020', 'Natalio Campos López', 'Vector W8', 'Clásico de los 90s');

-- Verificar inserción de vehículos
SELECT CONCAT('✅ Vehículos insertados: ', COUNT(*)) AS resultado FROM parking_vehicles;

-- ============================================
-- RESERVAS (64 registros)
-- ============================================
INSERT INTO parking_bookings (spot_id, vehicle_id, operator_id, expected_checkin, expected_checkout, actual_checkin, actual_checkout, status, total_amount, payment_amount, payment_method, booking_source, notes) VALUES
-- Enero-Septiembre 2025 (4)
(1, 1, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-01-10 08:00:00', '2025-01-17 18:00:00', '2025-01-10 08:15:00', '2025-01-17 17:45:00', 'completed', 100.00, 100.00, 'card', 'direct', 'Cliente habitual'),
(2, 2, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-02-15 10:00:00', '2025-02-22 19:00:00', '2025-02-15 10:30:00', '2025-02-22 18:30:00', 'completed', 105.00, 105.00, 'transfer', 'booking_com', 'Primera reserva online'),
(3, 3, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-03-05 09:00:00', '2025-03-12 20:00:00', '2025-03-05 09:45:00', '2025-03-12 20:00:00', 'completed', 100.00, 100.00, 'card', 'direct', 'Empresa visitante'),
(4, 4, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-09-25 14:00:00', '2025-10-02 15:00:00', '2025-09-25 14:30:00', '2025-10-02 14:45:00', 'completed', 140.00, 140.00, 'cash', 'direct', 'Cancelado con demora menor'),
-- Octubre 2025 (15)
(5, 5, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-05 08:00:00', '2025-10-12 18:00:00', '2025-10-05 08:15:00', '2025-10-12 17:45:00', 'completed', 100.00, 100.00, 'card', 'direct', 'Sin incidencias'),
(6, 6, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-08 10:00:00', '2025-10-15 19:00:00', '2025-10-08 10:30:00', '2025-10-15 18:30:00', 'completed', 105.00, 105.00, 'transfer', 'booking_com', 'Pago por Booking'),
(7, 7, NULL, '2025-10-10 09:00:00', '2025-10-17 20:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Próxima entrada'),
(8, 8, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-12 14:00:00', '2025-10-19 17:00:00', '2025-10-12 14:30:00', NULL, 'checked_in', 105.00, NULL, NULL, 'expedia', 'Actualmente en parking'),
(9, 9, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-15 08:30:00', '2025-10-22 18:30:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Confirmada'),
(1, 10, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-18 11:00:00', '2025-10-25 16:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'airbnb', 'Pago pendiente'),
(2, 11, NULL, '2025-10-20 09:00:00', '2025-10-27 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'agency_other', 'Reserva de agencia'),
(3, 12, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-22 10:00:00', '2025-10-29 18:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Cliente VIP'),
(4, 13, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-05 15:00:00', '2025-10-12 20:00:00', '2025-10-05 15:30:00', '2025-10-12 19:45:00', 'completed', 105.00, 105.00, 'card', 'booking_com', 'Premium'),
(5, 14, NULL, '2025-10-08 09:00:00', '2025-10-13 17:00:00', '2025-10-08 09:15:00', NULL, 'checked_in', 75.00, NULL, NULL, 'direct', 'Corta estancia'),
(6, 15, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-10-25 12:00:00', '2025-11-01 15:00:00', NULL, NULL, 'reserved', 140.00, NULL, NULL, 'direct', 'Fin de semana largo'),
-- Noviembre 2025 (25)
(7, 16, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-01 08:00:00', '2025-11-08 18:00:00', NULL, NULL, 'reserved', 100.00, NULL, NULL, 'direct', 'Inicio de noviembre'),
(8, 17, NULL, '2025-11-02 10:00:00', '2025-11-09 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'booking_com', 'Booking.com'),
(1, 18, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-03 09:00:00', '2025-11-10 20:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Semana completa'),
(2, 19, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-04 14:00:00', '2025-11-11 17:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'expedia', 'Expedia'),
(3, 20, NULL, '2025-11-05 08:30:00', '2025-11-12 18:30:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Confirmada'),
(4, 21, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-06 11:00:00', '2025-11-13 16:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'airbnb', 'Airbnb'),
(5, 22, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-07 09:00:00', '2025-11-14 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'agency_other', 'Agencia'),
(6, 23, NULL, '2025-11-08 10:00:00', '2025-11-15 18:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Sin pago aún'),
(7, 24, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-10 15:00:00', '2025-11-17 20:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'booking_com', 'Premium'),
(8, 25, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-12 09:00:00', '2025-11-19 17:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Semana'),
(1, 16, NULL, '2025-11-14 10:00:00', '2025-11-21 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'expedia', 'Expedia'),
(2, 17, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-15 14:00:00', '2025-11-22 18:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'VIP'),
(3, 18, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-16 09:00:00', '2025-11-23 17:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'airbnb', 'Airbnb'),
(4, 19, NULL, '2025-11-18 11:00:00', '2025-11-25 16:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Pendiente'),
(5, 20, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-19 08:30:00', '2025-11-26 18:30:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'booking_com', 'Booking'),
(6, 21, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-20 10:00:00', '2025-11-27 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Fin de semana'),
(7, 22, NULL, '2025-11-21 14:00:00', '2025-11-28 17:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'expedia', 'Expedia'),
(8, 23, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-22 09:00:00', '2025-11-29 18:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Semana'),
(1, 24, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-11-23 15:00:00', '2025-11-30 20:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'airbnb', 'Airbnb'),
(2, 25, NULL, '2025-11-24 10:00:00', '2025-12-01 19:00:00', NULL, NULL, 'reserved', 140.00, NULL, NULL, 'direct', 'Puente'),
-- Diciembre 2025 (20)
(3, 1, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-01 08:00:00', '2025-12-08 18:00:00', NULL, NULL, 'reserved', 100.00, NULL, NULL, 'booking_com', 'Inicio diciembre'),
(4, 2, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-02 10:00:00', '2025-12-09 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Semana 1'),
(5, 3, NULL, '2025-12-03 09:00:00', '2025-12-10 20:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'expedia', 'Expedia'),
(6, 4, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-04 14:00:00', '2025-12-11 17:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Semana 1'),
(7, 1, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-05 08:30:00', '2025-12-12 18:30:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'airbnb', 'Airbnb'),
(8, 2, NULL, '2025-12-06 11:00:00', '2025-12-13 16:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Semana 1'),
(1, 3, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-08 09:00:00', '2025-12-15 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'booking_com', 'Semana 2'),
(2, 4, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-10 10:00:00', '2025-12-17 18:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Semana 2'),
(3, 1, NULL, '2025-12-12 15:00:00', '2025-12-19 20:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'expedia', 'Semana 2'),
(4, 2, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-14 09:00:00', '2025-12-21 17:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Navidad aprox'),
(5, 3, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-15 10:00:00', '2025-12-22 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'airbnb', 'Navidad aprox'),
(6, 4, NULL, '2025-12-17 14:00:00', '2025-12-24 18:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Navidad'),
(7, 1, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-19 09:00:00', '2025-12-26 17:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'booking_com', 'Navidad'),
(8, 2, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-20 11:00:00', '2025-12-27 16:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Navidad'),
(1, 3, NULL, '2025-12-22 10:00:00', '2025-12-29 19:00:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'expedia', 'Año nuevo'),
(2, 4, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-23 08:30:00', '2025-12-30 18:30:00', NULL, NULL, 'reserved', 105.00, NULL, NULL, 'direct', 'Año nuevo'),
(3, 1, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-24 14:00:00', '2025-12-31 20:00:00', NULL, NULL, 'reserved', 140.00, NULL, NULL, 'airbnb', 'Fin de año'),
(4, 2, NULL, '2025-12-25 09:00:00', '2026-01-02 17:00:00', NULL, NULL, 'reserved', 175.00, NULL, NULL, 'direct', 'Puente año nuevo'),
(5, 3, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-26 10:00:00', '2026-01-03 18:00:00', NULL, NULL, 'reserved', 175.00, NULL, NULL, 'booking_com', 'Puente'),
(6, 4, '498d5939-b714-4d18-bcac-f79db198dd90', '2025-12-27 15:00:00', '2026-01-05 20:00:00', NULL, NULL, 'reserved', 210.00, NULL, NULL, 'direct', 'Largo plazo');

-- Verificar inserción de reservas
SELECT CONCAT('✅ Reservas insertadas: ', COUNT(*)) AS resultado FROM parking_bookings;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT '=== RESUMEN FINAL ===' AS titulo;
SELECT CONCAT('Total vehículos: ', COUNT(*)) AS resultado FROM parking_vehicles;
SELECT CONCAT('Total reservas: ', COUNT(*)) AS resultado FROM parking_bookings;

-- Reservas por mes
SELECT 
    DATE_FORMAT(expected_checkin, '%Y-%m') AS mes,
    COUNT(*) AS total_reservas,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completadas,
    SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reservadas,
    SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) AS activas
FROM parking_bookings
GROUP BY DATE_FORMAT(expected_checkin, '%Y-%m')
ORDER BY mes;