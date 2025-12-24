// services/scheduling/phases/assign-weekly-offs.phase.ts
// Phase 6: Assign weekly off days (2 consecutive libre days per week)

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, GenerationWarning, DayInfo } from '../types/index.js'
import {
  shuffle,
  randomInt,
  isWorkShift,
  isLibreShift,
  countShiftOnDay,
  getWeeksInMonth,
  getDaysInWeek,
  hasConsecutiveLibreDays,
  wouldCreateSmallWorkBlock,
} from '../utils/index.js'

/**
 * Phase 6: Assign Weekly Offs
 *
 * Ensure each employee has 2 consecutive libre days per week (48h rest).
 * Rules:
 * - CRITICAL: 2 consecutive days off per week
 * - CRITICAL: Must not create work blocks of 1-2 days (minimum 3 consecutive work days)
 * - Handle REQUEST_OFF by converting to libre
 * - Never convert night shifts to libre (would scatter night blocks)
 * - Respect coverage minimums when choosing which days
 * - Prefer weekends for libre when possible
 */
export class AssignWeeklyOffsPhase extends BasePhase {
  readonly name = 'AssignWeeklyOffs'
  readonly order = 60

  /** Minimum consecutive work days - cannot have isolated 1-2 day work blocks */
  private readonly MIN_WORK_BLOCK = 3

  execute(context: GeneratorContext): PhaseResult {
    const warnings: GenerationWarning[] = []
    const minConsecutiveLibre = 2 // CRITICAL: 2 consecutive days off per week (48h rest)

    // RANDOMIZATION: Shuffle employee order for processing
    const shuffledEmployees = shuffle(context.employees)

    this.log(`Assigning 2+ consecutive libre days per week (respecting coverage and min ${this.MIN_WORK_BLOCK} work block)`)

    for (const employee of shuffledEmployees) {
      // Skip if employee has fixed days (already handled - like EMP_01 R)
      if (employee.rules.fixedDays) {
        this.log(`Skipping ${employee.name} - has fixed days`)
        continue
      }

      const weeks = getWeeksInMonth(context.days)

      for (const week of weeks) {
        const weekDays = getDaysInWeek(context.days, week.weekNumber)

        // Handle REQUEST_OFF first
        for (const day of weekDays) {
          if (context.matrix[employee.id][day.dayNumber] === 'REQUEST_OFF') {
            context.matrix[employee.id][day.dayNumber] = `L${week.weekNumber}`
          }
        }

        // Check if employee already has 2+ consecutive libre days
        const hasConsecutive = hasConsecutiveLibreDays(context.matrix, weekDays, employee.id, minConsecutiveLibre)

        if (!hasConsecutive) {
          // CRITICAL: Must assign 2 consecutive libre days
          const consecutivePair = this.findBestConsecutivePairForLibre(context, employee.id, weekDays, week.weekNumber)

          if (consecutivePair) {
            for (const day of consecutivePair) {
              const currentShift = context.matrix[employee.id][day.dayNumber]
              // Don't override special absences
              if (!currentShift || isWorkShift(currentShift)) {
                context.matrix[employee.id][day.dayNumber] = `L${week.weekNumber}`
              }
            }
            this.log(
              `${employee.name} week ${week.weekNumber}: assigned consecutive libre on days ${consecutivePair.map((d) => d.dayNumber).join(', ')}`
            )
          } else {
            // Couldn't find consecutive pair without breaking coverage - emit warning
            warnings.push(
              this.warn(`${employee.name}: Semana ${week.weekNumber} no tiene 2 días libres consecutivos (48h descanso)`, {
                type: 'rest',
                employeeId: employee.id,
                employeeName: employee.name,
              })
            )
          }
        }
      }
    }

    return this.successWithWarnings(warnings, 'Assigned weekly offs')
  }

  /**
   * Find the best consecutive pair for libre that respects minimum coverage
   * and doesn't create work blocks smaller than MIN_WORK_BLOCK
   */
  private findBestConsecutivePairForLibre(
    context: GeneratorContext,
    employeeId: string,
    days: DayInfo[],
    _weekNumber: number
  ): DayInfo[] | null {
    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
    const minMorning = context.config.minMorningStaff || 1
    const minAfternoon = context.config.minAfternoonStaff || 1

    // Build list of consecutive pairs with their viability score
    const pairs: { days: DayInfo[]; score: number; viable: boolean; createsSmallBlock: boolean }[] = []

    for (let i = 0; i < sortedDays.length - 1; i++) {
      const day1 = sortedDays[i]
      const day2 = sortedDays[i + 1]

      // Must be consecutive days
      if (day2.dayNumber !== day1.dayNumber + 1) continue

      const shift1 = context.matrix[employeeId][day1.dayNumber]
      const shift2 = context.matrix[employeeId][day2.dayNumber]

      // Skip if either day has protected absence or NIGHT shift
      // CRITICAL: Never convert night shifts to libre - this would scatter night blocks
      if (
        shift1 === 'V' ||
        shift1 === 'B' ||
        shift1 === 'IT' ||
        shift1 === 'E' ||
        shift1 === 'FO' ||
        shift1 === 'N'
      )
        continue
      if (
        shift2 === 'V' ||
        shift2 === 'B' ||
        shift2 === 'IT' ||
        shift2 === 'E' ||
        shift2 === 'FO' ||
        shift2 === 'N'
      )
        continue

      // Skip if either day is already libre
      if (isLibreShift(shift1) || isLibreShift(shift2)) continue

      // Check if converting both would break coverage
      let viable = true
      let score = 0

      // Check day 1 coverage
      if (shift1 === 'M') {
        const coverage = countShiftOnDay(context.matrix, day1.dayNumber, 'M')
        if (coverage <= minMorning) viable = false
        score += (coverage - minMorning) * 10 // Prefer days with excess coverage
      } else if (shift1 === 'T') {
        const coverage = countShiftOnDay(context.matrix, day1.dayNumber, 'T')
        if (coverage <= minAfternoon) viable = false
        score += (coverage - minAfternoon) * 10
      }

      // Check day 2 coverage
      if (shift2 === 'M') {
        const coverage = countShiftOnDay(context.matrix, day2.dayNumber, 'M')
        if (coverage <= minMorning) viable = false
        score += (coverage - minMorning) * 10
      } else if (shift2 === 'T') {
        const coverage = countShiftOnDay(context.matrix, day2.dayNumber, 'T')
        if (coverage <= minAfternoon) viable = false
        score += (coverage - minAfternoon) * 10
      }

      // CRITICAL: Check if this would create a small work block (1-2 days)
      const createsSmallBlock = wouldCreateSmallWorkBlock(
        context.matrix,
        context.days,
        employeeId,
        [day1.dayNumber, day2.dayNumber],
        this.MIN_WORK_BLOCK
      )
      
      if (createsSmallBlock) {
        this.log(`  Pair ${day1.dayNumber}-${day2.dayNumber} would create <${this.MIN_WORK_BLOCK} day work block`)
      }

      // Prefer weekends (S=Saturday, D=Sunday)
      if (day1.dayOfWeek === 'S' || day1.dayOfWeek === 'D') score += 15
      if (day2.dayOfWeek === 'S' || day2.dayOfWeek === 'D') score += 15

      // RANDOMIZATION
      score += randomInt(0, 10)

      pairs.push({ days: [day1, day2], score, viable, createsSmallBlock })
    }

    // Sort by score (highest first)
    pairs.sort((a, b) => b.score - a.score)
    
    // PRIORITY 1: Viable pairs that DON'T create small work blocks
    const idealPairs = pairs.filter((p) => p.viable && !p.createsSmallBlock)
    if (idealPairs.length > 0) {
      return idealPairs[0].days
    }
    
    // PRIORITY 2: Any pair that doesn't create small work blocks (even if coverage is tight)
    const noSmallBlockPairs = pairs.filter((p) => !p.createsSmallBlock)
    if (noSmallBlockPairs.length > 0) {
      this.log('Warning: Using pair with tight coverage to avoid small work blocks')
      return noSmallBlockPairs[0].days
    }
    
    // PRIORITY 3: Viable pairs (even if they create small work blocks)
    // This is a last resort - small work blocks are bad but 48h rest is mandatory
    const anyViable = pairs.filter((p) => p.viable)
    if (anyViable.length > 0) {
      this.log('Warning: All pairs create small work blocks, using best viable')
      return anyViable[0].days
    }

    // If no viable pair, return the best non-viable (will cause coverage warning but respects rest)
    if (pairs.length > 0) {
      this.log('Warning: No viable consecutive pair for employee, using best available')
      return pairs[0].days
    }

    return null
  }
}
