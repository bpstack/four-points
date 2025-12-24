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
 */
export class NightBlockConstraint extends BaseConstraint {
  readonly name = 'night-block'
  readonly priority = 100 // High priority - critical rule

  /** Absolute minimum consecutive nights */
  private readonly MIN_CONSECUTIVE = 3

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const { matrix, days, employees, config } = context
    const minBlock = config.minNightBlock || 4
    const maxBlock = config.maxNightBlock || 6

    for (const employee of employees) {
      // Skip fixed-shift employees
      if (employee.rules.fixedShift) continue

      const nightDays = getDaysWithShift(matrix, days, employee.id, 'N')
      const nightCount = nightDays.length

      if (nightCount === 0) continue // No nights assigned is OK

      // Check consecutiveness
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
      } else if (nightCount < this.MIN_CONSECUTIVE) {
        // ERROR: Less than absolute minimum
        violations.push(
          this.error(
            `${employee.name}: ${nightCount} noches (mínimo obligatorio ${this.MIN_CONSECUTIVE} consecutivas)`,
            {
              type: 'night_block',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      } else if (nightCount < minBlock) {
        // WARNING: Less than recommended
        violations.push(
          this.warn(
            `${employee.name}: ${nightCount} noches (mín recomendado ${minBlock})`,
            {
              type: 'night_block',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      }

      // Check max
      if (nightCount > maxBlock) {
        violations.push(
          this.warn(
            `${employee.name}: ${nightCount} noches (máx ${maxBlock})`,
            {
              type: 'night_block',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      }
    }

    return violations.length > 0 ? this.failure(violations) : this.success()
  }
}
