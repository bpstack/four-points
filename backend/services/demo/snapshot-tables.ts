// services/demo/snapshot-tables.ts
// Every scheduling table, configuration included: what the demo saves as its
// base and restores on reset, in foreign-key order. No imports, so scripts can
// read it without opening the app's pool.

export const SNAPSHOT_TABLES = [
  'scheduling_config',
  'scheduling_shifts',
  'scheduling_employees',
  'scheduling_employee_contracts',
  'scheduling_employee_rules',
  'scheduling_employee_requests',
  'scheduling_months',
  'scheduling_days',
  'scheduling_constraints',
  'scheduling_assignments',
  'scheduling_history',
  'scheduling_solver_runs',
] as const
