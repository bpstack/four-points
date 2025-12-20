-- =========================================================
-- CASHIER SYSTEM - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de caja para turnos del hotel
-- Versión: AIVEN (utf8mb4_0900_ai_ci)
-- =========================================================

USE hotel_db;

-- =========================================================
-- 1. CATÁLOGO DE MÉTODOS DE PAGO
-- =========================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nombre del método de pago',
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 2. VALES GLOBALES (estructura nueva con status)
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL COMMENT 'Monto del vale',
  reason TEXT NOT NULL COMMENT 'Justificación del vale',
  status ENUM('pending', 'justified', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Estado del vale',
  notes TEXT NULL COMMENT 'Notas adicionales del vale',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) NULL COMMENT 'Usuario que creó el vale',
  
  CONSTRAINT fk_voucher_created_by FOREIGN KEY (created_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_voucher_status (status),
  INDEX idx_voucher_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 3. TURNOS DE CAJA (principal)
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_date DATE NOT NULL COMMENT 'Fecha del turno',
  shift_type ENUM('night', 'morning', 'afternoon', 'closing') NOT NULL COMMENT 'Tipo de turno',
  status ENUM('open', 'in_progress', 'closed', 'audited') DEFAULT 'open' COMMENT 'Estado del turno',
  
  -- Montos base
  initial_fund DECIMAL(10,2) DEFAULT 200.00 COMMENT 'Fondo inicial fijo',
  income DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Ventas del turno = Retirado a Office',
  income_breakdown JSON NULL COMMENT 'Desglose futuro: {alojamiento: X, restaurante: Y, etc}',
  
  -- Conteo físico
  cash_counted DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Efectivo contado físicamente',
  
  -- Campos calculados
  cash_expected DECIMAL(10,2) DEFAULT 200.00 COMMENT '200 - vales_activos',
  difference DECIMAL(10,2) DEFAULT 0.00 COMMENT 'cash_counted - cash_expected',
  payments_total DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Suma de pagos electrónicos',
  grand_total DECIMAL(10,2) DEFAULT 0.00 COMMENT 'income + payments_total',
  
  -- Metadata
  notes TEXT NULL COMMENT 'Observaciones generales',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at DATETIME NULL COMMENT 'Fecha/hora de cierre',
  closed_by_id CHAR(36) NULL COMMENT 'Usuario que cerró el turno',
  opened_by CHAR(36) NULL COMMENT 'Usuario que abrió el turno',
  
  -- Constraints
  CONSTRAINT fk_shift_opened_by FOREIGN KEY (opened_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_shift_closed_by FOREIGN KEY (closed_by_id) 
    REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Índices
  UNIQUE KEY uk_shift_date_type (shift_date, shift_type),
  INDEX idx_shift_date (shift_date),
  INDEX idx_shift_status (status),
  INDEX idx_shift_type (shift_type),
  INDEX idx_closed_at (closed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 4. RESPONSABLES MÚLTIPLES POR TURNO
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_shift_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_id INT NOT NULL,
  user_id CHAR(36) NOT NULL,
  is_primary TINYINT(1) DEFAULT 0 COMMENT '1 = responsable principal, 0 = secundario',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_shift_user_shift FOREIGN KEY (shift_id) 
    REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_shift_user_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE RESTRICT,
  
  UNIQUE KEY uk_shift_user (shift_id, user_id),
  INDEX idx_shift_users (shift_id),
  INDEX idx_user_shifts (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 5. DENOMINACIONES (conteo de efectivo)
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_denominations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_id INT NOT NULL COMMENT 'Turno asociado',
  denomination DECIMAL(10,2) NOT NULL COMMENT 'Valor del billete/moneda',
  quantity INT DEFAULT 0 COMMENT 'Cantidad de unidades',
  total DECIMAL(10,2) GENERATED ALWAYS AS (denomination * quantity) STORED COMMENT 'Total calculado',
  
  CONSTRAINT fk_denom_shift FOREIGN KEY (shift_id) 
    REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  
  INDEX idx_shift_denom (shift_id, denomination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 6. PAGOS ELECTRÓNICOS POR MÉTODO
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_id INT NOT NULL COMMENT 'Turno asociado',
  payment_method_id INT NOT NULL COMMENT 'Método de pago',
  amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Monto del método',
  
  CONSTRAINT fk_payment_shift FOREIGN KEY (shift_id) 
    REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_method FOREIGN KEY (payment_method_id) 
    REFERENCES payment_methods(id) ON DELETE RESTRICT,
  
  UNIQUE KEY uk_shift_method (shift_id, payment_method_id),
  INDEX idx_payment_method (payment_method_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 7. RELACIÓN TURNOS ↔ VALES
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_shift_vouchers (
  shift_id INT NOT NULL COMMENT 'Turno que ve el vale',
  voucher_id INT NOT NULL COMMENT 'Vale activo en ese turno',
  
  PRIMARY KEY (shift_id, voucher_id),
  
  CONSTRAINT fk_sv_shift FOREIGN KEY (shift_id) 
    REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_sv_voucher FOREIGN KEY (voucher_id) 
    REFERENCES cashier_vouchers(id) ON DELETE CASCADE,
  
  INDEX idx_sv_voucher (voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 8. AGREGADOS DIARIOS
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_daily (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  
  -- Totales agregados
  total_cash DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma de income de los 4 turnos',
  total_card DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma de TARJETA',
  total_bacs DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma de BACS',
  total_web_payment DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma de WEB PAYMENT',
  total_transfer DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma de TRANSFERENCIA',
  total_other DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma de OTROS',
  grand_total DECIMAL(10,2) DEFAULT 0 COMMENT 'Suma total del día',
  
  -- Control
  status ENUM('open', 'closed') DEFAULT 'open',
  closed_by CHAR(36) NULL,
  closed_at DATETIME NULL,
  notes TEXT NULL COMMENT 'Observaciones del cierre diario',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_daily_closed_by FOREIGN KEY (closed_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_daily_date (date),
  INDEX idx_daily_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- 9. HISTORIAL DE AUDITORÍA
-- =========================================================
CREATE TABLE IF NOT EXISTS cashier_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shift_id INT NOT NULL COMMENT 'Turno afectado',
  action ENUM('created', 'updated', 'deleted', 'status_changed', 'adjustment', 'voucher_created', 'voucher_repaid', 'daily_closed', 'daily_reopened') NOT NULL,
  table_affected VARCHAR(100) NULL COMMENT 'Tabla modificada',
  record_id INT NULL COMMENT 'ID del registro modificado',
  field_changed VARCHAR(100) NULL COMMENT 'Campo modificado',
  old_value TEXT NULL COMMENT 'Valor anterior',
  new_value TEXT NULL COMMENT 'Valor nuevo',
  changed_by CHAR(36) NULL COMMENT 'Usuario que realizó el cambio',
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL COMMENT 'Notas adicionales',
  
  CONSTRAINT fk_history_shift FOREIGN KEY (shift_id) 
    REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_history_shift (shift_id),
  INDEX idx_history_action (action),
  INDEX idx_history_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- TRIGGER: Actualizar agregados diarios
-- =========================================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_cashier_shift_update_daily$$

CREATE TRIGGER trg_cashier_shift_update_daily
AFTER UPDATE ON cashier_shifts
FOR EACH ROW
BEGIN
  DECLARE v_daily_id INT;
  DECLARE v_total_cash DECIMAL(10,2);
  DECLARE v_total_card DECIMAL(10,2);
  DECLARE v_total_bacs DECIMAL(10,2);
  DECLARE v_total_web DECIMAL(10,2);
  DECLARE v_total_transfer DECIMAL(10,2);
  DECLARE v_total_other DECIMAL(10,2);
  
  IF NEW.status != OLD.status OR NEW.income != OLD.income OR NEW.payments_total != OLD.payments_total THEN
    
    SELECT id INTO v_daily_id 
    FROM cashier_daily 
    WHERE date = NEW.shift_date;
    
    IF v_daily_id IS NULL THEN
      INSERT INTO cashier_daily (date) VALUES (NEW.shift_date);
      SET v_daily_id = LAST_INSERT_ID();
    END IF;
    
    SELECT 
      COALESCE(SUM(CAST(income AS DECIMAL(10,2))), 0),
      COALESCE(SUM(CASE WHEN cp.payment_method_id = 1 THEN CAST(cp.amount AS DECIMAL(10,2)) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.payment_method_id = 2 THEN CAST(cp.amount AS DECIMAL(10,2)) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.payment_method_id = 3 THEN CAST(cp.amount AS DECIMAL(10,2)) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.payment_method_id = 4 THEN CAST(cp.amount AS DECIMAL(10,2)) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.payment_method_id = 5 THEN CAST(cp.amount AS DECIMAL(10,2)) ELSE 0 END), 0)
    INTO 
      v_total_cash, v_total_card, v_total_bacs, 
      v_total_web, v_total_transfer, v_total_other
    FROM cashier_shifts cs
    LEFT JOIN cashier_payments cp ON cs.id = cp.shift_id
    WHERE cs.shift_date = NEW.shift_date
      AND cs.status = 'closed';
    
    UPDATE cashier_daily
    SET 
      total_cash = v_total_cash,
      total_card = v_total_card,
      total_bacs = v_total_bacs,
      total_web_payment = v_total_web,
      total_transfer = v_total_transfer,
      total_other = v_total_other,
      grand_total = v_total_cash + v_total_card + v_total_bacs + v_total_web + v_total_transfer + v_total_other,
      updated_at = NOW()
    WHERE id = v_daily_id;
    
  END IF;
END$$

DELIMITER ;

-- =========================================================
-- SEEDS: Métodos de pago con IDs FIJOS
-- =========================================================
INSERT IGNORE INTO payment_methods (id, name) VALUES 
(1, 'TARJETA CRÉDITO O DÉBITO'),
(2, 'BACS'),
(3, 'WEB PAYMENT'),
(4, 'TRANSFERENCIA'),
(5, 'OTROS');

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '✅ SISTEMA CASHIER AIVEN CREADO' AS resultado;
