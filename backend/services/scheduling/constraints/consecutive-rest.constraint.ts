// services/scheduling/constraints/consecutive-rest.constraint.ts
// Constraint: Each employee must have at least 2 consecutive rest days in every 7-day rolling window

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'
import { isLibreShift, isAbsenceShift } from '../utils/matrix.js'

/**
 * Consecutive Rest Constraint (ROLLING WINDOW)
 *
 * Rules:
 * - MINIMUM 2 consecutive rest days in every rolling 7-day window
 * - Rest days can cross calendar week boundaries (e.g., Fri+Sat)
 * - Absence days (V, B, IT, E, FO) count as rest
 * - Days must be truly consecutive (day N and N+1)
 * - Cross-month: T on last day of prev month + M on day 1 = rest violation (only 8h between shifts)
 *
 * NOTE: This replaces the old calendar-week validation.
 * A rolling window means we check days [1-7], [2-8], [3-9], etc.
 */
export class ConsecutiveRestConstraint extends BaseConstraint {
  readonly name = 'consecutive-rest'
  readonly priority = 95 // High priority - important labor regulation

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const { matrix, days, employees, previousMonthHistory } = context
    const daysInMonth = days.length

    for (const employee of employees) {
      // Skip fixed-shift employees with noWeekends (they have fixed rest days)
      if (employee.rules.fixedDays && employee.rules.noWeekends) continue

      // Cross-month check: T on last day of prev month → M on day 1 = only 8h rest (violation)
      if (previousMonthHistory) {
        const prevShifts = previousMonthHistory.lastShifts.get(employee.id)
        if (prevShifts && prevShifts.length > 0) {
          const lastEntry = prevShifts.reduce((a, b) => (a.dayNumber > b.dayNumber ? a : b))
          const day1Shift = matrix[employee.id]?.[1]
          if (lastEntry.shiftCode === 'T' && day1Shift === 'M') {
            violations.push(
              this.warn(
                `${employee.name}: T(último día mes anterior) → M(día 1) = solo 8h entre turnos (mínimo descanso no cumplido)`,
                {
                  type: 'rest',
                  severity: 'error',
                  day: 1,
                  employeeId: employee.id,
                  employeeName: employee.name,
                }
              )
            )
          }
        }
      }

      // Check every rolling 7-day window within the current month
      for (let start = 1; start <= daysInMonth - 6; start++) {
        const end = start + 6

        if (!this.hasConsecutiveRestInWindow(matrix, employee.id, start, end)) {
          violations.push(
            this.warn(
              `${employee.name}: días ${start}-${end} sin 2 días libres consecutivos (48h descanso obligatorio)`,
              {
                type: 'rest',
                severity: 'error',
                employeeId: employee.id,
                employeeName: employee.name,
              }
            )
          )
          // Skip ahead to avoid duplicate warnings for overlapping windows
          // If window [1-7] fails, [2-8] will likely fail too for same reason
          start += 5
        }
      }
    }

    return violations.length > 0 ? this.failure(violations) : this.success()
  }

  /**
   * Check if there are 2 consecutive rest days within a window [start, end]
   */
  private hasConsecutiveRestInWindow(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    start: number,
    end: number
  ): boolean {
    for (let d = start; d < end; d++) {
      const shift1 = matrix[employeeId]?.[d]
      const shift2 = matrix[employeeId]?.[d + 1]

      if (this.isRestDay(shift1) && this.isRestDay(shift2)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if a shift counts as rest
   * Includes: libre (L, L1, L2...), vacation (V), holiday (B), sick (IT, E), training (FO)
   */
  private isRestDay(shift: string | undefined): boolean {
    if (!shift || shift === '') return false
    return isLibreShift(shift) || isAbsenceShift(shift)
  }
}
