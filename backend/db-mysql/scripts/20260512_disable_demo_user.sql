-- =============================================================================
-- 20260512_disable_demo_user.sql  [RETROACTIVE — historical]
-- =============================================================================
-- Restores migration history for disabling the demo user (commit 5644aab,
-- H1-12). Demo user (`username='demo'`) is set to `is_active=0` so it can
-- no longer log in. The user row is preserved for audit purposes (linked
-- references in demo_activity_log etc.).
--
-- Idempotent: UPDATE only flips the bit if not already set.
-- Verified live in Aiven 2026-05-20 (demo.is_active = 0).
-- =============================================================================
USE hotel_db;

UPDATE users
SET is_active = 0
WHERE username = 'demo' AND is_active = 1;
