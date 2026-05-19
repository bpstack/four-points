-- =========================================================
-- SCHEDULING MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de horarios de personal (creación manual + validación)
-- Versión: AIVEN (utf8mb4_0900_ai_ci)
-- =========================================================

USE hotel_db;

-- =========================================================
-- SAFETY: Drop tables en orden inverso (respetando FK)
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS scheduling_solver_runs;
DROP TABLE IF EXISTS scheduling_employee_requests;
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
-- Configuración ajustable del sistema de horarios
-- =========================================================
CREATE TABLE scheduling_config (
  id INT NOT NULL AUTO_INCREMENT,
  config_key VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Clave de configuración',
  config_value VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Valor de la configuración',
  description VARCHAR(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Descripción de la configuración',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Configuración del sistema de horarios';

-- =========================================================
-- TABLA 2: scheduling_shifts
-- Tipos de turno disponibles (M, T, N, P, PI, B, V, L, etc.)
-- =========================================================
CREATE TABLE scheduling_shifts (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(5) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Código del turno (M, T, N, etc.)',
  name VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Nombre del turno',
  start_time TIME DEFAULT NULL COMMENT 'Hora de inicio (NULL para ausencias)',
  end_time TIME DEFAULT NULL COMMENT 'Hora de fin (NULL para ausencias)',
  hours DECIMAL(4,2) NOT NULL DEFAULT 8.00 COMMENT 'Horas del turno',
  color VARCHAR(7) COLLATE utf8mb4_0900_ai_ci DEFAULT '#CCCCCC' COMMENT 'Color HEX para UI',
  is_work_shift TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=turno trabajo, 0=ausencia/libre',
  is_paid TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=pagado, 0=no pagado',
  display_order INT NOT NULL DEFAULT 0 COMMENT 'Orden de visualización',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=activo, 0=inactivo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_shift_code (code),
  KEY idx_is_work_shift (is_work_shift),
  KEY idx_is_active (is_active),
  KEY idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tipos de turno disponibles';

-- =========================================================
-- TABLA 3: scheduling_employees
-- Empleados que participan en la generación de horarios
-- =========================================================
CREATE TABLE scheduling_employees (
  employee_id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado (users.id)',
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de alta en scheduling',
  added_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que lo añadió',
  notes VARCHAR(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas',
  display_order INT NULL COMMENT 'Orden manual en las UIs de scheduling. NULL = sin orden, fallback alfabetico',

  PRIMARY KEY (employee_id),
  KEY idx_added_at (added_at),
  KEY idx_scheduling_employees_display_order (display_order),
  CONSTRAINT fk_sched_emp_user FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_emp_added_by FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Empleados que participan en horarios';

-- =========================================================
-- TABLA 4: scheduling_employee_contracts
-- Datos de convenio/contrato por empleado y año
-- Permite definir días de trabajo, vacaciones, libres, etc. por empleado
-- =========================================================
CREATE TABLE scheduling_employee_contracts (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado (users.id)',
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
  observaciones TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Observaciones especiales del convenio',
  
  -- Metadata
  created_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_employee_year (employee_id, year),
  KEY idx_year (year),
  KEY idx_employee_id (employee_id),
  CONSTRAINT fk_sched_contract_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_contract_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Datos de convenio/contrato por empleado y año';

-- =========================================================
-- TABLA 5: scheduling_employee_rules
-- Reglas específicas por empleado (Salvador, Andrés, Ana R, etc.)
-- =========================================================
CREATE TABLE scheduling_employee_rules (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado (users.id)',
  rule_type ENUM('shift_priority', 'max_shift_per_month', 'min_shift_per_month', 'fixed_days', 'fixed_shift', 'no_weekends', 'custom') COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de regla',
  rule_value VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Valor de la regla',
  priority INT NOT NULL DEFAULT 0 COMMENT 'Prioridad de la regla (mayor = más importante)',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=activa, 0=inactiva',
  notes VARCHAR(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas sobre la regla',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_employee_id (employee_id),
  KEY idx_rule_type (rule_type),
  KEY idx_is_active (is_active),
  CONSTRAINT fk_sched_rule_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reglas específicas por empleado';

-- =========================================================
-- TABLA 6: scheduling_months
-- Planning mensual (un registro por mes/año)
-- =========================================================
CREATE TABLE scheduling_months (
  id INT NOT NULL AUTO_INCREMENT,
  year INT NOT NULL COMMENT 'Año del planning',
  month INT NOT NULL COMMENT 'Mes del planning (1-12)',
  status ENUM('draft', 'published') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'draft' COMMENT 'Estado del planning: draft (en edición), published (publicado)',
  published_at DATETIME DEFAULT NULL COMMENT 'Fecha/hora de publicación',
  published_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que publicó',
  notes TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas del planning',
  created_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_year_month (year, month),
  KEY idx_status (status),
  KEY idx_year (year),
  KEY idx_month (month),
  CONSTRAINT fk_sched_month_published_by FOREIGN KEY (published_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sched_month_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Planning mensual';

-- =========================================================
-- TABLA 7: scheduling_days
-- Días del mes con información adicional (festivos, ocupación, etc.)
-- =========================================================
CREATE TABLE scheduling_days (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL COMMENT 'ID del planning mensual',
  day_number INT NOT NULL COMMENT 'Día del mes (1-31)',
  date DATE NOT NULL COMMENT 'Fecha completa',
  day_of_week CHAR(1) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Día semana (L,M,X,J,V,S,D)',
  week_number INT NOT NULL COMMENT 'Número de semana del mes (1-5)',
  is_holiday TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=festivo, 0=normal',
  holiday_name VARCHAR(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Nombre del festivo',
  occupancy_pct DECIMAL(5,2) DEFAULT NULL COMMENT 'Porcentaje ocupación hotel',
  arrivals INT DEFAULT NULL COMMENT 'Llegadas previstas',
  departures INT DEFAULT NULL COMMENT 'Salidas previstas',
  notes TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas del día',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_month_day (month_id, day_number),
  KEY idx_date (date),
  KEY idx_day_of_week (day_of_week),
  KEY idx_week_number (week_number),
  KEY idx_is_holiday (is_holiday),
  CONSTRAINT fk_sched_day_month FOREIGN KEY (month_id) REFERENCES scheduling_months (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Días del planning con información adicional';

-- =========================================================
-- TABLA 8: scheduling_assignments
-- Asignación de turnos (empleado × día = turno)
-- =========================================================
CREATE TABLE scheduling_assignments (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL COMMENT 'ID del planning mensual',
  day_id INT NOT NULL COMMENT 'ID del día',
  employee_id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado',
  shift_code VARCHAR(5) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Código del turno asignado',
  source_constraint_id INT DEFAULT NULL COMMENT 'Constraint origen (si la celda está precargada/bloqueada)',
  notes VARCHAR(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas de la asignación',
  libre_number INT NULL DEFAULT NULL COMMENT 'Par de libre semanal al que pertenece esta asignación (1-45)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_day_employee (day_id, employee_id),
  KEY idx_month_id (month_id),
  KEY idx_employee_id (employee_id),
  KEY idx_shift_code (shift_code),
  KEY idx_source_constraint_id (source_constraint_id),
  CONSTRAINT fk_sched_assign_month FOREIGN KEY (month_id) REFERENCES scheduling_months (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_assign_day FOREIGN KEY (day_id) REFERENCES scheduling_days (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_assign_employee FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_assign_shift FOREIGN KEY (shift_code) REFERENCES scheduling_shifts (code) ON DELETE RESTRICT,
  CONSTRAINT fk_sched_assign_source_constraint FOREIGN KEY (source_constraint_id) REFERENCES scheduling_constraints (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Asignación de turnos por empleado y día';

-- =========================================================
-- TABLA 9: scheduling_constraints
-- Restricciones variables (vacaciones, peticiones, bajas, etc.)
-- =========================================================
CREATE TABLE scheduling_constraints (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL COMMENT 'ID del planning mensual',
  employee_id CHAR(36) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado',
  constraint_type ENUM('vacation', 'sick_leave', 'sick_day', 'training', 'holiday', 'request_off', 'request_shift', 'request_no_shift') COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de restricción',
  start_date DATE NOT NULL COMMENT 'Fecha inicio',
  end_date DATE NOT NULL COMMENT 'Fecha fin',
  shift_code VARCHAR(5) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Turno específico (para request_shift/request_no_shift)',
  status ENUM('pending', 'approved', 'rejected') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending' COMMENT 'Estado de la petición',
  priority INT NOT NULL DEFAULT 5 COMMENT 'Prioridad (1=máxima, 7=mínima)',
  notes TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Motivo o notas',
  created_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó',
  approved_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que aprobó/rechazó',
  approved_at DATETIME DEFAULT NULL COMMENT 'Fecha de aprobación/rechazo',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Restricciones y peticiones de empleados';

-- =========================================================
-- TABLA 10: scheduling_history
-- Historial de cambios para auditoría
-- =========================================================
CREATE TABLE scheduling_history (
  id INT NOT NULL AUTO_INCREMENT,
  month_id INT NOT NULL COMMENT 'ID del planning mensual',
  action ENUM('created', 'published', 'unpublished', 'assignment_changed', 'constraint_added', 'constraint_approved', 'constraint_rejected', 'manual_edit', 'reset') COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de acción realizada',
  table_affected VARCHAR(50) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Tabla afectada',
  record_id INT DEFAULT NULL COMMENT 'ID del registro afectado',
  field_changed VARCHAR(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Campo modificado',
  old_value TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Valor anterior',
  new_value TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Valor nuevo',
  changed_by CHAR(36) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que hizo el cambio',
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas del cambio',
  
  PRIMARY KEY (id),
  KEY idx_month_id (month_id),
  KEY idx_action (action),
  KEY idx_changed_at (changed_at),
  KEY idx_changed_by (changed_by),
  CONSTRAINT fk_sched_hist_month FOREIGN KEY (month_id) REFERENCES scheduling_months (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_hist_changed_by FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de cambios para auditoría';

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
('annual_free_days', '95', 'Libres semanales anuales');

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
-- TABLA 11: scheduling_employee_requests
-- Peticiones de empleados (vacaciones, libres, turnos...)
-- Origen: SCHEDULING-CONSTRAINTS.md §7.5 (2026-04-25)
-- =========================================================
CREATE TABLE scheduling_employee_requests (
  id              INT          NOT NULL AUTO_INCREMENT,
  employee_id     CHAR(36)     COLLATE utf8mb4_0900_ai_ci NOT NULL  COMMENT 'ID del empleado (users.id)',
  date_from       DATE         NOT NULL                              COMMENT 'Fecha inicio de la petición',
  date_to         DATE         NOT NULL                              COMMENT 'Fecha fin de la petición',
  request_type    ENUM(
    'shift_preference',
    'shift_exclusion',
    'bonificable',
    'baja_temporal',
    'vacation'
  )               COLLATE utf8mb4_0900_ai_ci NOT NULL               COMMENT 'Tipo de petición',
  requested_value VARCHAR(10)  COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Código turno (L,M,T,N,PI,P,...) cuando aplica',
  status          ENUM('pending', 'approved', 'rejected') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending',
  notes           VARCHAR(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas de la petición',
  created_by      CHAR(36)     COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Manager que crea la petición',
  approved_by     CHAR(36)     COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Manager que aprueba',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at     TIMESTAMP    NULL DEFAULT NULL                     COMMENT 'Fecha de aprobación',

  PRIMARY KEY (id),
  KEY idx_employee_date (employee_id, date_from, date_to),
  KEY idx_status (status),
  KEY idx_request_type (request_type),
  CONSTRAINT fk_sched_req_employee    FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_req_created_by  FOREIGN KEY (created_by)  REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sched_req_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Peticiones de empleados (vacaciones, libres, turnos específicos)';

-- =========================================================
-- TABLA 12: scheduling_solver_runs
-- Historial de ejecuciones del solver CP-SAT por mes
-- Origen: SCHEDULING-SOLVER-PLAN.md Fase 3 paso 1
-- =========================================================
CREATE TABLE scheduling_solver_runs (
  id                      INT          NOT NULL AUTO_INCREMENT,
  month_id                INT          NOT NULL                              COMMENT 'Mes para el que se generó',
  generated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by            CHAR(36)     COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que disparó la generación',
  status                  ENUM('ok', 'infeasible', 'error') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  solve_time_ms           INT          DEFAULT NULL                          COMMENT 'Tiempo de resolución en ms',
  cp_status               VARCHAR(20)  COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN',
  soft_penalty            INT          DEFAULT NULL                          COMMENT 'Penalización soft total',
  soft_penalty_breakdown  JSON         DEFAULT NULL                          COMMENT 'Desglose de penalización por constraint soft',
  solver_input            JSON         DEFAULT NULL                          COMMENT 'Snapshot del input enviado al solver',
  solver_matrix           JSON         DEFAULT NULL                          COMMENT 'Matriz generada original (pre-edición manual)',
  conflicting_constraints JSON         DEFAULT NULL                          COMMENT 'Constraints en conflicto (solo si infeasible)',

  PRIMARY KEY (id),
  KEY idx_month_id     (month_id),
  KEY idx_status       (status),
  KEY idx_generated_at (generated_at),
  CONSTRAINT fk_solver_run_month        FOREIGN KEY (month_id)      REFERENCES scheduling_months (id) ON DELETE CASCADE,
  CONSTRAINT fk_solver_run_generated_by FOREIGN KEY (generated_by)  REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de ejecuciones del solver CP-SAT por mes';

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '✅ SISTEMA SCHEDULING AIVEN CREADO' AS resultado;
SHOW TABLES LIKE 'scheduling%';

SELECT 'Configuración insertada:' AS info;
SELECT * FROM scheduling_config;

SELECT 'Turnos insertados:' AS info;
SELECT code, name, start_time, end_time, hours, is_work_shift FROM scheduling_shifts ORDER BY display_order;
