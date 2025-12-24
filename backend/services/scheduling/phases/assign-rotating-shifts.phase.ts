// services/scheduling/phases/assign-rotating-shifts.phase.ts
// Phase 5: Assign rotating M/T shifts for remaining days

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, Employee, DayInfo } from '../types/index.js'
import {
  shuffle,
  randomChance,
  getWeeksInMonth,
  getDaysInWeek,
  wouldExceedConsecutiveWork,
} from '../utils/index.js'

/**
 * Phase 5: Assign Rotating Shifts
 *
 * For each employee, assign M or T shifts for remaining unassigned days.
 * Rules:
 * - Respect weekly rotation (same shift type for M/T weeks)
 * - Night shifts are already assigned in Phase 4, don't touch them
 * - Assign work to ALL available days first, Phase 6 will convert some to libre
 * - Respect PREFER_T markers (post-night rest)
 * - Check max consecutive work days constraint
 */
export class AssignRotatingShiftsPhase extends BasePhase {
  readonly name = 'AssignRotatingShifts'
  readonly order = 50

  execute(context: GeneratorContext): PhaseResult {
    // RANDOMIZATION: Shuffle employee order for processing
    const shuffledEmployees = shuffle(context.employees)

    this.log(`Assigning M/T shifts for ${shuffledEmployees.length} employees`)

    for (const employee of shuffledEmployees) {
      // Skip fixed-shift employees (like EMP_01 R with P shift)
      if (employee.rules.fixedShift) {
        this.log(`Skipping ${employee.name} - fixed shift`)
        continue
      }

      const weeks = getWeeksInMonth(context.days)

      for (const week of weeks) {
        const weekDays = getDaysInWeek(context.days, week.weekNumber)

        // ========================================
        // STEP 1: Determine week shift type (M or T)
        // ========================================
        const weekShift = this.determineWeekShift(context, employee, weekDays, week.weekNumber)

        // ========================================
        // STEP 2: Assign shifts to all available days
        // ========================================
        for (const day of weekDays) {
          const current = context.matrix[employee.id][day.dayNumber]

          // Skip already assigned work shifts (N, M, T, P, etc) or special leaves
          if (
            current === 'N' ||
            current === 'M' ||
            current === 'T' ||
            current === 'P' ||
            current === 'V' ||
            current === 'B' ||
            current === 'IT' ||
            current === 'E' ||
            current === 'FO' ||
            (current && current.startsWith('L'))
          ) {
            continue
          }

          // Handle request_off - mark for libre in Phase 6
          if (current === 'REQUEST_OFF') {
            this.log(`${employee.name} day ${day.dayNumber}: skipping - REQUEST_OFF`)
            continue
          }

          // CRITICAL: Check if assigning work would cause >6 consecutive work days
          const maxConsecutive = context.config.maxConsecutiveWorkDays || 6
          if (wouldExceedConsecutiveWork(context.matrix, context.days, employee.id, day.dayNumber, maxConsecutive)) {
            // Must leave as libre to break the streak
            context.matrix[employee.id][day.dayNumber] = `L${week.weekNumber}`
            this.log(`${employee.name} day ${day.dayNumber}: forced L to prevent >6 consecutive work days`)
            continue
          }

          // Handle PREFER_T marker (post-night rest)
          if (current === 'PREFER_T') {
            context.matrix[employee.id][day.dayNumber] = 'T'
            continue
          }

          // Handle specific shift request
          if (current && current.startsWith('REQUEST_')) {
            const requested = current.replace('REQUEST_', '')
            if (requested === 'M' || requested === 'T') {
              context.matrix[employee.id][day.dayNumber] = requested
            }
            continue
          }

          // Handle avoid shift
          if (current && current.startsWith('AVOID_')) {
            const avoided = current.replace('AVOID_', '')
            if (weekShift !== avoided) {
              context.matrix[employee.id][day.dayNumber] = weekShift
            } else {
              // Assign the other shift
              context.matrix[employee.id][day.dayNumber] = weekShift === 'M' ? 'T' : 'M'
            }
            continue
          }

          // Normal assignment - empty slot gets the week shift
          if (!current || current === '') {
            context.matrix[employee.id][day.dayNumber] = weekShift
          }
        }

        // Log what we assigned
        const assigned = weekDays.filter(
          (d) => context.matrix[employee.id][d.dayNumber] === 'M' || context.matrix[employee.id][d.dayNumber] === 'T'
        ).length
        const nightsThisWeek = weekDays.filter((d) => context.matrix[employee.id][d.dayNumber] === 'N').length
        this.log(`${employee.name} week ${week.weekNumber}: ${weekShift} shift, ${assigned} M/T, ${nightsThisWeek} N`)
      }
    }

    return this.success('Assigned rotating shifts to all employees')
  }

  /**
   * Determine which shift type (M or T) for an employee in a given week
   */
  private determineWeekShift(
    context: GeneratorContext,
    employee: Employee,
    weekDays: DayInfo[],
    weekNumber: number
  ): 'M' | 'T' {
    // Check if any day has PREFER_T (post-night rest requirement)
    const hasPreferT = weekDays.some((d) => context.matrix[employee.id][d.dayNumber] === 'PREFER_T')

    if (hasPreferT) {
      // Post-night rest: must be T week (48h rule)
      return 'T'
    }

    // Check existing M/T assignments this week
    const existingMT = weekDays
      .map((d) => context.matrix[employee.id][d.dayNumber])
      .filter((s) => s && ['M', 'T'].includes(s))

    if (existingMT.includes('M')) return 'M'
    if (existingMT.includes('T')) return 'T'

    // ========================================
    // ROTATION RULE: Check previous day's shift
    // If previous day was T, cannot go back to M
    // ========================================
    const firstWeekDay = weekDays[0]?.dayNumber
    if (firstWeekDay && firstWeekDay > 1) {
      const prevDayShift = context.matrix[employee.id][firstWeekDay - 1]
      if (prevDayShift === 'T') {
        this.log(`${employee.name} week ${weekNumber}: forced T (previous day was T, cannot transition to M)`)
        return 'T'
      }
    }

    // Determine based on priority and balance
    return this.calculateWeekShift(context, employee, weekNumber)
  }

  /**
   * Calculate the best shift type for an employee based on rules and balance
   */
  private calculateWeekShift(context: GeneratorContext, employee: Employee, weekNumber: number): 'M' | 'T' {
    // Count current M and T assignments for this employee
    let mCount = 0
    let tCount = 0

    for (const day of context.days) {
      const shift = context.matrix[employee.id][day.dayNumber]
      if (shift === 'M') mCount++
      if (shift === 'T') tCount++
    }

    // Check priority preference (Salvador=M, Andrés=T)
    if (employee.rules.shiftPriority) {
      const preferred = employee.rules.shiftPriority as 'M' | 'T'
      const other = preferred === 'M' ? 'T' : 'M'

      const currentOther = other === 'M' ? mCount : tCount
      const currentPreferred = preferred === 'M' ? mCount : tCount

      // Check if we've hit the max for the preferred shift
      const maxPreferred = employee.rules.maxShiftPerMonth?.[preferred]
      if (maxPreferred && currentPreferred >= maxPreferred) {
        return other
      }

      // Check if we've hit the max for the other shift (can't use it anymore)
      const maxOther = employee.rules.maxShiftPerMonth?.[other]
      if (maxOther && currentOther >= maxOther) {
        return preferred
      }

      // If other shift hasn't reached its required minimum yet
      const minOther = employee.rules.minShiftPerMonth?.[other]
      if (minOther && currentOther < minOther) {
        return other
      }

      // Default to preferred
      return preferred
    }

    // ========================================
    // CONTINUITY: Consider last shift from previous month
    // For week 1, prefer opposite of last month's ending shift
    // ========================================
    if (weekNumber === 1 && context.previousMonthHistory) {
      const lastShiftType = context.previousMonthHistory.lastShiftType.get(employee.id)
      if (lastShiftType && mCount === 0 && tCount === 0) {
        // First assignment this month - rotate from previous month
        // RANDOMIZATION: 80% chance to rotate, 20% chance to stay same
        const shouldRotate = randomChance(0.8)
        const rotatedShift = shouldRotate ? (lastShiftType === 'M' ? 'T' : 'M') : lastShiftType
        this.log(
          `${employee.name} week 1: ${shouldRotate ? 'rotating' : 'staying'} from ${lastShiftType} to ${rotatedShift} (continuity)`
        )
        return rotatedShift
      }
    }

    // RANDOMIZATION: For employees without priority, randomly choose M or T
    // with some balancing logic

    // If heavily imbalanced, correct it (but with some randomness)
    if (mCount > tCount + 5) {
      // 90% chance to correct imbalance, 10% to let it slide
      return randomChance(0.9) ? 'T' : 'M'
    }
    if (tCount > mCount + 5) {
      return randomChance(0.9) ? 'M' : 'T'
    }

    // RANDOMIZATION: Random choice with slight bias toward balancing
    const imbalance = mCount - tCount
    let mProbability = 0.5

    // Adjust probability based on current balance (max 30% adjustment)
    mProbability -= imbalance / 20 // If mCount > tCount, reduce M probability
    mProbability = Math.max(0.2, Math.min(0.8, mProbability)) // Clamp between 0.2 and 0.8

    return randomChance(mProbability) ? 'M' : 'T'
  }
}
