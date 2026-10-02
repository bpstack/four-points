// services/scheduling/soft-weights.ts
// Soft penalty weights for schedule quality scoring.
// Source of truth: docs/scheduling/constraints.md §3.
//
// These are TENTATIVE initial values; will be tuned in Phase 2 with manager feedback.
// Kept in sync with the solver Python (Phase 1 will import via JSON or controlled duplication).
//
// Convention: units mean "one occurrence" unless noted.
// E.g. pref_morning_staff_below = 5 points per person per day below pref.
//
// Status legend in JSDoc tags:
//   @emitter <file>      — weight is currently emitted from the listed source
//   @deferred <reason>   — weight is defined but not emitted yet; reason given

export const SOFT_WEIGHTS = {
  /**
   * Coverage below preferred morning count (per person per day)
   * @emitter constraints/coverage.constraint.ts
   */
  pref_morning_staff_below: 5,
  /**
   * Coverage below preferred afternoon count (per person per day)
   * @emitter constraints/coverage.constraint.ts
   */
  pref_afternoon_staff_below: 5,
  /**
   * Weekly shifts deviating from preferred count (per shift per week)
   * @deferred S2 of CONSTRAINTS §6 — no constraint computes weekly shifts vs prefWeeklyShifts yet.
   *           Wire when adding the WeeklyShiftsConstraint (Phase 2).
   */
  pref_weekly_shifts_off: 3,
  /**
   * Night block size != prefNightBlock but within [min, max] (per night off from pref)
   * @emitter constraints/night-block.constraint.ts
   */
  pref_night_block_size_off: 4,
  /**
   * Employee libres below preferred count (per day under pref)
   * @emitter constraints/monthly-libre.constraint.ts
   */
  libre_below_pref: 2,
  /**
   * Employee libres above preferred count (per day over pref)
   * @emitter constraints/monthly-libre.constraint.ts
   */
  libre_above_pref: 2,
  /**
   * S3: Employee without any Sat+Dom libre this month (flat penalty per employee)
   * @emitter schedule-validator.ts (W10 in runFinalValidation)
   */
  weekend_off_missing: 5,
  /**
   * One employee has significantly more weekend-off days than the team average
   * @deferred Not numbered in CONSTRAINTS §6; requires team-wide computation
   *           (compare each employee against the team mean). Phase 2 candidate.
   */
  weekend_imbalance: 6,
  /**
   * Employee with very low M/T shift variety (monotone schedule, flat per employee)
   * @deferred W13 in runFinalValidation already emits a warning for extreme M/T imbalance
   *           but does not contribute to softPenalty. Wire here when promoting W13 to soft.
   */
  shift_variety_low: 1,
  /**
   * Rotation pattern continuity broken (incl. cross-month), flat per employee
   * @emitter schedule-validator.ts (VALIDATION 4c)
   */
  rotation_continuity_break: 4,
  /**
   * S4: Work block shorter than MIN_WORK_BLOCK (3 days). Penalty per missing day
   * (block of 2 → 3pt, block of 1 → 6pt). Soft by catalog (CONSTRAINTS §3) — solver
   * may produce short blocks when hard constraints leave no other option.
   * @emitter schedule-validator.ts (runFinalValidation, VALIDATION 3)
   */
  min_work_block_short: 3,
  /**
   * Approved shift preference not granted (not a hard constraint), per unmet request
   * @deferred Depends on scheduling_employee_requests table (step A of TODO.md
   *           and §7.5 of CONSTRAINTS). Wire alongside the request-loading logic.
   */
  request_preference_unmet: 8,
} as const

export type SoftWeightKey = keyof typeof SOFT_WEIGHTS
