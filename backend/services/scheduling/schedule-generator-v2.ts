// services/scheduling/schedule-generator-v2.ts
// Modular schedule generator using Phase and Constraint registries

import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import type {
  SchedulingConfigMap,
  SchedulingShiftRow,
  SchedulingDayRow,
  SchedulingConstraintWithDetails,
  SchedulingEmployeeRuleWithEmployee,
  GenerationResult,
  BulkAssignmentDTO,
  EmployeeStats,
  DailyStats,
} from '../../models/scheduling/index.js'

import type {
  Employee,
  DayInfo,
  GeneratorContext,
  SchedulingConfig,
  ShiftInfo,
  PreviousMonthHistory,
} from './types/index.js'

import { createDefaultPhaseRegistry, createAIPhaseRegistry, FinalValidationPhase } from './phases/index.js'
import { createDefaultConstraintRegistry } from './constraints/index.js'
import { countShiftOnDay } from './utils/matrix.js'

// ============================================
// MODULAR SCHEDULE GENERATOR
// ============================================

/**
 * Modular Schedule Generator using Phase and Constraint registries
 *
 * This is a clean orchestrator that delegates all logic to registered phases.
 * The phases are executed in order and can be customized by adding/removing phases.
 */
export class ScheduleGeneratorV2 {
  private monthId: number
  private year: number
  private month: number
  private config: SchedulingConfig
  private shifts: ShiftInfo[]
  private days: DayInfo[]
  private employees: Employee[]
  private constraints: SchedulingConstraintWithDetails[]
  private previousMonthHistory: PreviousMonthHistory | null = null
  // Store last generated context for getAssignments()
  private lastContext: GeneratorContext | null = null

  constructor(
    monthId: number,
    year: number,
    month: number,
    config: SchedulingConfigMap,
    shifts: SchedulingShiftRow[],
    days: SchedulingDayRow[],
    employees: Employee[],
    constraints: SchedulingConstraintWithDetails[]
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
      annualFreeDays: config.annualFreeDays ?? 6,
      aiProvider: config.aiProvider ?? 'none',
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
    this.constraints = constraints
  }

  /**
   * Load and analyze previous month's schedule for continuity
   */
  async loadPreviousMonthHistory(): Promise<void> {
    const prevAssignments = await repo.getPreviousMonthEndAssignments(this.year, this.month, 7)

    if (prevAssignments.length === 0) {
      this.previousMonthHistory = null
      return
    }

    const history: PreviousMonthHistory = {
      lastShifts: new Map(),
      incompleteNightBlocks: new Map(),
      lastShiftType: new Map(),
      endedWithNight: new Map(),
    }

    // Group by employee
    const byEmployee = new Map<string, { dayNumber: number; shiftCode: string }[]>()
    for (const a of prevAssignments) {
      if (!byEmployee.has(a.employeeId)) {
        byEmployee.set(a.employeeId, [])
      }
      byEmployee.get(a.employeeId)!.push({ dayNumber: a.dayNumber, shiftCode: a.shiftCode })
    }

    // Analyze each employee's end-of-month pattern
    for (const [empId, shifts] of byEmployee) {
      // Sort by day descending (most recent first)
      shifts.sort((a, b) => b.dayNumber - a.dayNumber)
      history.lastShifts.set(empId, shifts)

      // Check if ended with night shifts (count consecutive nights at end)
      let consecutiveNights = 0
      for (const s of shifts) {
        if (s.shiftCode === 'N') {
          consecutiveNights++
        } else {
          break // Stop at first non-night
        }
      }

      if (consecutiveNights > 0) {
        history.endedWithNight.set(empId, true)
        // If less than minNightBlock, they need to continue
        const minBlock = this.config.minNightBlock || 4
        if (consecutiveNights < minBlock) {
          history.incompleteNightBlocks.set(empId, consecutiveNights)
        }
      } else {
        history.endedWithNight.set(empId, false)
      }

      // Find last M/T shift for rotation continuity
      for (const s of shifts) {
        if (s.shiftCode === 'M' || s.shiftCode === 'T') {
          history.lastShiftType.set(empId, s.shiftCode as 'M' | 'T')
          break
        }
      }
    }

    this.previousMonthHistory = history
  }

  // ============================================
  // MAIN GENERATE METHOD
  // ============================================

  async generate(): Promise<GenerationResult> {
    const maxAttempts = 50
    let bestContext: GeneratorContext | null = null
    let bestErrorCount = Infinity
    let bestAttempt = 0
    const generationStart = Date.now()

    console.log(`[Schedule] Starting generation (${maxAttempts} max attempts)`)

    // Load previous month history once
    await this.loadPreviousMonthHistory()

    // Create registries (NO AI in default registry - AI runs separately)
    const phaseRegistry = createDefaultPhaseRegistry()
    const constraintRegistry = createDefaultConstraintRegistry()

    // ============================================
    // PHASE 1: Run 50 attempts WITHOUT AI
    // ============================================
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startTime = Date.now()

      // Create fresh context for this attempt
      const context = this.createContext()

      // Execute all phases (NO AI)
      await phaseRegistry.executeAll(context)

      // Run constraint validation
      const constraintResult = constraintRegistry.checkAll(context)

      // Merge warnings from constraints into context
      context.warnings.push(...constraintResult.violations)

      // Count errors
      const errorCount = context.warnings.filter((w) => w.severity === 'error').length
      const endTime = Date.now()

      console.log(`[Schedule] Attempt ${attempt}: ${errorCount} errors (${endTime - startTime}ms)`)

      // Keep track of best result (fewest errors)
      if (errorCount < bestErrorCount) {
        bestErrorCount = errorCount
        bestContext = context
        bestAttempt = attempt
      }

      // If no errors, stop early
      if (errorCount === 0) {
        console.log(`[Schedule] ✅ Perfect schedule on attempt ${attempt}`)
        break
      }
    }

    // ============================================
    // PHASE 2: Run AI optimization ONCE on best result
    // ============================================
    const aiEnabled = process.env.AI_ENABLED === 'true'
    const aiProvider = this.config.aiProvider
    
    console.log(`[Schedule] AI config: provider="${aiProvider}", env_enabled=${aiEnabled}`)
    
    if (!aiEnabled) {
      console.log(`[Schedule] ⚠️ AI disabled via .env (AI_ENABLED=false)`)
    } else if (aiProvider === 'none') {
      console.log(`[Schedule] ⚠️ AI disabled via DB (ai_provider=none)`)
    }
    
    if (bestContext && aiEnabled && aiProvider !== 'none') {
      console.log(`[Schedule] 🤖 Running AI optimization on best result (${bestErrorCount} errors)...`)
      
      const aiRegistry = createAIPhaseRegistry()
      const aiStartTime = Date.now()
      
      // Run AI phase on the best context
      await aiRegistry.executeAll(bestContext)
      
      const aiEndTime = Date.now()
      console.log(`[Schedule] 🤖 AI optimization completed in ${aiEndTime - aiStartTime}ms`)
      
      // Re-run final validation after AI changes
      console.log(`[Schedule] Re-validating after AI changes...`)
      const finalValidation = new FinalValidationPhase()
      
      // Clear previous warnings before re-validation (keep only non-error warnings from AI)
      const aiWarnings = bestContext.warnings.filter(w => w.message.includes('[AI]'))
      bestContext.warnings = aiWarnings
      
      // Run final validation
      await finalValidation.execute(bestContext)
      
      // Re-run constraint validation
      const constraintResult = constraintRegistry.checkAll(bestContext)
      bestContext.warnings.push(...constraintResult.violations)
      
      // Update error count after AI
      const newErrorCount = bestContext.warnings.filter((w) => w.severity === 'error').length
      const improvement = bestErrorCount - newErrorCount
      const emoji = improvement > 0 ? '✅' : improvement < 0 ? '❌' : '✖'
      console.log(`[Schedule] After AI: ${newErrorCount} errors (was ${bestErrorCount}) ${emoji} ${improvement > 0 ? `+${improvement} fixed` : improvement < 0 ? `${improvement} worse` : 'no change'}`)
      
      bestErrorCount = newErrorCount
    }

    // ============================================
    // PHASE 3: Return final result
    // ============================================
    const totalTime = Date.now() - generationStart

    if (bestContext) {
      this.lastContext = bestContext
      const assignments = this.matrixToAssignments(bestContext)
      const stats = this.calculateStats(bestContext)
      const success = bestErrorCount === 0

      if (success) {
        console.log(`[Schedule] ✅ Success (${totalTime}ms total)`)
      } else {
        console.log(`[Schedule] ❌ Completed with ${bestErrorCount} errors (${totalTime}ms total)`)
      }

      return {
        success,
        monthId: this.monthId,
        assignmentsCount: assignments.length,
        generationTimeMs: totalTime,
        warnings: bestContext.warnings,
        stats,
        attempt: bestAttempt,
      }
    }

    // Fallback (shouldn't happen)
    console.log(`[Schedule] ❌ No valid context generated`)
    return {
      success: false,
      monthId: this.monthId,
      assignmentsCount: 0,
      generationTimeMs: totalTime,
      warnings: [],
      stats: { byEmployee: [], byDay: [] },
    }
  }

  // ============================================
  // CONTEXT CREATION
  // ============================================

  private createContext(): GeneratorContext {
    return {
      monthId: this.monthId,
      year: this.year,
      month: this.month,
      config: this.config,
      shifts: this.shifts,
      days: this.days,
      employees: this.employees,
      matrix: {}, // Will be initialized by InitializeMatrixPhase
      warnings: [],
      previousMonthHistory: this.previousMonthHistory,
      employeesWithCompletedNightBlock: new Set(),
      daysNeedingPI: [],
      // Extended context for phases that need constraint data
      constraints: this.constraints,
    } as GeneratorContext & { constraints: SchedulingConstraintWithDetails[] }
  }

  // ============================================
  // CONVERT MATRIX TO ASSIGNMENTS
  // ============================================

  private matrixToAssignments(context: GeneratorContext): BulkAssignmentDTO[] {
    const assignments: BulkAssignmentDTO[] = []

    // Valid shift codes from database
    const validShiftCodes = new Set(this.shifts.map((s) => s.code))

    for (const employeeId of Object.keys(context.matrix)) {
      for (const day of this.days) {
        let shift = context.matrix[employeeId][day.dayNumber]
        if (shift && !shift.startsWith('REQUEST') && !shift.startsWith('AVOID') && !shift.startsWith('PREFER')) {
          // Normalize shift codes: L1, L2, L3, etc. -> L
          if (shift.startsWith('L') && shift.length > 1 && /^L\d+$/.test(shift)) {
            shift = 'L'
          }

          // Only add if valid shift code
          if (validShiftCodes.has(shift)) {
            assignments.push({
              day_id: day.id,
              employee_id: employeeId,
              shift_code: shift,
            })
          } else {
            // Log warning for unknown shift codes
            context.warnings.push({
              type: 'constraint',
              severity: 'warning',
              message: `Código de turno desconocido: ${shift} (día ${day.dayNumber})`,
              employeeId,
            })
          }
        }
      }
    }

    return assignments
  }

  // ============================================
  // CALCULATE STATS
  // ============================================

  private calculateStats(context: GeneratorContext): { byEmployee: EmployeeStats[]; byDay: DailyStats[] } {
    const byEmployee: EmployeeStats[] = []

    for (const employee of this.employees) {
      const stats: EmployeeStats = {
        L: 0,
        V: 0,
        B: 0,
        E: 0,
        IT: 0,
        M: 0,
        T: 0,
        N: 0,
        PI: 0,
        P: 0,
        FO: 0,
        A: 0,
        presencias: 0,
        horas: 0,
      }

      for (const day of this.days) {
        const shift = context.matrix[employee.id]?.[day.dayNumber]
        if (!shift) continue

        if (shift.startsWith('L')) stats.L++
        else if (shift === 'V') stats.V++
        else if (shift === 'B') stats.B++
        else if (shift === 'E') stats.E++
        else if (shift === 'IT') stats.IT++
        else if (shift === 'M') stats.M++
        else if (shift === 'T') stats.T++
        else if (shift === 'N') stats.N++
        else if (shift === 'PI') stats.PI++
        else if (shift === 'P') stats.P++
        else if (shift === 'FO') stats.FO++
        else if (shift === 'A') stats.A++
      }

      stats.presencias = stats.M + stats.T + stats.N + stats.PI + stats.P
      stats.horas = stats.presencias * 8

      byEmployee.push(stats)
    }

    const byDay: DailyStats[] = this.days.map((day) => ({
      day: day.dayNumber,
      M: countShiftOnDay(context.matrix, day.dayNumber, 'M'),
      T: countShiftOnDay(context.matrix, day.dayNumber, 'T'),
      N: countShiftOnDay(context.matrix, day.dayNumber, 'N'),
      PI: countShiftOnDay(context.matrix, day.dayNumber, 'PI'),
      P: countShiftOnDay(context.matrix, day.dayNumber, 'P'),
    }))

    return { byEmployee, byDay }
  }

  // ============================================
  // GET ASSIGNMENTS (to save to DB)
  // ============================================

  getAssignments(): BulkAssignmentDTO[] {
    if (!this.lastContext) {
      console.warn('[ScheduleGeneratorV2] getAssignments() called without generate() - returning empty')
      return []
    }
    return this.matrixToAssignments(this.lastContext)
  }

  /**
   * Get metadata about the generator context
   */
  getMetadata(): { year: number; month: number; totalDays: number; shiftCodes: string[] } {
    return {
      year: this.year,
      month: this.month,
      totalDays: this.days.length,
      shiftCodes: this.shifts.map((s) => s.code),
    }
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export async function createScheduleGeneratorV2(monthId: number): Promise<ScheduleGeneratorV2 | null> {
  // Load all required data
  const month = await repo.getMonthById(monthId)
  if (!month) return null

  const [config, shifts, days, constraints, allRules, schedulableUsers] = await Promise.all([
    repo.getConfigMap(),
    repo.getAllShifts(),
    repo.getDaysByMonth(monthId),
    repo.getConstraintsByMonth(monthId, { status: 'approved' }),
    repo.getAllEmployeeRules(),
    repo.getSchedulableEmployees(),
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

  return new ScheduleGeneratorV2(monthId, month.year, month.month, config, shifts, days, employees, constraints)
}
