-- =============================================================================
-- 20251230_add_demo_activity_log.sql  [RETROACTIVE — historical]
-- =============================================================================
-- Restores migration history for the demo_activity_log table (commit 68a4589).
-- Tracks blocked write attempts from the demo user (read-only API enforcement).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- Verified live in Aiven 2026-05-20.
-- =============================================================================
USE hotel_db;

CREATE TABLE IF NOT EXISTS demo_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(36),
  username VARCHAR(100),
  method VARCHAR(10) NOT NULL,
  route VARCHAR(255) NOT NULL,
  body_preview TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  blocked BOOLEAN DEFAULT TRUE,
  INDEX idx_demo_log_timestamp (timestamp),
  INDEX idx_demo_log_username (username),
  INDEX idx_demo_log_route (route)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
