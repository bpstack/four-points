-- =============================================================================
-- 20260929_add_cashier_voucher_status_dates.sql
-- =============================================================================
-- Adds `justified_at` and `cancelled_at` to `cashier_vouchers`. The backend
-- writes them when a voucher is justified or cancelled, and the reports show
-- the justification date, but the columns never existed: both operations
-- failed with "Unknown column" in every environment.
--
-- NULL = not justified / not cancelled. Existing rows stay NULL.
--
-- Idempotent: each ALTER runs only if the column is missing.
-- Safe to run multiple times.
--
-- Applies to: LOCAL + AIVEN.
-- Rollback:  ALTER TABLE cashier_vouchers DROP COLUMN justified_at, DROP COLUMN cancelled_at;
-- =============================================================================

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cashier_vouchers'
    AND COLUMN_NAME = 'justified_at'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE cashier_vouchers ADD COLUMN justified_at DATETIME NULL DEFAULT NULL AFTER status',
  'SELECT ''justified_at already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cashier_vouchers'
    AND COLUMN_NAME = 'cancelled_at'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE cashier_vouchers ADD COLUMN cancelled_at DATETIME NULL DEFAULT NULL AFTER justified_at',
  'SELECT ''cancelled_at already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
