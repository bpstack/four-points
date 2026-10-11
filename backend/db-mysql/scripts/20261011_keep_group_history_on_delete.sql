-- =============================================================================
-- 20261011_keep_group_history_on_delete.sql
-- =============================================================================
-- Drops the foreign key from group_history.group_id to hotel_groups.id. It was
-- ON DELETE CASCADE, so deleting a group also deleted its whole history and
-- left no trace of the deletion. Decided on 2026-10-11: a group is still
-- deleted, but its history stays and gains a "deleted" row with a snapshot of
-- the group (GroupRepository.delete). group_id keeps its index
-- (idx_group_id); rows of a deleted group point to an id that no longer
-- exists.
--
-- Idempotent: if the foreign key is already gone the ALTER is a no-op.
-- Safe to run multiple times.
--
-- Applies to: LOCAL + AIVEN. Apply it before deploying the code that writes
-- the deletion row: with the foreign key in place that insert fails and the
-- delete rolls back.
-- Rollback (only while no history row points to a deleted group):
--   ALTER TABLE group_history ADD CONSTRAINT group_history_ibfk_1
--     FOREIGN KEY (group_id) REFERENCES hotel_groups (id) ON DELETE CASCADE;
-- =============================================================================

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_history'
    AND CONSTRAINT_NAME = 'group_history_ibfk_1'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @ddl := IF(
  @fk_exists = 1,
  'ALTER TABLE group_history DROP FOREIGN KEY group_history_ibfk_1',
  'SELECT ''group_history_ibfk_1 already dropped, skipping'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
