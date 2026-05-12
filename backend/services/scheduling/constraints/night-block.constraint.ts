// services/scheduling/constraints/night-block.constraint.ts
// Constraint: Night shifts must be in consecutive blocks of 3-6 nights

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'
import { getDaysWithShift } from '../utils/matrix.js'
import { areConsecutive } from '../utils/day-helpers.js'

/**
 * Night Block Constraint
 *
 * Rules:
 * - MINIMUM 3 consecutive nights (MANDATORY - error if violated)
 * - Recommended 4-6 nights (warning if outside range)
 * - Nights must be consecutive (error if scattered)
 * - Cross-month: if employee ended prev month with incomplete night block (incompleteNightBlocks > 0)
 *   and this month starts with nights on day 1, those nights continue the block; the effective
 *   total is (prevIncomplete + currentCount) and is validated against min/max/pref.
 * - Soft penalty: if effective count is within [minBlock, maxBlock] but differs from prefNightBlock.
 */
export class NightBlockConstraint extends BaseConstraint {
  readonly name = 'night-block'
  readonly priority = 100 // High priority - critical rule

  /** Absolute minimum consecutive nights */
  private readonly MIN_CONSECUTIVE = 3

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const softViolations: GenerationWarning[] = []
    let softPenalty = 0
    const softPenaltyBreakdown: Record<string, number> = {}

    const { matrix, days, employees, config, previousMonthHistory } = context
    const minBlock = config.minNightBlock || 4
    const maxBlock = config.maxNightBlock || 6
    const prefBlock = config.prefNightBlock || minBlock

    for (const employee of employees) {
      // Skip fixed-shift employees
      if (employee.rules.fixedShift) continue

      const nightDays = getDaysWithShift(matrix, days, employee.id, 'N')
      const nightCount = nightDays.length

      if (nightCount === 0) continue // No nights assigned is OK

      // Cross-month: if the block continues from the previous month
      const prevIncomplete = previousMonthHistory?.incompleteNightBlocks.get(employee.id) ?? 0
      const startsOnDay1 = nightDays[0] === 1
      const effectiveCount =
        prevIncomplete > 0 && startsOnDay1 ? nightCount + prevIncomplete : nightCount

      // Check consecutiveness (within current month only — cross-month nights are always consecutive
      // by definition since they extend a block that ended on the last day of the previous month)
      const isConsecutive = areConsecutive(nightDays)

      if (!isConsecutive) {
        // ERROR: Scattered nights
        violations.push(
          this.error(
            `${employee.name}: noches dispersas (días ${nightDays.join(', ')}) - deben ser consecutivas`,
            {
              type: 'night_block',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
        continue
      }

      if (effectiveCount < this.MIN_CONSECUTIVE) {
        // ERROR: Less than absolute minimum (even counting cross-month)
        violations.push(
          this.error(
            `${employee.name}: ${effectiveCount} noches (mínimo obligatorio ${this.MIN_CONSECUTIVE} consecutivas)`,
            {
              type: 'night_block',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      } else if (effectiveCount < minBlock) {
        // WARNING: Less than recommended minimum
        violations.push(
          this.warn(`${employee.name}: ${effectiveCount} noches (mín recomendado ${minBlock})`, {
            type: 'night_block',
            severity: 'warning',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      } else if (effectiveCount > maxBlock) {
        // WARNING: Exceeds maximum
        violations.push(
          this.warn(`${employee.name}: ${effectiveCount} noches (máx ${maxBlock})`, {
            type: 'night_block',
            severity: 'warning',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      } else if (effectiveCount !== prefBlock) {
        // SOFT: Within valid range but differs from preference
        const delta = Math.abs(effectiveCount - prefBlock)
        const { warning, penalty, breakdownKey } = this.softWarn(
          'pref_night_block_size_off',
          delta,
          `${employee.name}: ${effectiveCount} noches (pref ${prefBlock})`,
          {
            type: 'night_block',
            employeeId: employee.id,
            employeeName: employee.name,
          }
        )
        softViolations.push(warning)
        softPenalty += penalty
        softPenaltyBreakdown[breakdownKey] = (softPenaltyBreakdown[breakdownKey] ?? 0) + penalty
      }
    }

    if (violations.length > 0) {
      return {
        ...this.failure(violations),
        violations: [...violations, ...softViolations],
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
}
