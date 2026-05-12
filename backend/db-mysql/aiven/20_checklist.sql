-- =========================================================
-- CHECKLIST MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de checklists operativos (tareas diarias,
--              procedimientos, referencia). Contenido en filesystem;
--              DB solo persiste estado de pasos y audit log.
-- Fases: F2 (runs + step_state + event_log + config)
--        F3 (comments + attachments)
-- =========================================================

USE hotel_db;

-- =========================================================
-- SAFETY: Drop en orden inverso (respetando FK)
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS checklist_step_attachments;
DROP TABLE IF EXISTS checklist_step_comments;
DROP TABLE IF EXISTS checklist_event_log;
DROP TABLE IF EXISTS checklist_step_state;
DROP TABLE IF EXISTS checklist_runs;
DROP TABLE IF EXISTS checklist_config;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA 1: checklist_config
-- Una fila por hotel. Reset time + timezone configurables.
-- =========================================================
CREATE TABLE checklist_config (
  hotel_id          INT PRIMARY KEY,
  daily_reset_time  TIME NOT NULL DEFAULT '06:30:00',
  timezone          VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO checklist_config (hotel_id) VALUES (1);

-- =========================================================
-- TABLA 2: checklist_runs
-- Una "instancia" del checklist para un día concreto.
-- hotel_id + checklist_id + hotel_date es único (UNIQUE KEY).
-- reset_at NULL = run activo; NOT NULL = run cerrado por reset.
-- =========================================================
CREATE TABLE checklist_runs (
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

-- =========================================================
-- TABLA 3: checklist_step_state
-- Estado actual de cada paso del run. Sobreescribible.
-- Referencia paso por step_id (string estable del JSON/MD).
-- =========================================================
CREATE TABLE checklist_step_state (
  run_id            BIGINT NOT NULL,
  step_id           VARCHAR(100) NOT NULL,
  done              TINYINT(1) NOT NULL DEFAULT 0,
  done_by_user_id   CHAR(36) NULL,
  done_at           DATETIME NULL,
  PRIMARY KEY (run_id, step_id),
  FOREIGN KEY (run_id) REFERENCES checklist_runs(id) ON DELETE CASCADE,
  INDEX idx_done_by (done_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- TABLA 4: checklist_event_log
-- Audit log inmutable: cada acción genera 1 fila, nunca se borra.
-- payload_json: contexto adicional (ej: { shift } en reset_cron).
-- =========================================================
CREATE TABLE checklist_event_log (
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

-- =========================================================
-- TABLA 5: checklist_step_comments (F3)
-- Comentarios por paso dentro de un run. Inmutables (no se editan).
-- =========================================================
CREATE TABLE checklist_step_comments (
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

-- =========================================================
-- TABLA 6: checklist_step_attachments (F3)
-- Adjuntos subidos a Cloudinary por paso dentro de un run.
-- =========================================================
CREATE TABLE checklist_step_attachments (
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

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT 'checklist_config'    AS tabla, COUNT(*) AS filas FROM checklist_config
UNION ALL
SELECT 'checklist_runs',       COUNT(*) FROM checklist_runs
UNION ALL
SELECT 'checklist_step_state', COUNT(*) FROM checklist_step_state
UNION ALL
SELECT 'checklist_event_log',       COUNT(*) FROM checklist_event_log
UNION ALL
SELECT 'checklist_step_comments',    COUNT(*) FROM checklist_step_comments
UNION ALL
SELECT 'checklist_step_attachments', COUNT(*) FROM checklist_step_attachments;
