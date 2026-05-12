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

    const minMorning = config.minMorningStaff ?? 1
    const minAfternoon = config.minAfternoonStaff ?? 1
    const minNight = config.minNightStaff ?? 1
    const maxMorning = config.maxMorningStaff ?? 2
    const maxAfternoon = config.maxAfternoonStaff ?? 2
    const maxNight = config.maxNightStaff ?? 1
    const prefMorning = config.prefMorningStaff ?? minMorning
    const prefAfternoon = config.prefAfternoonStaff ?? minAfternoon

    let softPenalty = 0
    const softPenaltyBreakdown: Record<string, number> = {}
    const softViolations: GenerationWarning[] = []

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
      } else if (morningCount < prefMorning) {
        // Soft: below preferred morning count but above minimum
        const missing = prefMorning - morningCount
        const { warning, penalty, breakdownKey } = this.softWarn(
          'pref_morning_staff_below',
          missing,
          `Día ${day.dayNumber}: Mañana tiene ${morningCount} (preferido ${prefMorning})`,
          { type: 'coverage', day: day.dayNumber }
        )
        softViolations.push(warning)
        softPenalty += penalty
        softPenaltyBreakdown[breakdownKey] = (softPenaltyBreakdown[breakdownKey] ?? 0) + penalty
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
      } else if (afternoonCount < prefAfternoon) {
        // Soft: below preferred afternoon count but above minimum
        const missing = prefAfternoon - afternoonCount
        const { warning, penalty, breakdownKey } = this.softWarn(
          'pref_afternoon_staff_below',
          missing,
          `Día ${day.dayNumber}: Tarde tiene ${afternoonCount} (preferido ${prefAfternoon})`,
          { type: 'coverage', day: day.dayNumber }
        )
        softViolations.push(warning)
        softPenalty += penalty
        softPenaltyBreakdown[breakdownKey] = (softPenaltyBreakdown[breakdownKey] ?? 0) + penalty
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

    // Merge soft violations into the final list (they don't affect satisfied)
    const allViolations = [...violations, ...softViolations]

    if (violations.length === 0) {
      return { ...this.success(), violations: softViolations, softPenalty, softPenaltyBreakdown }
    }
    return {
      ...this.failure(violations),
      violations: allViolations,
      softPenalty,
      softPenaltyBreakdown,
    }
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
