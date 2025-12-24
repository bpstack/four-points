// services/scheduling/phases/final-validation.phase.ts
// Phase 9: Final validation of the generated schedule

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, GenerationWarning, DayInfo } from '../types/index.js'
import { isWorkShift, isLibreShift, getEmployeeShiftCounts } from '../utils/matrix.js'
import { getWeeksInMonth, getDaysInWeek, areConsecutive } from '../utils/day-helpers.js'

/**
 * Final Validation Phase
 *
 * Validates the complete schedule against all rules:
 * 1. Monthly libre days (8-12)
 * 2. Max consecutive work days (6)
 * 3. Min consecutive work days (3) - no isolated 1-2 day work blocks
 * 4. 2 consecutive libre per week
 * 5. Max shifts per month rules
 * 6. Weekly shifts don't exceed max
 * 7. Night block validation (min 3 consecutive)
 */
export class FinalValidationPhase extends BasePhase {
  readonly name = 'final-validation'
  readonly order = 90

  /** Minimum consecutive work days - cannot have isolated 1-2 day work blocks */
  private readonly MIN_WORK_BLOCK = 3

  execute(context: GeneratorContext): PhaseResult {
    const warnings: GenerationWarning[] = []
    const { matrix, days, employees, config } = context

    const minMonthlyLibre = config.minMonthlyLibre || 8
    const maxMonthlyLibre = config.maxMonthlyLibre || 12
    const maxConsecutiveWorkDays = config.maxConsecutiveWorkDays || 6
    const minNightBlock = config.minNightBlock || 4
    const maxNightBlock = config.maxNightBlock || 6
    const MIN_NIGHTS_REQUIRED = 3

    for (const employee of employees) {
      // Skip validation for fixed-shift employees (like EMP_01 R)
      if (employee.rules.fixedDays) continue

      // Count shifts
      const shiftCounts = getEmployeeShiftCounts(matrix, days, employee.id)
      const totalLibreDays = this.countTotalLibreDays(matrix, days, employee.id)

      // ========================================
      // VALIDATION 1: Monthly libre days (8-12)
      // ========================================
      if (totalLibreDays < minMonthlyLibre) {
        warnings.push(
          this.warn(
            `${employee.name}: Solo ${totalLibreDays} días libres al mes (mín ${minMonthlyLibre})`,
            { type: 'rest', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
          )
        )
      }
      if (totalLibreDays > maxMonthlyLibre) {
        warnings.push(
          this.warn(
            `${employee.name}: ${totalLibreDays} días libres al mes (máx ${maxMonthlyLibre})`,
            { type: 'rest', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
          )
        )
      }

      // ========================================
      // VALIDATION 2: Max consecutive work days (6)
      // ========================================
      const consecutiveViolations = this.findConsecutiveWorkViolations(
        matrix,
        days,
        employee.id,
        maxConsecutiveWorkDays
      )
      for (const violation of consecutiveViolations) {
        warnings.push(
          this.warn(
            `${employee.name}: ${violation.count} días seguidos trabajando (días ${violation.startDay}-${violation.endDay}, máx ${maxConsecutiveWorkDays})`,
            { type: 'rest', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
          )
        )
      }

      // ========================================
      // VALIDATION 3: Min consecutive work days (3)
      // Cannot have isolated 1-2 day work blocks
      // ========================================
      const smallWorkBlocks = this.findSmallWorkBlocks(matrix, days, employee.id, this.MIN_WORK_BLOCK)
      for (const block of smallWorkBlocks) {
        warnings.push(
          this.error(
            `${employee.name}: bloque de ${block.count} día(s) de trabajo (días ${block.startDay}-${block.endDay}, mín ${this.MIN_WORK_BLOCK} consecutivos)`,
            { type: 'rest', employeeId: employee.id, employeeName: employee.name, day: block.startDay }
          )
        )
      }

      // ========================================
      // VALIDATION 4: 2 consecutive libre per week
      // ========================================
      const weeks = getWeeksInMonth(days)
      for (const week of weeks) {
        const weekDays = getDaysInWeek(days, week.weekNumber)
        if (!this.hasConsecutiveLibreDays(matrix, employee.id, weekDays, 2)) {
          warnings.push(
            this.warn(
              `${employee.name}: Semana ${week.weekNumber} sin 2 días libres consecutivos (48h descanso)`,
              { type: 'rest', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }
      }

      // ========================================
      // VALIDATION 5: Max shifts per month rules
      // ========================================
      if (employee.rules.maxShiftPerMonth) {
        for (const [shiftCode, maxCount] of Object.entries(employee.rules.maxShiftPerMonth)) {
          const actual = shiftCounts[shiftCode] || 0
          if (actual > maxCount) {
            warnings.push(
              this.warn(
                `${employee.name}: ${actual} turnos ${shiftCode} (máx ${maxCount})`,
                { type: 'constraint', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
              )
            )
          }
        }
      }

      // ========================================
      // VALIDATION 6: Weekly shifts don't exceed max
      // ========================================
      for (const week of weeks) {
        const weekWork = this.countWeekWorkDays(matrix, days, employee.id, week.weekNumber)
        if (weekWork > (config.maxWeeklyShifts || 6)) {
          warnings.push(
            this.warn(
              `${employee.name}: ${weekWork} turnos en semana ${week.weekNumber} (máx ${config.maxWeeklyShifts || 6})`,
              { type: 'hours', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }
      }

      // ========================================
      // VALIDATION 7: Night block validation
      // ========================================
      const nightCount = shiftCounts['N'] || 0
      if (nightCount > 0) {
        const nightDays = days
          .filter((d) => matrix[employee.id][d.dayNumber] === 'N')
          .map((d) => d.dayNumber)
          .sort((a, b) => a - b)

        const isConsecutive = areConsecutive(nightDays)

        if (!isConsecutive) {
          // ERROR: Scattered nights
          warnings.push(
            this.error(
              `${employee.name}: noches dispersas (días ${nightDays.join(', ')}) - deben ser consecutivas`,
              { type: 'night_block', employeeId: employee.id, employeeName: employee.name }
            )
          )
        } else if (nightCount < MIN_NIGHTS_REQUIRED) {
          // ERROR: Less than minimum 3
          warnings.push(
            this.error(
              `${employee.name}: ${nightCount} noches (mínimo obligatorio ${MIN_NIGHTS_REQUIRED} consecutivas)`,
              { type: 'night_block', employeeId: employee.id, employeeName: employee.name }
            )
          )
        } else if (nightCount < minNightBlock) {
          // WARNING: Less than recommended
          warnings.push(
            this.warn(
              `${employee.name}: ${nightCount} noches (mín recomendado ${minNightBlock})`,
              { type: 'night_block', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }

        if (nightCount > maxNightBlock) {
          warnings.push(
            this.warn(
              `${employee.name}: ${nightCount} noches (máx ${maxNightBlock})`,
              { type: 'night_block', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }
      }
    }

    const errorCount = warnings.filter((w) => w.severity === 'error').length
    const warningCount = warnings.filter((w) => w.severity === 'warning').length

    this.log(`Validation complete: ${errorCount} errors, ${warningCount} warnings`)

    return errorCount > 0
      ? this.failure(warnings, `Validation failed with ${errorCount} errors`)
      : this.successWithWarnings(warnings, `Validation passed with ${warningCount} warnings`)
  }

  /**
   * Count total libre days including all absence types
   */
  private countTotalLibreDays(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string
  ): number {
    let total = 0
    for (const day of days) {
      const shift = matrix[employeeId][day.dayNumber]
      if (isLibreShift(shift) || shift === 'V' || shift === 'B' || shift === 'IT' || shift === 'E' || shift === 'FO') {
        total++
      }
    }
    return total
  }

  /**
   * Find violations of max consecutive work days rule
   */
  private findConsecutiveWorkViolations(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string,
    maxConsecutive: number
  ): { startDay: number; endDay: number; count: number }[] {
    const violations: { startDay: number; endDay: number; count: number }[] = []
    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

    let consecutiveStart = -1
    let consecutiveCount = 0

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i]
      const shift = matrix[employeeId][day.dayNumber]
      const isWork = isWorkShift(shift)

      if (isWork) {
        if (consecutiveCount === 0) {
          consecutiveStart = day.dayNumber
        }
        consecutiveCount++
      } else {
        if (consecutiveCount > maxConsecutive) {
          violations.push({
            startDay: consecutiveStart,
            endDay: sortedDays[i - 1].dayNumber,
            count: consecutiveCount,
          })
        }
        consecutiveCount = 0
        consecutiveStart = -1
      }
    }

    // Check final streak
    if (consecutiveCount > maxConsecutive) {
      violations.push({
        startDay: consecutiveStart,
        endDay: sortedDays[sortedDays.length - 1].dayNumber,
        count: consecutiveCount,
      })
    }

    return violations
  }

  /**
   * Check if employee has consecutive libre days in the week
   */
  private hasConsecutiveLibreDays(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    weekDays: DayInfo[],
    minConsecutive: number
  ): boolean {
    let consecutive = 0
    const sortedDays = [...weekDays].sort((a, b) => a.dayNumber - b.dayNumber)

    for (let i = 0; i < sortedDays.length; i++) {
      const shift = matrix[employeeId][sortedDays[i].dayNumber]
      const isLibre =
        isLibreShift(shift) ||
        shift === 'V' ||
        shift === 'B' ||
        shift === 'IT' ||
        shift === 'E' ||
        shift === 'FO'

      if (isLibre) {
        if (i > 0 && sortedDays[i].dayNumber === sortedDays[i - 1].dayNumber + 1) {
          consecutive++
        } else {
          consecutive = 1
        }
        if (consecutive >= minConsecutive) {
          return true
        }
      } else {
        consecutive = 0
      }
    }

    return false
  }

  /**
   * Count work days for employee in a week
   */
  private countWeekWorkDays(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string,
    weekNumber: number
  ): number {
    let count = 0
    for (const day of days) {
      if (day.weekNumber === weekNumber) {
        const shift = matrix[employeeId][day.dayNumber]
        if (isWorkShift(shift)) {
          count++
        }
      }
    }
    return count
  }

  /**
   * Find work blocks that are smaller than the minimum required
   * A work block is a sequence of consecutive work days surrounded by non-work days
   */
  private findSmallWorkBlocks(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string,
    minWorkBlock: number
  ): { startDay: number; endDay: number; count: number }[] {
    const violations: { startDay: number; endDay: number; count: number }[] = []
    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

    let blockStart = -1
    let blockCount = 0

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i]
      const shift = matrix[employeeId][day.dayNumber]
      const isWork = isWorkShift(shift)

      if (isWork) {
        if (blockCount === 0) {
          blockStart = day.dayNumber
        }
        blockCount++
      } else {
        // End of a work block - check if it was too small
        if (blockCount > 0 && blockCount < minWorkBlock) {
          violations.push({
            startDay: blockStart,
            endDay: sortedDays[i - 1].dayNumber,
            count: blockCount,
          })
        }
        blockCount = 0
        blockStart = -1
      }
    }

    // Check final block at end of month
    if (blockCount > 0 && blockCount < minWorkBlock) {
      violations.push({
        startDay: blockStart,
        endDay: sortedDays[sortedDays.length - 1].dayNumber,
        count: blockCount,
      })
    }

    return violations
  }
}
