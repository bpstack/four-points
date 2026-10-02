// services/scheduling/types/index.ts
// Centralized types for the scheduling system

import type { DayOfWeek } from '../../../models/scheduling/index.js'

// ============================================
// CORE TYPES
// ============================================

export interface Employee {
  id: string
  name: string
  rules: EmployeeRules
}

export interface EmployeeRules {
  shiftPriority?: string
  maxShiftPerMonth?: Record<string, number>
  minShiftPerMonth?: Record<string, number>
  fixedDays?: number[]
  fixedShift?: string
  noWeekends?: boolean
}

export type ScheduleMatrix = Record<string, Record<number, string>>

export interface DayInfo {
  id: number
  dayNumber: number
  date: Date
  dayOfWeek: DayOfWeek
  weekNumber: number
  isHoliday: boolean
  holidayName?: string
}

export interface WeekInfo {
  weekNumber: number
}

export interface PreviousMonthHistory {
  lastShifts: Map<string, { dayNumber: number; shiftCode: string }[]>
  incompleteNightBlocks: Map<string, number>
  lastShiftType: Map<string, 'M' | 'T'>
  endedWithNight: Map<string, boolean>
}

// ============================================
// WARNINGS & VALIDATION
// ============================================

export type WarningSeverity = 'info' | 'warning' | 'error'

export type WarningType =
  'coverage' | 'night_block' | 'rest' | 'hours' | 'constraint' | 'validation'

export interface GenerationWarning {
  type: WarningType
  severity: WarningSeverity
  message: string
  day?: number
  employeeId?: string
  employeeName?: string
}

// ============================================
// GENERATOR CONTEXT
// ============================================

export interface GeneratorContext {
  monthId: number
  year: number
  month: number
  config: SchedulingConfig
  shifts: ShiftInfo[]
  days: DayInfo[]
  employees: Employee[]
  matrix: ScheduleMatrix
  warnings: GenerationWarning[]
  previousMonthHistory: PreviousMonthHistory | null
  employeesWithCompletedNightBlock: Set<string>
  daysNeedingPI: number[]
}

export interface SchedulingConfig {
  minMorningStaff: number
  prefMorningStaff: number
  minAfternoonStaff: number
  prefAfternoonStaff: number
  maxMorningStaff?: number
  maxAfternoonStaff?: number
  minNightStaff: number
  maxNightStaff: number
  maxWeeklyShifts: number
  prefWeeklyShifts: number
  minRestHours: number
  minNightBlock: number
  maxNightBlock: number
  prefNightBlock: number
  minMonthlyLibre?: number
  prefMonthlyLibre?: number
  maxMonthlyLibre?: number
  maxConsecutiveWorkDays?: number
  annualVacationDays: number
  annualHolidays: number
  annualFreeDays: number
}

export interface ShiftInfo {
  id: number
  code: string
  name: string
  startTime: string | null
  endTime: string | null
  hours: number
  color: string
  isWorkShift: boolean
  isPaid: boolean
  displayOrder: number
  isActive: boolean
}

// ============================================
// CONSTRAINT SYSTEM
// ============================================

export interface ConstraintResult {
  satisfied: boolean
  violations: GenerationWarning[]
  /** Sum of soft penalties from this constraint (0 for hard-only constraints) */
  softPenalty?: number
  /** Breakdown by SoftWeightKey for traceability */
  softPenaltyBreakdown?: Record<string, number>
}
