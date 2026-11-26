# `hotel_db` index: tables and migrations

Which tables exist and which migrations were applied, and where. The rules
(migration policy, install, comparing with production, backups) are in
[`AGENTS.md`](./AGENTS.md); what each file of this folder is for is in
[`README.md`](./README.md).

## Tables by module

As of `schema.sql` (2026-11-26): 67 tables and 3 views.

- **Core** (3): `roles`, `departments`, `users`.
- **Logbook** (4): `logbooks`, `logbook_comments`, `logbook_reads`,
  `logbook_history`.
- **Parking** (4): `parking_spots`, `parking_vehicles`, `parking_bookings`,
  `parking_availability`. With 5 triggers on `parking_bookings`, 2 functions
  (`check_availability`, `get_total_availability`) and 4 procedures
  (`generate_availability`, `sync_parking_availability`,
  `daily_parking_maintenance`, `get_pending_checkins`).
- **Conciliation** (4): `conciliation_reception`, `conciliation_housekeeping`,
  `conciliation_summary`, `conciliation_monthly_summary`.
- **Groups** (6): `hotel_groups`, `group_contacts`, `group_rooms`,
  `group_payments`, `group_status`, `group_history`.
- **Cashier** (9): `payment_methods`, `cashier_daily`, `cashier_shifts`,
  `cashier_shift_users`, `cashier_denominations`, `cashier_payments`,
  `cashier_vouchers`, `cashier_shift_vouchers`, `cashier_history`. With the
  trigger `trg_cashier_shift_update_daily`.
- **Blacklist** (1): `blacklist_entries`.
- **Maintenance** (3): `maintenance_reports`, `maintenance_images`,
  `maintenance_history`.
- **Messaging** (3): `conversations`, `conversation_participants`, `messages`.
  With the daily event `cleanup_old_messages`.
- **Notifications** (2): `notifications`, `notification_recipients`.
- **Backoffice** (5 + 3 views): `bo_categories`, `bo_suppliers`, `bo_invoices`,
  `bo_invoice_history`, `bo_assets`; views `v_bo_invoices_detail`,
  `v_bo_monthly_summary`, `v_bo_suppliers_stats`.
- **Scheduling** (12): `scheduling_months`, `scheduling_days`,
  `scheduling_shifts`, `scheduling_assignments`, `scheduling_config`,
  `scheduling_constraints`, `scheduling_employees`,
  `scheduling_employee_contracts`, `scheduling_employee_rules`,
  `scheduling_employee_requests`, `scheduling_solver_runs`,
  `scheduling_history`.
- **Checklist** (6): `checklist_config`, `checklist_runs`,
  `checklist_step_state`, `checklist_step_comments`,
  `checklist_step_attachments`, `checklist_event_log`.
- **F&B** (2): `fnb_category`, `fnb_daily_revenue`.
- **System and demo** (3): `cron_job_runs`, `demo_activity_log`,
  `demo_reset_log`. The demo also creates the `demo_snapshot_scheduling_*`
  tables at runtime; they are not in `schema.sql`.

## Incremental migrations (`scripts/`)

- **Up to 2026-11-26** every migration is already inside `schema.sql`: a fresh
  install only applies the ones after it (ADR-050).
- **`[RETROACTIVE]`** marks scripts that document schema changes which entered
  by editing `_archive/aiven/NN_*.sql` directly, before the incremental policy
  existed. They were rebuilt from git for traceability and are all idempotent
  (no-ops against an up-to-date database).
- **Status.** Until 2026-10-14 the remote database (production and preview) was
  on Aiven. On 2026-11-16 its dump was loaded into a self-managed MySQL 8.4
  (ADR-048), so everything applied on Aiven is also in the current remote. Rows
  say `✅ local · ✅ remote`; the text keeps "Aiven" where it describes what was
  done there then.
- **If a script is missing from this list, it is not tracked.**

Newest last:

- **2025-12-20 · `20251220_add_backoffice.sql`** — **[RETROACTIVE]** Backoffice
  module: 5 tables (`bo_categories`, `bo_suppliers`, `bo_invoices`,
  `bo_invoice_history`, `bo_assets`) + 3 views (`v_bo_invoices_detail`,
  `v_bo_monthly_summary`, `v_bo_suppliers_stats`). Commit `4bc0543`. ✅ local ·
  ✅ remote.
- **2025-12-22 · `20251222_add_user_avatar_columns.sql`** — **[RETROACTIVE]**
  Columns `avatar_url` (VARCHAR 500) and `avatar_public_id` (VARCHAR 255) in
  `users`, for Cloudinary storage. Commit `9f2b443`. ✅ local · ✅ remote.
- **2025-12-24 · `20251224_add_scheduling.sql`** — **[RETROACTIVE]** The whole
  Scheduling module: 10 tables (`scheduling_config`, `scheduling_shifts`,
  `scheduling_employees`, `scheduling_employee_contracts`,
  `scheduling_employee_rules`, `scheduling_months`, `scheduling_days`,
  `scheduling_assignments`, `scheduling_constraints`, `scheduling_history`).
  Commits `86ea812` + `f438d81`. ✅ local · ✅ remote.
- **2025-12-30 · `20251230_add_demo_activity_log.sql`** — **[RETROACTIVE]**
  Table `demo_activity_log`, to record the blocked write attempts of demo users.
  Commit `68a4589`. ✅ local · ✅ remote.
- **2026-02-26 · `20260226_unify_collation.sql`** — **[RETROACTIVE — marker]**
  Collation unified to `utf8mb4_0900_ai_ci` across `hotel_db`, and
  `MASTER_INSTALL_AIVEN.sql` + `MASTER_INSTALL_LOCAL.sql` merged into one
  installer (deleted on 2026-11-26, ADR-051). Commit `f5d47d6`. The script is an
  informational no-op. ✅ local · ✅ remote.
- **2026-02-28 · `20260228_add_libre_number_column.sql`** — **[RETROACTIVE]**
  Column `libre_number` (INT) in `scheduling_assignments`, to group the weekly
  pairs of days off (1-45). Commit `142372d`. It came with two TypeScript
  scripts, `add-libre-number.ts` and `backfill-libre-numbers.ts`, removed on
  2026-10-04. ✅ local · ✅ remote.
- **2026-04-25 · `20260425_create_scheduling_employee_requests.sql`** — New
  table `scheduling_employee_requests`: employees' shift requests (phase 1 of
  the solver). Foreign key to `users(id)`. ✅ local · ✅ remote.
- **2026-05-12 · `20260512_disable_demo_user.sql`** — **[RETROACTIVE]** The demo
  user is deactivated (`is_active=0`) after finding H1-12. Commit `5644aab`. ✅
  local · ✅ remote.
- **2026-05-12 · `20260512_add_checklist_tables.sql`** — Checklist module
  tables: `checklist_runs`, `checklist_step_state`, `checklist_event_log`,
  `checklist_config`. Daily reset daemon. Commit `a9024a3`. ✅ local · ✅
  remote.
- **2026-05-12 · `20260512_add_scheduling_solver_runs_and_requests.sql`** —
  Table `scheduling_solver_runs` (structured logging of every CP-SAT solver run)
  plus adjustments to `scheduling_employee_requests`. Commit `a9024a3`. ✅ local
  · ✅ remote.
- **2026-05-19 · `20260519_add_scheduling_employee_display_order.sql`** — Column
  `display_order` in `scheduling_employees`, to reorder the list by hand in the
  scheduling UIs. NULL falls back to alphabetical. Idempotent. ✅ local · ✅
  remote.
- **2026-05-20 · `20260520_add_scheduling_employee_dates.sql`** — Columns
  `start_date` and `end_date` in `scheduling_employees`, to model partial
  tenures (hires and leavers mid-year). NULL means active with no restriction.
  Idempotent. ✅ local · ✅ remote.
- **2026-05-20 · `20260520_add_shift_LI.sql`** — New code `LI` (free disposal)
  in `scheduling_shifts`: an extra day off outside the weekly rotation.
  Idempotent (`INSERT IGNORE`). ✅ local · ✅ remote.
- **2026-05-20 · `20260520_insert_user_*.sql` (withdrawn)** — Hire of a
  receptionist with their period in `scheduling_employees` (Jan-Feb 2026). The
  file was removed on 2026-10-04 because it named a real person; the hire was
  already applied. ✅ local · ✅ remote.
- **2026-05-21 · `20260521_add_fnb_revenue.sql`** — F&B Daily Revenue module:
  `fnb_category` (seed of 7 Breakfast/Lunch/Dinner categories) and
  `fnb_daily_revenue` (daily values per Opera code). Idempotent. ✅ local · ✅
  remote.
- **2026-09-29 · `20260929_add_cashier_voucher_status_dates.sql`** —
  `justified_at` and `cancelled_at` (DATETIME NULL) in `cashier_vouchers`. The
  backend wrote them and the reports show the justification date, but they never
  existed: justifying and cancelling vouchers always failed. Idempotent
  (`information_schema`). ✅ local · ✅ remote.
- **2026-09-29 · `20260929_fix_cashier_daily_trigger.sql`** — Recreates
  `trg_cashier_shift_update_daily`: it separates the `income` calculation (a
  direct sum of `cashier_shifts`) from the electronic payments one (an
  aggregated subquery), removing the inflation caused by a LEFT JOIN. No schema
  change, only the trigger DDL. Applied by hand on Aiven, with a recalculation
  of the 10 `cashier_daily` rows from source. ✅ local · ✅ remote.
- **2026-10-04 · `20261004_add_messages_to_notifications_module.sql`** — Adds
  `messages` to the `notifications.module` ENUM. Since `9be16b1` the urgent
  message notice is saved with that module, and the INSERT failed silently
  ("Data truncated"). It only changes the column if it has the exact previous
  definition. Local already had it (the database was built from the baseline);
  on Aiven it was applied on 2026-10-04. ✅ local · ✅ remote.
- **2026-10-04 · `20261004_fix_parking_availability_triggers.sql`** — Recreates
  `trg_free_availability_on_status_change` (it only frees the days of the
  booking itself) and `trg_update_availability_on_date_change` (it only occupies
  free or own days). Before, completing, cancelling or moving a booking could
  free or occupy another booking's days. The overlap check is in
  `bookings.repository.ts`. Local had a different `date_change` body; this one
  starts from Aiven's. ✅ local · ✅ remote.
- **2026-10-05 · `20261005_add_is_demo_to_users.sql`** — Adds `users.is_demo` (0
  by default): it marks the public demo account, which the backend carries in
  the token and `demoRestriction` limits (ADR-038). Apply it **before**
  deploying the code: the login reads the column. It only adds the column if it
  does not exist. Applied on Aiven on 2026-10-05, before the code. ✅ local · ✅
  remote.
- **2026-10-05 · `20261005_add_demo_reset_log.sql`** — Creates `demo_reset_log`:
  one row for every daily demo reset and for every saved scheduling base
  (ADR-038). The base lives in `demo_snapshot_scheduling_*` tables that the
  backend creates when it saves it. Apply it before deploying the code.
  `CREATE TABLE IF NOT EXISTS`. ✅ local · ✅ remote.
- **2026-10-05 · `20261005_complete_fresh_install.sql`** — Completes a
  from-scratch install: the frozen baseline does not create `cashier_history`
  (duplicate key name), `scheduling_assignments` (it references a table created
  later) or `demo_activity_log`, and leaves `roles.name` as `varchar(50)`.
  Definitions copied from Aiven. It changes nothing on Aiven; on local it
  created the missing `demo_activity_log`. Until ADR-050, `pnpm setup:local`
  also fixed those two baseline failures in memory. ✅ local · ✅ remote (no
  change).
- **2026-10-05 · `20261005_fix_bo_monthly_summary_view.sql`** — Recreates
  `v_bo_monthly_summary` with `period` in the `GROUP BY`. With
  `ONLY_FULL_GROUP_BY` (on in Aiven and local) every query to the view failed
  with error 1055 and `GET /api/backoffice/stats/monthly` always answered 500.
  Same columns and same groups; checked against a direct calculation over
  `bo_invoices`. ✅ local · ✅ remote.
- **2026-10-05 · `20261005_drop_demo_admin_role.sql`** — Deletes the
  `demo-admin` role if no user has it (ADR-038): the demo account is an admin
  with `is_demo` and the code no longer knows that role. It did not exist
  locally. ✅ local (no change) · ✅ remote.
- **2026-10-11 · `20261011_keep_group_history_on_delete.sql`** — Drops the
  foreign key `group_history_ibfk_1` (`ON DELETE CASCADE` to `hotel_groups`):
  deleting a group no longer deletes its history, and the delete leaves a
  `deleted` row with a snapshot of the group. **Apply it on Aiven before
  deploying the code**: with the key in place, deleting a group fails. ✅ local
  · ✅ remote.
- **2026-10-12 · `20261012_unique_invoice_supplier_number.sql`** — Adds
  `UNIQUE KEY uk_invoice_supplier_number (supplier_id, invoice_number)` to
  `bo_invoices`: a supplier's same invoice could be registered twice and both
  were paid in the monthly batch. The backend answers 409
  `BACKOFFICE_INVOICE_DUPLICATE`. Before the `ALTER` it lists the duplicates; if
  there are any, the `ALTER` fails and they have to be fixed. Idempotent. The
  code works without it (it rejects nothing until the key exists). ✅ local · ✅
  remote.
- **2026-10-14 · `20261014_cron_catch_up.sql`** — Creates the inactive user
  `system-cron` (the automatic payment of the 10th signed with it and it did not
  exist: the foreign key of `updated_by` failed) and the table `cron_job_runs`,
  with the last period of every scheduled task, so they catch up on start
  without repeating (ADR-046). Idempotent. **Apply it on Aiven before deploying
  the code**: without the table the tasks do not run. ✅ local · ✅ remote.
- **2026-10-14 · `20261014_booking_code_hotel_date.sql`** —
  `trg_generate_booking_code` takes the date of `PK-YYYYMMDD-NNNN` in Madrid
  time (`CONVERT_TZ` of `UTC_TIMESTAMP()`): with `NOW()` in UTC, a booking made
  between 00:00 and 02:00 carried yesterday's date (ADR-047). Without named time
  zones (local MySQL) it uses the UTC date, as before. Idempotent. ✅ local · ✅
  remote.
- **2026-11-26 · `20261126_fix_charset_leftovers.sql`** — Recreates
  `v_bo_monthly_summary` and `trg_cashier_shift_update_daily` with
  `SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci` (same bodies) and fixes 4
  comments of `scheduling_employee_requests` with broken characters. On the
  remote they had been created from a `cp850` console: the view's `period`
  column was `cp850`. Found with `compare-schema.sh`. Idempotent. ✅ local · ✅
  remote.
