-- =========================================================
-- 16_backoffice.sql (LOCAL)
-- Sistema de Backoffice: Proveedores, Facturas, Categorías
-- Collation: utf8mb4_unicode_ci
-- =========================================================
USE hotel_db;

-- ============================================
-- 1. CATEGORÍAS DE GASTOS
-- ============================================
CREATE TABLE bo_categories (
  id INT NOT NULL AUTO_INCREMENT,
  cost_center VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cost_center_department (cost_center, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. PROVEEDORES
-- ============================================
CREATE TABLE bo_suppliers (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  cif VARCHAR(20) DEFAULT NULL,
  default_category_id INT DEFAULT NULL,
  periodicity ENUM('monthly','bimonthly','quarterly','annual','on_demand') DEFAULT 'monthly',
  payment_method ENUM('transfer','direct_debit') DEFAULT 'transfer',
  bank_account VARCHAR(50) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  address TEXT,
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_supplier_name (name),
  KEY idx_supplier_active (is_active),
  KEY idx_supplier_category (default_category_id),
  KEY fk_supplier_created_by (created_by),
  CONSTRAINT fk_supplier_category FOREIGN KEY (default_category_id) REFERENCES bo_categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_supplier_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. FACTURAS
-- ============================================
CREATE TABLE bo_invoices (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(100) NOT NULL,
  supplier_id INT NOT NULL,
  category_id INT DEFAULT NULL,
  amount_without_vat DECIMAL(12,2) NOT NULL,
  amount_with_vat DECIMAL(12,2) NOT NULL,
  vat_percentage DECIMAL(5,2) DEFAULT 21.00,
  invoice_date DATE NOT NULL,
  received_date DATE DEFAULT NULL,
  billing_period_start DATE DEFAULT NULL,
  billing_period_end DATE DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  paid_date DATE DEFAULT NULL,
  status ENUM('pending','validated','rejected','paid') DEFAULT 'pending',
  payment_method ENUM('transfer','direct_debit') NOT NULL,
  original_pdf_url VARCHAR(500) DEFAULT NULL,
  original_pdf_public_id VARCHAR(255) DEFAULT NULL,
  validated_pdf_url VARCHAR(500) DEFAULT NULL,
  validated_pdf_public_id VARCHAR(255) DEFAULT NULL,
  validated_by CHAR(36) DEFAULT NULL,
  validated_at TIMESTAMP NULL DEFAULT NULL,
  validation_notes TEXT,
  notes TEXT,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by CHAR(36) DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  deleted_by CHAR(36) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_invoice_supplier (supplier_id),
  KEY idx_invoice_status (status),
  KEY idx_invoice_date (invoice_date),
  KEY idx_invoice_paid_date (paid_date),
  KEY idx_invoice_category (category_id),
  KEY idx_invoice_deleted (is_deleted),
  KEY fk_invoice_validated_by (validated_by),
  KEY fk_invoice_created_by (created_by),
  KEY fk_invoice_updated_by (updated_by),
  KEY fk_invoice_deleted_by (deleted_by),
  CONSTRAINT fk_invoice_category FOREIGN KEY (category_id) REFERENCES bo_categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_invoice_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoice_deleted_by FOREIGN KEY (deleted_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_invoice_supplier FOREIGN KEY (supplier_id) REFERENCES bo_suppliers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoice_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_invoice_validated_by FOREIGN KEY (validated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. HISTORIAL DE FACTURAS
-- ============================================
CREATE TABLE bo_invoice_history (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  action ENUM('created','updated','validated','rejected','paid','deleted','restored') NOT NULL,
  field_changed VARCHAR(50) DEFAULT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  changed_by CHAR(36) NOT NULL,
  changed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bo_history_invoice (invoice_id),
  KEY idx_bo_history_action (action),
  KEY idx_bo_history_date (changed_at),
  KEY fk_bo_history_changed_by (changed_by),
  CONSTRAINT fk_bo_history_changed_by FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_bo_history_invoice FOREIGN KEY (invoice_id) REFERENCES bo_invoices (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. ASSETS (Sellos, Firmas)
-- ============================================
CREATE TABLE bo_assets (
  id INT NOT NULL AUTO_INCREMENT,
  type ENUM('stamp','signature') NOT NULL,
  name VARCHAR(100) NOT NULL,
  cloudinary_url VARCHAR(500) NOT NULL,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_asset_type (type),
  KEY idx_asset_default (is_default),
  KEY fk_asset_created_by (created_by),
  CONSTRAINT fk_asset_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tablas backoffice creadas: bo_categories, bo_suppliers, bo_invoices, bo_invoice_history, bo_assets' AS resultado;

-- ============================================
-- 6. VISTAS
-- ============================================

-- Vista: Detalle de facturas con joins
CREATE OR REPLACE VIEW v_bo_invoices_detail AS
SELECT 
  i.id,
  i.invoice_number,
  i.supplier_id,
  s.name AS supplier_name,
  i.category_id,
  c.cost_center,
  c.department,
  CONCAT(c.cost_center, ' / ', c.department) AS category_full,
  i.amount_without_vat,
  i.amount_with_vat,
  i.vat_percentage,
  i.invoice_date,
  i.received_date,
  i.billing_period_start,
  i.billing_period_end,
  i.due_date,
  i.paid_date,
  i.status,
  i.payment_method,
  i.original_pdf_url,
  i.validated_pdf_url,
  i.validated_by,
  u_val.username AS validated_by_name,
  i.validated_at,
  i.validation_notes,
  i.notes,
  i.created_by,
  u_cre.username AS created_by_name,
  i.created_at,
  i.updated_at,
  i.is_deleted
FROM bo_invoices i
LEFT JOIN bo_suppliers s ON i.supplier_id = s.id
LEFT JOIN bo_categories c ON i.category_id = c.id
LEFT JOIN users u_val ON i.validated_by = u_val.id
LEFT JOIN users u_cre ON i.created_by = u_cre.id;

-- Vista: Resumen mensual
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
GROUP BY YEAR(i.invoice_date), MONTH(i.invoice_date)
ORDER BY year DESC, month DESC;

-- Vista: Estadísticas de proveedores
CREATE OR REPLACE VIEW v_bo_suppliers_stats AS
SELECT 
  s.id,
  s.name,
  s.cif,
  s.default_category_id,
  c.cost_center,
  c.department,
  CONCAT(c.cost_center, ' / ', c.department) AS category_full,
  s.periodicity,
  s.payment_method,
  s.bank_account,
  s.email,
  s.phone,
  s.address,
  s.notes,
  s.is_active,
  COUNT(DISTINCT i.id) AS total_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'pending' THEN i.id END) AS pending_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) AS paid_invoices,
  COALESCE(SUM(CASE WHEN YEAR(i.invoice_date) = YEAR(CURDATE()) AND i.is_deleted = 0 THEN i.amount_with_vat END), 0) AS ytd_total,
  MAX(i.invoice_date) AS last_invoice_date
FROM bo_suppliers s
LEFT JOIN bo_categories c ON s.default_category_id = c.id
LEFT JOIN bo_invoices i ON s.id = i.supplier_id AND i.is_deleted = 0
GROUP BY s.id;

SELECT 'Vistas backoffice creadas: v_bo_invoices_detail, v_bo_monthly_summary, v_bo_suppliers_stats' AS resultado;

-- ============================================
-- 7. DATOS INICIALES: Categorías
-- ============================================
INSERT INTO bo_categories (cost_center, department) VALUES
('GASTOS ADMINISTRACIÓN', 'ADMINISTRACIÓN'),
('GASTOS ADMINISTRACIÓN', 'FEES MARCA'),
('GASTOS ADMINISTRACIÓN', 'PRL'),
('MANTENIMIENTO', 'REPARACIONES Y MATERIALES'),
('MANTENIMIENTO', 'INSTALACIONES'),
('MANTENIMIENTO', 'PERSONAL SUBCONTRATADO'),
('ALOJAMIENTO', 'COMISIÓN AGENCIA'),
('ALOJAMIENTO', 'LAVANDERÍA'),
('ALOJAMIENTO', 'PRODUCTOS LIMPIEZA'),
('ALOJAMIENTO', 'AMENITIES'),
('ALOJAMIENTO', 'MATERIALES HABITACIONES'),
('ALOJAMIENTO', 'LIMPIEZA SUBCONTRATADA'),
('SUMINISTROS', 'ELECTRICIDAD'),
('SUMINISTROS', 'AGUA'),
('SUMINISTROS', 'GAS'),
('SUMINISTROS', 'TELÉFONO'),
('MARKETING Y RESERVAS', 'MARKETING Y RESERVAS'),
('MARKETING Y RESERVAS', 'PUBLICIDAD'),
('CONSUMO RESTAURACIÓN', 'COMIDA'),
('CONSUMO RESTAURACIÓN', 'BEBIDAS'),
('INFORMÁTICA', 'INFORMÁTICA'),
('RECURSOS HUMANOS', 'PERSONAL'),
('RECURSOS HUMANOS', 'FORMACIÓN');

SELECT CONCAT('Insertadas ', COUNT(*), ' categorías de backoffice') AS resultado
FROM bo_categories;
