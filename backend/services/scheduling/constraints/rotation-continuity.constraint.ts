// services/scheduling/constraints/rotation-continuity.constraint.ts
// Ensures rotation continuity within a week

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'

/**
 * Rotation Continuity Constraint
 *
 * Enforces rotation rules:
 * 1. T(day X) → M(day X+1) = ERROR (only 8h between shifts)
 * 2. T → L → M = OK (rest between)
 * 3. M → T = OK (16h between shifts)
 * NOTE: "máx 1 M/T before N" rule does NOT exist - removed
 */
export class RotationContinuityConstraint extends BaseConstraint {
  readonly name = 'rotation_continuity'
  readonly priority = 85 // After night blocks, before monthly libre

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const { matrix, employees, days } = context

    for (const employee of employees) {
      const empMatrix = matrix[employee.id]
      if (!empMatrix) continue

      // Check each week
      const weeklyViolations = this.checkWeeklyRotation(employee.id, employee.name, empMatrix, days, context)
      violations.push(...weeklyViolations)

      // Check day-to-day transitions
      const transitionViolations = this.checkTransitions(employee.id, employee.name, empMatrix, days)
      violations.push(...transitionViolations)
    }

    return violations.length > 0 ? this.failure(violations) : this.success()
  }

  /**
   * Check weekly rotation - with block-based rotation, M and T can coexist
   * in the same week (e.g. M block ends, rest, T block starts).
   * The only real constraint is T→M on consecutive days (checked in checkTransitions).
   * This method is kept for structural compatibility but no longer flags weekly mixing.
   */
  private checkWeeklyRotation(
    _employeeId: string,
    _employeeName: string,
    _empMatrix: Record<number, string>,
    _days: Array<{ dayNumber: number; weekNumber: number }>,
    _context: GeneratorContext
  ): GenerationWarning[] {
    // With block-based rotation, having M and T in the same week is valid
    // (e.g., M(Mon-Wed) + L(Thu-Fri) + T(Sat) in the same week)
    // T→M on consecutive days is caught by checkTransitions
    return []
  }

  /**
   * Check day-to-day shift transitions
   * Only ERROR if T->M on consecutive days without rest
   * If there's L, V, B, IT, E, FO between T and M -> OK
   */
  private checkTransitions(
    employeeId: string,
    employeeName: string,
    empMatrix: Record<number, string>,
    days: Array<{ dayNumber: number }>
  ): GenerationWarning[] {
    const violations: GenerationWarning[] = []

    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDay = sortedDays[i - 1].dayNumber
      const currDay = sortedDays[i].dayNumber
      const prevShift = empMatrix[prevDay]
      const currShift = empMatrix[currDay]

      if (!prevShift || !currShift) continue

      // Rule: T→M only ERROR if consecutive days (no rest between)
      // T(day X) → M(day X+1) = ERROR (only 8h between shifts)
      // T(day X) → L/V/B... → M(day Y) = OK (rest between)
      if (prevShift === 'T' && currShift === 'M' && currDay === prevDay + 1) {
        violations.push(
          this.warn(
            `${employeeName}: T(día ${prevDay}) → M(día ${currDay}) = solo 8h entre turnos`,
            { type: 'constraint', severity: 'error', day: currDay, employeeId, employeeName }
          )
        )
      }

      // NOTE: "máx 1 M/T before N" rule REMOVED - it doesn't exist in reality
      // Any employee can transition from M/T block to N block after rest
    }

    return violations
  }

  /**
   * Attempt to fix rotation violations by adjusting shifts
   */
  fix(context: GeneratorContext): boolean {
    let fixed = false
    const { matrix, employees, days } = context

    for (const employee of employees) {
      const empMatrix = matrix[employee.id]
      if (!empMatrix) continue

      const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

      for (let i = 1; i < sortedDays.length; i++) {
        const prevDay = sortedDays[i - 1].dayNumber
        const currDay = sortedDays[i].dayNumber
        const prevShift = empMatrix[prevDay]
        const currShift = empMatrix[currDay]

        if (!prevShift || !currShift) continue

        // Fix T->M only if consecutive days (no rest between)
        if (prevShift === 'T' && currShift === 'M' && currDay === prevDay + 1) {
          empMatrix[currDay] = 'T'
          fixed = true
        }
      }
    }

    return fixed
  }
}
