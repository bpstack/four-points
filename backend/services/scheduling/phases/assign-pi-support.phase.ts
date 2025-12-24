// services/scheduling/phases/assign-pi-support.phase.ts
// Phase 8: Assign PI (intervention support) shifts

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult } from '../types/index.js'
import { countShiftOnDay, isWorkShift, countWeekWorkDays } from '../utils/matrix.js'
import { shuffle } from '../utils/randomization.js'
import { getDaysInWeek } from '../utils/day-helpers.js'

// Interface for constraints (simplified)
interface SchedulingConstraint {
  employee_id: string
  constraint_type: string
  start_date: string | Date
  end_date: string | Date
  status: string
}

// Extended context type that includes constraints
interface ExtendedContext extends GeneratorContext {
  constraints?: SchedulingConstraint[]
}

/**
 * Assign PI Support Phase
 *
 * Assigns PI (Presencia de Intervención) shifts for reinforcement:
 * - Prioritizes days marked as needing PI (3-4 available staff)
 * - Also checks days with only 1 person in morning or afternoon
 * - Respects REQUEST_OFF constraints
 * - Doesn't break 2 consecutive libre requirement
 * - Doesn't exceed 6 consecutive work days
 */
export class AssignPISupportPhase extends BasePhase {
  readonly name = 'AssignPISupport'
  readonly order = 80

  // Constraints can be set externally or passed via context
  private externalConstraints: SchedulingConstraint[] | null = null

  setConstraints(constraints: SchedulingConstraint[]): void {
    this.externalConstraints = constraints
  }

  private getConstraints(context: GeneratorContext): SchedulingConstraint[] {
    if (this.externalConstraints) {
      return this.externalConstraints
    }
    const extContext = context as ExtendedContext
    if (extContext.constraints) {
      return extContext.constraints as SchedulingConstraint[]
    }
    return []
  }

  execute(context: GeneratorContext): PhaseResult {
    const { matrix, days, employees, config, daysNeedingPI } = context
    const constraints = this.getConstraints(context)
    let piAssigned = 0

    // Get non-holiday days, prioritize those marked as needing PI
    const daysToCheck = days.filter((d) => !d.isHoliday)

    // Sort to prioritize days marked as needing PI
    daysToCheck.sort((a, b) => {
      const aNeedsPI = daysNeedingPI.includes(a.dayNumber) ? 0 : 1
      const bNeedsPI = daysNeedingPI.includes(b.dayNumber) ? 0 : 1
      return aNeedsPI - bNeedsPI
    })

    this.log(`Checking ${daysToCheck.length} days, ${daysNeedingPI.length} marked as needing PI`)

    for (const day of daysToCheck) {
      const morningCount = countShiftOnDay(matrix, day.dayNumber, 'M')
      const afternoonCount = countShiftOnDay(matrix, day.dayNumber, 'T')
      const needsPI = daysNeedingPI.includes(day.dayNumber)

      // Assign PI if:
      // 1. Only 1 person in morning or afternoon, OR
      // 2. Day was marked as needing PI (3-4 available staff)
      if (morningCount === 1 || afternoonCount === 1 || needsPI) {
        // Find someone available for PI
        const shuffledEmployees = shuffle(employees)
        const available = shuffledEmployees.find((e) => {
          if (e.rules.fixedShift) return false

          const shift = matrix[e.id][day.dayNumber]
          // Must be empty or libre
          if (shift && !shift.startsWith('L')) return false

          // Don't assign PI to employees who had REQUEST_OFF
          const hasRequestOff = this.hasRequestOffConstraint(constraints, e.id, day.dayNumber)
          if (hasRequestOff) return false

          // Check if converting would break 2 consecutive libre days
          if (shift?.startsWith('L')) {
            const weekDays = getDaysInWeek(days, day.weekNumber)
            if (this.wouldBreakConsecutiveLibre(matrix, e.id, day, weekDays)) {
              return false
            }
          }

          // Check if converting would cause >6 consecutive work days
          if (this.wouldExceedConsecutiveWork(matrix, days, e.id, day.dayNumber, 6)) {
            return false
          }

          // CRITICAL: Check if assigning PI here would create an isolated small work block
          // Simulate what would happen if we convert this libre to PI
          if (shift?.startsWith('L')) {
            // Check what blocks exist before and after
            const beforeIsWork = day.dayNumber > 1 && isWorkShift(matrix[e.id][day.dayNumber - 1])
            const afterIsWork = day.dayNumber < days.length && isWorkShift(matrix[e.id][day.dayNumber + 1])
            
            // If this day is isolated (no adjacent work), skip it to avoid creating 1-day block
            if (!beforeIsWork && !afterIsWork) {
              return false
            }
          }

          return true
        })

        if (available) {
          // Only assign if they don't already have too many shifts this week
          const weekWorkDays = countWeekWorkDays(matrix, days, available.id, day.weekNumber)
          if (weekWorkDays < (config.maxWeeklyShifts || 6)) {
            matrix[available.id][day.dayNumber] = 'PI'
            piAssigned++

            if (needsPI) {
              this.log(`Day ${day.dayNumber}: ${available.name} -> PI (marked as needing reinforcement)`)
            }
          }
        } else if (needsPI) {
          this.log(`Day ${day.dayNumber} needs PI but no one available`)
        }
      }
    }

    this.log(`Assigned ${piAssigned} PI shifts`)

    return this.success(`Assigned ${piAssigned} PI shifts`)
  }

  /**
   * Check if employee has REQUEST_OFF constraint for this day
   */
  private hasRequestOffConstraint(constraints: SchedulingConstraint[], employeeId: string, dayNumber: number): boolean {
    return constraints.some((c) => {
      if (c.constraint_type !== 'request_off' || c.status !== 'approved') return false
      if (c.employee_id !== employeeId) return false

      const startDateAdjusted = new Date(new Date(c.start_date).getTime() + 12 * 60 * 60 * 1000)
      const endDateAdjusted = new Date(new Date(c.end_date).getTime() + 12 * 60 * 60 * 1000)

      return (
        dayNumber >= startDateAdjusted.getUTCDate() && dayNumber <= endDateAdjusted.getUTCDate()
      )
    })
  }

  /**
   * Check if converting libre to work would break 2 consecutive libre requirement
   */
  private wouldBreakConsecutiveLibre(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    day: { dayNumber: number; weekNumber: number },
    weekDays: { dayNumber: number }[]
  ): boolean {
    // Get current libre days in this week
    const libreDays = weekDays.filter((d) => {
      const shift = matrix[employeeId][d.dayNumber]
      return (
        shift &&
        (shift.startsWith('L') ||
          shift === 'V' ||
          shift === 'B' ||
          shift === 'IT' ||
          shift === 'E' ||
          shift === 'FO')
      )
    })

    // If only 2 libre days, check if this is part of a consecutive pair
    if (libreDays.length <= 2) {
      // Check for consecutive pair
      for (let i = 0; i < libreDays.length - 1; i++) {
        if (libreDays[i + 1].dayNumber === libreDays[i].dayNumber + 1) {
          // Found consecutive pair - check if target day is part of it
          if (
            libreDays[i].dayNumber === day.dayNumber ||
            libreDays[i + 1].dayNumber === day.dayNumber
          ) {
            return true // Don't break the only consecutive pair
          }
        }
      }

      if (libreDays.length === 2) {
        return true // Protect the only 2 libre days
      }
    }

    // If more than 2, simulate removal and check
    if (libreDays.length > 2) {
      const remaining = libreDays.filter((d) => d.dayNumber !== day.dayNumber)
      let hasConsecutive = false
      for (let i = 0; i < remaining.length - 1; i++) {
        if (remaining[i + 1].dayNumber === remaining[i].dayNumber + 1) {
          hasConsecutive = true
          break
        }
      }
      if (!hasConsecutive) {
        return true
      }
    }

    return false
  }

  /**
   * Check if converting libre to work would exceed max consecutive work days
   */
  private wouldExceedConsecutiveWork(
    matrix: Record<string, Record<number, string>>,
    days: { dayNumber: number }[],
    employeeId: string,
    dayNumber: number,
    maxConsecutive: number
  ): boolean {
    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

    let before = 0
    let after = 0

    // Count backwards
    for (let d = dayNumber - 1; d >= 1; d--) {
      const dayInfo = sortedDays.find((x) => x.dayNumber === d)
      if (!dayInfo) break
      const shift = matrix[employeeId][d]
      if (isWorkShift(shift)) {
        before++
      } else {
        break
      }
    }

    // Count forwards
    const maxDay = sortedDays[sortedDays.length - 1]?.dayNumber || 31
    for (let d = dayNumber + 1; d <= maxDay; d++) {
      const dayInfo = sortedDays.find((x) => x.dayNumber === d)
      if (!dayInfo) break
      const shift = matrix[employeeId][d]
      if (isWorkShift(shift)) {
        after++
      } else {
        break
      }
    }

    return before + 1 + after > maxConsecutive
  }
}
