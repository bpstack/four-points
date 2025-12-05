-- =========================================================
-- 01_create_database.sql
-- Crea la base de datos hotel_db con UTF-8
-- =========================================================

DROP DATABASE IF EXISTS hotel_db;
CREATE DATABASE hotel_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE hotel_db;

SELECT 'Base de datos hotel_db creada correctamente con UTF-8' AS resultado;