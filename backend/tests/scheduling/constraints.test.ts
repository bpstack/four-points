// tests/scheduling/constraints.test.ts
// Unit tests for scheduling constraints

import { describe, it, expect, beforeEach } from 'vitest'
import { MaxConsecutiveWorkConstraint } from '../../services/scheduling/constraints/max-consecutive-work.constraint.js'
import { ConsecutiveRestConstraint } from '../../services/scheduling/constraints/consecutive-rest.constraint.js'
import { NightBlockConstraint } from '../../services/scheduling/constraints/night-block.constraint.js'
import { CoverageConstraint } from '../../services/scheduling/constraints/coverage.constraint.js'
import { MonthlyLibreConstraint } from '../../services/scheduling/constraints/monthly-libre.constraint.js'
import type { GeneratorContext, DayInfo, Employee, ScheduleMatrix } from '../../services/scheduling/types/index.js'

// ============================================
// TEST HELPERS
// ============================================

function createMockDays(count: number = 31): DayInfo[] {
  const days: DayInfo[] = []
  // Start on Monday (L) for week 1
  const dayOfWeekMap: Array<'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D'> = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  
  for (let i = 1; i <= count; i++) {
    const dayOfWeekIndex = (i - 1) % 7
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

function createMockEmployee(id: string, name: string, rules: Employee['rules'] = {}): Employee {
  return { id, name, rules }
}

function createMockContext(
  matrix: ScheduleMatrix,
  employees: Employee[],
  days: DayInfo[],
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

// ============================================
// MAX CONSECUTIVE WORK CONSTRAINT
// ============================================

describe('MaxConsecutiveWorkConstraint', () => {
  let constraint: MaxConsecutiveWorkConstraint
  let days: DayInfo[]
  let employee: Employee

  beforeEach(() => {
    constraint = new MaxConsecutiveWorkConstraint()
    days = createMockDays(14) // 2 weeks
    employee = createMockEmployee('emp1', 'Juan')
  })

  it('should pass when employee works 6 consecutive days', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M',
        7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('should fail when employee works 7 consecutive days', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M',
        8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].severity).toBe('error')
    expect(result.violations[0].employeeId).toBe('emp1')
  })

  it('should pass with alternating work/rest pattern', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'L', 3: 'T', 4: 'L', 5: 'M', 6: 'L', 7: 'T',
        8: 'L', 9: 'M', 10: 'L', 11: 'T', 12: 'L', 13: 'M', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should count N (night) shifts as work', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'N', 7: 'N',
        8: 'L', 9: 'L', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
  })

  it('should count P and PI as work', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'P', 2: 'P', 3: 'PI', 4: 'PI', 5: 'M', 6: 'T', 7: 'M',
        8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
  })

  it('should not count vacation (V) as work', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'V', 5: 'M', 6: 'M', 7: 'M',
        8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should respect custom maxConsecutiveWorkDays config', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M',
        6: 'L', 7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L',
      },
    }
    // Should pass with default (6 max)
    let context = createMockContext(matrix, [employee], days)
    let result = constraint.check(context)
    expect(result.satisfied).toBe(true)
    
    // Should fail with max 4
    context = createMockContext(matrix, [employee], days, { maxConsecutiveWorkDays: 4 })
    result = constraint.check(context)
    expect(result.satisfied).toBe(false)
  })
})

// ============================================
// CONSECUTIVE REST CONSTRAINT
// ============================================

describe('ConsecutiveRestConstraint', () => {
  let constraint: ConsecutiveRestConstraint
  let days: DayInfo[]
  let employee: Employee

  beforeEach(() => {
    constraint = new ConsecutiveRestConstraint()
    days = createMockDays(14) // 2 weeks
    employee = createMockEmployee('emp1', 'Maria')
  })

  it('should pass when employee has 2 consecutive libre days per week', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L',
        8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should fail when employee has only 1 libre day in a week', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'L',
        8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations).toHaveLength(1)
  })

  it('should fail when libre days are not consecutive', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'L', 3: 'M', 4: 'M', 5: 'L', 6: 'M', 7: 'M',
        8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
  })

  it('should count vacation (V) as rest', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'V', 7: 'V',
        8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should count holiday (B) as rest', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'B',
        8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should count sick leave (IT) as rest', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'IT', 7: 'IT',
        8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should skip fixed-shift employees with noWeekends', () => {
    const fixedEmployee = createMockEmployee('emp1', 'Carlos', {
      fixedDays: [1, 2, 3, 4, 5],
      noWeekends: true,
    })
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'L', 7: 'M', // Only 1 libre!
        8: 'P', 9: 'P', 10: 'P', 11: 'P', 12: 'P', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [fixedEmployee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true) // Skipped
  })
})

// ============================================
// NIGHT BLOCK CONSTRAINT
// ============================================

describe('NightBlockConstraint', () => {
  let constraint: NightBlockConstraint
  let days: DayInfo[]
  let employee: Employee

  beforeEach(() => {
    constraint = new NightBlockConstraint()
    days = createMockDays(14) // 2 weeks
    employee = createMockEmployee('emp1', 'Pedro')
  })

  it('should pass with 4 consecutive night shifts', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'M',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should pass with 5 consecutive night shifts', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'L', 7: 'L',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should fail with only 2 consecutive night shifts (below min 3)', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'L', 4: 'L', 5: 'M', 6: 'M', 7: 'L',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations[0].severity).toBe('error')
  })

  it('should warn when nights are below recommended (3 nights with min 4 recommended)', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'N', 4: 'L', 5: 'L', 6: 'M', 7: 'M',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations[0].severity).toBe('warning')
  })

  it('should fail with scattered (non-consecutive) night shifts', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'M', 3: 'N', 4: 'M', 5: 'N', 6: 'N', 7: 'L',
        8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations[0].message).toContain('dispersas')
  })

  it('should warn when exceeding max night block (7 nights with max 6)', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'N', 7: 'N',
        8: 'L', 9: 'L', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations[0].severity).toBe('warning')
  })

  it('should pass when employee has no night shifts', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L',
        8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should skip fixed-shift employees', () => {
    const fixedEmployee = createMockEmployee('emp1', 'Marta', {
      fixedShift: 'P',
    })
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'L', 4: 'L', 5: 'M', 6: 'M', 7: 'L', // Invalid 2 nights
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    const context = createMockContext(matrix, [fixedEmployee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true) // Skipped
  })

  it('should respect custom minNightBlock and maxNightBlock config', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'N', 2: 'N', 3: 'N', 4: 'L', 5: 'L', 6: 'M', 7: 'M',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    // With minNightBlock: 3, should pass (no warning)
    const context = createMockContext(matrix, [employee], days, { 
      minNightBlock: 3,
      maxNightBlock: 5 
    })
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })
})

// ============================================
// MULTIPLE EMPLOYEES
// ============================================

describe('Constraints with multiple employees', () => {
  it('should check all employees and report individual violations', () => {
    const constraint = new MaxConsecutiveWorkConstraint()
    const days = createMockDays(14)
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    
    const matrix: ScheduleMatrix = {
      emp1: { // OK - 6 days
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'L',
        8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
      },
      emp2: { // Violation - 8 days
        1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'T', 7: 'T',
        8: 'T', 9: 'L', 10: 'L', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
      },
      emp3: { // OK - rest on day 4
        1: 'M', 2: 'M', 3: 'M', 4: 'L', 5: 'M', 6: 'M', 7: 'L',
        8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M',
      },
    }
    
    const context = createMockContext(matrix, employees, days)
    const result = constraint.check(context)
    
    expect(result.satisfied).toBe(false)
    expect(result.violations).toHaveLength(1)
    expect(result.violations[0].employeeId).toBe('emp2')
    expect(result.violations[0].employeeName).toBe('Maria')
  })
})

// ============================================
// COVERAGE CONSTRAINT
// ============================================

describe('CoverageConstraint', () => {
  let constraint: CoverageConstraint
  let days: DayInfo[]
  
  beforeEach(() => {
    constraint = new CoverageConstraint()
    days = createMockDays(7) // 1 week
  })

  it('should pass when all shifts have minimum coverage', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
      createMockEmployee('emp4', 'Marta'),
      createMockEmployee('emp5', 'Carlos'),
      createMockEmployee('emp6', 'Laura'),
      createMockEmployee('emp7', 'Miguel'),
      createMockEmployee('emp8', 'Sofia'),
    ]
    // Need coverage for all 7 days: 2M + 2T + 1N minimum per day
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L' },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M' }, // Covers weekends
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'L', 7: 'L' },
      emp4: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'T', 7: 'T' }, // Covers weekends
      emp5: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'N' },
      emp6: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'N', 6: 'N', 7: 'L' }, // Covers weekend nights
      emp7: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'M', 7: 'M' }, // Covers weekend mornings
      emp8: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'T', 7: 'T' }, // Covers weekend afternoons
    }
    const context = createMockContext(matrix, employees, days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('should fail when morning coverage is below minimum', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'L', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L' }, // Only 1 M on day 2
      emp2: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'L', 7: 'L' },
      emp3: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'L', 7: 'L' },
    }
    // Default minMorningStaff is 2
    const context = createMockContext(matrix, employees, days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    // Day 1,3,4,5 have 1M (below min 2), Day 2 has 0M 
    expect(result.violations.length).toBeGreaterThan(0)
    expect(result.violations.some(v => v.message.includes('Mañana'))).toBe(true)
  })

  it('should fail when night coverage is zero', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'L' },
      emp2: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'L', 6: 'L', 7: 'L' },
      // No N shifts at all
    }
    const context = createMockContext(matrix, employees, days, { 
      minMorningStaff: 1, 
      minAfternoonStaff: 1,
      minNightStaff: 1 
    })
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations.some(v => v.message.includes('Noche'))).toBe(true)
    expect(result.violations.some(v => v.severity === 'error')).toBe(true) // Zero coverage is error
  })

  it('should warn when overstaffed', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
      createMockEmployee('emp4', 'Marta'),
      createMockEmployee('emp5', 'Carlos'),
    ]
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L' },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L' },
      emp3: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L' }, // 3 M but max is 2
      emp4: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'L', 7: 'L' },
      emp5: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'L', 7: 'L' },
    }
    const context = createMockContext(matrix, employees, days, {
      minMorningStaff: 2,
      maxMorningStaff: 2, // Max is 2, but we have 3
      minAfternoonStaff: 1,
      minNightStaff: 1
    })
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations.some(v => v.message.includes('máximo'))).toBe(true)
  })

  it('should skip holiday days', () => {
    const daysWithHoliday = createMockDays(7)
    daysWithHoliday[2].isHoliday = true // Day 3 is holiday
    
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'L', 4: 'M', 5: 'L', 6: 'L', 7: 'L' }, // No work on holiday
      emp2: { 1: 'T', 2: 'T', 3: 'L', 4: 'T', 5: 'L', 6: 'L', 7: 'L' },
      // No N on holiday day 3, but it's holiday so OK
    }
    const context = createMockContext(matrix, employees, daysWithHoliday, {
      minMorningStaff: 1,
      minAfternoonStaff: 1,
      minNightStaff: 1
    })
    const result = constraint.check(context)
    // Day 3 should be skipped (holiday), so no violation for missing coverage
    const day3Violations = result.violations.filter(v => v.day === 3)
    expect(day3Violations.length).toBe(0)
  })
})

// ============================================
// MONTHLY LIBRE CONSTRAINT
// ============================================

describe('MonthlyLibreConstraint', () => {
  let constraint: MonthlyLibreConstraint
  let days: DayInfo[]
  let employee: Employee

  beforeEach(() => {
    constraint = new MonthlyLibreConstraint()
    days = createMockDays(28) // 4 weeks
    employee = createMockEmployee('emp1', 'Juan')
  })

  it('should pass when employee has 8-12 libre days', () => {
    // 28 days, 8 libre = 20 work days (2 libre per week)
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L',
        15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'L', 21: 'L',
        22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'T', 27: 'L', 28: 'L',
      }
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should pass when employee has 10 libre days', () => {
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'L',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L',
        15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'L', 21: 'L',
        22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'L', 27: 'L', 28: 'L', // 10 L total
      }
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })

  it('should fail when employee has fewer than 8 libre days', () => {
    // Only 6 libre days
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'L',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
        15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'T', 21: 'L',
        22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'T', 27: 'L', 28: 'L',
        // Total: 5 L
      }
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations[0].message).toContain('mínimo')
  })

  it('should fail when employee has more than 12 libre days', () => {
    // 14 libre days
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'L', 5: 'L', 6: 'L', 7: 'L',
        8: 'M', 9: 'M', 10: 'M', 11: 'L', 12: 'L', 13: 'L', 14: 'L',
        15: 'T', 16: 'T', 17: 'T', 18: 'L', 19: 'L', 20: 'L', 21: 'L',
        22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'L', 27: 'L', 28: 'M',
        // Total: 14 L
      }
    }
    const context = createMockContext(matrix, [employee], days, {
      maxMonthlyLibre: 12
    })
    const result = constraint.check(context)
    expect(result.satisfied).toBe(false)
    expect(result.violations[0].message).toContain('máximo')
  })

  it('should count vacation (V) as rest day', () => {
    // 4 L + 4 V = 8 rest days
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L',
        8: 'V', 9: 'V', 10: 'V', 11: 'V', 12: 'M', 13: 'M', 14: 'M',
        15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'M', 21: 'M',
        22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'T', 27: 'L', 28: 'L',
      }
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true) // 4L + 4V = 8 rest days
  })

  it('should count sick leave (IT) as rest day', () => {
    // 6 L + 2 IT = 8 rest days
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L',
        8: 'IT', 9: 'IT', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L',
        15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'M', 21: 'M',
        22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'T', 27: 'L', 28: 'L',
      }
    }
    const context = createMockContext(matrix, [employee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true) // 6L + 2IT = 8 rest days
  })

  it('should skip fixed-shift employees', () => {
    const fixedEmployee = createMockEmployee('emp1', 'Carlos', {
      fixedShift: 'P'
    })
    // Only 4 libre days - would fail for regular employee
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'L', 7: 'M',
        8: 'P', 9: 'P', 10: 'P', 11: 'P', 12: 'P', 13: 'L', 14: 'M',
        15: 'P', 16: 'P', 17: 'P', 18: 'P', 19: 'P', 20: 'L', 21: 'M',
        22: 'P', 23: 'P', 24: 'P', 25: 'P', 26: 'P', 27: 'L', 28: 'M',
      }
    }
    const context = createMockContext(matrix, [fixedEmployee], days)
    const result = constraint.check(context)
    expect(result.satisfied).toBe(true) // Skipped
  })

  it('should respect custom min/max libre config', () => {
    // 6 libre days
    const matrix: ScheduleMatrix = {
      emp1: {
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'L',
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'M', 14: 'L',
        15: 'T', 16: 'T', 17: 'T', 18: 'T', 19: 'T', 20: 'T', 21: 'L',
        22: 'T', 23: 'T', 24: 'T', 25: 'T', 26: 'T', 27: 'L', 28: 'L',
        // Total: 5 L + would need more but with config of minMonthlyLibre: 5, it passes
      }
    }
    // With default (8), should fail
    let context = createMockContext(matrix, [employee], days)
    let result = constraint.check(context)
    expect(result.satisfied).toBe(false)

    // With custom min of 5, should pass
    context = createMockContext(matrix, [employee], days, { minMonthlyLibre: 5 })
    result = constraint.check(context)
    expect(result.satisfied).toBe(true)
  })
})
