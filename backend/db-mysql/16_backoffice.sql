-- =========================================================
-- 16_backoffice.sql
-- Sistema Back Office: Gestión de Facturas y Proveedores
-- =========================================================
USE hotel_db;

-- =========================================================
-- TABLA: bo_categories
-- Categorías/Centros de coste y departamentos
-- =========================================================
CREATE TABLE bo_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cost_center VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_cost_center_department (cost_center, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: bo_suppliers
-- Proveedores
-- =========================================================
CREATE TABLE bo_suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cif VARCHAR(20),
    
    -- Categoría por defecto del proveedor
    default_category_id INT,
    
    -- Periodicidad de facturación
    periodicity ENUM('monthly', 'bimonthly', 'quarterly', 'annual', 'on_demand') DEFAULT 'monthly',
    
    -- Método de pago
    payment_method ENUM('transfer', 'direct_debit') DEFAULT 'transfer',
    bank_account VARCHAR(50),
    
    -- Contacto
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    
    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_supplier_name (name),
    INDEX idx_supplier_active (is_active),
    INDEX idx_supplier_category (default_category_id),
    
    CONSTRAINT fk_supplier_category FOREIGN KEY (default_category_id) 
        REFERENCES bo_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_supplier_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: bo_invoices
-- Facturas
-- =========================================================
CREATE TABLE bo_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Identificación
    invoice_number VARCHAR(100) NOT NULL,
    supplier_id INT NOT NULL,
    
    -- Categoría (puede diferir de la del proveedor)
    category_id INT,
    
    -- Importes
    amount_without_vat DECIMAL(12,2) NOT NULL,
    amount_with_vat DECIMAL(12,2) NOT NULL,
    vat_percentage DECIMAL(5,2) DEFAULT 21.00,
    
    -- Fechas
    invoice_date DATE NOT NULL,
    received_date DATE,
    billing_period_start DATE,
    billing_period_end DATE,
    due_date DATE,
    paid_date DATE,
    
    -- Estado y pago
    status ENUM('pending', 'validated', 'rejected', 'paid') DEFAULT 'pending',
    payment_method ENUM('transfer', 'direct_debit') NOT NULL,
    
    -- Archivos PDF en Cloudinary
    original_pdf_url VARCHAR(500),
    original_pdf_public_id VARCHAR(255),
    validated_pdf_url VARCHAR(500),
    validated_pdf_public_id VARCHAR(255),
    
    -- Validación
    validated_by CHAR(36),
    validated_at TIMESTAMP NULL,
    validation_notes TEXT,
    
    -- Notas generales
    notes TEXT,
    
    -- Auditoría
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by CHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    deleted_by CHAR(36),
    
    INDEX idx_invoice_supplier (supplier_id),
    INDEX idx_invoice_status (status),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_invoice_paid_date (paid_date),
    INDEX idx_invoice_category (category_id),
    INDEX idx_invoice_deleted (is_deleted),
    
    CONSTRAINT fk_invoice_supplier FOREIGN KEY (supplier_id) 
        REFERENCES bo_suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_category FOREIGN KEY (category_id) 
        REFERENCES bo_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_validated_by FOREIGN KEY (validated_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_updated_by FOREIGN KEY (updated_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_deleted_by FOREIGN KEY (deleted_by) 
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: bo_assets
-- Assets predefinidos (sellos, firmas)
-- =========================================================
CREATE TABLE bo_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Tipo de asset
    type ENUM('stamp', 'signature') NOT NULL,
    
    -- Nombre descriptivo
    name VARCHAR(100) NOT NULL,
    
    -- Archivo en Cloudinary
    cloudinary_url VARCHAR(500) NOT NULL,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    
    -- Configuración
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_asset_type (type),
    INDEX idx_asset_default (is_default),
    
    CONSTRAINT fk_asset_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLA: bo_invoice_history
-- Historial de cambios en facturas
-- =========================================================
CREATE TABLE bo_invoice_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    
    action ENUM('created', 'updated', 'validated', 'rejected', 'paid', 'deleted', 'restored') NOT NULL,
    field_changed VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    
    changed_by CHAR(36) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_bo_history_invoice (invoice_id),
    INDEX idx_bo_history_action (action),
    INDEX idx_bo_history_date (changed_at),
    
    CONSTRAINT fk_bo_history_invoice FOREIGN KEY (invoice_id) 
        REFERENCES bo_invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_bo_history_changed_by FOREIGN KEY (changed_by) 
        REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- DATOS INICIALES: Categorías basadas en el Excel
-- =========================================================
INSERT INTO bo_categories (cost_center, department) VALUES
    -- GASTOS ADMINISTRACIÓN
    ('GASTOS ADMINISTRACIÓN', 'ADMINISTRACIÓN'),
    ('GASTOS ADMINISTRACIÓN', 'FEES MARCA'),
    ('GASTOS ADMINISTRACIÓN', 'PRL'),
    
    -- MANTENIMIENTO
    ('MANTENIMIENTO', 'REPARACIONES Y MATERIALES'),
    ('MANTENIMIENTO', 'INSTALACIONES'),
    ('MANTENIMIENTO', 'PERSONAL SUBCONTRATADO'),
    
    -- ALOJAMIENTO
    ('ALOJAMIENTO', 'COMISIÓN AGENCIA'),
    ('ALOJAMIENTO', 'LAVANDERÍA'),
    ('ALOJAMIENTO', 'PRODUCTOS LIMPIEZA'),
    ('ALOJAMIENTO', 'AMENITIES'),
    ('ALOJAMIENTO', 'MATERIALES HABITACIONES'),
    ('ALOJAMIENTO', 'LIMPIEZA SUBCONTRATADA'),
    
    -- SUMINISTROS
    ('SUMINISTROS', 'ELECTRICIDAD'),
    ('SUMINISTROS', 'AGUA'),
    ('SUMINISTROS', 'GAS'),
    ('SUMINISTROS', 'TELÉFONO'),
    
    -- MARKETING Y RESERVAS
    ('MARKETING Y RESERVAS', 'MARKETING Y RESERVAS'),
    ('MARKETING Y RESERVAS', 'PUBLICIDAD'),
    
    -- RESTAURACIÓN
    ('CONSUMO RESTAURACIÓN', 'COMIDA'),
    ('CONSUMO RESTAURACIÓN', 'BEBIDAS'),
    
    -- INFORMÁTICA
    ('INFORMÁTICA', 'INFORMÁTICA'),
    
    -- RECURSOS HUMANOS
    ('RECURSOS HUMANOS', 'PERSONAL'),
    ('RECURSOS HUMANOS', 'FORMACIÓN');

-- =========================================================
-- DATOS INICIALES: Proveedores basados en el Excel
-- =========================================================

-- Primero insertamos proveedores sin categoría, luego actualizamos
INSERT INTO bo_suppliers (name, periodicity, payment_method, notes) VALUES
    ('ADYEN', 'monthly', 'direct_debit', NULL),
    ('ACTIVH2O', 'monthly', 'transfer', '345.95€/mes'),
    ('AUDAX', 'monthly', 'direct_debit', 'Electricidad'),
    ('BYHOURS', 'monthly', 'transfer', NULL),
    ('BOOKING', 'monthly', 'transfer', NULL),
    ('BOOKASSIST', 'monthly', 'transfer', NULL),
    ('CARLIN', 'monthly', 'transfer', NULL),
    ('CORDIS', 'monthly', 'direct_debit', '134.31€'),
    ('CENTRONET', 'monthly', 'transfer', 'Lavandería'),
    ('DIMARSOL', 'monthly', 'transfer', 'Productos limpieza y amenities'),
    ('DORDIO', 'on_demand', 'transfer', NULL),
    ('DUETTO', 'annual', 'transfer', 'Julio'),
    ('EASY FEES', 'monthly', 'transfer', 'Fees marca'),
    ('ECUS', 'on_demand', 'transfer', 'Bajo pedido'),
    ('EKYNER', 'monthly', 'transfer', 'Gas'),
    ('EL CORTE INGLÉS', 'on_demand', 'transfer', NULL),
    ('EMASA', 'monthly', 'direct_debit', 'Agua'),
    ('EXPEDIA', 'monthly', 'transfer', NULL),
    ('FELPUDORENT', 'monthly', 'transfer', NULL),
    ('FRIT RAVICH', 'on_demand', 'transfer', 'Alimentación'),
    ('GARBAYO', 'on_demand', 'transfer', NULL),
    ('GEZE', 'on_demand', 'transfer', NULL),
    ('NORVEX', 'monthly', 'transfer', 'Informática'),
    ('HOTELREZ', 'monthly', 'transfer', NULL),
    ('ILUNION', 'monthly', 'direct_debit', 'Lavandería'),
    ('KONICA', 'monthly', 'direct_debit', 'Alquiler + copias'),
    ('LABORAL RISK', 'annual', 'transfer', 'PRL'),
    ('LANDE', 'on_demand', 'transfer', 'Amenities'),
    ('LINEA VERDE', 'monthly', 'transfer', NULL),
    ('ONYX', 'monthly', 'transfer', 'OTA'),
    ('ONDOAN', 'monthly', 'transfer', 'Personal subcontratado'),
    ('OTIS', 'monthly', 'direct_debit', 'Ascensores'),
    ('OTA INSIGHT', 'annual', 'transfer', NULL),
    ('POVAL', 'on_demand', 'transfer', NULL),
    ('PREVILABOR', 'annual', 'transfer', 'PRL'),
    ('PS PREVENCION', 'annual', 'transfer', 'PRL'),
    ('PUBLILINE', 'on_demand', 'transfer', 'Publicidad'),
    ('RENTOKIL', 'quarterly', 'transfer', 'Control plagas'),
    ('SAMSOTECH', 'on_demand', 'transfer', NULL),
    ('SARATON', 'on_demand', 'transfer', NULL),
    ('SANGAL', 'monthly', 'transfer', 'Limpieza subcontratada'),
    ('SICILIA HERMANOS', 'on_demand', 'transfer', NULL),
    ('SGAE', 'annual', 'transfer', 'SGAE/AGEDI'),
    ('TELEFONICA', 'monthly', 'direct_debit', NULL),
    ('TEMPORING', 'monthly', 'transfer', 'ETT'),
    ('VODAFONE', 'monthly', 'direct_debit', 'Internet fibra'),
    ('VULCANO FERRETERIA', 'on_demand', 'transfer', NULL),
    ('SECURITAS DIRECT', 'monthly', 'direct_debit', 'Alarma');

-- Actualizar categorías de proveedores
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'GASTOS ADMINISTRACIÓN' AND department = 'ADMINISTRACIÓN') WHERE name IN ('ADYEN', 'CARLIN', 'KONICA');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'GASTOS ADMINISTRACIÓN' AND department = 'FEES MARCA') WHERE name IN ('EASY FEES');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'GASTOS ADMINISTRACIÓN' AND department = 'PRL') WHERE name IN ('LABORAL RISK', 'PREVILABOR', 'PS PREVENCION');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'MANTENIMIENTO' AND department = 'REPARACIONES Y MATERIALES') WHERE name IN ('ACTIVH2O', 'CORDIS', 'DORDIO', 'FELPUDORENT', 'RENTOKIL', 'SARATON', 'SICILIA HERMANOS', 'VULCANO FERRETERIA');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'MANTENIMIENTO' AND department = 'INSTALACIONES') WHERE name IN ('GEZE', 'OTIS');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'MANTENIMIENTO' AND department = 'PERSONAL SUBCONTRATADO') WHERE name IN ('ONDOAN');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'ALOJAMIENTO' AND department = 'COMISIÓN AGENCIA') WHERE name IN ('BYHOURS', 'BOOKING', 'EXPEDIA', 'ONYX');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'ALOJAMIENTO' AND department = 'LAVANDERÍA') WHERE name IN ('CENTRONET', 'ILUNION');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'ALOJAMIENTO' AND department = 'PRODUCTOS LIMPIEZA') WHERE name IN ('DIMARSOL');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'ALOJAMIENTO' AND department = 'AMENITIES') WHERE name IN ('LANDE');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'ALOJAMIENTO' AND department = 'MATERIALES HABITACIONES') WHERE name IN ('ECUS');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'ALOJAMIENTO' AND department = 'LIMPIEZA SUBCONTRATADA') WHERE name IN ('SANGAL');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'SUMINISTROS' AND department = 'ELECTRICIDAD') WHERE name IN ('AUDAX');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'SUMINISTROS' AND department = 'AGUA') WHERE name IN ('EMASA');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'SUMINISTROS' AND department = 'GAS') WHERE name IN ('EKYNER');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'SUMINISTROS' AND department = 'TELÉFONO') WHERE name IN ('TELEFONICA', 'VODAFONE', 'SECURITAS DIRECT');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'MARKETING Y RESERVAS' AND department = 'MARKETING Y RESERVAS') WHERE name IN ('BOOKASSIST', 'HOTELREZ', 'OTA INSIGHT', 'DUETTO');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'MARKETING Y RESERVAS' AND department = 'PUBLICIDAD') WHERE name IN ('PUBLILINE', 'SGAE');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'CONSUMO RESTAURACIÓN' AND department = 'COMIDA') WHERE name IN ('FRIT RAVICH');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'INFORMÁTICA' AND department = 'INFORMÁTICA') WHERE name IN ('NORVEX', 'SAMSOTECH');
UPDATE bo_suppliers SET default_category_id = (SELECT id FROM bo_categories WHERE cost_center = 'RECURSOS HUMANOS' AND department = 'PERSONAL') WHERE name IN ('TEMPORING');

-- =========================================================
-- VISTAS ÚTILES
-- =========================================================

-- Vista: Facturas con detalles completos
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

-- Vista: Proveedores con estadísticas
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
    s.email,
    s.phone,
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

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT 'Tablas Back Office creadas correctamente' AS resultado;
SELECT 'Categorías insertadas:' AS info, COUNT(*) AS total FROM bo_categories;
SELECT 'Proveedores insertados:' AS info, COUNT(*) AS total FROM bo_suppliers;
