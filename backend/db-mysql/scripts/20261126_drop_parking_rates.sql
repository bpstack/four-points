-- =============================================================================
-- 20261126_drop_parking_rates.sql
-- =============================================================================
-- Parking prices are typed by hand on each booking (decided on 2026-11-26):
-- the rates will change often and nobody maintained the table, which had no
-- screen to edit it and already held different prices on the remote database
-- and on a fresh install (7 to 30 days).
--
-- Drops:
--   - parking_rates: the backend no longer reads it. Bookings keep the amount
--     stored on each one (parking_bookings.total_amount).
--   - get_available_spots: the only routine that read parking_rates. Nothing
--     calls it (not the backend, not mock-data.sql, not another routine).
--
-- ⚠️ Remote: apply only after the code that no longer reads parking_rates is
--    deployed on preview AND production (they share the database). Before
--    that, creating a booking without a price fails.
--
-- Idempotent: DROP ... IF EXISTS. The last SELECT shows what is left (0, 0).
--
-- Applies to: LOCAL + REMOTE.
-- Rollback:  the definitions are in aiven/04_parking_tables.sql,
--            aiven/06_parking_procedures.sql and aiven/07_parking_initial_data.sql;
--            the remote prices, in the dump taken before applying this.
-- =============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

DROP PROCEDURE IF EXISTS get_available_spots;
DROP TABLE IF EXISTS parking_rates;

SELECT
  (SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parking_rates') AS parking_rates_left,
  (SELECT COUNT(*) FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'get_available_spots') AS get_available_spots_left;
