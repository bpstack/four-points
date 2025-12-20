-- =========================================================
-- 07_parking_initial_data.sql (AIVEN)
-- Datos iniciales del sistema de parking
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================
USE hotel_db;

-- ============================================
-- 1. PLAZAS (20 plazas: 10 en -2, 10 en -3)
-- ============================================

INSERT INTO parking_spots (level_code, spot_number, spot_type, is_active) VALUES
-- PLANTA -2 (10 plazas)
('-2', 1, 'normal', 1),
('-2', 2, 'ancha', 1),
('-2', 3, 'mas_ancha', 1),
('-2', 4, 'normal', 1),
('-2', 5, 'esquina', 1),
('-2', 6, 'accesible', 1),
('-2', 7, 'normal', 1),
('-2', 8, 'normal', 1),
('-2', 9, 'estrecha_bicis', 1),
('-2', 10, 'normal', 1),
-- PLANTA -3 (10 plazas)
('-3', 1, 'normal', 1),
('-3', 2, 'ancha', 1),
('-3', 3, 'mas_ancha', 1),
('-3', 4, 'normal', 1),
('-3', 5, 'esquina', 1),
('-3', 6, 'accesible', 1),
('-3', 7, 'normal', 1),
('-3', 8, 'normal', 1),
('-3', 9, 'estrecha_bicis', 1),
('-3', 10, 'normal', 1);

SELECT CONCAT('Insertadas ', COUNT(*), ' plazas de parking') AS status
FROM parking_spots;

-- ============================================
-- 2. TARIFAS (1-30 días)
-- ============================================

INSERT INTO parking_rates (days, price, description) VALUES
(1, 15.00, '1 día'),
(2, 27.00, '2 días'),
(3, 39.00, '3 días'),
(4, 51.00, '4 días'),
(5, 63.00, '5 días'),
(6, 75.00, '6 días'),
(7, 84.00, '7 días'),
(8, 96.00, '8 días'),
(9, 108.00, '9 días'),
(10, 120.00, '10 días'),
(11, 132.00, '11 días'),
(12, 144.00, '12 días'),
(13, 156.00, '13 días'),
(14, 168.00, '14 días'),
(15, 180.00, '15 días'),
(16, 192.00, '16 días'),
(17, 204.00, '17 días'),
(18, 216.00, '18 días'),
(19, 228.00, '19 días'),
(20, 240.00, '20 días'),
(21, 252.00, '21 días'),
(22, 264.00, '22 días'),
(23, 276.00, '23 días'),
(24, 288.00, '24 días'),
(25, 300.00, '25 días'),
(26, 312.00, '26 días'),
(27, 324.00, '27 días'),
(28, 336.00, '28 días'),
(29, 348.00, '29 días'),
(30, 360.00, '30 días');

SELECT CONCAT('Insertadas ', COUNT(*), ' tarifas') AS status
FROM parking_rates;

-- ============================================
-- 3. GENERAR DISPONIBILIDAD INICIAL
-- ============================================

CALL generate_availability();

SELECT '========================================' AS separador;
SELECT 'DATOS INICIALES CARGADOS (Aiven)' AS resultado;
SELECT '========================================' AS separador;
