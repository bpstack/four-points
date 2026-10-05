-- =============================================================================
-- 20261005_fix_bo_monthly_summary_view.sql
-- =============================================================================
-- Recreates v_bo_monthly_summary with `period` in its GROUP BY. The view
-- returned DATE_FORMAT(invoice_date, '%Y-%m') without grouping by it, and
-- with ONLY_FULL_GROUP_BY (on in Aiven and local) every SELECT on it failed
-- with error 1055: GET /api/backoffice/stats/monthly always answered 500.
-- Found on 2026-10-05 while comparing a fresh install with Aiven.
--
-- Same columns and the same groups as before: year + month and '%Y-%m' split
-- the invoices the same way.
--
-- Idempotent: CREATE OR REPLACE VIEW.
--
-- Applies to: LOCAL + AIVEN.
-- Rollback:  the previous body is in aiven/16_backoffice.sql (it fails while
--            ONLY_FULL_GROUP_BY is on).
-- =============================================================================

CREATE OR REPLACE VIEW v_bo_monthly_summary AS
SELECT
  YEAR(i.invoice_date) AS year,
  MONTH(i.invoice_date) AS month,
  DATE_FORMAT(i.invoice_date, '%Y-%m') AS period,
  COUNT(*) AS total_invoices,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_count,
  SUM(i.amount_without_vat) AS total_without_vat,
  SUM(i.amount_with_vat) AS total_with_vat,
  SUM(CASE WHEN i.status = 'pending' THEN i.amount_with_vat ELSE 0 END) AS pending_total,
  SUM(CASE WHEN i.status = 'paid' THEN i.amount_with_vat ELSE 0 END) AS paid_total
FROM bo_invoices i
WHERE i.is_deleted = 0
GROUP BY YEAR(i.invoice_date), MONTH(i.invoice_date), DATE_FORMAT(i.invoice_date, '%Y-%m')
ORDER BY year DESC, month DESC;
