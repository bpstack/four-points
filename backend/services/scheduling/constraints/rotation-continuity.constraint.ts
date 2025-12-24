// services/scheduling/constraints/rotation-continuity.constraint.ts
// Ensures rotation continuity within a week

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'

/**
 * Rotation Continuity Constraint
 * 
 * Enforces rotation rules:
 * 1. If doing M, continue M within the week (same for T, N)
 * 2. M can transition to T, but T cannot transition to M
 * 3. M or T can only do N if they've done exactly 1 shift of M or T
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
   * Check that within a week, an employee stays on their shift type
   */
  private checkWeeklyRotation(
    employeeId: string,
    employeeName: string,
    empMatrix: Record<number, string>,
    days: Array<{ dayNumber: number; weekNumber: number }>,
    _context: GeneratorContext
  ): GenerationWarning[] {
    const violations: GenerationWarning[] = []

    // Group days by week
    const weekMap = new Map<number, number[]>()
    for (const day of days) {
      const weekDays = weekMap.get(day.weekNumber) || []
      weekDays.push(day.dayNumber)
      weekMap.set(day.weekNumber, weekDays)
    }

    // Check each week
    for (const [weekNum, weekDays] of weekMap) {
      const shifts = weekDays.map((d) => empMatrix[d]).filter((s) => s)
      
      // Get work shifts (M, T, N) - ignore rest days and special shifts
      const workShifts = shifts.filter((s) => ['M', 'T', 'N'].includes(s))
      
      if (workShifts.length === 0) continue

      // Count each type
      const mCount = workShifts.filter((s) => s === 'M').length

      // If someone has M and T in the same week (and not transitioning), that's a problem
      // But M->T transition IS allowed (just not T->M)
      // So we check for mixed M/T only if there's a T->M pattern
      
      // For N: if doing N, should be in a night block, not mixed with M/T in same week
      // (This is more of a validation than strict constraint since night blocks are assigned first)
      
      // The main issue: if employee started with T, they shouldn't have M later in week
      const firstWorkShift = workShifts[0]
      if (firstWorkShift === 'T' && mCount > 0) {
        violations.push(
          this.warn(
            `${employeeName} tiene turno T y luego M en semana ${weekNum} - no permitido`,
            { type: 'constraint', severity: 'error', employeeId, employeeName }
          )
        )
      }
    }

    return violations
  }

  /**
   * Check day-to-day shift transitions
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

      // Rule: T cannot transition to M
      if (prevShift === 'T' && currShift === 'M') {
        violations.push(
          this.warn(
            `${employeeName} transición inválida T->M en día ${currDay}`,
            { type: 'constraint', severity: 'error', day: currDay, employeeId, employeeName }
          )
        )
      }

      // Rule: Can only start N if you've done exactly 1 M or T shift before
      // This checks if transitioning into N from M/T
      if (currShift === 'N' && ['M', 'T'].includes(prevShift)) {
        // Count M/T shifts before this day
        const mtShiftsBefore = sortedDays
          .filter((d) => d.dayNumber < currDay)
          .map((d) => empMatrix[d.dayNumber])
          .filter((s) => ['M', 'T'].includes(s)).length

        if (mtShiftsBefore > 1) {
          violations.push(
            this.warn(
              `${employeeName} transición a N en día ${currDay} con ${mtShiftsBefore} turnos M/T previos (máx 1)`,
              { type: 'constraint', severity: 'warning', day: currDay, employeeId, employeeName }
            )
          )
        }
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

        // Fix T->M: change M to T
        if (prevShift === 'T' && currShift === 'M') {
          empMatrix[currDay] = 'T'
          fixed = true
          console.log(`[RotationContinuity] Fixed T->M transition for ${employee.name} day ${currDay}: M -> T`)
        }
      }
    }

    return fixed
  }
}
