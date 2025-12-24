// services/scheduling/constraints/consecutive-rest.constraint.ts
// Constraint: Each employee must have at least 2 consecutive libre days per week (48h rest)

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning, DayInfo } from '../types/index.js'
import { isLibreShift, isAbsenceShift } from '../utils/matrix.js'
import { getWeeksInMonth, getDaysInWeek } from '../utils/day-helpers.js'

/**
 * Consecutive Rest Constraint
 *
 * Rules:
 * - MINIMUM 2 consecutive libre/absence days per week (48h rest) - MANDATORY
 * - Absence days (V, B, IT, E, FO) count as rest
 * - Days must be truly consecutive (day N and N+1)
 */
export class ConsecutiveRestConstraint extends BaseConstraint {
  readonly name = 'consecutive-rest'
  readonly priority = 95 // High priority - important labor regulation

  /** Minimum consecutive rest days per week */
  private readonly MIN_CONSECUTIVE_REST = 2

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const { matrix, days, employees } = context
    const weeks = getWeeksInMonth(days)

    for (const employee of employees) {
      // Skip fixed-shift employees with noWeekends (they have fixed rest days)
      if (employee.rules.fixedDays && employee.rules.noWeekends) continue

      for (const week of weeks) {
        const weekDays = getDaysInWeek(days, week.weekNumber)

        // Check for consecutive rest days
        if (!this.hasConsecutiveRest(matrix, employee.id, weekDays)) {
          violations.push(
            this.warn(
              `${employee.name}: Semana ${week.weekNumber} sin 2 días libres consecutivos (48h descanso obligatorio)`,
              {
                type: 'rest',
                severity: 'error',
                employeeId: employee.id,
                employeeName: employee.name,
              }
            )
          )
        }
      }
    }

    return violations.length > 0 ? this.failure(violations) : this.success()
  }

  /**
   * Check if employee has at least MIN_CONSECUTIVE_REST consecutive rest days in the week
   */
  private hasConsecutiveRest(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    weekDays: DayInfo[]
  ): boolean {
    if (weekDays.length < this.MIN_CONSECUTIVE_REST) return true // Short week at month boundary

    const sortedDays = [...weekDays].sort((a, b) => a.dayNumber - b.dayNumber)
    let consecutive = 0

    for (let i = 0; i < sortedDays.length; i++) {
      const shift = matrix[employeeId][sortedDays[i].dayNumber]
      const isRest = this.isRestDay(shift)

      if (isRest) {
        // Check if consecutive with previous day
        if (i > 0 && sortedDays[i].dayNumber === sortedDays[i - 1].dayNumber + 1) {
          consecutive++
        } else {
          consecutive = 1
        }

        if (consecutive >= this.MIN_CONSECUTIVE_REST) {
          return true
        }
      } else {
        consecutive = 0
      }
    }

    return false
  }

  /**
   * Check if a shift counts as rest
   * Includes: libre (L, L1, L2...), vacation (V), holiday (B), sick (IT, E), training (FO)
   */
  private isRestDay(shift: string | undefined): boolean {
    if (!shift) return false
    return isLibreShift(shift) || isAbsenceShift(shift)
  }
}
