-- =============================================================================
-- 20261005_add_is_demo_to_users.sql
-- =============================================================================
-- Adds `users.is_demo`: marks the public demo account. The backend puts it in
-- the token, and middlewares/demoRestriction.ts blocks that account from user
-- management, its own profile, departments, file uploads, the demo log and the
-- scheduling configuration. Every existing user keeps 0.
--
-- Must run BEFORE deploying the code that reads it: login selects u.is_demo.
--
-- Idempotent: adds the column only when it does not exist.
--
-- Applies to: LOCAL + AIVEN.
-- Rollback:  ALTER TABLE users DROP COLUMN is_demo;
--            (only after the code that reads it is gone)
-- =============================================================================

SET @has_col := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'is_demo'
);

SET @ddl := IF(
  @has_col = 0,
  'ALTER TABLE users ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Public demo account: restricted by demoRestriction'' AFTER is_active',
  'SELECT ''users.is_demo already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
