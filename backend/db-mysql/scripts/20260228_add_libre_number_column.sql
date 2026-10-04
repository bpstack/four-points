-- =============================================================================
-- 20260228_add_libre_number_column.sql  [RETROACTIVE — historical]
-- =============================================================================
-- Restores migration history for the libre numbering feature (commit 142372d).
-- Adds `libre_number` column to `scheduling_assignments` to group weekly libre
-- pairs (1-45). Used by the scheduling solver and the UI to keep L-pairs
-- consistent across the month.
--
-- The same commit had two one-off TypeScript scripts (DDL helper and backfill
-- of existing assignments). Both ran and were removed on 2026-10-04.
--
-- Idempotent: checks information_schema before ALTER.
-- Verified live in Aiven 2026-05-20.
-- =============================================================================
USE hotel_db;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'scheduling_assignments'
    AND COLUMN_NAME = 'libre_number'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE scheduling_assignments ADD COLUMN libre_number INT NULL DEFAULT NULL COMMENT ''Par de libre semanal al que pertenece esta asignación (1-45)''',
  'SELECT ''scheduling_assignments.libre_number already exists, skipping'' AS info'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
