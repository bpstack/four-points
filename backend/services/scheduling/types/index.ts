// services/scheduling/types/index.ts
// Centralized types for the scheduling generator

import type { DayOfWeek } from '../../../models/scheduling/index.js'

// ============================================
// CORE TYPES
// ============================================

/**
 * Employee with parsed rules ready for scheduling
 */
export interface Employee {
  id: string
  name: string
  rules: EmployeeRules
}

/**
 * Parsed rules for an employee
 */
export interface EmployeeRules {
  /** Preferred shift type (M, T, N) */
  shiftPriority?: string
  /** Maximum shifts per type per month: { T: 5 } */
  maxShiftPerMonth?: Record<string, number>
  /** Minimum shifts per type per month */
  minShiftPerMonth?: Record<string, number>
  /** Fixed working days (1=Mon, 5=Fri, etc) */
  fixedDays?: number[]
  /** Fixed shift code (e.g., 'P' for Presencia) */
  fixedShift?: string
  /** Employee doesn't work weekends */
  noWeekends?: boolean
}

/**
 * The schedule matrix: employeeId -> dayNumber -> shiftCode
 */
export type ScheduleMatrix = Record<string, Record<number, string>>

/**
 * Processed day information
 */
export interface DayInfo {
  id: number
  dayNumber: number
  date: Date
  dayOfWeek: DayOfWeek
  weekNumber: number
  isHoliday: boolean
  holidayName?: string
}

/**
 * Week information
 */
export interface WeekInfo {
  weekNumber: number
}

// ============================================
// PREVIOUS MONTH CONTINUITY
// ============================================

/**
 * Previous month history for schedule continuity
 */
export interface PreviousMonthHistory {
  /** Last shifts per employee (last 7 days) */
  lastShifts: Map<string, { dayNumber: number; shiftCode: string }[]>
  /** Employees who ended with incomplete night blocks */
  incompleteNightBlocks: Map<string, number>
  /** Last M/T shift type per employee for rotation */
  lastShiftType: Map<string, 'M' | 'T'>
  /** Did employee end with night? (needs 48h rest) */
  endedWithNight: Map<string, boolean>
}

// ============================================
// WARNINGS & VALIDATION
// ============================================

/**
 * Warning/error severity levels
 */
export type WarningSeverity = 'info' | 'warning' | 'error'

/**
 * Warning/error types for categorization
 */
export type WarningType =
  | 'coverage'
  | 'night_block'
  | 'rest'
  | 'hours'
  | 'constraint'
  | 'validation'

/**
 * Generation warning/error
 */
export interface GenerationWarning {
  type: WarningType
  severity: WarningSeverity
  message: string
  day?: number
  employeeId?: string
  employeeName?: string
}

// ============================================
// GENERATION CONTEXT
// ============================================

/**
 * Shared context passed to all phases and constraints
 */
export interface GeneratorContext {
  /** Month ID in database */
  monthId: number
  /** Year being scheduled */
  year: number
  /** Month being scheduled (1-12) */
  month: number
  /** Configuration map */
  config: SchedulingConfig
  /** Available shift types */
  shifts: ShiftInfo[]
  /** Days in the month */
  days: DayInfo[]
  /** Employees to schedule */
  employees: Employee[]
  /** The schedule matrix (mutable) */
  matrix: ScheduleMatrix
  /** Accumulated warnings */
  warnings: GenerationWarning[]
  /** Previous month history for continuity */
  previousMonthHistory: PreviousMonthHistory | null
  /** Employees who completed their night block */
  employeesWithCompletedNightBlock: Set<string>
  /** Days that need PI reinforcement */
  daysNeedingPI: number[]
}

/**
 * Scheduling configuration
 */
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
  maxMonthlyLibre?: number
  maxConsecutiveWorkDays?: number
  annualVacationDays: number
  annualHolidays: number
  annualFreeDays: number
  aiProvider: string
}

/**
 * Shift type information
 */
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
// PHASE SYSTEM
// ============================================

/**
 * Result of a phase execution
 */
export interface PhaseResult {
  /** Phase completed successfully */
  success: boolean
  /** Any warnings generated */
  warnings: GenerationWarning[]
  /** Optional message */
  message?: string
}

/**
 * Interface for schedule generation phases
 */
export interface IPhase {
  /** Phase name for logging */
  name: string
  /** Phase order (lower = earlier) */
  order: number
  /** Execute the phase */
  execute(context: GeneratorContext): PhaseResult | Promise<PhaseResult>
}

// ============================================
// CONSTRAINT SYSTEM
// ============================================

/**
 * Constraint check result
 */
export interface ConstraintResult {
  /** Constraint is satisfied */
  satisfied: boolean
  /** Violations found */
  violations: GenerationWarning[]
}

/**
 * Interface for constraints that can be validated
 */
export interface IConstraint {
  /** Constraint name */
  name: string
  /** Constraint priority (higher = more important) */
  priority: number
  /** Check if constraint is satisfied */
  check(context: GeneratorContext): ConstraintResult
  /** Try to fix violations (optional) */
  fix?(context: GeneratorContext): boolean
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Shift assignment for bulk insert
 */
export interface BulkAssignment {
  day_id: number
  employee_id: string
  shift_code: string
}

/**
 * Employee statistics
 */
export interface EmployeeStats {
  L: number
  V: number
  B: number
  E: number
  IT: number
  M: number
  T: number
  N: number
  PI: number
  P: number
  FO: number
  A: number
  presencias: number
  horas: number
}

/**
 * Daily statistics
 */
export interface DailyStats {
  day: number
  M: number
  T: number
  N: number
  PI: number
  P: number
}

/**
 * Generation result
 */
export interface GenerationResult {
  success: boolean
  monthId: number
  assignmentsCount: number
  generationTimeMs: number
  warnings: GenerationWarning[]
  stats: {
    byEmployee: EmployeeStats[]
    byDay: DailyStats[]
  }
  attempt?: number
}
