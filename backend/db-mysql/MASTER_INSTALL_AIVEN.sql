-- =========================================================
-- MASTER_INSTALL_AIVEN.sql
-- Instalación completa del sistema hotel_db (Aiven/Prod)
-- Collation: utf8mb4_0900_ai_ci
-- =========================================================

-- ============================================
-- CONFIGURACIÓN INICIAL
-- ============================================
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_0900_ai_ci';
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

SELECT '========================================' AS separador;
SELECT 'INICIANDO INSTALACIÓN COMPLETA (AIVEN)' AS mensaje;
SELECT '========================================' AS separador;

-- ============================================
-- PASO 1: CREAR BASE DE DATOS
-- ============================================
SOURCE aiven/01_create_database.sql;

-- ============================================
-- PASO 2: TABLAS CORE (roles, departments, users)
-- ============================================
SOURCE aiven/02_core_tables.sql;

-- ============================================
-- PASO 3: SISTEMA LOGBOOK
-- ============================================
SOURCE aiven/03_logbook_tables.sql;

-- ============================================
-- PASO 4-8: PARKING
-- ============================================
SOURCE aiven/04_parking_tables.sql;
SOURCE aiven/05_parking_functions_triggers.sql;
SOURCE aiven/06_parking_procedures.sql;
SOURCE aiven/07_parking_initial_data.sql;
-- SOURCE aiven/08_parking_sample_data.sql;  -- Descomentar para datos de prueba

-- ============================================
-- PASO 9: CONCILIACIÓN BANCARIA
-- ============================================
SOURCE aiven/09_conciliation.sql;

-- ============================================
-- PASO 10: GROUP TRACKING
-- ============================================
SOURCE aiven/10_group-tracking.sql;

-- ============================================
-- PASO 11: CASHIER (CAJA)
-- ============================================
SOURCE aiven/11_cashier.sql;

-- ============================================
-- PASO 12: BLACKLIST
-- ============================================
SOURCE aiven/12_blacklist.sql;

-- ============================================
-- PASO 13: MAINTENANCE
-- ============================================
SOURCE aiven/13_maintenance.sql;

-- ============================================
-- PASO 14: MESSAGES
-- ============================================
SOURCE aiven/14_messages.sql;

-- ============================================
-- PASO 15: DEMO USER (OPCIONAL)
-- ============================================
-- SOURCE aiven/15_demo_user.sql;  -- Descomentar para usuario demo

-- ============================================
-- PASO 17: NOTIFICATIONS
-- ============================================
SOURCE aiven/17_notifications.sql;

-- ============================================
-- REACTIVAR CONFIGURACIONES
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SOURCE aiven/99_verification.sql;

SELECT '========================================' AS separador;
SELECT 'INSTALACIÓN AIVEN COMPLETADA' AS mensaje;
SELECT '========================================' AS separador;
