-- =============================================================================
-- 20261004_add_messages_to_notifications_module.sql
-- =============================================================================
-- Adds 'messages' to the `notifications.module` ENUM. The backend stores the
-- notice of an urgent message with module = 'messages' (commit 9be16b1), and
-- the frozen baseline aiven/17_notifications.sql already lists it, but the live
-- databases still have the older ENUM without it: every INSERT failed with
-- "Data truncated for column 'module'" and the notice was silently lost.
--
-- Existing rows keep their value (old message notices stay as 'system').
--
-- Idempotent: the ALTER runs only when the column has exactly the previous
-- definition. If 'messages' is already there, or the column differs from what
-- this script expects, it does nothing and says why.
--
-- Applies to: LOCAL + AIVEN.
-- Rollback:  ALTER TABLE notifications MODIFY COLUMN module
--              ENUM('groups','parking','logbooks','system')
--              COLLATE utf8mb4_0900_ai_ci DEFAULT 'groups' COMMENT 'Módulo de origen';
--            (only after no row uses 'messages')
-- =============================================================================

SET @col_type := (
  SELECT COLUMN_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'module'
);

SET @ddl := CASE
  WHEN @col_type = 'enum(''groups'',''parking'',''logbooks'',''system'')' THEN
    'ALTER TABLE notifications MODIFY COLUMN module ENUM(''groups'',''parking'',''logbooks'',''system'',''messages'') COLLATE utf8mb4_0900_ai_ci DEFAULT ''groups'' COMMENT ''Módulo de origen'''
  WHEN @col_type LIKE '%''messages''%' THEN
    'SELECT ''notifications.module already has messages, skipping'' AS info'
  ELSE
    'SELECT CONCAT(''notifications.module has an unexpected definition, not changed: '', @col_type) AS warning'
END;

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verification
SELECT COLUMN_TYPE AS notifications_module
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'notifications'
  AND COLUMN_NAME = 'module';
