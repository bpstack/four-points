-- Fix: trg_cashier_shift_update_daily inflaba total_cash sumando income una vez
-- por cada pago electrónico del turno (LEFT JOIN multiplicaba filas).
-- Se separa el cálculo: income se suma directamente de cashier_shifts,
-- pagos electrónicos se suman de cashier_payments en subquery agregado.

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
