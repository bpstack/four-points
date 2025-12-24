// services/scheduling/phases/apply-employee-rules.phase.ts
// Phase 3: Apply employee-specific rules (fixed days, fixed shifts)

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult } from '../types/index.js'
import { dayOfWeekToNumber } from '../utils/day-helpers.js'

/**
 * Apply Employee Rules Phase
 *
 * Applies employee-specific rules to the schedule:
 * - Fixed days (e.g., Mon-Fri)
 * - Fixed shifts (e.g., P for Presencia)
 * - No weekends rule (weekends = libre)
 *
 * Example: EMP_01 R type employee has fixed days Mon-Fri with P shift
 */
export class ApplyEmployeeRulesPhase extends BasePhase {
  readonly name = 'apply-employee-rules'
  readonly order = 30

  execute(context: GeneratorContext): PhaseResult {
    let rulesApplied = 0

    for (const employee of context.employees) {
      // Handle employees with fixed days and fixed shift (like EMP_01 R: Mon-Fri with P)
      if (employee.rules.fixedDays && employee.rules.fixedShift) {
        for (const day of context.days) {
          // Convert day of week to number (1=Mon, 5=Fri, 6=Sat, 0=Sun)
          const dayNum = dayOfWeekToNumber(day.dayOfWeek)

          if (employee.rules.fixedDays.includes(dayNum)) {
            // Working day - assign fixed shift if not already assigned
            if (!context.matrix[employee.id][day.dayNumber]) {
              context.matrix[employee.id][day.dayNumber] = employee.rules.fixedShift
              rulesApplied++
            }
          } else if (employee.rules.noWeekends) {
            // Weekend = libre for employees with noWeekends rule
            if (!context.matrix[employee.id][day.dayNumber]) {
              context.matrix[employee.id][day.dayNumber] = `L${day.weekNumber}`
              rulesApplied++
            }
          }
        }

        this.log(
          `${employee.name}: Applied fixed days ${employee.rules.fixedDays.join(',')} with shift ${employee.rules.fixedShift}`
        )
      }
      // Handle employees with only noWeekends rule (no fixed shift)
      else if (employee.rules.noWeekends && !employee.rules.fixedShift) {
        for (const day of context.days) {
          const dayNum = dayOfWeekToNumber(day.dayOfWeek)
          // Saturday (6) and Sunday (7)
          if (dayNum === 6 || dayNum === 7) {
            if (!context.matrix[employee.id][day.dayNumber]) {
              context.matrix[employee.id][day.dayNumber] = `L${day.weekNumber}`
              rulesApplied++
            }
          }
        }

        this.log(`${employee.name}: Applied noWeekends rule`)
      }
    }

    this.log(`Applied ${rulesApplied} employee rule assignments`)

    return this.success(`Applied ${rulesApplied} employee rule assignments`)
  }
}
