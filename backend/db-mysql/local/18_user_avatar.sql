-- =========================================================
-- 18_user_avatar.sql (LOCAL)
-- Añade campos para avatar de usuario
-- Usa Cloudinary para almacenamiento de imágenes
-- =========================================================
USE hotel_db;

-- Añadir campos de avatar a la tabla users
ALTER TABLE users
  ADD COLUMN avatar_url VARCHAR(500) NULL DEFAULT NULL,
  ADD COLUMN avatar_public_id VARCHAR(255) NULL DEFAULT NULL;

SELECT 'Campos avatar_url y avatar_public_id añadidos a tabla users' AS resultado;
