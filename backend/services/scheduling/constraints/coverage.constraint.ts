// services/scheduling/constraints/coverage.constraint.ts
// Constraint: Minimum staff coverage per shift type per day

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'
import { countShiftOnDay } from '../utils/matrix.js'

/**
 * Coverage Constraint
 *
 * Rules:
 * - Each day (non-holiday) must have minimum staff for M, T, and N shifts
 * - Critical minimum: 3 staff total (1M + 1T + 1N)
 * - Ideal coverage: 5 staff (2M + 2T + 1N) - warns if below
 * - Also checks maximum coverage to prevent overstaffing
 */
export class CoverageConstraint extends BaseConstraint {
  readonly name = 'coverage'
  readonly priority = 100 // Highest priority - critical for operations

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const { matrix, days, config } = context

    const minMorning = config.minMorningStaff || 1
    const minAfternoon = config.minAfternoonStaff || 1
    const minNight = config.minNightStaff || 1
    const maxMorning = config.maxMorningStaff || 2
    const maxAfternoon = config.maxAfternoonStaff || 2
    const maxNight = config.maxNightStaff || 1

    for (const day of days) {
      // Skip holidays - no coverage required
      if (day.isHoliday) continue

      const morningCount = countShiftOnDay(matrix, day.dayNumber, 'M')
      const afternoonCount = countShiftOnDay(matrix, day.dayNumber, 'T')
      const nightCount = countShiftOnDay(matrix, day.dayNumber, 'N')

      // Check morning coverage
      if (morningCount < minMorning) {
        violations.push(
          this.createCoverageViolation('M', day.dayNumber, morningCount, minMorning, 'under')
        )
      } else if (morningCount > maxMorning) {
        violations.push(
          this.createCoverageViolation('M', day.dayNumber, morningCount, maxMorning, 'over')
        )
      }

      // Check afternoon coverage
      if (afternoonCount < minAfternoon) {
        violations.push(
          this.createCoverageViolation('T', day.dayNumber, afternoonCount, minAfternoon, 'under')
        )
      } else if (afternoonCount > maxAfternoon) {
        violations.push(
          this.createCoverageViolation('T', day.dayNumber, afternoonCount, maxAfternoon, 'over')
        )
      }

      // Check night coverage
      if (nightCount < minNight) {
        violations.push(
          this.createCoverageViolation('N', day.dayNumber, nightCount, minNight, 'under')
        )
      } else if (nightCount > maxNight) {
        violations.push(
          this.createCoverageViolation('N', day.dayNumber, nightCount, maxNight, 'over')
        )
      }
    }

    return violations.length > 0 ? this.failure(violations) : this.success()
  }

  /**
   * Create a coverage violation warning
   */
  private createCoverageViolation(
    shift: string,
    dayNumber: number,
    actual: number,
    required: number,
    type: 'under' | 'over'
  ): GenerationWarning {
    const shiftName = this.getShiftName(shift)

    if (type === 'under') {
      // Undercoverage is an error if zero, warning otherwise
      const severity = actual === 0 ? 'error' : 'warning'
      return this.warn(`Día ${dayNumber}: ${shiftName} tiene ${actual} (mínimo ${required})`, {
        type: 'coverage',
        severity,
        day: dayNumber,
      })
    } else {
      // Overcoverage is always a warning
      return this.warn(`Día ${dayNumber}: ${shiftName} tiene ${actual} (máximo ${required})`, {
        type: 'coverage',
        severity: 'warning',
        day: dayNumber,
      })
    }
  }

  /**
   * Get human-readable shift name
   */
  private getShiftName(shift: string): string {
    switch (shift) {
      case 'M':
        return 'Mañana'
      case 'T':
        return 'Tarde'
      case 'N':
        return 'Noche'
      default:
        return shift
    }
  }
}
