-- =============================================================================
-- 20260519_add_scheduling_employee_display_order.sql
-- =============================================================================
-- Adds a `display_order` column to `scheduling_employees` so the manager can
-- explicitly reorder employees in the scheduling grid, totales tab, dropdowns,
-- etc. NULL means "no manual order" → backend falls back to sorting by
-- username, so existing behavior is preserved out of the box.
--
-- Idempotent: if the column already exists the ALTER is a no-op.
-- Safe to run multiple times.
--
-- Applies to: LOCAL + AIVEN.
-- Rollback:  ALTER TABLE scheduling_employees DROP COLUMN display_order;
-- =============================================================================

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'scheduling_employees'
    AND COLUMN_NAME = 'display_order'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE scheduling_employees ADD COLUMN display_order INT NULL COMMENT ''Manual sort order in scheduling UIs. NULL = unsorted, fallback to username.''',
  'SELECT ''display_order already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index to keep ORDER BY display_order cheap when the table grows.
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'scheduling_employees'
    AND INDEX_NAME = 'idx_scheduling_employees_display_order'
);

SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_scheduling_employees_display_order ON scheduling_employees (display_order)',
  'SELECT ''idx_scheduling_employees_display_order already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
