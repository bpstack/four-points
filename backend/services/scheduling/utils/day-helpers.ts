// services/scheduling/utils/day-helpers.ts
// Day and date utility functions

import type { DayOfWeek } from '../../../models/scheduling/index.js'
import type { DayInfo, WeekInfo } from '../types/index.js'

/**
 * Convert day of week letter to number (1=Monday, 7=Sunday)
 */
export function dayOfWeekToNumber(dow: DayOfWeek): number {
  const map: Record<string, number> = {
    L: 1, // Lunes
    M: 2, // Martes
    X: 3, // Miércoles
    J: 4, // Jueves
    V: 5, // Viernes
    S: 6, // Sábado
    D: 7, // Domingo
  }
  return map[dow] || 0
}

/**
 * Check if day is weekend (Saturday or Sunday)
 */
export function isWeekend(dayOfWeek: DayOfWeek): boolean {
  return dayOfWeek === 'S' || dayOfWeek === 'D'
}

/**
 * Get unique weeks from days array
 */
export function getWeeksInMonth(days: DayInfo[]): WeekInfo[] {
  const weeks = new Set<number>()
  for (const day of days) {
    weeks.add(day.weekNumber)
  }
  return Array.from(weeks)
    .sort((a, b) => a - b)
    .map((w) => ({ weekNumber: w }))
}

/**
 * Get days for a specific week
 */
export function getDaysInWeek(days: DayInfo[], weekNumber: number): DayInfo[] {
  return days.filter((d) => d.weekNumber === weekNumber).sort((a, b) => a.dayNumber - b.dayNumber)
}

/**
 * Get day by day number
 */
export function getDayByNumber(days: DayInfo[], dayNumber: number): DayInfo | undefined {
  return days.find((d) => d.dayNumber === dayNumber)
}

/**
 * Get non-holiday days
 */
export function getWorkableDays(days: DayInfo[]): DayInfo[] {
  return days.filter((d) => !d.isHoliday)
}

/**
 * Sort days by day number
 */
export function sortDaysByNumber(days: DayInfo[]): DayInfo[] {
  return [...days].sort((a, b) => a.dayNumber - b.dayNumber)
}

/**
 * Find consecutive day segments
 * Returns arrays of consecutive days
 */
export function findConsecutiveSegments(days: DayInfo[]): DayInfo[][] {
  const sorted = sortDaysByNumber(days)
  const segments: DayInfo[][] = []
  let currentSegment: DayInfo[] = []

  for (const day of sorted) {
    if (currentSegment.length === 0) {
      currentSegment.push(day)
    } else if (day.dayNumber === currentSegment[currentSegment.length - 1].dayNumber + 1) {
      currentSegment.push(day)
    } else {
      segments.push(currentSegment)
      currentSegment = [day]
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

/**
 * Check if two days are adjacent (consecutive)
 */
export function areAdjacent(dayNumber1: number, dayNumber2: number): boolean {
  return Math.abs(dayNumber1 - dayNumber2) === 1
}

/**
 * Check if a day number is adjacent to any day in the array
 */
export function isAdjacentToAny(dayNumber: number, dayNumbers: number[]): boolean {
  if (dayNumbers.length === 0) return true // No existing days = can be anywhere
  const sorted = [...dayNumbers].sort((a, b) => a - b)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return dayNumber === first - 1 || dayNumber === last + 1
}

/**
 * Check if day numbers form a consecutive sequence
 */
export function areConsecutive(dayNumbers: number[]): boolean {
  if (dayNumbers.length <= 1) return true
  const sorted = [...dayNumbers].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}
