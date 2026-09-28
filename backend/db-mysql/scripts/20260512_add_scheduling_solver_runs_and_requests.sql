-- ============================================================
-- 20260512_add_scheduling_solver_runs_and_requests.sql
--
-- Migración incremental — NO destructiva.
-- Añade las tablas que faltan a una BD existente:
--   - scheduling_employee_requests (si no existe; LOCAL ya la tiene)
--   - scheduling_solver_runs       (nueva, AIVEN y LOCAL)
--
-- Usar este script en lugar de MASTER_INSTALL.sql cuando se quiera
-- preservar los datos existentes. MASTER_INSTALL.sql es destructivo
-- (DROP DATABASE al inicio).
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS.
--
-- Aplicación:
--   - AIVEN:  mysql --host=$AIVEN_DB_HOST -u $AIVEN_DB_USER -p$AIVEN_PASSWORD --ssl-mode=REQUIRED $AIVEN_DB_NAME < 20260512_add_scheduling_solver_runs_and_requests.sql
--   - LOCAL:  mysql --host=$LOCAL_DB_HOST -u $LOCAL_DB_USER -p$LOCAL_DB_PASSWORD $LOCAL_DB_NAME < 20260512_add_scheduling_solver_runs_and_requests.sql
-- ============================================================

-- =========================================================
-- TABLA: scheduling_employee_requests
-- Origen: docs/scheduling/constraints.md §7.5 (2026-04-25)
-- Idéntica a aiven/19_scheduling.sql (Tabla 11).
-- =========================================================
CREATE TABLE IF NOT EXISTS scheduling_employee_requests (
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
  requested_value VARCHAR(10)  COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Código turno cuando aplica',
  status          ENUM('pending', 'approved', 'rejected') COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending',
  notes           VARCHAR(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  created_by      CHAR(36)     COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  approved_by     CHAR(36)     COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at     TIMESTAMP    NULL DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_employee_date (employee_id, date_from, date_to),
  KEY idx_status (status),
  KEY idx_request_type (request_type),
  CONSTRAINT fk_sched_req_employee    FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_req_created_by  FOREIGN KEY (created_by)  REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sched_req_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Peticiones de empleados';

-- =========================================================
-- TABLA: scheduling_solver_runs
-- Origen: SCHEDULING-SOLVER-PLAN.md Fase 3 paso 1 (2026-05-12)
-- Idéntica a aiven/19_scheduling.sql (Tabla 12).
-- =========================================================
CREATE TABLE IF NOT EXISTS scheduling_solver_runs (
  id                      INT          NOT NULL AUTO_INCREMENT,
  month_id                INT          NOT NULL,
  generated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by            CHAR(36)     COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  status                  ENUM('ok', 'infeasible', 'error') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  solve_time_ms           INT          DEFAULT NULL,
  cp_status               VARCHAR(20)  COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  soft_penalty            INT          DEFAULT NULL,
  soft_penalty_breakdown  JSON         DEFAULT NULL,
  solver_input            JSON         DEFAULT NULL,
  solver_matrix           JSON         DEFAULT NULL,
  conflicting_constraints JSON         DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_month_id     (month_id),
  KEY idx_status       (status),
  KEY idx_generated_at (generated_at),
  CONSTRAINT fk_solver_run_month        FOREIGN KEY (month_id)     REFERENCES scheduling_months (id) ON DELETE CASCADE,
  CONSTRAINT fk_solver_run_generated_by FOREIGN KEY (generated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de ejecuciones del solver CP-SAT por mes';

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT 'Migración 20260512 aplicada. Tablas resultantes:' AS info;
SHOW TABLES LIKE 'scheduling_employee_requests';
SHOW TABLES LIKE 'scheduling_solver_runs';

SELECT 'Verificación de FKs:' AS info;
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('scheduling_employee_requests', 'scheduling_solver_runs')
  AND REFERENCED_TABLE_NAME IS NOT NULL;
