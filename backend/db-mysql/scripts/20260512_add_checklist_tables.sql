-- ============================================================
-- 20260512_add_checklist_tables.sql
--
-- Migración incremental — NO destructiva.
-- Añade las 6 tablas del módulo checklist a una BD que no las tenga.
-- Aiven actualmente no las tiene → endpoints /api/checklists devuelven 500.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS. Si las tablas ya existen
-- (caso de LOCAL), no hace nada.
--
-- Fuente canónica: aiven/20_checklist.sql (sin la sección DROP).
-- ============================================================

CREATE TABLE IF NOT EXISTS checklist_config (
  hotel_id          INT PRIMARY KEY,
  daily_reset_time  TIME NOT NULL DEFAULT '06:30:00',
  timezone          VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO checklist_config (hotel_id) VALUES (1);

CREATE TABLE IF NOT EXISTS checklist_runs (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  checklist_id      VARCHAR(100) NOT NULL,
  hotel_id          INT NOT NULL DEFAULT 1,
  hotel_date        DATE NOT NULL,
  shift             ENUM('morning','afternoon','night') NULL,
  started_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reset_at          DATETIME NULL,
  reset_by_user_id  CHAR(36) NULL,
  reset_reason      ENUM('cron','manual') NULL,
  UNIQUE KEY uk_run (hotel_id, checklist_id, hotel_date),
  INDEX idx_active     (hotel_id, checklist_id, reset_at),
  INDEX idx_hotel_date (hotel_id, hotel_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS checklist_step_state (
  run_id            BIGINT NOT NULL,
  step_id           VARCHAR(100) NOT NULL,
  done              TINYINT(1) NOT NULL DEFAULT 0,
  done_by_user_id   CHAR(36) NULL,
  done_at           DATETIME NULL,
  PRIMARY KEY (run_id, step_id),
  FOREIGN KEY (run_id) REFERENCES checklist_runs(id) ON DELETE CASCADE,
  INDEX idx_done_by (done_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS checklist_event_log (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  run_id        BIGINT NOT NULL,
  step_id       VARCHAR(100) NULL,
  user_id       CHAR(36) NOT NULL,
  action        ENUM('check','uncheck','comment','attach','reset_manual','reset_cron') NOT NULL,
  payload_json  JSON NULL,
  at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES checklist_runs(id) ON DELETE CASCADE,
  INDEX idx_run_at (run_id, at),
  INDEX idx_user   (user_id, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS checklist_step_comments (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  run_id      BIGINT NOT NULL,
  step_id     VARCHAR(100) NOT NULL,
  user_id     CHAR(36) NOT NULL,
  body        TEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES checklist_runs(id) ON DELETE CASCADE,
  INDEX idx_step (run_id, step_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS checklist_step_attachments (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  run_id      BIGINT NOT NULL,
  step_id     VARCHAR(100) NOT NULL,
  user_id     CHAR(36) NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  public_id   VARCHAR(255) NOT NULL,
  mime        VARCHAR(100) NOT NULL,
  size        INT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES checklist_runs(id) ON DELETE CASCADE,
  INDEX idx_step (run_id, step_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT 'checklist_config'           AS tabla, COUNT(*) AS filas FROM checklist_config
UNION ALL SELECT 'checklist_runs',                  COUNT(*) FROM checklist_runs
UNION ALL SELECT 'checklist_step_state',            COUNT(*) FROM checklist_step_state
UNION ALL SELECT 'checklist_event_log',             COUNT(*) FROM checklist_event_log
UNION ALL SELECT 'checklist_step_comments',         COUNT(*) FROM checklist_step_comments
UNION ALL SELECT 'checklist_step_attachments',      COUNT(*) FROM checklist_step_attachments;
