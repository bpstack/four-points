-- =============================================================================
-- 20261126_fix_charset_leftovers.sql
-- =============================================================================
-- Three objects of the remote database were created from a console whose
-- client character set was not utf8mb4, and kept it:
--
--   1. v_bo_monthly_summary (20261005_fix_bo_monthly_summary_view.sql) was
--      created with cp850, so its `period` column is cp850_general_ci.
--   2. trg_cashier_shift_update_daily (20260929_fix_cashier_daily_trigger.sql)
--      was created with utf8mb4_unicode_ci as connection collation.
--   3. Four column comments of scheduling_employee_requests were stored with
--      broken characters ("petici├│n" instead of "petición").
--
-- None of them changes what the application does today, but they make the
-- remote schema differ from a fresh install. Found on 2026-11-26 comparing the
-- remote database with a fresh install (scripts/compare-schema.sh).
--
-- This script recreates the view and the trigger with the same bodies as the
-- scripts above, and restates the four columns with the same definition and
-- the comment of the repository. Restating a column with an unchanged
-- definition only changes its metadata: ALGORITHM=INPLACE, LOCK=NONE makes
-- MySQL refuse instead of copying the table if that were not the case.
--
-- Idempotent: CREATE OR REPLACE VIEW, DROP + CREATE TRIGGER and MODIFY COLUMN
-- leave the same result every time. The last SELECT shows the final state.
--
-- Applies to: LOCAL + REMOTE.
-- Rollback:  not needed (same bodies and definitions; only the character set
--            and the comments change).
-- =============================================================================

-- The connection character set is stored with every view, trigger and routine
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 1. v_bo_monthly_summary: body of 20261005_fix_bo_monthly_summary_view.sql
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

-- 2. trg_cashier_shift_update_daily: body of 20260929_fix_cashier_daily_trigger.sql
DROP TRIGGER IF EXISTS trg_cashier_shift_update_daily;

DELIMITER $$

CREATE TRIGGER trg_cashier_shift_update_daily
AFTER UPDATE ON cashier_shifts
FOR EACH ROW
BEGIN
  DECLARE v_daily_id INT;
  DECLARE v_total_cash    DECIMAL(10,2);
  DECLARE v_total_card    DECIMAL(10,2);
  DECLARE v_total_bacs    DECIMAL(10,2);
  DECLARE v_total_web     DECIMAL(10,2);
  DECLARE v_total_transfer DECIMAL(10,2);
  DECLARE v_total_other   DECIMAL(10,2);

  IF NEW.status != OLD.status OR NEW.income != OLD.income OR NEW.payments_total != OLD.payments_total THEN

    SELECT id INTO v_daily_id
    FROM cashier_daily
    WHERE date = NEW.shift_date;

    IF v_daily_id IS NULL THEN
      INSERT INTO cashier_daily (date) VALUES (NEW.shift_date);
      SET v_daily_id = LAST_INSERT_ID();
    END IF;

    -- Efectivo: suma income directamente de los turnos cerrados (sin JOIN)
    SELECT COALESCE(SUM(income), 0)
    INTO v_total_cash
    FROM cashier_shifts
    WHERE shift_date = NEW.shift_date
      AND status = 'closed';

    -- Pagos electrónicos: subquery agregado por método para evitar multiplicar filas
    SELECT
      COALESCE(SUM(CASE WHEN payment_method_id = 1 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 2 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 3 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 4 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 5 THEN amount ELSE 0 END), 0)
    INTO v_total_card, v_total_bacs, v_total_web, v_total_transfer, v_total_other
    FROM cashier_payments
    WHERE shift_id IN (
      SELECT id FROM cashier_shifts
      WHERE shift_date = NEW.shift_date AND status = 'closed'
    );

    UPDATE cashier_daily
    SET
      total_cash        = v_total_cash,
      total_card        = v_total_card,
      total_bacs        = v_total_bacs,
      total_web_payment = v_total_web,
      total_transfer    = v_total_transfer,
      total_other       = v_total_other,
      grand_total       = v_total_cash + v_total_card + v_total_bacs
                          + v_total_web + v_total_transfer + v_total_other,
      updated_at        = NOW()
    WHERE id = v_daily_id;

  END IF;
END$$

DELIMITER ;

-- 3. Comments of scheduling_employee_requests (same definitions)
ALTER TABLE scheduling_employee_requests
  MODIFY COLUMN date_from DATE NOT NULL
    COMMENT 'Fecha inicio de la petición',
  MODIFY COLUMN date_to DATE NOT NULL
    COMMENT 'Fecha fin de la petición',
  MODIFY COLUMN request_type
    ENUM('shift_preference','shift_exclusion','bonificable','baja_temporal','vacation')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
    COMMENT 'Tipo de petición',
  MODIFY COLUMN requested_value VARCHAR(10)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL
    COMMENT 'Código turno (L,M,T,N,PI,P,...) cuando aplica',
  ALGORITHM = INPLACE, LOCK = NONE;

-- Final state
SELECT 'VIEW' AS object, TABLE_NAME AS name, CHARACTER_SET_CLIENT AS charset,
       COLLATION_CONNECTION AS collation
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v_bo_monthly_summary'
UNION ALL
SELECT 'TRIGGER', TRIGGER_NAME, CHARACTER_SET_CLIENT, COLLATION_CONNECTION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = 'trg_cashier_shift_update_daily'
UNION ALL
SELECT 'COLUMN', CONCAT('scheduling_employee_requests.', COLUMN_NAME), COLUMN_COMMENT, ''
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scheduling_employee_requests'
  AND COLUMN_NAME IN ('date_from', 'date_to', 'request_type', 'requested_value');
