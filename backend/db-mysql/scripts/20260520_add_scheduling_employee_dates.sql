-- =============================================================================
-- 20260520_add_scheduling_employee_dates.sql
-- =============================================================================
-- Adds `start_date` and `end_date` to `scheduling_employees` to model partial
-- tenures (employees that start mid-year or leave on a known date). The
-- scheduling UI / queries use these to decide whether to show an employee in
-- a given month. Both NULL = always-active (default for existing rows).
--
-- Idempotent: each ALTER is gated on information_schema.
-- Applies to: LOCAL + AIVEN.
-- Rollback:
--   ALTER TABLE scheduling_employees DROP COLUMN start_date;
--   ALTER TABLE scheduling_employees DROP COLUMN end_date;
-- =============================================================================

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'scheduling_employees'
    AND COLUMN_NAME = 'start_date'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE scheduling_employees ADD COLUMN start_date DATE NULL COMMENT ''Fecha de alta efectiva en horarios. NULL = siempre activo.''',
  'SELECT ''start_date already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'scheduling_employees'
    AND COLUMN_NAME = 'end_date'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE scheduling_employees ADD COLUMN end_date DATE NULL COMMENT ''Fecha de baja en horarios. NULL = sin baja.''',
  'SELECT ''end_date already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
