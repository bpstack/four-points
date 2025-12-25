// services/scheduling/phases/validate-fix-coverage.phase.ts
// Phase 7: Validate and fix coverage issues

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, GenerationWarning, DayInfo, Employee } from '../types/index.js'
import {
  shuffle,
  isLibreShift,
  countShiftOnDay,
  countWeekWorkDays,
  getEmployeeWeekShift,
  getDaysWithShift,
  wouldExceedConsecutiveWork,
  sortDaysByNumber,
  areConsecutive,
  isAdjacentToAny,
  getDaysInWeek,
} from '../utils/index.js'
import { selectBestCandidate } from '../scoring/index.js'

/**
 * Phase 7: Validate and Fix Coverage
 *
 * Ensure minimum coverage is met for all shifts on all days.
 * Actions:
 * - Redistribute between M and T if needed
 * - Convert libre to work if under minimum
 * - Convert excess to libre if over maximum
 * - Emit warnings for remaining issues
 */
export class ValidateFixCoveragePhase extends BasePhase {
  readonly name = 'ValidateFixCoverage'
  readonly order = 70

  execute(context: GeneratorContext): PhaseResult {
    const warnings: GenerationWarning[] = []

    // Get employees who can be reassigned (not fixed shift)
    const flexibleEmployees = context.employees.filter((e) => !e.rules.fixedShift)

    this.log(`Validating and fixing coverage for ${context.days.length} days`)

    // Process days in order (not random) for consistent coverage fixing
    const sortedDays = sortDaysByNumber(context.days)

    for (const day of sortedDays) {
      if (day.isHoliday) continue

      let morningCount = countShiftOnDay(context.matrix, day.dayNumber, 'M')
      let afternoonCount = countShiftOnDay(context.matrix, day.dayNumber, 'T')
      const minMorning = context.config.minMorningStaff || 1
      const minAfternoon = context.config.minAfternoonStaff || 1
      const maxMorning = context.config.maxMorningStaff || 2
      const maxAfternoon = context.config.maxAfternoonStaff || 2

      // ========================================
      // STEP 1: REDISTRIBUTE between M and T if needed
      // ========================================

      // If M has excess and T needs people, move from M to T
      while (morningCount > minMorning && afternoonCount < minAfternoon) {
        const moved = this.tryMoveShift(context, day, 'M', 'T', flexibleEmployees)
        if (moved) {
          morningCount--
          afternoonCount++
          this.log(`Day ${day.dayNumber}: Moved 1 from M to T`)
        } else {
          break
        }
      }

      // If T has excess and M needs people, move from T to M
      while (afternoonCount > minAfternoon && morningCount < minMorning) {
        const moved = this.tryMoveShift(context, day, 'T', 'M', flexibleEmployees)
        if (moved) {
          afternoonCount--
          morningCount++
          this.log(`Day ${day.dayNumber}: Moved 1 from T to M`)
        } else {
          break
        }
      }

      // ========================================
      // STEP 2: Convert libre to work if still under minimum
      // ========================================

      // Fix morning undercoverage by converting libre
      while (morningCount < minMorning) {
        const converted = this.tryConvertToShift(context, day, 'M', flexibleEmployees)
        if (converted) {
          morningCount++
        } else {
          break
        }
      }

      // Fix afternoon undercoverage by converting libre
      while (afternoonCount < minAfternoon) {
        const converted = this.tryConvertToShift(context, day, 'T', flexibleEmployees)
        if (converted) {
          afternoonCount++
        } else {
          break
        }
      }

      // ========================================
      // STEP 3: Fix overcoverage (convert excess to libre)
      // ========================================

      while (morningCount > maxMorning) {
        const reduced = this.reduceShiftCoverage(context, day, 'M')
        if (reduced) {
          morningCount--
        } else {
          break
        }
      }

      while (afternoonCount > maxAfternoon) {
        const reduced = this.reduceShiftCoverage(context, day, 'T')
        if (reduced) {
          afternoonCount--
        } else {
          break
        }
      }

      // ========================================
      // STEP 4: Emit warnings for remaining issues
      // ========================================

      if (morningCount < minMorning) {
        warnings.push(
          morningCount === 0
            ? this.error(`Día ${day.dayNumber}: Solo ${morningCount} personas en mañana (mín ${minMorning})`, {
                type: 'coverage',
                day: day.dayNumber,
              })
            : this.warn(`Día ${day.dayNumber}: Solo ${morningCount} personas en mañana (mín ${minMorning})`, {
                type: 'coverage',
                day: day.dayNumber,
              })
        )
      }

      if (afternoonCount < minAfternoon) {
        warnings.push(
          afternoonCount === 0
            ? this.error(`Día ${day.dayNumber}: Solo ${afternoonCount} personas en tarde (mín ${minAfternoon})`, {
                type: 'coverage',
                day: day.dayNumber,
              })
            : this.warn(`Día ${day.dayNumber}: Solo ${afternoonCount} personas en tarde (mín ${minAfternoon})`, {
                type: 'coverage',
                day: day.dayNumber,
              })
        )
      }

      // Check night coverage (should already be 1 from Phase 4)
      const nightCount = countShiftOnDay(context.matrix, day.dayNumber, 'N')
      const maxNight = context.config.maxNightStaff || 1

      if (nightCount === 0) {
        // Try to assign someone to night
        const converted = this.tryConvertToShift(context, day, 'N', flexibleEmployees)
        if (!converted) {
          warnings.push(
            this.error(`Día ${day.dayNumber}: No hay cobertura de noche`, {
              type: 'coverage',
              day: day.dayNumber,
            })
          )
        }
      } else if (nightCount > maxNight) {
        // Too many on night - convert extras to libre
        this.reduceNightCoverage(context, day, nightCount - maxNight)
      }

      // Log coverage status for first few days
      if (day.dayNumber <= 5) {
        const finalM = countShiftOnDay(context.matrix, day.dayNumber, 'M')
        const finalT = countShiftOnDay(context.matrix, day.dayNumber, 'T')
        const finalN = countShiftOnDay(context.matrix, day.dayNumber, 'N')
        this.log(`Day ${day.dayNumber}: M=${finalM} T=${finalT} N=${finalN}`)
      }
    }

    return this.successWithWarnings(warnings, 'Coverage validation complete')
  }

  /**
   * Try to move an employee from one shift to another on the same day
   */
  private tryMoveShift(
    context: GeneratorContext,
    day: DayInfo,
    fromShift: string,
    toShift: string,
    candidates: Employee[]
  ): boolean {
    const moveCandidates = candidates.filter((emp) => {
      if (emp.rules.fixedShift) return false
      const current = context.matrix[emp.id][day.dayNumber]
      if (current !== fromShift) return false

      // Check weekly rotation consistency
      const weekShift = getEmployeeWeekShift(context.matrix, context.days, emp.id, day.weekNumber)
      if (weekShift && weekShift !== toShift && weekShift !== fromShift) return false

      return true
    })

    // Shuffle to add randomness, then use scoring for selection
    const shuffled = shuffle(moveCandidates)

    if (shuffled.length > 0) {
      // Use scoring to select the best candidate to move
      const selectionResult = selectBestCandidate(shuffled, day, toShift, context)
      const emp = selectionResult.selected || shuffled[0]
      context.matrix[emp.id][day.dayNumber] = toShift
      return true
    }

    return false
  }

  /**
   * Reduce coverage for a shift by converting one person to libre
   */
  private reduceShiftCoverage(context: GeneratorContext, day: DayInfo, shiftCode: string): boolean {
    const candidates = context.employees
      .filter((emp) => {
        if (emp.rules.fixedShift) return false
        return context.matrix[emp.id][day.dayNumber] === shiftCode
      })
      .sort((a, b) => {
        const weekWorkA = countWeekWorkDays(context.matrix, context.days, a.id, day.weekNumber)
        const weekWorkB = countWeekWorkDays(context.matrix, context.days, b.id, day.weekNumber)
        return weekWorkB - weekWorkA // Prefer employees with more shifts (to reduce)
      })

    if (candidates.length > 0) {
      const emp = candidates[0]
      context.matrix[emp.id][day.dayNumber] = `L${day.weekNumber}`
      this.log(`Reduced ${shiftCode} coverage on day ${day.dayNumber}: ${emp.name} -> L`)
      return true
    }

    return false
  }

  /**
   * Try to convert a libre day to work shift
   */
  private tryConvertToShift(
    context: GeneratorContext,
    day: DayInfo,
    targetShift: string,
    candidates: Employee[]
  ): boolean {
    const maxConsecutive = context.config.maxConsecutiveWorkDays || 6

    const availableCandidates = candidates
      .filter((emp) => {
        const current = context.matrix[emp.id][day.dayNumber]
        if (!current || !isLibreShift(current)) return false

        // Check they won't exceed weekly max
        const weekWork = countWeekWorkDays(context.matrix, context.days, emp.id, day.weekNumber)
        if (weekWork >= (context.config.maxWeeklyShifts || 6)) return false

        // CRITICAL: Check if converting this day would break 2 consecutive libre days
        if (this.wouldBreakConsecutiveLibre(context, emp.id, day)) {
          return false
        }

        // CRITICAL: Check if converting would cause more than max consecutive work days
        if (wouldExceedConsecutiveWork(context.matrix, context.days, emp.id, day.dayNumber, maxConsecutive)) {
          return false
        }

        // For M/T shifts, check weekly rotation consistency
        if (targetShift === 'M' || targetShift === 'T') {
          const weekShift = getEmployeeWeekShift(context.matrix, context.days, emp.id, day.weekNumber)
          if (weekShift && weekShift !== targetShift) return false
        }

        // For night shifts, check special rules
        if (targetShift === 'N') {
          if (emp.rules.fixedShift || emp.rules.noWeekends) return false

          // Check they don't already have too many nights
          const existingNights = getDaysWithShift(context.matrix, context.days, emp.id, 'N')

          if (existingNights.length >= (context.config.maxNightBlock || 6)) {
            return false
          }

          // CRITICAL: If employee has existing nights, new night must be ADJACENT
          if (existingNights.length > 0) {
            // Check if existing nights are consecutive
            if (!areConsecutive(existingNights)) {
              return false // Already has scattered nights
            }

            // Check if this day would be adjacent
            if (!isAdjacentToAny(day.dayNumber, existingNights)) {
              return false // Would create scattered nights
            }
          } else {
            // Employee has NO existing nights
            // CRITICAL: If employee has already completed their night block, reject
            if (context.employeesWithCompletedNightBlock.has(emp.id)) {
              return false
            }
          }
        }

        return true
      })

    if (availableCandidates.length > 0) {
      // Use scoring to select the best candidate
      const selectionResult = selectBestCandidate(availableCandidates, day, targetShift, context)
      const emp = selectionResult.selected || availableCandidates[0]
      
      context.matrix[emp.id][day.dayNumber] = targetShift

      if (targetShift === 'N') {
        const existingNights = getDaysWithShift(context.matrix, context.days, emp.id, 'N')
        this.log(`Converted ${emp.name} day ${day.dayNumber} from L to ${targetShift} (total nights: ${existingNights.join(',')})`)
      } else {
        this.log(`Converted ${emp.name} day ${day.dayNumber} from L to ${targetShift}`)
      }
      return true
    }

    return false
  }

  /**
   * Reduce night coverage by converting extras to libre
   */
  private reduceNightCoverage(context: GeneratorContext, day: DayInfo, excess: number): void {
    let reduced = 0
    for (const emp of context.employees) {
      if (reduced >= excess) break
      if (context.matrix[emp.id][day.dayNumber] === 'N') {
        // Convert to libre, but only if this employee has other nights
        const totalNights = context.days.filter((d) => context.matrix[emp.id][d.dayNumber] === 'N').length
        if (totalNights > context.config.minNightBlock) {
          context.matrix[emp.id][day.dayNumber] = `L${day.weekNumber}`
          reduced++
        }
      }
    }
  }

  /**
   * Check if converting a libre day to work would break the 2 consecutive libre requirement
   */
  private wouldBreakConsecutiveLibre(context: GeneratorContext, employeeId: string, day: DayInfo): boolean {
    const weekDays = getDaysInWeek(context.days, day.weekNumber)

    // Count current libre days in this week
    const libreDays = weekDays.filter((d) => {
      const shift = context.matrix[employeeId][d.dayNumber]
      return (
        shift &&
        (isLibreShift(shift) ||
          shift.startsWith('RESERVED_L') ||
          shift === 'V' ||
          shift === 'B' ||
          shift === 'IT' ||
          shift === 'E' ||
          shift === 'FO')
      )
    })

    // If only 2 libre days left, check if this one is part of a consecutive pair
    if (libreDays.length <= 2) {
      // Find consecutive pairs
      const sortedLibre = [...libreDays].sort((a, b) => a.dayNumber - b.dayNumber)
      for (let i = 0; i < sortedLibre.length - 1; i++) {
        if (sortedLibre[i + 1].dayNumber === sortedLibre[i].dayNumber + 1) {
          // Found a consecutive pair - check if target day is part of it
          if (sortedLibre[i].dayNumber === day.dayNumber || sortedLibre[i + 1].dayNumber === day.dayNumber) {
            return true // Don't break the only consecutive pair
          }
        }
      }

      // If exactly 2 libre and they're NOT consecutive, we already have a problem
      // But removing one would make it worse
      if (libreDays.length === 2) {
        return true
      }
    }

    // If more than 2 libre days, simulate removal and check if 2 consecutive remain
    if (libreDays.length > 2) {
      const remainingLibre = libreDays.filter((d) => d.dayNumber !== day.dayNumber)
      const sortedRemaining = [...remainingLibre].sort((a, b) => a.dayNumber - b.dayNumber)

      // Check if remaining libre days have at least 2 consecutive
      let hasConsecutive = false
      for (let i = 0; i < sortedRemaining.length - 1; i++) {
        if (sortedRemaining[i + 1].dayNumber === sortedRemaining[i].dayNumber + 1) {
          hasConsecutive = true
          break
        }
      }

      if (!hasConsecutive) {
        return true // Would break the 2 consecutive requirement
      }
    }

    return false // Safe to convert
  }
}
