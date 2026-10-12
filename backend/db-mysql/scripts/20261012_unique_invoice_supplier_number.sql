-- =============================================================================
-- 20261012_unique_invoice_supplier_number.sql
-- =============================================================================
-- Adds UNIQUE KEY uk_invoice_supplier_number (supplier_id, invoice_number) to
-- bo_invoices. The same invoice of the same supplier could be entered twice
-- and both copies were paid in the monthly batch. Decided on 2026-10-11: a
-- second invoice with the same supplier and number is refused (409
-- BACKOFFICE_INVOICE_DUPLICATE, see validations/backoffice/invoice.ts).
-- Deleting an invoice stays permanent, so a deleted number can be reused.
-- The column collation is case-insensitive: "F-1" and "f-1" count as the same.
--
-- Idempotent: if the key already exists the ALTER is skipped.
-- Safe to run multiple times.
--
-- If the table already holds duplicates, the first SELECT lists them and the
-- ALTER fails with "Duplicate entry": fix those rows and run it again.
--
-- Applies to: LOCAL + AIVEN. The code works without it (nothing is refused
-- until the key exists), so it can go before or after the deploy.
-- Rollback:
--   ALTER TABLE bo_invoices DROP INDEX uk_invoice_supplier_number;
-- =============================================================================

SELECT supplier_id, invoice_number, COUNT(*) AS copies
FROM bo_invoices
GROUP BY supplier_id, invoice_number
HAVING COUNT(*) > 1;

SET @key_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bo_invoices'
    AND INDEX_NAME = 'uk_invoice_supplier_number'
);

SET @ddl := IF(
  @key_exists = 0,
  'ALTER TABLE bo_invoices ADD UNIQUE KEY uk_invoice_supplier_number (supplier_id, invoice_number)',
  'SELECT ''uk_invoice_supplier_number already exists, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
