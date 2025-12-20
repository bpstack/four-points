-- =========================================================
-- MASTER_INSTALL_LOCAL.sql
-- Instalación completa del sistema hotel_db (Local)
-- Collation: utf8mb4_unicode_ci
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
SELECT 'INICIANDO INSTALACIÓN COMPLETA (LOCAL)' AS mensaje;
SELECT '========================================' AS separador;

-- ============================================
-- PASO 1: CREAR BASE DE DATOS
-- ============================================
SOURCE local/01_create_database.sql;

-- ============================================
-- PASO 2: TABLAS CORE (roles, departments, users)
-- ============================================
SOURCE local/02_core_tables.sql;

-- ============================================
-- PASO 3: SISTEMA LOGBOOK
-- ============================================
SOURCE local/03_logbook_tables.sql;

-- ============================================
-- PASO 4-8: PARKING (SOLO LOCAL)
-- ============================================
SOURCE local/04_parking_tables.sql;
SOURCE local/05_parking_functions_triggers.sql;
SOURCE local/06_parking_procedures.sql;
SOURCE local/07_parking_initial_data.sql;
-- SOURCE local/08_parking_sample_data.sql;  -- Descomentar para datos de prueba

-- ============================================
-- PASO 9: CONCILIACIÓN BANCARIA
-- ============================================
SOURCE local/09_conciliation.sql;

-- ============================================
-- PASO 10: GROUP TRACKING
-- ============================================
SOURCE local/10_group-tracking.sql;

-- ============================================
-- PASO 11: CASHIER (CAJA)
-- ============================================
SOURCE local/11_cashier.sql;

-- ============================================
-- PASO 12: BLACKLIST
-- ============================================
SOURCE local/12_blacklist.sql;

-- ============================================
-- PASO 13: MAINTENANCE
-- ============================================
SOURCE local/13_maintenance.sql;

-- ============================================
-- PASO 14: MESSAGES
-- ============================================
SOURCE local/14_messages.sql;

-- ============================================
-- PASO 15: DEMO USER (OPCIONAL)
-- ============================================
-- SOURCE local/15_demo_user.sql;  -- Descomentar para usuario demo

-- ============================================
-- PASO 16: BACKOFFICE
-- ============================================
SOURCE local/16_backoffice.sql;

-- ============================================
-- PASO 17: NOTIFICATIONS
-- ============================================
SOURCE local/17_notifications.sql;

-- ============================================
-- REACTIVAR CONFIGURACIONES
-- ============================================
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SOURCE local/99_verification.sql;

SELECT '========================================' AS separador;
SELECT 'INSTALACIÓN LOCAL COMPLETADA' AS mensaje;
SELECT '========================================' AS separador;
