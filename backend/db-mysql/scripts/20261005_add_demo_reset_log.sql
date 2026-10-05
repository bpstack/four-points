-- =============================================================================
-- 20261005_add_demo_reset_log.sql
-- =============================================================================
-- Adds `demo_reset_log`: one row per daily reset of the public demo and per
-- saved scheduling base (ADR-038). The backend reads it to reset only once a
-- day, on the first demo entry, and shows it in Settings → Demo.
--
-- The scheduling base itself lives in `demo_snapshot_scheduling_*` tables,
-- created by the backend when an admin saves it (services/demo).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS.
--
-- Applies to: LOCAL + AIVEN.
-- Rollback:  DROP TABLE demo_reset_log;
-- =============================================================================

CREATE TABLE IF NOT EXISTS demo_reset_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  action ENUM('reset', 'snapshot') NOT NULL COMMENT 'reset: mock + scheduling base; snapshot: base saved',
  trigger_type ENUM('auto', 'manual') NOT NULL COMMENT 'auto: first demo entry of the day',
  user_id VARCHAR(36) NULL COMMENT 'Admin who ran it (manual)',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  ok TINYINT(1) NOT NULL DEFAULT 0,
  details VARCHAR(500) NULL COMMENT 'Summary or error code, never SQL text',
  PRIMARY KEY (id),
  KEY idx_demo_reset_log_action_started (action, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Public demo: daily resets and saved scheduling bases (ADR-038)';
