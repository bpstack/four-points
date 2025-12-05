-- =========================================================
-- MASTER_INSTALL.sql
-- Instalación completa del sistema hotel_db
-- Ejecuta todos los scripts en orden correcto
-- =========================================================

-- ============================================
-- CONFIGURACIÓN INICIAL
-- ============================================
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

SELECT '========================================' AS separador;
SELECT '🚀 INICIANDO INSTALACIÓN COMPLETA' AS mensaje;
SELECT '========================================' AS separador;

-- ============================================
-- PASO 1: CREAR BASE DE DATOS
-- ============================================
SOURCE 01_create_database.sql;

-- ============================================
-- PASO 2: TABLAS CORE
-- ============================================
SOURCE 02_core_tables.sql;

-- ============================================
-- PASO 3: SISTEMA LOGBOOK
-- ============================================
SOURCE 03_logbook_tables.sql;

-- ============================================
-- PASO 4: TABLAS PARKING
-- ============================================
SOURCE 04_parking_tables.sql;

-- ============================================
-- PASO 5: FUNCIONES Y PROCEDIMIENTOS
-- ============================================
SOURCE 05_parking_functions_procedures.sql;

-- ============================================
-- PASO 6: TRIGGERS
-- ============================================
SOURCE 06_parking_triggers.sql;

-- ============================================
-- PASO 7: DATOS INICIALES
-- ============================================
SOURCE 07_parking_initial_data.sql;

-- ============================================
-- PASO 8 (OPCIONAL): DATOS DE EJEMPLO
-- Descomentar la siguiente línea para incluir datos de prueba
-- ============================================
-- SOURCE 08_parking_sample_data.sql;

-- ============================================
-- REACTIVAR CONFIGURACIONES
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

SELECT '========================================' AS separador;
SELECT '✅ INSTALACIÓN COMPLETADA' AS mensaje;
SELECT '========================================' AS separador;

USE hotel_db;

-- Verificar tablas
SELECT 
    'Tablas totales' AS componente,
    COUNT(*) AS total
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hotel_db';

-- Verificar funciones
SELECT 
    'Funciones' AS componente,
    COUNT(*) AS total
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db' 
  AND ROUTINE_TYPE = 'FUNCTION';

-- Verificar procedimientos
SELECT 
    'Procedimientos' AS componente,
    COUNT(*) AS total
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db' 
  AND ROUTINE_TYPE = 'PROCEDURE';

-- Verificar triggers
SELECT 
    'Triggers' AS componente,
    COUNT(*) AS total
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'hotel_db';

-- Verificar datos parking
SELECT 'Plazas parking' AS componente, COUNT(*) AS total FROM parking_spots
UNION ALL
SELECT 'Tarifas' AS componente, COUNT(*) AS total FROM parking_rates
UNION ALL
SELECT 'Disponibilidad' AS componente, COUNT(*) AS total FROM parking_availability;

-- Verificar charset
SELECT 
    'Charset/Collation' AS componente,
    CONCAT(@@character_set_database, ' / ', @@collation_database) AS valor;

SELECT '========================================' AS separador;
SELECT '🎉 Sistema hotel_db listo para usar' AS mensaje;
SELECT 'Lee el README.md para más información' AS nota;
SELECT '========================================' AS separador;
