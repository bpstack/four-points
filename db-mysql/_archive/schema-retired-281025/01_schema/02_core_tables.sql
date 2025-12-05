-- =========================================================
-- 02_core_tables.sql
-- ✅ CORREGIDO: Sistema de roles unificado
-- Tablas principales: roles, departments, users
-- =========================================================
USE hotel_db;

-- Roles
CREATE TABLE roles (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Departamentos
CREATE TABLE departments (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuarios con role_id integrado
CREATE TABLE users (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  username   VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role_id    INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active  TINYINT(1) DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) 
    REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tablas core creadas: roles, departments, users (con role_id)' AS resultado;