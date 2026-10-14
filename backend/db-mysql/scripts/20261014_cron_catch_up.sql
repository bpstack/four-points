-- =============================================================================
-- 20261014_cron_catch_up.sql
-- =============================================================================
-- Two things the scheduled jobs need (services/cron/):
--
-- 1. The `system-cron` user. The monthly batch payment writes
--    bo_invoices.updated_by and bo_invoice_history.changed_by, both foreign keys
--    to users, with 'system-cron'; that user never existed, so the batch failed
--    and no invoice was ever paid by it. It is inactive (login refuses it and
--    every user list filters is_active = 1) and its password is not a bcrypt
--    hash, so nothing can match it.
--
-- 2. Table `cron_job_runs`: one row per job with the last period it ran for
--    (day, week or month). Render's free plan puts the backend to sleep, so
--    the node-cron times are missed; on every start the backend runs the jobs
--    whose period is due and not yet done, and the row keeps a job from running
--    twice in the same period.
--
-- Idempotent: INSERT IGNORE and CREATE TABLE IF NOT EXISTS.
-- Safe to run multiple times.
--
-- Applies to: LOCAL + AIVEN. Apply it before deploying the code: without the
-- table, every job logs an error and skips.
-- Rollback:
--   DROP TABLE cron_job_runs;
--   DELETE FROM users WHERE id = 'system-cron';  -- only if nothing references it
-- =============================================================================

INSERT IGNORE INTO users (id, username, email, password, role_id, is_active)
VALUES ('system-cron', 'system-cron', 'system-cron@localhost', '!', 1, 0);

SELECT id, username, role_id, is_active FROM users WHERE id = 'system-cron';

CREATE TABLE IF NOT EXISTS cron_job_runs (
  job          VARCHAR(64)  NOT NULL PRIMARY KEY,
  last_period  VARCHAR(16)  NOT NULL COMMENT 'YYYY-MM-DD (the day, or the Monday of the week) or YYYY-MM',
  last_status  ENUM('running', 'ok', 'error') NOT NULL,
  last_run_at  DATETIME     NOT NULL,
  last_error   VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT COUNT(*) AS cron_job_runs_rows FROM cron_job_runs;
