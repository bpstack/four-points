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
} from './types/index.js'

import { FinalValidationPhase } from './phases/final-validation.phase.js'
import { CoverageConstraint } from './constraints/coverage.constraint.js'

// ============================================
// VALIDATION RESULT
// ============================================

export interface ValidationResult {
  isValid: boolean
  errors: GenerationWarning[]
  warnings: GenerationWarning[]
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

  constructor(
    monthId: number,
    year: number,
    month: number,
    config: SchedulingConfigMap,
    shifts: SchedulingShiftRow[],
    days: SchedulingDayRow[],
    employees: Employee[],
    assignments: SchedulingAssignmentWithDetails[]
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
    this.assignments = assignments
  }

  // ============================================
  // MAIN VALIDATE METHOD
  // ============================================

  validate(): ValidationResult {
    // Build context with existing assignments
    const context = this.createContextFromAssignments()

    console.log(`[Validator] Validating month ${this.monthId} with ${this.assignments.length} assignments`)
    console.log(`[Validator] Employees: ${this.employees.map(e => e.name).join(', ')}`)

    // Run validation phases
    const finalValidation = new FinalValidationPhase()
    const validationResult = finalValidation.execute(context)

    console.log(`[Validator] FinalValidation returned ${validationResult.warnings.length} issues`)

    // Run coverage constraint
    const coverageConstraint = new CoverageConstraint()
    const coverageResult = coverageConstraint.check(context)

    console.log(`[Validator] CoverageConstraint returned ${coverageResult.violations.length} issues`)

    // Merge all warnings
    const allWarnings: GenerationWarning[] = [
      ...validationResult.warnings,
      ...coverageResult.violations,
    ]

    // Separate errors and warnings
    const errors = allWarnings.filter((w) => w.severity === 'error')
    const warnings = allWarnings.filter((w) => w.severity === 'warning')

    console.log(`[Validator] Total: ${errors.length} errors, ${warnings.length} warnings`)

    // Count by type
    const byType: Record<string, number> = {}
    for (const warning of allWarnings) {
      byType[warning.type] = (byType[warning.type] || 0) + 1
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        byType,
      },
    }
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
      previousMonthHistory: null,
      employeesWithCompletedNightBlock: new Set(),
      daysNeedingPI: [],
    }
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export async function createScheduleValidator(monthId: number): Promise<ScheduleValidator | null> {
  // Load all required data
  const month = await repo.getMonthById(monthId)
  if (!month) return null

  const [config, shifts, days, assignments, allRules, schedulableUsers] = await Promise.all([
    repo.getConfigMap(),
    repo.getAllShifts(),
    repo.getDaysByMonth(monthId),
    repo.getAssignmentsByMonth(monthId),
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

  return new ScheduleValidator(
    monthId,
    month.year,
    month.month,
    config,
    shifts,
    days,
    employees,
    assignments
  )
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
  return validator.validate()
}
