-- =========================================================
-- SCHEDULING MODULE - DATABASE SCHEMA (LOCAL)
-- =========================================================
-- Descripción: Sistema de generación de horarios de personal
-- Versión: LOCAL
-- =========================================================

USE hotel_db;

-- =========================================================
-- SAFETY: Drop tables en orden inverso (respetando FK)
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS scheduling_history;
DROP TABLE IF EXISTS scheduling_assignments;
DROP TABLE IF EXISTS scheduling_constraints;
DROP TABLE IF EXISTS scheduling_days;
DROP TABLE IF EXISTS scheduling_months;
DROP TABLE IF EXISTS scheduling_employee_rules;
DROP TABLE IF EXISTS scheduling_employee_contracts;
DROP TABLE IF EXISTS scheduling_employees;
DROP TABLE IF EXISTS scheduling_shifts;
DROP TABLE IF EXISTS scheduling_config;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA 1: scheduling_config
-- =========================================================
CREATE TABLE scheduling_config (
  id INT NOT NULL AUTO_INCREMENT,
  config_key VARCHAR(50) NOT NULL,
  config_value VARCHAR(255) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 2: scheduling_shifts
-- =========================================================
CREATE TABLE scheduling_shifts (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(5) NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  hours DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  color VARCHAR(7) DEFAULT '#CCCCCC',
  is_work_shift TINYINT(1) NOT NULL DEFAULT 1,
  is_paid TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_shift_code (code),
  KEY idx_is_work_shift (is_work_shift),
  KEY idx_is_active (is_active),
  KEY idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 3: scheduling_employees
-- Empleados que participan en la generación de horarios
-- =========================================================
CREATE TABLE scheduling_employees (
  employee_id CHAR(36) NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by CHAR(36) DEFAULT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  
  PRIMARY KEY (employee_id),
  KEY idx_added_at (added_at),
  CONSTRAINT fk_sched_emp_user FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_emp_added_by FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 4: scheduling_employee_contracts
-- Datos de convenio/contrato por empleado y año
-- Permite definir días de trabajo, vacaciones, libres, etc. por empleado
-- =========================================================
CREATE TABLE scheduling_employee_contracts (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id CHAR(36) NOT NULL COMMENT 'ID del empleado (users.id)',
  year INT NOT NULL COMMENT 'Año del contrato',
  
  -- Datos de convenio (lo que corresponde trabajar)
  dias_trabajo INT NOT NULL DEFAULT 225 COMMENT 'Días de trabajo anuales según convenio',
  horas_anuales INT NOT NULL DEFAULT 1800 COMMENT 'Horas a trabajar anuales (dias_trabajo * 8)',
  dias_vacaciones INT NOT NULL DEFAULT 30 COMMENT 'Días de vacaciones anuales',
  dias_libre_semanal INT NOT NULL DEFAULT 90 COMMENT 'Días de libre semanal anuales (~2 por semana)',
  dias_bonificables INT NOT NULL DEFAULT 20 COMMENT 'Días bonificables/festivos anuales',
  dias_it INT NOT NULL DEFAULT 0 COMMENT 'Días de IT previstos (normalmente 0)',
  
  -- Total días año (para validación: trabajo + vac + libre + bonif = ~365)
  dias_laborables_ano INT NOT NULL DEFAULT 365 COMMENT 'Total días laborables del año',
  
  -- Observaciones especiales (ej: "2 LI ENERO", "3 LI ABRIL // 3 LI SEPT")
  observaciones TEXT DEFAULT NULL COMMENT 'Observaciones especiales del convenio',
  
  -- Metadata
  created_by CHAR(36) DEFAULT NULL COMMENT 'Usuario que creó',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_employee_year (employee_id, year),
  KEY idx_year (year),
  KEY idx_employee_id (employee_id),
  CONSTRAINT fk_sched_contract_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_contract_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Datos de convenio/contrato por empleado y año';

-- =========================================================
-- TABLA 5: scheduling_employee_rules
-- =========================================================
CREATE TABLE scheduling_employee_rules (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id CHAR(36) NOT NULL,
  rule_type ENUM('shift_priority', 'max_shift_per_month', 'min_shift_per_month', 'fixed_days', 'fixed_shift', 'no_weekends', 'custom') NOT NULL,
  rule_value VARCHAR(255) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  notes VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_employee_id (employee_id),
  KEY idx_rule_type (rule_type),
  KEY idx_is_active (is_active),
  CONSTRAINT fk_sched_rule_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 6: scheduling_months
-- =========================================================
CREATE TABLE scheduling_months (
  id INT NOT NULL AUTO_INCREMENT,
  year INT NOT NULL,
  month INT NOT NULL,
  status ENUM('draft', 'generated', 'published', 'archived') NOT NULL DEFAULT 'draft',
  generated_at DATETIME DEFAULT NULL,
  generated_by CHAR(36) DEFAULT NULL,
  published_at DATETIME DEFAULT NULL,
  published_by CHAR(36) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_year_month (year, month),
  KEY idx_status (status),
  KEY idx_year (year),
  KEY idx_month (month),
  CONSTRAINT fk_sched_month_generated_by FOREIGN KEY (generated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sched_month_published_by FOREIGN KEY (published_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sched_month_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 7: scheduling_days
-- =========================================================
CREATE TABLE scheduling_days (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL,
  day_number INT NOT NULL,
  date DATE NOT NULL,
  day_of_week CHAR(1) NOT NULL,
  week_number INT NOT NULL,
  is_holiday TINYINT(1) NOT NULL DEFAULT 0,
  holiday_name VARCHAR(100) DEFAULT NULL,
  occupancy_pct DECIMAL(5,2) DEFAULT NULL,
  arrivals INT DEFAULT NULL,
  departures INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_month_day (month_id, day_number),
  KEY idx_date (date),
  KEY idx_day_of_week (day_of_week),
  KEY idx_week_number (week_number),
  KEY idx_is_holiday (is_holiday),
  CONSTRAINT fk_sched_day_month FOREIGN KEY (month_id) REFERENCES scheduling_months (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 8: scheduling_assignments
-- =========================================================
CREATE TABLE scheduling_assignments (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL,
  day_id INT NOT NULL,
  employee_id CHAR(36) NOT NULL,
  shift_code VARCHAR(5) NOT NULL,
  is_manual TINYINT(1) NOT NULL DEFAULT 0,
  notes VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_day_employee (day_id, employee_id),
  KEY idx_month_id (month_id),
  KEY idx_employee_id (employee_id),
  KEY idx_shift_code (shift_code),
  KEY idx_is_manual (is_manual),
  CONSTRAINT fk_sched_assign_month FOREIGN KEY (month_id) REFERENCES scheduling_months (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_assign_day FOREIGN KEY (day_id) REFERENCES scheduling_days (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_assign_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_assign_shift FOREIGN KEY (shift_code) REFERENCES scheduling_shifts (code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 9: scheduling_constraints
-- =========================================================
CREATE TABLE scheduling_constraints (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL,
  employee_id CHAR(36) NOT NULL,
  constraint_type ENUM('vacation', 'sick_leave', 'sick_day', 'training', 'holiday', 'request_off', 'request_shift', 'request_no_shift') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  shift_code VARCHAR(5) DEFAULT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 5,
  notes TEXT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  approved_by CHAR(36) DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_month_id (month_id),
  KEY idx_employee_id (employee_id),
  KEY idx_constraint_type (constraint_type),
  KEY idx_status (status),
  KEY idx_start_date (start_date),
  KEY idx_end_date (end_date),
  KEY idx_priority (priority),
  CONSTRAINT fk_sched_const_month FOREIGN KEY (month_id) REFERENCES scheduling_months (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_const_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_const_shift FOREIGN KEY (shift_code) REFERENCES scheduling_shifts (code) ON DELETE SET NULL,
  CONSTRAINT fk_sched_const_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sched_const_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TABLA 10: scheduling_history
-- =========================================================
CREATE TABLE scheduling_history (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL,
  action ENUM('created', 'generated', 'published', 'unpublished', 'assignment_changed', 'constraint_added', 'constraint_approved', 'constraint_rejected', 'manual_edit') NOT NULL,
  table_affected VARCHAR(50) DEFAULT NULL,
  record_id INT DEFAULT NULL,
  field_changed VARCHAR(100) DEFAULT NULL,
  old_value TEXT DEFAULT NULL,
  new_value TEXT DEFAULT NULL,
  changed_by CHAR(36) DEFAULT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT NULL,
  
  PRIMARY KEY (id),
  KEY idx_month_id (month_id),
  KEY idx_action (action),
  KEY idx_changed_at (changed_at),
  KEY idx_changed_by (changed_by),
  CONSTRAINT fk_sched_hist_month FOREIGN KEY (month_id) REFERENCES scheduling_months (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_hist_changed_by FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- DATOS INICIALES: Configuración
-- =========================================================
INSERT INTO scheduling_config (config_key, config_value, description) VALUES
('min_morning_staff', '1', 'Mínimo personas en turno mañana'),
('pref_morning_staff', '2', 'Preferido personas en turno mañana'),
('max_morning_staff', '2', 'Máximo personas en turno mañana'),
('min_afternoon_staff', '1', 'Mínimo personas en turno tarde'),
('pref_afternoon_staff', '2', 'Preferido personas en turno tarde'),
('max_afternoon_staff', '2', 'Máximo personas en turno tarde'),
('min_night_staff', '1', 'Mínimo personas en turno noche'),
('max_night_staff', '1', 'Máximo personas en turno noche'),
('max_weekly_shifts', '6', 'Máximo turnos por semana'),
('pref_weekly_shifts', '5', 'Preferido turnos por semana'),
('min_rest_hours', '48', 'Horas mínimas de descanso'),
('min_night_block', '4', 'Mínimo noches consecutivas por mes'),
('max_night_block', '6', 'Máximo noches consecutivas por mes'),
('pref_night_block', '5', 'Preferido noches consecutivas por mes'),
('min_monthly_libre', '8', 'Mínimo días libres al mes'),
('max_monthly_libre', '12', 'Máximo días libres al mes'),
('max_consecutive_work_days', '6', 'Máximo días consecutivos de trabajo'),
('min_consecutive_libre', '2', 'Mínimo días libres consecutivos por semana'),
('annual_vacation_days', '30', 'Días de vacaciones anuales'),
('annual_holidays', '14', 'Festivos anuales'),
('annual_free_days', '95', 'Libres semanales anuales'),
('ai_provider', 'none', 'Proveedor IA: none, ollama, openai');

-- =========================================================
-- DATOS INICIALES: Tipos de turno
-- =========================================================
INSERT INTO scheduling_shifts (code, name, start_time, end_time, hours, color, is_work_shift, is_paid, display_order) VALUES
('M', 'Mañana', '07:00:00', '15:00:00', 8.00, '#D1FAE5', 1, 1, 1),
('T', 'Tarde', '15:00:00', '23:00:00', 8.00, '#DBEAFE', 1, 1, 2),
('N', 'Noche', '23:00:00', '07:00:00', 8.00, '#FFEDD5', 1, 1, 3),
('P', 'Presencia', '08:00:00', '16:00:00', 8.00, '#E0E7FF', 1, 1, 4),
('PI', 'Personal Intervención', '09:00:00', '17:00:00', 8.00, '#FEF3C7', 1, 1, 5),
('B', 'Abonable/Festivo', NULL, NULL, 0.00, '#F3E8FF', 0, 1, 6),
('V', 'Vacaciones', NULL, NULL, 0.00, '#FECACA', 0, 1, 7),
('L', 'Libre', NULL, NULL, 0.00, '#FFFFFF', 0, 1, 8),
('FO', 'Formación', NULL, NULL, 0.00, '#FEF9C3', 0, 1, 9),
('IT', 'Incapacidad Temporal', NULL, NULL, 0.00, '#FED7AA', 0, 1, 10),
('E', 'Enfermedad', NULL, NULL, 0.00, '#FECDD3', 0, 1, 11),
('A', 'Ausencia Injustificada', NULL, NULL, 0.00, '#FCA5A5', 0, 0, 12);

-- =========================================================
-- NOTA: DATOS INICIALES DE CONTRATOS
-- Los contratos de empleados se insertan después de que 
-- los usuarios estén creados en la tabla users.
-- Ejemplo de inserción para 2025:
-- =========================================================
-- INSERT INTO scheduling_employee_contracts 
--   (employee_id, year, dias_trabajo, horas_anuales, dias_vacaciones, 
--    dias_libre_semanal, dias_bonificables, dias_laborables_ano, observaciones)
-- VALUES
--   ('uuid-ana-r', 2025, 223, 1784, 30, 90, 20, 363, '2 LI ENERO'),
--   ('uuid-hugo', 2025, 225, 1800, 30, 90, 20, 365, NULL),
--   ('uuid-irene', 2025, 225, 1800, 30, 90, 20, 365, NULL),
--   ('uuid-salvador', 2025, 219, 1752, 30, 90, 20, 359, '3 LI ABRIL // 3 LI SEPT'),
--   ('uuid-pablo', 2025, 222, 1776, 30, 90, 20, 362, '3 LI ABRIL'),
--   ('uuid-elena', 2025, 225, 1800, 30, 90, 20, 365, NULL),
--   ('uuid-Clara', 2025, 225, 1800, 30, 90, 20, 365, NULL),
--   ('uuid-andres', 2025, 225, 1800, 30, 90, 20, 365, NULL);

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '✅ SISTEMA SCHEDULING LOCAL CREADO' AS resultado;
SHOW TABLES LIKE 'scheduling%';
