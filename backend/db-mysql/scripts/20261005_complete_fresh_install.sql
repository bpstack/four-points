-- =============================================================================
-- 20261005_complete_fresh_install.sql
-- =============================================================================
-- Completes a database installed from scratch with MASTER_INSTALL.sql, so it
-- ends up like Aiven (compared column by column on 2026-10-05, ADR-038). The
-- frozen baseline (aiven/NN, ADR-021) leaves out three tables:
--
-- - cashier_history: aiven/11_cashier.sql names its foreign key
--   fk_history_user, already used by logbook_history, and the CREATE fails.
-- - scheduling_assignments: aiven/19_scheduling.sql creates it before
--   scheduling_constraints, which it references, and the CREATE fails.
-- - demo_activity_log: MASTER_INSTALL.sql skips aiven/15_demo_user.sql and its
--   migration predates the baseline.
--
-- And roles.name is varchar(50) there, varchar(255) on Aiven.
--
-- Definitions copied from Aiven (SHOW CREATE TABLE). On Aiven and on any
-- database that already has them it does nothing.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS; the ALTER runs only on varchar(50).
--
-- Applies to: LOCAL + AIVEN (no-op on both today) + fresh installs.
-- Rollback:  not needed; it only adds what a fresh install lacks.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `cashier_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift_id` int NOT NULL COMMENT 'Turno afectado',
  `action` enum('created','updated','deleted','status_changed','adjustment','voucher_created','voucher_repaid','daily_closed','daily_reopened') NOT NULL,
  `table_affected` varchar(100) DEFAULT NULL COMMENT 'Tabla modificada',
  `record_id` int DEFAULT NULL COMMENT 'ID del registro modificado',
  `field_changed` varchar(100) DEFAULT NULL COMMENT 'Campo modificado',
  `old_value` text COMMENT 'Valor anterior',
  `new_value` text COMMENT 'Valor nuevo',
  `changed_by` char(36) DEFAULT NULL COMMENT 'Usuario que realizó el cambio',
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text COMMENT 'Notas adicionales',
  PRIMARY KEY (`id`),
  KEY `fk_cashier_history_user` (`changed_by`),
  KEY `idx_history_shift` (`shift_id`),
  KEY `idx_history_action` (`action`),
  KEY `idx_history_changed_at` (`changed_at`),
  CONSTRAINT `fk_cashier_history_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cashier_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `scheduling_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month_id` int NOT NULL COMMENT 'ID del planning mensual',
  `day_id` int NOT NULL COMMENT 'ID del día',
  `employee_id` char(36) NOT NULL COMMENT 'ID del empleado',
  `shift_code` varchar(5) NOT NULL COMMENT 'Código del turno asignado',
  `source_constraint_id` int DEFAULT NULL COMMENT 'Constraint origen (si la celda está precargada/bloqueada)',
  `notes` varchar(255) DEFAULT NULL COMMENT 'Notas de la asignación',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `libre_number` int DEFAULT NULL COMMENT 'Par de libre semanal al que pertenece esta asignación (1-45)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_day_employee` (`day_id`,`employee_id`),
  KEY `idx_month_id` (`month_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_shift_code` (`shift_code`),
  KEY `idx_source_constraint_id` (`source_constraint_id`),
  CONSTRAINT `fk_sched_assign_day` FOREIGN KEY (`day_id`) REFERENCES `scheduling_days` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_assign_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_assign_month` FOREIGN KEY (`month_id`) REFERENCES `scheduling_months` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_assign_shift` FOREIGN KEY (`shift_code`) REFERENCES `scheduling_shifts` (`code`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sched_assign_source_constraint` FOREIGN KEY (`source_constraint_id`) REFERENCES `scheduling_constraints` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `demo_activity_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_id` varchar(36) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `method` varchar(10) NOT NULL,
  `route` varchar(255) NOT NULL,
  `body_preview` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `blocked` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_demo_log_timestamp` (`timestamp`),
  KEY `idx_demo_log_username` (`username`),
  KEY `idx_demo_log_route` (`route`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @roles_name := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'name'
);
SET @ddl := IF(
  @roles_name = 'varchar(50)',
  'ALTER TABLE roles MODIFY COLUMN name VARCHAR(255) NOT NULL',
  'SELECT ''roles.name already wider than varchar(50), skipping'' AS info'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
