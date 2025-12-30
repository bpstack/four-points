// tests/scheduling/validation-helpers.ts
// Shared validation helpers for objective scheduling tests
// These validate actual business rules, not just code execution

import type { ScheduleMatrix, DayInfo, Employee, GeneratorContext } from '../../services/scheduling/types/index.js'

// Re-export from utils if available, or define inline
export function isWorkShift(shift: string | undefined): boolean {
  if (!shift) return false
  const workShifts = ['M', 'T', 'N', 'PI']
  // Handle REQUEST_X markers as potential work
  if (shift.startsWith('REQUEST_') && shift !== 'REQUEST_OFF') {
    return true
  }
  return workShifts.includes(shift)
}

export function isLibreShift(shift: string | undefined): boolean {
  if (!shift) return false
  return shift === 'L1' || shift === 'L2' || shift.startsWith('L')
}

export function isRestShift(shift: string | undefined): boolean {
  if (!shift) return false
  return isLibreShift(shift) || ['V', 'B', 'IT', 'E', 'FO'].includes(shift)
}

// ============================================
// VALIDATION RESULT INTERFACE
// ============================================

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

// ============================================
// BUSINESS RULE VALIDATORS
// ============================================

/**
 * RULE: Night shifts must be consecutive (no scattered nights)
 * Business requirement: Night blocks must be 3-6 consecutive nights
 */
export function validateNightBlocksAreConsecutive(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string
): ValidationResult {
  const errors: string[] = []
  
  if (!matrix[employeeId]) {
    return { valid: true, errors: [] }
  }

  const nightDays = days
    .filter(d => matrix[employeeId][d.dayNumber] === 'N')
    .map(d => d.dayNumber)
    .sort((a, b) => a - b)

  if (nightDays.length === 0) {
    return { valid: true, errors: [] }
  }

  // Check if all nights are consecutive
  for (let i = 1; i < nightDays.length; i++) {
    if (nightDays[i] !== nightDays[i - 1] + 1) {
      errors.push(`Employee ${employeeId}: Night shifts are not consecutive. Days: ${nightDays.join(', ')}`)
      break
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * RULE: Night blocks must have minimum 3 nights
 * Business requirement: No isolated 1-2 night assignments
 */
export function validateMinimumNightBlock(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  minBlock: number = 3
): ValidationResult {
  const errors: string[] = []
  
  if (!matrix[employeeId]) {
    return { valid: true, errors: [] }
  }

  const nightDays = days
    .filter(d => matrix[employeeId][d.dayNumber] === 'N')
    .map(d => d.dayNumber)

  if (nightDays.length > 0 && nightDays.length < minBlock) {
    errors.push(`Employee ${employeeId}: Only ${nightDays.length} night shifts (minimum ${minBlock} required)`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * RULE: No small work blocks (1-2 day blocks are forbidden)
 * Business requirement: Minimum 3 consecutive work days
 */
export function validateNoSmallWorkBlocks(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  minBlock: number = 3
): ValidationResult {
  const errors: string[] = []
  
  if (!matrix[employeeId]) {
    return { valid: true, errors: [] }
  }

  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
  
  let blockStart = -1
  let blockSize = 0

  for (let i = 0; i < sortedDays.length; i++) {
    const shift = matrix[employeeId][sortedDays[i].dayNumber]
    const isWork = isWorkShift(shift)

    if (isWork) {
      if (blockSize === 0) blockStart = sortedDays[i].dayNumber
      blockSize++
    } else {
      if (blockSize > 0 && blockSize < minBlock) {
        errors.push(
          `Employee ${employeeId}: Work block of ${blockSize} days (days ${blockStart}-${sortedDays[i - 1].dayNumber}), minimum is ${minBlock}`
        )
      }
      blockSize = 0
    }
  }

  // Check final block
  if (blockSize > 0 && blockSize < minBlock) {
    errors.push(`Employee ${employeeId}: Work block of ${blockSize} days at end of month, minimum is ${minBlock}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * RULE: Maximum 6 consecutive work days
 * Business requirement: Legal maximum work streak
 */
export function validateMaxConsecutiveWork(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  maxConsecutive: number = 6
): ValidationResult {
  const errors: string[] = []
  
  if (!matrix[employeeId]) {
    return { valid: true, errors: [] }
  }

  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
  
  let consecutiveWork = 0
  let streakStart = -1

  for (const day of sortedDays) {
    const shift = matrix[employeeId][day.dayNumber]
    if (isWorkShift(shift)) {
      if (consecutiveWork === 0) streakStart = day.dayNumber
      consecutiveWork++
      if (consecutiveWork > maxConsecutive) {
        errors.push(
          `Employee ${employeeId}: ${consecutiveWork} consecutive work days starting day ${streakStart} (max ${maxConsecutive})`
        )
      }
    } else {
      consecutiveWork = 0
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * RULE: 2 consecutive libre days per week (48h weekly rest)
 * Business requirement: Legal minimum weekly rest
 */
export function validateConsecutiveLibrePerWeek(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string
): ValidationResult {
  const errors: string[] = []
  
  if (!matrix[employeeId]) {
    return { valid: true, errors: [] }
  }

  // Group days by week
  const weeks = new Map<number, DayInfo[]>()
  for (const day of days) {
    if (!weeks.has(day.weekNumber)) weeks.set(day.weekNumber, [])
    weeks.get(day.weekNumber)!.push(day)
  }

  for (const [weekNum, weekDays] of weeks) {
    // Skip incomplete weeks (first/last week of month)
    if (weekDays.length < 7) continue

    const sortedWeek = weekDays.sort((a, b) => a.dayNumber - b.dayNumber)
    let maxConsecutiveLibre = 0
    let currentConsecutive = 0

    for (let i = 0; i < sortedWeek.length; i++) {
      const shift = matrix[employeeId][sortedWeek[i].dayNumber]
      const isRest = isRestShift(shift)

      if (isRest) {
        if (i > 0 && sortedWeek[i].dayNumber === sortedWeek[i - 1].dayNumber + 1) {
          currentConsecutive++
        } else {
          currentConsecutive = 1
        }
        maxConsecutiveLibre = Math.max(maxConsecutiveLibre, currentConsecutive)
      } else {
        currentConsecutive = 0
      }
    }

    if (maxConsecutiveLibre < 2) {
      errors.push(
        `Employee ${employeeId}: Week ${weekNum} has only ${maxConsecutiveLibre} consecutive rest day(s), needs 2 for 48h rest`
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * RULE: 48h rest after night block
 * Business requirement: Rest day after nights + no M shift on return day
 */
export function validate48hRestAfterNights(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string
): ValidationResult {
  const errors: string[] = []
  
  if (!matrix[employeeId]) {
    return { valid: true, errors: [] }
  }

  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)

  // Find night blocks
  const nightDays = sortedDays.filter(d => matrix[employeeId][d.dayNumber] === 'N')
  if (nightDays.length === 0) return { valid: true, errors: [] }

  // Find end of each night block
  for (let i = 0; i < nightDays.length; i++) {
    const isEndOfBlock = i === nightDays.length - 1 || nightDays[i + 1].dayNumber !== nightDays[i].dayNumber + 1

    if (isEndOfBlock) {
      const lastNightDay = nightDays[i].dayNumber
      const restDay = lastNightDay + 1
      const returnDay = lastNightDay + 2

      // Check rest day (must NOT be work)
      const restDayInfo = sortedDays.find(d => d.dayNumber === restDay)
      if (restDayInfo) {
        const restShift = matrix[employeeId][restDay]
        if (isWorkShift(restShift)) {
          errors.push(
            `Employee ${employeeId}: Day ${restDay} should be rest after night block ending day ${lastNightDay}, but has ${restShift}`
          )
        }
      }

      // Check return day - should not be M (only 24h rest if M)
      const returnDayInfo = sortedDays.find(d => d.dayNumber === returnDay)
      if (returnDayInfo) {
        const returnShift = matrix[employeeId][returnDay]
        if (returnShift === 'M') {
          errors.push(
            `Employee ${employeeId}: Day ${returnDay} has M shift after night block, violates 48h rest (need T or rest)`
          )
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * RULE: Monthly libre days should be 8-12
 * Business requirement: Adequate monthly rest
 */
export function validateMonthlyLibreDays(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  min: number = 8,
  max: number = 12
): ValidationResult {
  const errors: string[] = []
  
  if (!matrix[employeeId]) {
    return { valid: true, errors: [] }
  }

  let libreDays = 0
  for (const day of days) {
    const shift = matrix[employeeId][day.dayNumber]
    if (isRestShift(shift)) {
      libreDays++
    }
  }

  if (libreDays < min) {
    errors.push(`Employee ${employeeId}: Only ${libreDays} libre/rest days in month (minimum ${min})`)
  }
  if (libreDays > max) {
    errors.push(`Employee ${employeeId}: ${libreDays} libre/rest days in month (maximum ${max})`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * RULE: Minimum daily coverage
 * Business requirement: min 2 morning, 2 afternoon, 1 night per non-holiday
 */
export function validateDailyCoverage(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employees: Employee[],
  minMorning: number = 2,
  minAfternoon: number = 2,
  minNight: number = 1
): ValidationResult {
  const errors: string[] = []

  for (const day of days) {
    if (day.isHoliday) continue

    let morningCount = 0
    let afternoonCount = 0
    let nightCount = 0

    for (const emp of employees) {
      if (!matrix[emp.id]) continue
      const shift = matrix[emp.id][day.dayNumber]
      if (shift === 'M') morningCount++
      if (shift === 'T') afternoonCount++
      if (shift === 'N') nightCount++
    }

    if (morningCount < minMorning) {
      errors.push(`Day ${day.dayNumber}: Morning coverage ${morningCount} < ${minMorning} minimum`)
    }
    if (afternoonCount < minAfternoon) {
      errors.push(`Day ${day.dayNumber}: Afternoon coverage ${afternoonCount} < ${minAfternoon} minimum`)
    }
    if (nightCount < minNight) {
      errors.push(`Day ${day.dayNumber}: Night coverage ${nightCount} < ${minNight} minimum`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ============================================
// COMPREHENSIVE VALIDATOR (runs all rules)
// ============================================

export interface ComprehensiveValidationOptions {
  minNightBlock?: number
  maxConsecutiveWork?: number
  minMonthlyLibre?: number
  maxMonthlyLibre?: number
  minMorning?: number
  minAfternoon?: number
  minNight?: number
  skipFixedEmployees?: boolean
}

export interface ComprehensiveValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    totalViolations: number
    byRule: Record<string, number>
    byEmployee: Record<string, number>
  }
}

/**
 * Run all business rule validations on a schedule
 */
export function validateScheduleComprehensive(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employees: Employee[],
  options: ComprehensiveValidationOptions = {}
): ComprehensiveValidationResult {
  const {
    minNightBlock = 3,
    maxConsecutiveWork = 6,
    minMonthlyLibre = 8,
    maxMonthlyLibre = 12,
    minMorning = 2,
    minAfternoon = 2,
    minNight = 1,
    skipFixedEmployees = true,
  } = options

  const allErrors: string[] = []
  const allWarnings: string[] = []
  const byRule: Record<string, number> = {
    nightsConsecutive: 0,
    nightBlockMinimum: 0,
    smallWorkBlocks: 0,
    maxConsecutive: 0,
    weeklyRest: 0,
    postNightRest: 0,
    monthlyLibre: 0,
    coverage: 0,
  }
  const byEmployee: Record<string, number> = {}

  for (const emp of employees) {
    // Skip fixed employees if configured
    if (skipFixedEmployees && (emp.rules?.fixedDays || emp.rules?.fixedShift)) {
      continue
    }

    byEmployee[emp.id] = 0

    // Night blocks consecutive
    const nightsResult = validateNightBlocksAreConsecutive(matrix, days, emp.id)
    if (!nightsResult.valid) {
      allErrors.push(...nightsResult.errors)
      byRule.nightsConsecutive += nightsResult.errors.length
      byEmployee[emp.id] += nightsResult.errors.length
    }

    // Night block minimum
    const nightMinResult = validateMinimumNightBlock(matrix, days, emp.id, minNightBlock)
    if (!nightMinResult.valid) {
      allErrors.push(...nightMinResult.errors)
      byRule.nightBlockMinimum += nightMinResult.errors.length
      byEmployee[emp.id] += nightMinResult.errors.length
    }

    // Small work blocks
    const smallBlockResult = validateNoSmallWorkBlocks(matrix, days, emp.id, 3)
    if (!smallBlockResult.valid) {
      allErrors.push(...smallBlockResult.errors)
      byRule.smallWorkBlocks += smallBlockResult.errors.length
      byEmployee[emp.id] += smallBlockResult.errors.length
    }

    // Max consecutive work
    const maxConsResult = validateMaxConsecutiveWork(matrix, days, emp.id, maxConsecutiveWork)
    if (!maxConsResult.valid) {
      allErrors.push(...maxConsResult.errors)
      byRule.maxConsecutive += maxConsResult.errors.length
      byEmployee[emp.id] += maxConsResult.errors.length
    }

    // Weekly rest (2 consecutive libre)
    const weeklyRestResult = validateConsecutiveLibrePerWeek(matrix, days, emp.id)
    if (!weeklyRestResult.valid) {
      allWarnings.push(...weeklyRestResult.errors) // Weekly rest is warning level
      byRule.weeklyRest += weeklyRestResult.errors.length
      byEmployee[emp.id] += weeklyRestResult.errors.length
    }

    // 48h rest after nights
    const postNightResult = validate48hRestAfterNights(matrix, days, emp.id)
    if (!postNightResult.valid) {
      allErrors.push(...postNightResult.errors)
      byRule.postNightRest += postNightResult.errors.length
      byEmployee[emp.id] += postNightResult.errors.length
    }

    // Monthly libre days
    const monthlyResult = validateMonthlyLibreDays(matrix, days, emp.id, minMonthlyLibre, maxMonthlyLibre)
    if (!monthlyResult.valid) {
      allWarnings.push(...monthlyResult.errors) // Monthly libre is warning level
      byRule.monthlyLibre += monthlyResult.errors.length
      byEmployee[emp.id] += monthlyResult.errors.length
    }
  }

  // Coverage validation (applies to whole schedule)
  const coverageResult = validateDailyCoverage(matrix, days, employees, minMorning, minAfternoon, minNight)
  if (!coverageResult.valid) {
    allWarnings.push(...coverageResult.errors) // Coverage is warning level
    byRule.coverage += coverageResult.errors.length
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      totalViolations: allErrors.length + allWarnings.length,
      byRule,
      byEmployee,
    },
  }
}

// ============================================
// TEST HELPERS
// ============================================

export function createMockDays(count: number = 31, startDayOfWeek: number = 1): DayInfo[] {
  const days: DayInfo[] = []
  const dayOfWeekMap: Array<'D' | 'L' | 'M' | 'X' | 'J' | 'V' | 'S'> = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  for (let i = 1; i <= count; i++) {
    const dayOfWeekIndex = (startDayOfWeek + i - 2) % 7
    const weekNumber = Math.ceil(i / 7)
    days.push({
      id: i,
      dayNumber: i,
      date: new Date(2025, 0, i),
      dayOfWeek: dayOfWeekMap[dayOfWeekIndex],
      weekNumber,
      isHoliday: false,
    })
  }
  return days
}

export function createMockEmployee(id: string, name: string, rules: Employee['rules'] = {}): Employee {
  return { id, name, rules }
}

export function createMockContext(
  matrix: ScheduleMatrix = {},
  employees: Employee[] = [],
  days: DayInfo[] = [],
  config: Partial<GeneratorContext['config']> = {}
): GeneratorContext {
  return {
    monthId: 1,
    year: 2025,
    month: 1,
    config: {
      minMorningStaff: 2,
      prefMorningStaff: 3,
      minAfternoonStaff: 2,
      prefAfternoonStaff: 3,
      maxMorningStaff: 4,
      maxAfternoonStaff: 4,
      minNightStaff: 1,
      maxNightStaff: 2,
      maxWeeklyShifts: 5,
      prefWeeklyShifts: 5,
      minRestHours: 48,
      minNightBlock: 4,
      maxNightBlock: 6,
      prefNightBlock: 5,
      minMonthlyLibre: 8,
      maxMonthlyLibre: 10,
      maxConsecutiveWorkDays: 6,
      annualVacationDays: 22,
      annualHolidays: 14,
      annualFreeDays: 6,
      aiProvider: 'none',
      ...config,
    },
    shifts: [],
    days,
    employees,
    matrix,
    warnings: [],
    previousMonthHistory: null,
    employeesWithCompletedNightBlock: new Set(),
    daysNeedingPI: [],
  }
}

/**
 * Initialize matrix for all employees with empty shifts
 */
export function initializeMatrix(context: GeneratorContext): void {
  for (const emp of context.employees) {
    context.matrix[emp.id] = {}
    for (const day of context.days) {
      context.matrix[emp.id][day.dayNumber] = ''
    }
  }
}
