// services/scheduling/schedule-validator.ts
// Validates existing schedule assignments and returns warnings/errors

import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import type {
  SchedulingConfigMap,
  SchedulingShiftRow,
  SchedulingDayRow,
  SchedulingEmployeeRuleWithEmployee,
  SchedulingAssignmentWithDetails,
} from '../../models/scheduling/index.js'

import type {
  Employee,
  DayInfo,
  GeneratorContext,
  SchedulingConfig,
  ShiftInfo,
  GenerationWarning,
  ScheduleMatrix,
  PreviousMonthHistory,
} from './types/index.js'

import { CoverageConstraint } from './constraints/coverage.constraint.js'
import { EmployeeRulesConstraint } from './constraints/employee-rules.constraint.js'
import { ConstraintRegistry } from './constraints/registry.js'
import { SOFT_WEIGHTS } from './soft-weights.js'
import { isWorkShift, isLibreShift, getEmployeeShiftCounts } from './utils/matrix.js'
import { getWeeksInMonth, areConsecutive } from './utils/day-helpers.js'

// ============================================
// VALIDATION RESULT
// ============================================

export interface ValidationResult {
  isValid: boolean
  errors: GenerationWarning[]
  warnings: GenerationWarning[]
  /** Weighted sum of soft-penalty violations (0 = perfect, higher = more soft violations) */
  softPenalty: number
  /** Breakdown by SoftWeightKey for traceability and solver use */
  softPenaltyBreakdown: Record<string, number>
  stats: {
    totalErrors: number
    totalWarnings: number
    byType: Record<string, number>
  }
}

// ============================================
// SCHEDULE VALIDATOR
// ============================================

/**
 * Schedule Validator
 *
 * Validates an existing schedule's assignments against all rules.
 * Used for re-validating after manual edits without regenerating.
 */
export class ScheduleValidator {
  private monthId: number
  private year: number
  private month: number
  private config: SchedulingConfig
  private shifts: ShiftInfo[]
  private days: DayInfo[]
  private employees: Employee[]
  private assignments: SchedulingAssignmentWithDetails[]
  private previousMonthHistory: PreviousMonthHistory | null

  constructor(
    monthId: number,
    year: number,
    month: number,
    config: SchedulingConfigMap,
    shifts: SchedulingShiftRow[],
    days: SchedulingDayRow[],
    employees: Employee[],
    assignments: SchedulingAssignmentWithDetails[],
    previousMonthHistory: PreviousMonthHistory | null = null
  ) {
    this.monthId = monthId
    this.year = year
    this.month = month

    // Convert config map to typed config
    this.config = {
      minMorningStaff: config.minMorningStaff ?? 1,
      prefMorningStaff: config.prefMorningStaff ?? 2,
      minAfternoonStaff: config.minAfternoonStaff ?? 1,
      prefAfternoonStaff: config.prefAfternoonStaff ?? 2,
      maxMorningStaff: config.maxMorningStaff ?? 3,
      maxAfternoonStaff: config.maxAfternoonStaff ?? 3,
      minNightStaff: config.minNightStaff ?? 1,
      maxNightStaff: config.maxNightStaff ?? 1,
      maxWeeklyShifts: config.maxWeeklyShifts ?? 6,
      prefWeeklyShifts: config.prefWeeklyShifts ?? 5,
      minRestHours: config.minRestHours ?? 48,
      minNightBlock: config.minNightBlock ?? 4,
      maxNightBlock: config.maxNightBlock ?? 6,
      prefNightBlock: config.prefNightBlock ?? 5,
      minMonthlyLibre: config.minMonthlyLibre ?? 8,
      maxMonthlyLibre: config.maxMonthlyLibre ?? 12,
      maxConsecutiveWorkDays: config.maxConsecutiveWorkDays ?? 6,
      annualVacationDays: config.annualVacationDays ?? 22,
      annualHolidays: config.annualHolidays ?? 14,
      annualFreeDays: config.annualFreeDays ?? 95,
    }

    // Convert shifts to typed info
    this.shifts = shifts.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      startTime: s.start_time,
      endTime: s.end_time,
      hours: s.hours,
      color: s.color,
      isWorkShift: s.is_work_shift === 1,
      isPaid: s.is_paid === 1,
      displayOrder: s.display_order,
      isActive: s.is_active === 1,
    }))

    // Convert days to typed info
    this.days = days.map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      date: new Date(d.date),
      dayOfWeek: d.day_of_week,
      weekNumber: d.week_number,
      isHoliday: d.is_holiday === 1,
      holidayName: d.holiday_name || undefined,
    }))

    this.employees = employees
    this.assignments = assignments
    this.previousMonthHistory = previousMonthHistory
  }

  // ============================================
  // MAIN VALIDATE METHOD
  // ============================================

  validate(): ValidationResult {
    // Build context with existing assignments (including previousMonthHistory for cross-month checks)
    const context = this.createContextFromAssignments()

    console.log(
      `[Validator] Validating month ${this.monthId} with ${this.assignments.length} assignments`
    )
    console.log(`[Validator] Employees: ${this.employees.map((e) => e.name).join(', ')}`)

    // Run final validation logic (inline rules: libre count, consecutive work, night block, etc.)
    const finalResult = this.runFinalValidation(context)

    console.log(`[Validator] FinalValidation returned ${finalResult.warnings.length} issues`)

    // Run constraint registry (coverage + employee-rules)
    const registry = new ConstraintRegistry()
    registry.register(new CoverageConstraint())
    registry.register(new EmployeeRulesConstraint())
    const registryResult = registry.checkAll(context)

    console.log(
      `[Validator] CoverageConstraint returned ${registryResult.violations.length} issues`
    )

    // Merge all warnings
    const allWarnings: GenerationWarning[] = [...finalResult.warnings, ...registryResult.violations]

    // Separate errors and warnings
    const errors = allWarnings.filter((w) => w.severity === 'error')
    const warnings = allWarnings.filter((w) => w.severity === 'warning')

    console.log(`[Validator] Total: ${errors.length} errors, ${warnings.length} warnings`)

    // Aggregate soft penalty from both sources
    const softPenalty = finalResult.softPenalty + (registryResult.softPenalty ?? 0)
    const softPenaltyBreakdown: Record<string, number> = { ...finalResult.softPenaltyBreakdown }
    for (const [key, val] of Object.entries(registryResult.softPenaltyBreakdown ?? {})) {
      softPenaltyBreakdown[key] = (softPenaltyBreakdown[key] ?? 0) + val
    }

    // Count by type
    const byType: Record<string, number> = {}
    for (const warning of allWarnings) {
      byType[warning.type] = (byType[warning.type] || 0) + 1
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      softPenalty,
      softPenaltyBreakdown,
      stats: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        byType,
      },
    }
  }

  // ============================================
  // FINAL VALIDATION LOGIC (extracted from FinalValidationPhase)
  // ============================================

  private readonly MIN_WORK_BLOCK = 3

  private runFinalValidation(context: GeneratorContext): {
    warnings: GenerationWarning[]
    softPenalty: number
    softPenaltyBreakdown: Record<string, number>
  } {
    const warnings: GenerationWarning[] = []
    const { matrix, days, employees, config } = context
    let softPenalty = 0
    const softPenaltyBreakdown: Record<string, number> = {}

    const minMonthlyLibre = config.minMonthlyLibre ?? 7
    const maxMonthlyLibre = config.maxMonthlyLibre ?? 10
    const prefMonthlyLibre =
      config.prefMonthlyLibre ?? Math.round((minMonthlyLibre + maxMonthlyLibre) / 2)
    const maxConsecutiveWorkDays = config.maxConsecutiveWorkDays || 6
    const minNightBlock = config.minNightBlock || 4
    const maxNightBlock = config.maxNightBlock || 6
    const prefNightBlock = config.prefNightBlock || minNightBlock
    // Suelo absoluto de noches consecutivas en edición MANUAL. NO leer de config:
    // el solver enforce `minNightBlock` (default 4) como hard, así que la generación
    // automática nunca cae por debajo. Este 3 es la relajación intencional para que el
    // manager pueda editar bloques de 3 noches (warning) sin invalidar el mes.
    // Por debajo de 3 = error duro siempre.
    const MIN_NIGHTS_REQUIRED = 3

    for (const employee of employees) {
      if (employee.rules.fixedDays) continue

      const shiftCounts = getEmployeeShiftCounts(matrix, days, employee.id)
      const totalLibreDays = this.countTotalLibreDays(matrix, days, employee.id)

      // VALIDATION 1: Monthly libre days (8-12)
      if (totalLibreDays < minMonthlyLibre) {
        warnings.push(
          this.createWarning(
            `${employee.name}: Solo ${totalLibreDays} días libres al mes (mín ${minMonthlyLibre})`,
            {
              type: 'rest',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      } else if (totalLibreDays < prefMonthlyLibre) {
        // SOFT: below preference but above minimum
        const delta = prefMonthlyLibre - totalLibreDays
        const penalty = SOFT_WEIGHTS.libre_below_pref * delta
        softPenalty += penalty
        softPenaltyBreakdown.libre_below_pref =
          (softPenaltyBreakdown.libre_below_pref ?? 0) + penalty
      }

      if (totalLibreDays > maxMonthlyLibre) {
        warnings.push(
          this.createWarning(
            `${employee.name}: ${totalLibreDays} días libres al mes (máx ${maxMonthlyLibre})`,
            {
              type: 'rest',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      } else if (totalLibreDays > prefMonthlyLibre) {
        // SOFT: above preference but below maximum
        const delta = totalLibreDays - prefMonthlyLibre
        const penalty = SOFT_WEIGHTS.libre_above_pref * delta
        softPenalty += penalty
        softPenaltyBreakdown.libre_above_pref =
          (softPenaltyBreakdown.libre_above_pref ?? 0) + penalty
      }

      // VALIDATION 2: Max consecutive work days (6)
      const consecutiveViolations = this.findConsecutiveWorkViolations(
        matrix,
        days,
        employee.id,
        maxConsecutiveWorkDays
      )
      for (const violation of consecutiveViolations) {
        warnings.push(
          this.createError(
            `${employee.name}: ${violation.count} días consecutivos trabajados (días ${violation.startDay}-${violation.endDay}, máx ${maxConsecutiveWorkDays})`,
            {
              type: 'rest',
              employeeId: employee.id,
              employeeName: employee.name,
              day: violation.startDay,
            }
          )
        )
      }

      // VALIDATION 3: Min consecutive work days (3) - no isolated 1-2 day work blocks
      const smallWorkBlocks = this.findSmallWorkBlocks(
        matrix,
        days,
        employee.id,
        this.MIN_WORK_BLOCK
      )
      for (const block of smallWorkBlocks) {
        // Cross-month: if block starts on day 1, it may extend a block from the previous month.
        // If the effective size (prev consecutive + current) >= MIN_WORK_BLOCK, skip the violation.
        if (block.startDay === 1 && context.previousMonthHistory) {
          const prevShifts = context.previousMonthHistory.lastShifts.get(employee.id)
          if (prevShifts && prevShifts.length > 0) {
            const sortedPrev = [...prevShifts].sort((a, b) => b.dayNumber - a.dayNumber)
            let prevConsecutive = 0
            for (const entry of sortedPrev) {
              if (isWorkShift(entry.shiftCode)) prevConsecutive++
              else break
            }
            if (block.count + prevConsecutive >= this.MIN_WORK_BLOCK) continue
          }
        }
        // S4 (CONSTRAINTS §3): soft, peso 3 por día faltante. Hard constraints
        // pueden dejar al solver sin alternativa a un bloque corto.
        const delta = this.MIN_WORK_BLOCK - block.count
        const penalty = SOFT_WEIGHTS.min_work_block_short * delta
        softPenalty += penalty
        softPenaltyBreakdown.min_work_block_short =
          (softPenaltyBreakdown.min_work_block_short ?? 0) + penalty
        warnings.push(
          this.createWarning(
            `${employee.name}: bloque de ${block.count} día(s) de trabajo (días ${block.startDay}-${block.endDay}, mín ${this.MIN_WORK_BLOCK} consecutivos)`,
            {
              type: 'rest',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
              day: block.startDay,
            }
          )
        )
      }

      // VALIDATION 4: 2 consecutive rest in rolling 7-day window
      for (let windowStart = 1; windowStart <= days.length - 6; windowStart++) {
        const windowEnd = windowStart + 6
        if (!this.hasConsecutiveRestInWindow(matrix, employee.id, windowStart, windowEnd)) {
          warnings.push(
            this.createWarning(
              `${employee.name}: días ${windowStart}-${windowEnd} sin 2 días libres consecutivos (48h descanso)`,
              {
                type: 'rest',
                severity: 'warning',
                employeeId: employee.id,
                employeeName: employee.name,
              }
            )
          )
          windowStart += 5
        }
      }

      // VALIDATION 4b: Cross-month rest — T on last day of prev month + M on day 1 = only 8h rest
      if (context.previousMonthHistory) {
        const prevShifts = context.previousMonthHistory.lastShifts.get(employee.id)
        if (prevShifts && prevShifts.length > 0) {
          const lastEntry = prevShifts.reduce((a, b) => (a.dayNumber > b.dayNumber ? a : b))
          const day1Shift = matrix[employee.id]?.[1]
          if (lastEntry.shiftCode === 'T' && day1Shift === 'M') {
            warnings.push(
              this.createError(
                `${employee.name}: T(último día mes anterior) → M(día 1) = solo 8h entre turnos`,
                {
                  type: 'rest',
                  day: 1,
                  employeeId: employee.id,
                  employeeName: employee.name,
                }
              )
            )
          }
        }
      }

      // VALIDATION 4c: Cross-month rotation change (M→T or T→M at month boundary) = hard error + soft penalty
      if (context.previousMonthHistory) {
        const lastShiftType = context.previousMonthHistory.lastShiftType.get(employee.id)
        const day1Shift = matrix[employee.id]?.[1]
        if (
          lastShiftType &&
          (day1Shift === 'M' || day1Shift === 'T') &&
          lastShiftType !== day1Shift
        ) {
          warnings.push(
            this.createError(
              `${employee.name}: cambio de rotación ${lastShiftType}→${day1Shift} en límite de mes sin transición`,
              { type: 'constraint', day: 1, employeeId: employee.id, employeeName: employee.name }
            )
          )
          const penalty = SOFT_WEIGHTS.rotation_continuity_break
          softPenalty += penalty
          softPenaltyBreakdown.rotation_continuity_break =
            (softPenaltyBreakdown.rotation_continuity_break ?? 0) + penalty
        }
      }

      // VALIDATION 5: Max shifts per month rules
      if (employee.rules.maxShiftPerMonth) {
        for (const [shiftCode, maxCount] of Object.entries(employee.rules.maxShiftPerMonth)) {
          const actual = shiftCounts[shiftCode] || 0
          if (actual > maxCount) {
            warnings.push(
              this.createWarning(
                `${employee.name}: ${actual} turnos ${shiftCode} (máx ${maxCount})`,
                {
                  type: 'constraint',
                  severity: 'warning',
                  employeeId: employee.id,
                  employeeName: employee.name,
                }
              )
            )
          }
        }
      }

      // VALIDATION 6: Weekly shifts don't exceed max
      const weeks = getWeeksInMonth(days)
      for (const week of weeks) {
        const weekWork = this.countWeekWorkDays(matrix, days, employee.id, week.weekNumber)
        if (weekWork > (config.maxWeeklyShifts || 6)) {
          warnings.push(
            this.createWarning(
              `${employee.name}: ${weekWork} turnos en semana ${week.weekNumber} (máx ${config.maxWeeklyShifts || 6})`,
              {
                type: 'hours',
                severity: 'warning',
                employeeId: employee.id,
                employeeName: employee.name,
              }
            )
          )
        }
      }

      // VALIDATION 7: Night block validation
      const nightCount = shiftCounts['N'] || 0
      if (nightCount > 0) {
        const nightDays = days
          .filter((d) => matrix[employee.id][d.dayNumber] === 'N')
          .map((d) => d.dayNumber)
          .sort((a, b) => a - b)

        const isConsecutive = areConsecutive(nightDays)

        // Cross-month: if employee had incomplete nights from previous month
        // and this month's block starts on day 1, count them together
        const prevIncomplete =
          context.previousMonthHistory?.incompleteNightBlocks.get(employee.id) ?? 0
        const startsOnDay1 = nightDays[0] === 1
        const effectiveNightCount =
          prevIncomplete > 0 && startsOnDay1 ? nightCount + prevIncomplete : nightCount

        if (!isConsecutive) {
          warnings.push(
            this.createError(
              `${employee.name}: noches dispersas (días ${nightDays.join(', ')}) - deben ser consecutivas`,
              { type: 'night_block', employeeId: employee.id, employeeName: employee.name }
            )
          )
        } else if (effectiveNightCount < MIN_NIGHTS_REQUIRED) {
          warnings.push(
            this.createError(
              `${employee.name}: ${effectiveNightCount} noches (mínimo obligatorio ${MIN_NIGHTS_REQUIRED} consecutivas)`,
              { type: 'night_block', employeeId: employee.id, employeeName: employee.name }
            )
          )
        } else if (effectiveNightCount < minNightBlock) {
          warnings.push(
            this.createWarning(
              `${employee.name}: ${effectiveNightCount} noches (mín recomendado ${minNightBlock})`,
              {
                type: 'night_block',
                severity: 'warning',
                employeeId: employee.id,
                employeeName: employee.name,
              }
            )
          )
        }

        if (effectiveNightCount > maxNightBlock) {
          warnings.push(
            this.createError(
              `${employee.name}: ${effectiveNightCount} noches consecutivas (máx ${maxNightBlock})`,
              { type: 'night_block', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }

        // SOFT: within valid range [minBlock, maxBlock] but differs from preference
        if (
          isConsecutive &&
          effectiveNightCount >= minNightBlock &&
          effectiveNightCount <= maxNightBlock &&
          effectiveNightCount !== prefNightBlock
        ) {
          const delta = Math.abs(effectiveNightCount - prefNightBlock)
          const penalty = SOFT_WEIGHTS.pref_night_block_size_off * delta
          softPenalty += penalty
          softPenaltyBreakdown.pref_night_block_size_off =
            (softPenaltyBreakdown.pref_night_block_size_off ?? 0) + penalty
        }
      }
    }

    // ADDITIONAL VALIDATIONS
    for (const employee of employees) {
      if (employee.rules.fixedDays) continue

      const shiftCounts = getEmployeeShiftCounts(matrix, days, employee.id)
      const nightCount = shiftCounts['N'] || 0

      // W5: Sin noches este mes (todos rotan)
      if (nightCount === 0 && !employee.rules.fixedShift && !employee.rules.noWeekends) {
        warnings.push(
          this.createWarning(
            `${employee.name}: 0 noches este mes (todos los rotatorios deben hacer noches)`,
            {
              type: 'night_block',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      }

      // W6: >21 turnos en el mes
      const workDays = this.countWorkDays(matrix, employee.id)
      if (workDays > 21) {
        warnings.push(
          this.createWarning(`${employee.name}: ${workDays} turnos (máx recomendado 21)`, {
            type: 'hours',
            severity: 'warning',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      }

      // W7: <13 turnos sin V ni B
      const vacDays = shiftCounts['V'] || 0
      const bonDays = shiftCounts['B'] || 0
      if (workDays < 13 && vacDays === 0 && bonDays === 0) {
        warnings.push(
          this.createWarning(
            `${employee.name}: ${workDays} turnos sin vacaciones (mín recomendado 13)`,
            {
              type: 'hours',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
            }
          )
        )
      }

      // W10: Sin fin de semana libre
      if (!this.hasWeekendOff(matrix, employee.id, days)) {
        warnings.push(
          this.createWarning(`${employee.name}: no tiene ningún Sáb+Dom libre este mes`, {
            type: 'rest',
            severity: 'warning',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
        // S3 soft penalty: weight 5 per employee without weekend off
        const penalty = SOFT_WEIGHTS.weekend_off_missing
        softPenalty += penalty
        softPenaltyBreakdown.weekend_off_missing =
          (softPenaltyBreakdown.weekend_off_missing ?? 0) + penalty
      }

      // W13: Desequilibrio M/T extremo (sin preferencia)
      if (!employee.rules.shiftPriority) {
        const mCount = shiftCounts['M'] || 0
        const tCount = shiftCounts['T'] || 0
        const total = mCount + tCount
        if (total > 0 && (mCount === 0 || tCount === 0) && total > 5) {
          warnings.push(
            this.createWarning(`${employee.name}: ${mCount}M/${tCount}T - desequilibrio extremo`, {
              type: 'constraint',
              severity: 'warning',
              employeeId: employee.id,
              employeeName: employee.name,
            })
          )
        }
      }
    }

    return { warnings, softPenalty, softPenaltyBreakdown }
  }

  private createWarning(message: string, data: Partial<GenerationWarning>): GenerationWarning {
    return {
      type: 'validation',
      severity: 'warning',
      message,
      ...data,
    }
  }

  private createError(message: string, data: Partial<GenerationWarning>): GenerationWarning {
    return {
      type: 'validation',
      severity: 'error',
      message,
      ...data,
    }
  }

  private countTotalLibreDays(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string
  ): number {
    let total = 0
    for (const day of days) {
      const shift = matrix[employeeId][day.dayNumber]
      if (
        isLibreShift(shift) ||
        shift === 'V' ||
        shift === 'B' ||
        shift === 'IT' ||
        shift === 'E' ||
        shift === 'FO'
      ) {
        total++
      }
    }
    return total
  }

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

    if (consecutiveCount > maxConsecutive) {
      violations.push({
        startDay: consecutiveStart,
        endDay: sortedDays[sortedDays.length - 1].dayNumber,
        count: consecutiveCount,
      })
    }

    return violations
  }

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

    if (blockCount > 0 && blockCount < minWorkBlock) {
      violations.push({
        startDay: blockStart,
        endDay: sortedDays[sortedDays.length - 1].dayNumber,
        count: blockCount,
      })
    }

    return violations
  }

  private hasConsecutiveRestInWindow(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    start: number,
    end: number
  ): boolean {
    const empMatrix = matrix[employeeId]
    if (!empMatrix) return false

    for (let d = start; d < end; d++) {
      const shift1 = empMatrix[d]
      const shift2 = empMatrix[d + 1]

      if (this.isRestShift(shift1) && this.isRestShift(shift2)) {
        return true
      }
    }
    return false
  }

  private isRestShift(shift: string | undefined): boolean {
    if (!shift || shift === '') return false
    return isLibreShift(shift) || ['V', 'B', 'IT', 'E', 'FO'].includes(shift)
  }

  private countWorkDays(
    matrix: Record<string, Record<number, string>>,
    employeeId: string
  ): number {
    let count = 0
    const empMatrix = matrix[employeeId]
    if (!empMatrix) return 0

    for (const shift of Object.values(empMatrix)) {
      if (shift && ['M', 'T', 'N', 'P', 'PI'].includes(shift)) {
        count++
      }
    }
    return count
  }

  private hasWeekendOff(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    days: DayInfo[]
  ): boolean {
    const empMatrix = matrix[employeeId]
    if (!empMatrix) return false

    for (let i = 0; i < days.length - 1; i++) {
      const day1 = days[i]
      const day2 = days[i + 1]

      if (day1.dayOfWeek === 'S' && day2.dayOfWeek === 'D') {
        const shift1 = empMatrix[day1.dayNumber]
        const shift2 = empMatrix[day2.dayNumber]

        if (isLibreShift(shift1) && isLibreShift(shift2)) {
          return true
        }
      }
    }
    return false
  }

  // ============================================
  // BUILD CONTEXT FROM EXISTING ASSIGNMENTS
  // ============================================

  private createContextFromAssignments(): GeneratorContext {
    // Build matrix from existing assignments
    const matrix: ScheduleMatrix = {}

    // Initialize matrix for all employees
    for (const employee of this.employees) {
      matrix[employee.id] = {}
    }

    // Build day ID to day number map
    const dayIdToNumber = new Map<number, number>()
    for (const day of this.days) {
      dayIdToNumber.set(day.id, day.dayNumber)
    }

    // Populate matrix from assignments
    for (const assignment of this.assignments) {
      const dayNumber = dayIdToNumber.get(assignment.day_id)
      if (dayNumber && matrix[assignment.employee_id]) {
        matrix[assignment.employee_id][dayNumber] = assignment.shift_code
      }
    }

    // Debug: log matrix summary for first employee
    if (this.employees.length > 0) {
      const firstEmp = this.employees[0]
      const shifts = Object.entries(matrix[firstEmp.id] || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([day, shift]) => `${day}:${shift}`)
        .join(' ')
      console.log(`[Validator] Matrix for ${firstEmp.name}: ${shifts}`)
    }

    return {
      monthId: this.monthId,
      year: this.year,
      month: this.month,
      config: this.config,
      shifts: this.shifts,
      days: this.days,
      employees: this.employees,
      matrix,
      warnings: [],
      previousMonthHistory: this.previousMonthHistory,
      employeesWithCompletedNightBlock: new Set(),
      daysNeedingPI: [],
    }
  }

  // ============================================
  // ANNUAL LIBRE CHECK (cross-month)
  // ============================================

  async validateAnnualLibre(): Promise<GenerationWarning[]> {
    const MAX_ANNUAL_LIBRE = 90
    const employeeIds = new Set(this.employees.map((e) => e.id))
    if (employeeIds.size === 0) return []

    const counts = await repo.getAnnualLCountByEmployee(this.year)
    const warnings: GenerationWarning[] = []

    for (const row of counts) {
      if (!employeeIds.has(row.employee_id)) continue
      if (row.libre_count > MAX_ANNUAL_LIBRE) {
        warnings.push({
          type: 'constraint',
          severity: 'warning',
          message: `${row.employee_name}: ${row.libre_count} días libre semanal en ${this.year} (convenio: máx. ${MAX_ANNUAL_LIBRE})`,
          employeeId: row.employee_id,
          employeeName: row.employee_name,
        })
      }
    }

    return warnings
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export async function createScheduleValidator(monthId: number): Promise<ScheduleValidator | null> {
  // Load all required data
  const month = await repo.getMonthById(monthId)
  if (!month) return null

  const [config, shifts, days, assignments, allRules, schedulableUsers, prevTailRows] = await Promise.all([
    repo.getConfigMap(),
    repo.getAllShifts(),
    repo.getDaysByMonth(monthId),
    repo.getAssignmentsByMonth(monthId),
    repo.getAllEmployeeRules(),
    repo.getSchedulableEmployees(),
    repo.getPreviousMonthEndAssignments(month.year, month.month, 7),
  ])

  // Build rules map for quick lookup
  const rulesMap = new Map<string, SchedulingEmployeeRuleWithEmployee[]>()
  allRules.forEach((r) => {
    if (!rulesMap.has(r.employee_id)) {
      rulesMap.set(r.employee_id, [])
    }
    rulesMap.get(r.employee_id)!.push(r)
  })

  // Build employee objects from schedulable users
  const employees: Employee[] = schedulableUsers.map((user) => {
    const empRules = rulesMap.get(user.id) || []
    const employee: Employee = {
      id: user.id,
      name: user.username,
      rules: {},
    }

    // Parse rules if any exist
    for (const rule of empRules) {
      switch (rule.rule_type) {
        case 'shift_priority':
          employee.rules.shiftPriority = rule.rule_value
          break
        case 'max_shift_per_month':
          if (!employee.rules.maxShiftPerMonth) {
            employee.rules.maxShiftPerMonth = {}
          }
          const [shiftCode, maxStr] = rule.rule_value.split(':')
          employee.rules.maxShiftPerMonth[shiftCode] = parseInt(maxStr)
          break
        case 'min_shift_per_month':
          if (!employee.rules.minShiftPerMonth) {
            employee.rules.minShiftPerMonth = {}
          }
          const [shiftCode2, minStr] = rule.rule_value.split(':')
          employee.rules.minShiftPerMonth[shiftCode2] = parseInt(minStr)
          break
        case 'fixed_days':
          employee.rules.fixedDays = rule.rule_value.split(',').map(Number)
          break
        case 'fixed_shift':
          employee.rules.fixedShift = rule.rule_value
          break
        case 'no_weekends':
          employee.rules.noWeekends = rule.rule_value === 'true'
          break
      }
    }

    return employee
  })

  return new ScheduleValidator(
    monthId,
    month.year,
    month.month,
    config,
    shifts,
    days,
    employees,
    assignments,
    buildPreviousMonthHistory(prevTailRows)
  )
}

function buildPreviousMonthHistory(
  tailRows: { employeeId: string; dayNumber: number; shiftCode: string }[]
): PreviousMonthHistory {
  const lastShifts = new Map<string, { dayNumber: number; shiftCode: string }[]>()
  const incompleteNightBlocks = new Map<string, number>()
  const lastShiftType = new Map<string, 'M' | 'T'>()
  const endedWithNight = new Map<string, boolean>()

  for (const row of tailRows) {
    if (!lastShifts.has(row.employeeId)) lastShifts.set(row.employeeId, [])
    lastShifts.get(row.employeeId)!.push({ dayNumber: row.dayNumber, shiftCode: row.shiftCode })
  }

  for (const [empId, shifts] of lastShifts) {
    const sorted = [...shifts].sort((a, b) => a.dayNumber - b.dayNumber)

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].shiftCode === 'M' || sorted[i].shiftCode === 'T') {
        lastShiftType.set(empId, sorted[i].shiftCode as 'M' | 'T')
        break
      }
    }

    endedWithNight.set(empId, sorted[sorted.length - 1]?.shiftCode === 'N')

    let nightCount = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].shiftCode === 'N') nightCount++
      else break
    }
    if (nightCount > 0) incompleteNightBlocks.set(empId, nightCount)
  }

  return { lastShifts, incompleteNightBlocks, lastShiftType, endedWithNight }
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Validate a schedule and return the result
 * @param monthId - The month ID to validate
 * @returns ValidationResult or null if month not found
 */
export async function validateSchedule(monthId: number): Promise<ValidationResult | null> {
  const validator = await createScheduleValidator(monthId)
  if (!validator) return null

  const result = validator.validate()

  // Annual libre check — cross-month, always a warning never an error
  const annualWarnings = await validator.validateAnnualLibre()
  if (annualWarnings.length > 0) {
    result.warnings.push(...annualWarnings)
    result.stats.totalWarnings += annualWarnings.length
    for (const w of annualWarnings) {
      result.stats.byType[w.type] = (result.stats.byType[w.type] || 0) + 1
    }
  }

  return result
}
