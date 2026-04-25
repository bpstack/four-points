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
 * 4. Cross-month: if lastShiftType changed between months (M→T or T→M), emit error.
 *    This also emits a rotation_continuity_break soft penalty.
 * NOTE: "máx 1 M/T before N" rule does NOT exist - removed
 */
export class RotationContinuityConstraint extends BaseConstraint {
  readonly name = 'rotation_continuity'
  readonly priority = 85 // After night blocks, before monthly libre

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const softViolations: GenerationWarning[] = []
    let softPenalty = 0
    const softPenaltyBreakdown: Record<string, number> = {}

    const { matrix, employees, days, previousMonthHistory } = context

    for (const employee of employees) {
      const empMatrix = matrix[employee.id]
      if (!empMatrix) continue

      // Cross-month rotation continuity check
      if (previousMonthHistory) {
        const lastShiftType = previousMonthHistory.lastShiftType.get(employee.id)
        const day1Shift = empMatrix[1]

        if (lastShiftType && (day1Shift === 'M' || day1Shift === 'T')) {
          const day1Type = day1Shift as 'M' | 'T'
          if (lastShiftType !== day1Type) {
            // Rotation changed at month boundary without a rest transition
            const { warning, penalty, breakdownKey } = this.softWarn(
              'rotation_continuity_break',
              1,
              `${employee.name}: cambio de rotación ${lastShiftType}→${day1Type} en límite de mes sin transición`,
              { type: 'constraint', day: 1, employeeId: employee.id, employeeName: employee.name }
            )
            // This is a hard error (rotation break is not acceptable without rest days)
            violations.push({ ...warning, severity: 'error' })
            softPenalty += penalty
            softPenaltyBreakdown[breakdownKey] = (softPenaltyBreakdown[breakdownKey] ?? 0) + penalty
          }
        }
      }

      // Check day-to-day transitions within the month
      const transitionViolations = this.checkTransitions(
        employee.id,
        employee.name,
        empMatrix,
        days
      )
      violations.push(...transitionViolations)
    }

    const allViolations = [...violations, ...softViolations]

    if (violations.length > 0) {
      return {
        ...this.failure(allViolations),
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
