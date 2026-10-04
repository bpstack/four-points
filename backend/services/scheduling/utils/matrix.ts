// services/scheduling/utils/matrix.ts
// Schedule matrix operations

import type { ScheduleMatrix, DayInfo } from '../types/index.js'

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
