// services/scheduling/constraints/max-consecutive-work.constraint.ts
// Constraint: Maximum consecutive work days (default 6)

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'
import { isWorkShift } from '../utils/matrix.js'
import { sortDaysByNumber } from '../utils/day-helpers.js'

/**
 * Max Consecutive Work Constraint
 *
 * Rules:
 * - Maximum 6 consecutive work days without a rest day (MANDATORY)
 * - Work shifts include: M, T, N, P, PI
 * - This is a labor regulation requirement
 */
export class MaxConsecutiveWorkConstraint extends BaseConstraint {
  readonly name = 'max-consecutive-work'
  readonly priority = 90 // High priority - labor regulation

  /** Default maximum consecutive work days */
  private readonly DEFAULT_MAX_CONSECUTIVE = 6

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const { matrix, days, employees, config } = context
    const maxConsecutive = config.maxConsecutiveWorkDays || this.DEFAULT_MAX_CONSECUTIVE
    const sortedDays = sortDaysByNumber(days)

    for (const employee of employees) {
      const consecutiveViolation = this.findConsecutiveViolation(
        matrix,
        sortedDays,
        employee.id,
        maxConsecutive
      )

      if (consecutiveViolation) {
        violations.push(
          this.error(
            `${employee.name}: ${consecutiveViolation.count} días consecutivos trabajados (días ${consecutiveViolation.startDay}-${consecutiveViolation.endDay}, máx ${maxConsecutive})`,
            {
              type: 'rest',
              employeeId: employee.id,
              employeeName: employee.name,
              day: consecutiveViolation.startDay,
            }
          )
        )
      }
    }

    return violations.length > 0 ? this.failure(violations) : this.success()
  }

  /**
   * Find if employee has a consecutive work violation
   * Returns the first violation found with details
   */
  private findConsecutiveViolation(
    matrix: Record<string, Record<number, string>>,
    sortedDays: { dayNumber: number }[],
    employeeId: string,
    maxConsecutive: number
  ): { count: number; startDay: number; endDay: number } | null {
    let consecutiveCount = 0
    let startDay = 0

    for (let i = 0; i < sortedDays.length; i++) {
      const dayNumber = sortedDays[i].dayNumber
      const shift = matrix[employeeId][dayNumber]

      if (isWorkShift(shift)) {
        // Check if this is consecutive (not the first day, and previous day was dayNumber - 1)
        if (consecutiveCount === 0) {
          startDay = dayNumber
          consecutiveCount = 1
        } else if (i > 0 && dayNumber === sortedDays[i - 1].dayNumber + 1) {
          consecutiveCount++
        } else {
          // Gap in days (e.g., month boundary) - reset
          startDay = dayNumber
          consecutiveCount = 1
        }

        // Check if exceeded limit
        if (consecutiveCount > maxConsecutive) {
          return {
            count: consecutiveCount,
            startDay,
            endDay: dayNumber,
          }
        }
      } else {
        // Rest day - reset counter
        consecutiveCount = 0
        startDay = 0
      }
    }

    return null
  }

  /**
   * Optional fix method - try to insert a rest day
   */
  fix(_context: GeneratorContext): boolean {
    // This would require more complex logic to:
    // 1. Find the violation
    // 2. Identify the best day to convert to libre
    // 3. Ensure coverage is still met
    // For now, we rely on the generator phases to prevent this
    return false
  }
}
