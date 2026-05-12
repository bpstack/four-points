-- ============================================================
-- 20260425_create_scheduling_employee_requests.sql
-- Crea la tabla scheduling_employee_requests.
-- Origen: SCHEDULING-CONSTRAINTS.md §7.5 (cerrado 2026-04-25).
-- Bloqueante de Fase 1 del solver.
--
-- IMPORTANTE: Solo aplicar en LOCAL hasta que se valide en pruebas.
-- Aiven se actualiza en una fase posterior.
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduling_employee_requests (
  id            INT          NOT NULL AUTO_INCREMENT,
  employee_id   CHAR(36)     NOT NULL,
  date_from     DATE         NOT NULL,
  date_to       DATE         NOT NULL,
  request_type  ENUM(
    'shift_preference',
    'shift_exclusion',
    'bonificable',
    'baja_temporal',
    'vacation'
  )             NOT NULL,
  requested_value VARCHAR(10) DEFAULT NULL
    COMMENT 'Código turno (L,M,T,N,PI,P,...) cuando aplica',
  status        ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  notes         VARCHAR(255) DEFAULT NULL,
  created_by    CHAR(36)     DEFAULT NULL
    COMMENT 'Manager que crea la petición',
  approved_by   CHAR(36)     DEFAULT NULL
    COMMENT 'Manager que aprueba (puede coincidir con created_by)',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at   TIMESTAMP    NULL DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_employee_date (employee_id, date_from, date_to),
  KEY idx_status (status),
  CONSTRAINT fk_sched_req_employee
    FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
