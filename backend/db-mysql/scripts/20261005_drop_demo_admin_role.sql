-- =============================================================================
-- 20261005_drop_demo_admin_role.sql
-- =============================================================================
-- Removes the `demo-admin` role (ADR-038). The public demo account is now an
-- admin marked with users.is_demo, restricted by demoRestriction; the code no
-- longer knows the old role. Its only user, `demo`, was converted by
-- scripts/create-demo-user.ts.
--
-- Deletes the role only when no user has it: if one still did, that user
-- would be left without a role.
--
-- Idempotent: deletes nothing the second time.
--
-- Applies to: AIVEN (local never had the role).
-- Rollback:  INSERT INTO roles (id, name) VALUES (7, 'demo-admin');
-- =============================================================================

DELETE r FROM roles r
WHERE r.name = 'demo-admin'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.role_id = r.id);

SELECT CONCAT('demo-admin roles left: ', COUNT(*)) AS info FROM roles WHERE name = 'demo-admin';
