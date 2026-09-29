// services/scheduling/utils/matrix.ts
// Schedule matrix operations

import type { ScheduleMatrix, DayInfo, Employee } from '../types/index.js'

// ============================================
// SHIFT CLASSIFICATION
// ============================================

/** Work shifts that count toward coverage */
const WORK_SHIFTS = new Set(['M', 'T', 'N', 'P', 'PI'])

/** Absence shifts (not available for work) */
const ABSENCE_SHIFTS = new Set(['V', 'B', 'IT', 'E', 'FO', 'A'])

/** Libre (day off) - starts with L */
export function isLibreShift(shift: string | undefined): boolean {
  if (!shift) return false
  return shift.startsWith('L') || shift === 'L'
}

/** Check if shift is a work shift */
export function isWorkShift(shift: string | undefined): boolean {
  if (!shift) return false
  return WORK_SHIFTS.has(shift)
}

/** Check if shift is an absence */
export function isAbsenceShift(shift: string | undefined): boolean {
  if (!shift) return false
  return ABSENCE_SHIFTS.has(shift)
}

/** Check if shift is protected (cannot be changed) */
export function isProtectedShift(shift: string | undefined): boolean {
  if (!shift) return false
  return ABSENCE_SHIFTS.has(shift) || shift === 'N'
}

/** Check if cell is empty or has a soft marker */
export function isEmptyOrSoftMarker(shift: string | undefined): boolean {
  if (!shift || shift === '') return true
  return shift.startsWith('REQUEST') || shift.startsWith('AVOID') || shift.startsWith('PREFER')
}

// ============================================
// MATRIX INITIALIZATION
// ============================================

/**
 * Create empty schedule matrix
 */
export function createEmptyMatrix(employees: Employee[], days: DayInfo[]): ScheduleMatrix {
  const matrix: ScheduleMatrix = {}
  for (const employee of employees) {
    matrix[employee.id] = {}
    for (const day of days) {
      matrix[employee.id][day.dayNumber] = ''
    }
  }
  return matrix
}

/**
 * Clone a matrix (deep copy)
 */
export function cloneMatrix(matrix: ScheduleMatrix): ScheduleMatrix {
  const clone: ScheduleMatrix = {}
  for (const employeeId of Object.keys(matrix)) {
    clone[employeeId] = { ...matrix[employeeId] }
  }
  return clone
}

// ============================================
// COUNTING OPERATIONS
// ============================================

/**
 * Count how many employees have a specific shift on a day
 */
export function countShiftOnDay(
  matrix: ScheduleMatrix,
  dayNumber: number,
  shiftCode: string
): number {
  let count = 0
  for (const employeeId of Object.keys(matrix)) {
    if (matrix[employeeId][dayNumber] === shiftCode) {
      count++
    }
  }
  return count
}

/**
 * Count work days for an employee in a specific week
 */
export function countWeekWorkDays(
  matrix: ScheduleMatrix,
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
 * Count total shifts of a type for an employee
 */
export function countShiftForEmployee(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  shiftCode: string
): number {
  let count = 0
  for (const day of days) {
    if (matrix[employeeId][day.dayNumber] === shiftCode) {
      count++
    }
  }
  return count
}

/**
 * Count libre days for an employee
 */
export function countLibreDays(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string
): number {
  let count = 0
  for (const day of days) {
    const shift = matrix[employeeId][day.dayNumber]
    if (isLibreShift(shift)) {
      count++
    }
  }
  return count
}

/**
 * Get all day numbers where employee has a specific shift
 */
export function getDaysWithShift(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  shiftCode: string
): number[] {
  return days
    .filter((d) => matrix[employeeId][d.dayNumber] === shiftCode)
    .map((d) => d.dayNumber)
    .sort((a, b) => a - b)
}

// ============================================
// AVAILABILITY CHECKS
// ============================================

/**
 * Check if employee is available on a day (not already assigned a fixed shift)
 */
export function isEmployeeAvailable(
  matrix: ScheduleMatrix,
  employeeId: string,
  dayNumber: number
): boolean {
  const current = matrix[employeeId][dayNumber]
  return isEmptyOrSoftMarker(current)
}

/**
 * Check if employee has REQUEST_OFF on a day
 */
export function hasRequestOff(
  matrix: ScheduleMatrix,
  employeeId: string,
  dayNumber: number
): boolean {
  return matrix[employeeId][dayNumber] === 'REQUEST_OFF'
}

/**
 * Get employees available for a shift on a day
 */
export function getAvailableEmployees(
  matrix: ScheduleMatrix,
  employees: Employee[],
  dayNumber: number,
  excludeShifts: string[] = []
): Employee[] {
  return employees.filter((emp) => {
    const current = matrix[emp.id][dayNumber]
    if (!isEmptyOrSoftMarker(current) && !excludeShifts.includes(current)) {
      return false
    }
    return true
  })
}

// ============================================
// CONSECUTIVE DAYS ANALYSIS
// ============================================

/**
 * Count consecutive work days around a specific day
 */
export function countConsecutiveWorkDays(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  aroundDay: number
): { before: number; after: number; total: number } {
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
  const maxDay = sortedDays[sortedDays.length - 1]?.dayNumber || 31

  let before = 0
  let after = 0

  // Count backwards
  for (let d = aroundDay - 1; d >= 1; d--) {
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
  for (let d = aroundDay + 1; d <= maxDay; d++) {
    const dayInfo = sortedDays.find((x) => x.dayNumber === d)
    if (!dayInfo) break
    const shift = matrix[employeeId][d]
    if (isWorkShift(shift)) {
      after++
    } else {
      break
    }
  }

  return { before, after, total: before + 1 + after }
}

/**
 * Check if assigning work to a day would exceed max consecutive work days
 */
export function wouldExceedConsecutiveWork(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  dayNumber: number,
  maxConsecutive: number
): boolean {
  const { total } = countConsecutiveWorkDays(matrix, days, employeeId, dayNumber)
  return total > maxConsecutive
}

/**
 * Find consecutive libre days in a week for an employee
 */
export function hasConsecutiveLibreDays(
  matrix: ScheduleMatrix,
  weekDays: DayInfo[],
  employeeId: string,
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

// ============================================
// WEEK ANALYSIS
// ============================================

/**
 * Get the primary work shift type (M or T) for employee in a week
 */
export function getEmployeeWeekShift(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  weekNumber: number
): 'M' | 'T' | null {
  const weekDays = days.filter((d) => d.weekNumber === weekNumber)
  for (const day of weekDays) {
    const shift = matrix[employeeId][day.dayNumber]
    if (shift === 'M' || shift === 'T') {
      return shift
    }
  }
  return null
}

/**
 * Check if converting days to libre would create a work block smaller than minWorkBlock
 * This is used to ensure we don't create 1-2 day work blocks when assigning libre
 *
 * @param matrix Current schedule matrix
 * @param days All days in the month
 * @param employeeId Employee to check
 * @param libreDays Day numbers that would become libre
 * @param minWorkBlock Minimum consecutive work days allowed (default 3)
 * @returns true if this would create an invalid small work block
 */
export function wouldCreateSmallWorkBlock(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string,
  libreDays: number[],
  minWorkBlock: number = 3
): boolean {
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
  const libreSet = new Set(libreDays)

  // Simulate the matrix with the new libre days
  const simulatedShifts: { dayNumber: number; isWork: boolean }[] = []

  for (const day of sortedDays) {
    const currentShift = matrix[employeeId][day.dayNumber]
    let isWork: boolean

    if (libreSet.has(day.dayNumber)) {
      // This day would become libre
      isWork = false
    } else if (isWorkShift(currentShift)) {
      isWork = true
    } else {
      // Already libre or absence
      isWork = false
    }

    simulatedShifts.push({ dayNumber: day.dayNumber, isWork })
  }

  // Find all work blocks and check their size
  let currentBlockSize = 0

  for (let i = 0; i < simulatedShifts.length; i++) {
    const { isWork } = simulatedShifts[i]

    if (isWork) {
      currentBlockSize++
    } else {
      // End of a work block - check if it's too small
      if (currentBlockSize > 0 && currentBlockSize < minWorkBlock) {
        return true // Found a work block smaller than minimum
      }
      currentBlockSize = 0
    }
  }

  // Check final block
  if (currentBlockSize > 0 && currentBlockSize < minWorkBlock) {
    return true
  }

  return false
}

// ============================================
// SHIFT STATISTICS
// ============================================

/**
 * Get shift counts for an employee
 */
export function getEmployeeShiftCounts(
  matrix: ScheduleMatrix,
  days: DayInfo[],
  employeeId: string
): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const day of days) {
    let shift = matrix[employeeId][day.dayNumber]
    if (!shift) continue

    // Normalize L1, L2, etc to L
    if (shift.startsWith('L') && shift.length > 1) {
      shift = 'L'
    }

    counts[shift] = (counts[shift] || 0) + 1
  }

  return counts
}
