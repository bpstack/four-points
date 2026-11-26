-- =============================================================================
-- ⚠️  FROZEN 2026-05-20 — DO NOT EDIT
-- =============================================================================
-- This file is part of the install base snapshot. All schema changes since
-- 2026-05-20 live in `scripts/AAAAMMDD_*.sql`. Editing this file breaks the
-- single-source-of-truth invariant. See MIGRATIONS_POLICY.md.
-- =============================================================================

-- =========================================================
-- 15_demo_user.sql (AIVEN)
-- Usuario demo para demostrar la aplicación.
--
-- ⚠️ DESHABILITADO 2026-05-12 (Sprint 0, H1-12). Razón: introducción de
-- datos reales en aiven; sin multi-tenancy no es seguro mantener un
-- usuario público que comparte el mismo schema. La cuenta se queda en
-- BD con is_active=0 y un password aleatorio (no es 'demo987654').
-- MASTER_INSTALL.sql tiene este archivo comentado, por lo que un
-- redeploy NO recrea el usuario. Para reactivar: cambiar is_active=1
-- y resetear password con bcrypt nuevo.
--
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================
USE hotel_db;

-- =========================================================
-- TABLA: demo_activity_log
-- Registra intentos de escritura bloqueados de usuarios demo
-- =========================================================
CREATE TABLE IF NOT EXISTS demo_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(36),
  username VARCHAR(100),
  method VARCHAR(10) NOT NULL,
  route VARCHAR(255) NOT NULL,
  body_preview TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  blocked BOOLEAN DEFAULT TRUE,
  INDEX idx_demo_log_timestamp (timestamp),
  INDEX idx_demo_log_username (username),
  INDEX idx_demo_log_route (route)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT 'Tabla demo_activity_log creada' AS resultado;

-- =========================================================
-- ROLES Y USUARIOS DEMO
-- =========================================================

-- 1. Agregar rol demo-admin
INSERT INTO roles (id, name) VALUES (7, 'demo-admin')
ON DUPLICATE KEY UPDATE name = 'demo-admin';

SELECT 'Rol demo-admin creado (id=7)' AS resultado;

-- 2. Crear usuario demo (DESHABILITADO 2026-05-12)
-- Password aleatorio (no en plano en ningun sitio). is_active=0.
INSERT INTO users (id, username, email, password, role_id, is_active)
VALUES (
  'demo-user-0000-0000-000000000001',
  'demo',
  'demo@four-points.local',
  '$2b$10$Mm0w4Yuj4MAUdYsKHidLoOdxJcIFe9GhoWvabrqVd6I7jFC/YzgI6',
  7,
  0
)
ON DUPLICATE KEY UPDATE
  password = '$2b$10$Mm0w4Yuj4MAUdYsKHidLoOdxJcIFe9GhoWvabrqVd6I7jFC/YzgI6',
  role_id = 7,
  is_active = 0;

SELECT 'Usuario demo creado (AIVEN)' AS resultado;

-- Verificación
SELECT u.id, u.username, u.email, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.username = 'demo';
