// tests/scheduling-corpus/factory.ts
// Helper functions for building ScheduleValidator inputs from concise fixture specs.
// These translate the fixture JSON format to the types expected by ScheduleValidator.

import type { SchedulingConfigMap } from '../../models/scheduling/index.js'
import type {
  SchedulingAssignmentWithDetails,
  SchedulingDayRow,
  SchedulingShiftRow,
} from '../../models/scheduling/index.js'
import type { Employee, PreviousMonthHistory } from '../../services/scheduling/types/index.js'
import type {
  FixtureConfig,
  FixtureEmployee,
  FixtureDay,
  FixtureAssignments,
  FixtureLockedCells,
  FixturePreviousMonthHistory,
} from './_schema.js'

// ============================================
// DETERMINISTIC EMPLOYEE IDS
// ============================================

/**
 * Generate a deterministic UUID-like employee id from an index (1-based).
 * E.g. employeeId(1) → 'E0000000-0000-0000-0000-000000000001'
 */
export function employeeId(index: number): string {
  return `E0000000-0000-0000-0000-${String(index).padStart(12, '0')}`
}

// ============================================
// DEFAULT CONFIG
// ============================================

/**
 * Returns the canonical default config used across all fixtures unless overridden.
 * Values match docs/scheduling/constraints.md §4 (unified parameters).
 */
export function defaultConfig(): SchedulingConfigMap {
  return {
    minMorningStaff: 1,
    prefMorningStaff: 2,
    maxMorningStaff: 6,
    minAfternoonStaff: 1,
    prefAfternoonStaff: 2,
    maxAfternoonStaff: 6,
    minNightStaff: 1,
    maxNightStaff: 1,
    maxWeeklyShifts: 6,
    prefWeeklyShifts: 5,
    minRestHours: 48,
    minNightBlock: 4,
    maxNightBlock: 6,
    prefNightBlock: 5,
    minMonthlyLibre: 9,
    maxMonthlyLibre: 11,
    maxConsecutiveWorkDays: 6,
    minConsecutiveLibre: 2,
    annualVacationDays: 30,
    annualHolidays: 20,
    annualFreeDays: 90,
  }
}

/**
 * Merge a partial fixture config override on top of defaultConfig().
 */
export function mergeConfig(overrides: FixtureConfig): SchedulingConfigMap {
  return { ...defaultConfig(), ...overrides }
}

// ============================================
// BUILD DAYS
// ============================================

/**
 * Build SchedulingDayRow[] from a FixtureDay[] (used when JSON provides explicit days).
 */
export function buildDaysFromFixture(fixtureDays: FixtureDay[]): SchedulingDayRow[] {
  return fixtureDays.map(
    (fd) =>
      ({
        id: fd.dayNumber,
        month_id: 1,
        day_number: fd.dayNumber,
        date: `2026-01-${String(fd.dayNumber).padStart(2, '0')}`,
        day_of_week: fd.dayOfWeek,
        week_number: fd.weekNumber,
        is_holiday: fd.isHoliday ? 1 : 0,
        holiday_name: fd.holidayName ?? null,
        occupancy_pct: null,
        arrivals: null,
        departures: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        constructor: { name: 'RowDataPacket' },
      }) as unknown as SchedulingDayRow
  )
}

// ============================================
// BUILD SHIFTS
// ============================================

/**
 * Returns the canonical shift set used in fixtures.
 * Based on docs/scheduling/constraints.md §1.1.
 */
export function buildShifts(): SchedulingShiftRow[] {
  const shifts: Array<{
    code: string
    name: string
    start: string | null
    end: string | null
    hours: number
    color: string
    isWork: boolean
    isPaid: boolean
  }> = [
    {
      code: 'M',
      name: 'Mañana',
      start: '07:00',
      end: '15:00',
      hours: 8,
      color: '#FCD34D',
      isWork: true,
      isPaid: true,
    },
    {
      code: 'T',
      name: 'Tarde',
      start: '15:00',
      end: '23:00',
      hours: 8,
      color: '#60A5FA',
      isWork: true,
      isPaid: true,
    },
    {
      code: 'N',
      name: 'Noche',
      start: '23:00',
      end: '07:00',
      hours: 8,
      color: '#A78BFA',
      isWork: true,
      isPaid: true,
    },
    {
      code: 'PI',
      name: 'PI',
      start: '09:00',
      end: '21:00',
      hours: 12,
      color: '#FB923C',
      isWork: true,
      isPaid: true,
    },
    {
      code: 'P',
      name: 'Presencia',
      start: '08:00',
      end: '20:00',
      hours: 12,
      color: '#34D399',
      isWork: true,
      isPaid: true,
    },
    {
      code: 'L',
      name: 'Libre',
      start: null,
      end: null,
      hours: 0,
      color: '#E5E7EB',
      isWork: false,
      isPaid: false,
    },
    {
      code: 'V',
      name: 'Vacaciones',
      start: null,
      end: null,
      hours: 0,
      color: '#6EE7B7',
      isWork: false,
      isPaid: true,
    },
    {
      code: 'B',
      name: 'Bonificable',
      start: null,
      end: null,
      hours: 0,
      color: '#BFDBFE',
      isWork: false,
      isPaid: true,
    },
    {
      code: 'E',
      name: 'Enfermedad',
      start: null,
      end: null,
      hours: 0,
      color: '#FCA5A5',
      isWork: false,
      isPaid: false,
    },
    {
      code: 'IT',
      name: 'Baja IT',
      start: null,
      end: null,
      hours: 0,
      color: '#F9A8D4',
      isWork: false,
      isPaid: false,
    },
    {
      code: 'FO',
      name: 'Día Libre',
      start: null,
      end: null,
      hours: 0,
      color: '#D1FAE5',
      isWork: false,
      isPaid: false,
    },
    {
      code: 'A',
      name: 'Ausencia',
      start: null,
      end: null,
      hours: 0,
      color: '#FECACA',
      isWork: false,
      isPaid: false,
    },
  ]

  return shifts.map(
    (s, i) =>
      ({
        id: i + 1,
        code: s.code,
        name: s.name,
        start_time: s.start,
        end_time: s.end,
        hours: s.hours,
        color: s.color,
        is_work_shift: s.isWork ? 1 : 0,
        is_paid: s.isPaid ? 1 : 0,
        display_order: i + 1,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date(),
        constructor: { name: 'RowDataPacket' },
      }) as unknown as SchedulingShiftRow
  )
}

// ============================================
// BUILD EMPLOYEES
// ============================================

/**
 * Build Employee[] from FixtureEmployee[] specs.
 */
export function buildEmployees(specs: FixtureEmployee[]): Employee[] {
  return specs.map((s) => ({
    id: s.id,
    name: s.name,
    rules: {
      shiftPriority: s.rules?.shiftPriority,
      fixedShift: s.rules?.fixedShift,
      noWeekends: s.rules?.noWeekends,
      maxShiftPerMonth: s.rules?.maxShiftPerMonth,
      minShiftPerMonth: s.rules?.minShiftPerMonth,
      fixedDays: s.rules?.fixedDays,
    },
  }))
}

// ============================================
// BUILD ASSIGNMENTS
// ============================================

/**
 * Convert an assignments matrix (employeeId → dayNumber → shiftCode)
 * into SchedulingAssignmentWithDetails[] expected by ScheduleValidator.
 *
 * @param matrix       The fixture assignments map
 * @param days         SchedulingDayRow[] (to get day metadata for joins)
 * @param employees    Employee[] (for employee_name join)
 * @param lockedCells  Optional locked cells map: employeeId → dayNumbers[]
 */
export function buildAssignments(
  matrix: FixtureAssignments,
  days: SchedulingDayRow[],
  employees: Employee[],
  lockedCells?: FixtureLockedCells
): SchedulingAssignmentWithDetails[] {
  const dayMap = new Map(days.map((d) => [d.day_number, d]))
  const employeeMap = new Map(employees.map((e) => [e.id, e]))
  const assignments: SchedulingAssignmentWithDetails[] = []
  let idCounter = 1

  for (const [employeeId, dayAssignments] of Object.entries(matrix)) {
    const employee = employeeMap.get(employeeId)
    const lockedDays = new Set(lockedCells?.[employeeId] ?? [])

    for (const [dayNumStr, shiftCode] of Object.entries(dayAssignments)) {
      if (!shiftCode || shiftCode === '') continue

      const dayNumber = Number(dayNumStr)
      const day = dayMap.get(dayNumber)
      if (!day) continue

      const isLocked = lockedDays.has(dayNumber)

      assignments.push({
        id: idCounter++,
        month_id: 1,
        day_id: day.id,
        employee_id: employeeId,
        shift_code: shiftCode,
        source_constraint_id: isLocked ? 9999 : null,
        notes: null,
        libre_number: null,
        created_at: new Date(),
        updated_at: new Date(),
        // Join fields
        employee_name: employee?.name ?? 'Unknown',
        shift_name: shiftCode,
        shift_color: '#000000',
        day_date: day.date,
        day_of_week: day.day_of_week,
        constructor: { name: 'RowDataPacket' },
      } as unknown as SchedulingAssignmentWithDetails)
    }
  }

  return assignments
}

// ============================================
// BUILD PREVIOUS MONTH HISTORY
// ============================================

/**
 * Convert a FixturePreviousMonthHistory (plain JSON with plain objects)
 * to PreviousMonthHistory (with Maps) expected by the validator.
 */
export function buildPreviousMonthHistory(data: FixturePreviousMonthHistory): PreviousMonthHistory {
  return {
    lastShifts: new Map(Object.entries(data.lastShifts)),
    incompleteNightBlocks: new Map(
      Object.entries(data.incompleteNightBlocks).map(([k, v]) => [k, Number(v)])
    ),
    lastShiftType: new Map(Object.entries(data.lastShiftType) as [string, 'M' | 'T'][]),
    endedWithNight: new Map(Object.entries(data.endedWithNight).map(([k, v]) => [k, Boolean(v)])),
  }
}
