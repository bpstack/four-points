// services/scheduling/constraints/monthly-libre.constraint.ts
// Constraint: Monthly libre days balance (8-12 days off per month)

import { BaseConstraint } from './base-constraint.js'
import type {
  GeneratorContext,
  ConstraintResult,
  GenerationWarning,
  DayInfo,
} from '../types/index.js'
import { countLibreDays, countShiftForEmployee } from '../utils/matrix.js'

/**
 * Monthly Libre Constraint
 *
 * Rules:
 * - Minimum 7 libre days per month (includes V, B, IT, E, FO)
 * - Maximum 10 libre days per month (to ensure adequate work contribution)
 * - Soft penalty when below prefMonthlyLibre (but above min) or above pref (but below max)
 * - Libre types: L (regular), V (vacation), B (holiday), IT (sick leave), E (sick day), FO (training)
 */
export class MonthlyLibreConstraint extends BaseConstraint {
  readonly name = 'monthly-libre'
  readonly priority = 70 // Medium-high priority

  /** Default minimum libre days per month */
  private readonly DEFAULT_MIN_LIBRE = 7

  /** Default maximum libre days per month */
  private readonly DEFAULT_MAX_LIBRE = 10

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const softViolations: GenerationWarning[] = []
    let softPenalty = 0
    const softPenaltyBreakdown: Record<string, number> = {}

    const { matrix, days, employees, config } = context
    const minLibre = config.minMonthlyLibre ?? this.DEFAULT_MIN_LIBRE
    const maxLibre = config.maxMonthlyLibre ?? this.DEFAULT_MAX_LIBRE
    const prefLibre = config.prefMonthlyLibre ?? Math.round((minLibre + maxLibre) / 2)

    for (const employee of employees) {
      // Skip fixed-shift employees (like Presencia - they have different rules)
      if (employee.rules.fixedShift) continue

      const totalRestDays = this.countTotalRestDays(matrix, days, employee.id)

      if (totalRestDays < minLibre) {
        violations.push(
          this.warn(`${employee.name}: ${totalRestDays} días de descanso (mínimo ${minLibre})`, {
            type: 'rest',
            severity: 'warning',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      } else if (totalRestDays < prefLibre) {
        // SOFT: Below preference but above minimum
        const delta = prefLibre - totalRestDays
        const { warning, penalty, breakdownKey } = this.softWarn(
          'libre_below_pref',
          delta,
          `${employee.name}: ${totalRestDays} días libres (pref ${prefLibre}, mín ${minLibre})`,
          { type: 'rest', employeeId: employee.id, employeeName: employee.name }
        )
        softViolations.push(warning)
        softPenalty += penalty
        softPenaltyBreakdown[breakdownKey] = (softPenaltyBreakdown[breakdownKey] ?? 0) + penalty
      }

      if (totalRestDays > maxLibre) {
        violations.push(
          this.warn(`${employee.name}: ${totalRestDays} días de descanso (máximo ${maxLibre})`, {
            type: 'rest',
            severity: 'warning',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      } else if (totalRestDays > prefLibre && totalRestDays <= maxLibre) {
        // SOFT: Above preference but below maximum
        const delta = totalRestDays - prefLibre
        const { warning, penalty, breakdownKey } = this.softWarn(
          'libre_above_pref',
          delta,
          `${employee.name}: ${totalRestDays} días libres (pref ${prefLibre}, máx ${maxLibre})`,
          { type: 'rest', employeeId: employee.id, employeeName: employee.name }
        )
        softViolations.push(warning)
        softPenalty += penalty
        softPenaltyBreakdown[breakdownKey] = (softPenaltyBreakdown[breakdownKey] ?? 0) + penalty
      }
    }

    if (violations.length > 0) {
      return {
        ...this.failure([...violations, ...softViolations]),
        softPenalty,
        softPenaltyBreakdown,
      }
    }

    return {
      ...this.success(),
      violations: softViolations,
      softPenalty,
      softPenaltyBreakdown,
    }
  }

  /**
   * Count total rest days for an employee
   * Includes: L (libre), V (vacation), B (holiday), IT (sick leave), E (sick day), FO (training)
   */
  private countTotalRestDays(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string
  ): number {
    let total = 0

    // Count regular libre days (L, L1, L2, etc.)
    total += countLibreDays(matrix, days, employeeId)

    // Count other absence types
    total += countShiftForEmployee(matrix, days, employeeId, 'V') // Vacation
    total += countShiftForEmployee(matrix, days, employeeId, 'B') // Holiday
    total += countShiftForEmployee(matrix, days, employeeId, 'IT') // Sick leave
    total += countShiftForEmployee(matrix, days, employeeId, 'E') // Sick day
    total += countShiftForEmployee(matrix, days, employeeId, 'FO') // Training

    return total
  }
}
