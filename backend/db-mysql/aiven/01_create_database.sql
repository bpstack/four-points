-- =========================================================
-- 01_create_database.sql (AIVEN)
-- Crea la base de datos hotel_db con UTF-8
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================

DROP DATABASE IF EXISTS hotel_db;
CREATE DATABASE hotel_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_0900_ai_ci;

USE hotel_db;

SELECT 'Base de datos hotel_db creada correctamente con UTF-8 (Aiven)' AS resultado;
