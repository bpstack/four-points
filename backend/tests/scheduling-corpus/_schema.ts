// tests/scheduling-corpus/_schema.ts
// Type contract for scheduling corpus fixtures.
// This file is a reference for humans and the test runner — NOT a Zod schema.
// Fixtures are plain JSON; the test runner converts them to ScheduleValidator inputs.
//
// RULES:
// - expected.violations describes what MUST be present in the result
// - expected.absentViolations describes what must NOT be present
// - Match by (type, severity, employeeId?, day?) — NOT by message text
// - employeeId: omit = any employee, 'ANY' = any employee, specific UUID = that employee
// - day: omit = any day, specific number = that day

import type { DayOfWeek } from '../../models/scheduling/index.js'

// ============================================
// FIXTURE INPUT
// ============================================

export interface FixtureEmployee {
  /** Deterministic UUID-like id: 'E00000000000000000000000000000000001' */
  id: string
  name: string
  rules?: {
    shiftPriority?: string
    fixedShift?: string
    noWeekends?: boolean
    maxShiftPerMonth?: Record<string, number>
    minShiftPerMonth?: Record<string, number>
    fixedDays?: number[]
  }
}

export interface FixtureDay {
  dayNumber: number
  /** 'L'=Mon, 'M'=Tue, 'X'=Wed, 'J'=Thu, 'V'=Fri, 'S'=Sat, 'D'=Sun */
  dayOfWeek: DayOfWeek
  weekNumber: number
  isHoliday?: boolean
  holidayName?: string
}

/** Shift code: 'M' | 'T' | 'N' | 'PI' | 'P' | 'L' | 'V' | 'B' | 'E' | 'IT' | 'FO' | 'A' */
export type ShiftCode = string

/**
 * Assignments matrix: employeeId → dayNumber → shiftCode.
 * Days with no assignment entry are treated as empty string ''.
 */
export type FixtureAssignments = Record<string, Record<number, ShiftCode>>

/**
 * Which days are locked (have source_constraint_id).
 * lockedCells[employeeId][dayNumber] = true means the cell is locked.
 * Locked cells should not trigger violations in the validator — they count but aren't "wrong".
 */
export type FixtureLockedCells = Record<string, number[]>

export interface FixturePreviousMonthHistory {
  /** Last N shifts per employee. Key = employeeId, value = array ordered oldest→newest */
  lastShifts: Record<string, Array<{ dayNumber: number; shiftCode: string }>>
  /** How many nights are in an incomplete night block at end of prev month */
  incompleteNightBlocks: Record<string, number>
  /** Last non-night shift type per employee */
  lastShiftType: Record<string, 'M' | 'T'>
  /** Whether employee ended the prev month on a night shift */
  endedWithNight: Record<string, boolean>
}

export interface FixtureConfig {
  minMorningStaff?: number
  prefMorningStaff?: number
  maxMorningStaff?: number
  minAfternoonStaff?: number
  prefAfternoonStaff?: number
  maxAfternoonStaff?: number
  minNightStaff?: number
  maxNightStaff?: number
  maxWeeklyShifts?: number
  prefWeeklyShifts?: number
  minRestHours?: number
  minNightBlock?: number
  maxNightBlock?: number
  prefNightBlock?: number
  minMonthlyLibre?: number
  maxMonthlyLibre?: number
  maxConsecutiveWorkDays?: number
  minConsecutiveLibre?: number
  annualVacationDays?: number
  annualHolidays?: number
  annualFreeDays?: number
}

export interface FixtureInput {
  monthId: number
  year: number
  month: number
  config: FixtureConfig
  employees: FixtureEmployee[]
  days: FixtureDay[]
  /** Assignments matrix: employeeId → dayNumber → shiftCode */
  assignments: FixtureAssignments
  /** Optional: locked cells (source_constraint_id not null) */
  lockedCells?: FixtureLockedCells
  /** Optional: history from previous month for cross-month checks */
  previousMonthHistory?: FixturePreviousMonthHistory | null
}

// ============================================
// FIXTURE EXPECTED OUTPUT
// ============================================

/**
 * A violation matcher. All provided fields must match.
 * Omitted optional fields are not checked.
 */
export interface ViolationMatcher {
  /** WarningType: 'coverage' | 'night_block' | 'rest' | 'hours' | 'constraint' | 'validation' */
  type: string
  /** 'error' | 'warning' | 'info' */
  severity: string
  /** employeeId to match. Omit = match any employee. */
  employeeId?: string
  /** Day number to match. Omit = match any day. */
  day?: number
}

export interface FixtureExpected {
  /** Overall validity: true = no errors (warnings are ok) */
  isValid: boolean
  /**
   * Violations that MUST be present in the result.
   * Each matcher must find at least one matching entry in errors+warnings.
   */
  violations: ViolationMatcher[]
  /**
   * Violations that must NOT be present.
   * Each matcher must find zero matching entries.
   */
  absentViolations?: ViolationMatcher[]
  /**
   * Expected soft penalty total. Optional — only checked when present.
   * Fill in after running the validator to snapshot the value.
   */
  softPenalty?: number
  /**
   * Expected soft penalty breakdown by key. Optional — only checked when present.
   */
  softPenaltyBreakdown?: Record<string, number>
}

// ============================================
// FULL FIXTURE
// ============================================

export interface CorpusFixture {
  /** Unique id. Convention: 'F##-kebab-case-description' */
  id: string
  /** Human-readable description of what this fixture tests */
  description: string
  /**
   * If true, the test is marked as todo (expected to fail until implementation catches up).
   * Use for cross-month fixtures until B.0 wiring is done.
   */
  todo?: boolean
  input: FixtureInput
  expected: FixtureExpected
}
