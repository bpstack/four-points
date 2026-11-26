-- =============================================================================
-- ⚠️  FROZEN 2026-05-20 — DO NOT EDIT
-- =============================================================================
-- This file is part of the install base snapshot. All schema changes since
-- 2026-05-20 live in `scripts/AAAAMMDD_*.sql`. Editing this file breaks the
-- single-source-of-truth invariant. See MIGRATIONS_POLICY.md.
-- =============================================================================

-- =========================================================
-- 18_user_avatar.sql (AIVEN)
-- Añade campos para avatar de usuario
-- Usa Cloudinary para almacenamiento de imágenes
-- =========================================================
USE hotel_db;

-- Añadir campos de avatar a la tabla users
ALTER TABLE users
  ADD COLUMN avatar_url VARCHAR(500) NULL DEFAULT NULL,
  ADD COLUMN avatar_public_id VARCHAR(255) NULL DEFAULT NULL;

SELECT 'Campos avatar_url y avatar_public_id añadidos a tabla users' AS resultado;
