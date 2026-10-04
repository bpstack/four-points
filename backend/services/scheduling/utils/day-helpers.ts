// services/scheduling/utils/day-helpers.ts
// Day and date utility functions

import type { DayOfWeek } from '../../../models/scheduling/index.js'
import type { DayInfo, WeekInfo } from '../types/index.js'

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
 * Sort days by day number
 */
export function sortDaysByNumber(days: DayInfo[]): DayInfo[] {
  return [...days].sort((a, b) => a.dayNumber - b.dayNumber)
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
