-- =============================================================================
-- 20251222_add_user_avatar_columns.sql  [RETROACTIVE — historical]
-- =============================================================================
-- Restores migration history for the user avatar feature (commit 9f2b443).
-- Adds two columns to `users` for Cloudinary avatar storage:
--   * avatar_url        VARCHAR(500)
--   * avatar_public_id  VARCHAR(255)
--
-- Idempotent: checks information_schema before ALTER.
-- Safe to run multiple times. Verified live in Aiven 2026-05-20.
-- =============================================================================
USE hotel_db;

SET @col1_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'avatar_url'
);

SET @ddl := IF(
  @col1_exists = 0,
  'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL DEFAULT NULL',
  'SELECT ''users.avatar_url already exists, skipping'' AS info'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col2_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'avatar_public_id'
);

SET @ddl := IF(
  @col2_exists = 0,
  'ALTER TABLE users ADD COLUMN avatar_public_id VARCHAR(255) NULL DEFAULT NULL',
  'SELECT ''users.avatar_public_id already exists, skipping'' AS info'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
