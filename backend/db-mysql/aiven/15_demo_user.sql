-- =========================================================
-- 15_demo_user.sql (AIVEN)
-- Usuario demo para demostrar la aplicación / demo / demo987654
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================
USE hotel_db;

-- 1. Agregar rol demo-admin
INSERT INTO roles (id, name) VALUES (7, 'demo-admin')
ON DUPLICATE KEY UPDATE name = 'demo-admin';

SELECT 'Rol demo-admin creado (id=7)' AS resultado;

-- 2. Crear usuario demo
-- Password: demo987654 (bcrypt hash con rounds=10)
INSERT INTO users (id, username, email, password, role_id, is_active)
VALUES (
  'demo-user-0000-0000-000000000001',
  'demo',
  'demo@four-points.local',
  '$2b$10$DDRolzhYqUVClahO.ycw4uJe3yte5ly.9cd9RNoM1gvK6ZhyXsbjK',
  7,
  1
)
ON DUPLICATE KEY UPDATE 
  password = '$2b$10$DDRolzhYqUVClahO.ycw4uJe3yte5ly.9cd9RNoM1gvK6ZhyXsbjK',
  role_id = 7,
  is_active = 1;

SELECT 'Usuario demo creado (AIVEN)' AS resultado;

-- Verificación
SELECT u.id, u.username, u.email, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.username = 'demo';
