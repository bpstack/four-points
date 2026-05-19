-- =============================================================================
-- 20260520_add_shift_LI.sql
-- =============================================================================
-- Adds the 'LI' shift code (Libre Disposición) to `scheduling_shifts`. Used
-- in the historical 2026 schedule for free days that don't belong to the
-- regular weekly libre rotation.
--
-- Idempotent (INSERT IGNORE on uk_shift_code).
-- Applies to: LOCAL + AIVEN.
-- Rollback: DELETE FROM scheduling_shifts WHERE code = 'LI';
-- =============================================================================

INSERT IGNORE INTO scheduling_shifts
  (code, name, start_time, end_time, hours, color, is_work_shift, is_paid, display_order)
VALUES
  ('LI', 'Libre Disposición', NULL, NULL, 0.00, '#E5E7EB', 0, 1, 13);
