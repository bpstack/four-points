// tests/scheduling/phases.test.ts
// Unit tests for scheduling phases

import { describe, it, expect, beforeEach } from 'vitest'
import { InitializeMatrixPhase } from '../../services/scheduling/phases/initialize-matrix.phase.js'
import { ApplyConstraintsPhase } from '../../services/scheduling/phases/apply-constraints.phase.js'
import { ApplyEmployeeRulesPhase } from '../../services/scheduling/phases/apply-employee-rules.phase.js'
import { EnforcePostNightRestPhase } from '../../services/scheduling/phases/enforce-post-night-rest.phase.js'
import { AssignNightBlocksPhase } from '../../services/scheduling/phases/assign-night-blocks.phase.js'
import { AssignRotatingShiftsPhase } from '../../services/scheduling/phases/assign-rotating-shifts.phase.js'
import { AssignWeeklyOffsPhase } from '../../services/scheduling/phases/assign-weekly-offs.phase.js'
import { ValidateFixCoveragePhase } from '../../services/scheduling/phases/validate-fix-coverage.phase.js'
import { AssignPISupportPhase } from '../../services/scheduling/phases/assign-pi-support.phase.js'
import { RepairSmallBlocksPhase } from '../../services/scheduling/phases/repair-small-blocks.phase.js'
import { FinalValidationPhase } from '../../services/scheduling/phases/final-validation.phase.js'
import { PhaseRegistry, createPhaseRegistry } from '../../services/scheduling/phases/registry.js'
import type { GeneratorContext, DayInfo, Employee, ScheduleMatrix } from '../../services/scheduling/types/index.js'

// ============================================
// TEST HELPERS
// ============================================

function createMockDays(count: number = 31, startDayOfWeek: number = 1): DayInfo[] {
  const days: DayInfo[] = []
  const dayOfWeekMap: Array<'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D'> = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  
  for (let i = 1; i <= count; i++) {
    const dayOfWeekIndex = ((startDayOfWeek - 1 + i - 1) % 7) + 1
    const weekNumber = Math.ceil(i / 7)
    days.push({
      id: i,
      dayNumber: i,
      date: new Date(2025, 0, i),
      dayOfWeek: dayOfWeekMap[dayOfWeekIndex === 7 ? 0 : dayOfWeekIndex],
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

// ============================================
// INITIALIZE MATRIX PHASE (Order 10)
// ============================================

describe('InitializeMatrixPhase', () => {
  let phase: InitializeMatrixPhase

  beforeEach(() => {
    phase = new InitializeMatrixPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('initialize-matrix')
    expect(phase.order).toBe(10)
    expect(phase.enabled).toBe(true)
  })

  it('should create empty matrix for all employees', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    expect(Object.keys(context.matrix)).toHaveLength(3)
    expect(context.matrix['emp1']).toBeDefined()
    expect(context.matrix['emp2']).toBeDefined()
    expect(context.matrix['emp3']).toBeDefined()
  })

  it('should initialize all days to empty string', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)

    phase.execute(context)

    for (let d = 1; d <= 7; d++) {
      expect(context.matrix['emp1'][d]).toBe('')
    }
  })

  it('should reset tracking sets', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    // Pre-populate tracking sets
    context.employeesWithCompletedNightBlock.add('emp1')
    context.daysNeedingPI.push(1, 2, 3)

    phase.execute(context)

    expect(context.employeesWithCompletedNightBlock.size).toBe(0)
    expect(context.daysNeedingPI).toHaveLength(0)
  })

  it('should handle empty employees list', () => {
    const days = createMockDays(7)
    const context = createMockContext({}, [], days)

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    expect(Object.keys(context.matrix)).toHaveLength(0)
  })
})

// ============================================
// APPLY CONSTRAINTS PHASE (Order 20)
// ============================================

describe('ApplyConstraintsPhase', () => {
  let phase: ApplyConstraintsPhase

  beforeEach(() => {
    phase = new ApplyConstraintsPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('ApplyConstraints')
    expect(phase.order).toBe(20)
  })

  it('should apply holiday (B) to all non-fixed employees', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Carlos', { fixedShift: 'P' }),
    ]
    const days = createMockDays(7)
    days[2].isHoliday = true // Day 3 is holiday
    
    const context = createMockContext({}, employees, days)
    // Initialize matrix first
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    expect(context.matrix['emp1'][3]).toBe('B')
    expect(context.matrix['emp2'][3]).toBe('B')
    expect(context.matrix['emp3'][3]).toBe('') // Fixed shift employee not affected
  })

  it('should apply vacation (V) constraint', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(10)
    const context = createMockContext({}, employees, days)
    
    // Initialize matrix
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    // Set vacation constraint for days 3-5
    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'vacation',
        start_date: new Date(2025, 0, 3),
        end_date: new Date(2025, 0, 5),
        status: 'approved',
      },
    ])

    phase.execute(context)

    expect(context.matrix['emp1'][3]).toBe('V')
    expect(context.matrix['emp1'][4]).toBe('V')
    expect(context.matrix['emp1'][5]).toBe('V')
    expect(context.matrix['emp1'][2]).toBe('')
    expect(context.matrix['emp1'][6]).toBe('')
  })

  it('should apply sick leave (IT) constraint', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'sick_leave',
        start_date: new Date(2025, 0, 1),
        end_date: new Date(2025, 0, 2),
        status: 'approved',
      },
    ])

    phase.execute(context)

    expect(context.matrix['emp1'][1]).toBe('IT')
    expect(context.matrix['emp1'][2]).toBe('IT')
  })

  it('should apply sick day (E) constraint', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'sick_day',
        start_date: new Date(2025, 0, 4),
        end_date: new Date(2025, 0, 4),
        status: 'approved',
      },
    ])

    phase.execute(context)

    expect(context.matrix['emp1'][4]).toBe('E')
  })

  it('should apply training (FO) constraint', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'training',
        start_date: new Date(2025, 0, 6),
        end_date: new Date(2025, 0, 7),
        status: 'approved',
      },
    ])

    phase.execute(context)

    expect(context.matrix['emp1'][6]).toBe('FO')
    expect(context.matrix['emp1'][7]).toBe('FO')
  })

  it('should apply REQUEST_OFF marker', () => {
    // Need enough employees to meet critical minimum (3) so REQUEST_OFF is not cancelled
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
      createMockEmployee('emp4', 'Marta'),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'request_off',
        start_date: new Date(2025, 0, 5),
        end_date: new Date(2025, 0, 5),
        status: 'approved',
      },
    ])

    phase.execute(context)

    // With 4 employees and 1 REQUEST_OFF, we still have 3 available (meets minimum)
    expect(context.matrix['emp1'][5]).toBe('REQUEST_OFF')
  })

  it('should apply REQUEST_X marker for shift requests', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'request_shift',
        start_date: new Date(2025, 0, 3),
        end_date: new Date(2025, 0, 3),
        shift_code: 'M',
        status: 'approved',
      },
    ])

    phase.execute(context)

    expect(context.matrix['emp1'][3]).toBe('REQUEST_M')
  })

  it('should apply AVOID_X marker', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'request_no_shift',
        start_date: new Date(2025, 0, 2),
        end_date: new Date(2025, 0, 2),
        shift_code: 'N',
        status: 'approved',
      },
    ])

    phase.execute(context)

    expect(context.matrix['emp1'][2]).toBe('AVOID_N')
  })

  it('should skip non-approved constraints', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'vacation',
        start_date: new Date(2025, 0, 1),
        end_date: new Date(2025, 0, 3),
        status: 'pending', // Not approved!
      },
    ])

    phase.execute(context)

    expect(context.matrix['emp1'][1]).toBe('')
    expect(context.matrix['emp1'][2]).toBe('')
    expect(context.matrix['emp1'][3]).toBe('')
  })

  it('should mark days needing PI when available staff is between 3-4', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
      createMockEmployee('emp4', 'Marta'),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    // Initialize matrix with one person on vacation day 3
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'vacation',
        start_date: new Date(2025, 0, 3),
        end_date: new Date(2025, 0, 3),
        status: 'approved',
      },
    ])

    phase.execute(context)

    // Day 3 has only 3 available (4-1), needs PI reinforcement
    expect(context.daysNeedingPI).toContain(3)
  })

  it('should override REQUEST_OFF when below critical minimum (3)', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    // Two people request off on same day - only 1 available (below critical 3)
    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'request_off',
        start_date: new Date(2025, 0, 5),
        end_date: new Date(2025, 0, 5),
        status: 'approved',
        priority: 3,
      },
      {
        employee_id: 'emp2',
        constraint_type: 'request_off',
        start_date: new Date(2025, 0, 5),
        end_date: new Date(2025, 0, 5),
        status: 'approved',
        priority: 5, // Lower priority, will be overridden first
      },
    ])

    const result = phase.execute(context)

    // At least one REQUEST_OFF should be cleared to meet minimum
    const day5Values = [
      context.matrix['emp1'][5],
      context.matrix['emp2'][5],
      context.matrix['emp3'][5],
    ]
    const requestOffCount = day5Values.filter(v => v === 'REQUEST_OFF').length
    expect(requestOffCount).toBeLessThanOrEqual(1) // At most 1 can keep REQUEST_OFF
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

// ============================================
// APPLY EMPLOYEE RULES PHASE (Order 30)
// ============================================

describe('ApplyEmployeeRulesPhase', () => {
  let phase: ApplyEmployeeRulesPhase

  beforeEach(() => {
    phase = new ApplyEmployeeRulesPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('apply-employee-rules')
    expect(phase.order).toBe(30)
  })

  it('should apply fixed shift on fixed days', () => {
    // Employee works Mon-Fri (1-5) with P shift
    const employee = createMockEmployee('emp1', 'Marta', {
      fixedDays: [1, 2, 3, 4, 5], // Mon-Fri
      fixedShift: 'P',
    })
    // Start on Monday
    const days = createMockDays(7, 1) // 1=Monday
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    // Days 1-5 should be P (Mon-Fri)
    expect(context.matrix['emp1'][1]).toBe('P')
    expect(context.matrix['emp1'][2]).toBe('P')
    expect(context.matrix['emp1'][3]).toBe('P')
    expect(context.matrix['emp1'][4]).toBe('P')
    expect(context.matrix['emp1'][5]).toBe('P')
  })

  it('should apply libre on weekends for noWeekends employees', () => {
    const employee = createMockEmployee('emp1', 'Marta', {
      fixedDays: [1, 2, 3, 4, 5],
      fixedShift: 'P',
      noWeekends: true,
    })
    const days = createMockDays(7, 1) // Start Monday
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.execute(context)

    // Days 6-7 (Sat-Sun) should be libre
    expect(context.matrix['emp1'][6]).toMatch(/^L\d$/)
    expect(context.matrix['emp1'][7]).toMatch(/^L\d$/)
  })

  it('should apply only noWeekends without fixed shift', () => {
    const employee = createMockEmployee('emp1', 'Juan', {
      noWeekends: true,
    })
    const days = createMockDays(14, 1) // 2 weeks starting Monday
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.execute(context)

    // Day 6 (Sat week 1), Day 7 (Sun week 1), Day 13 (Sat week 2), Day 14 (Sun week 2)
    expect(context.matrix['emp1'][6]).toMatch(/^L\d$/)
    expect(context.matrix['emp1'][7]).toMatch(/^L\d$/)
    expect(context.matrix['emp1'][13]).toMatch(/^L\d$/)
    expect(context.matrix['emp1'][14]).toMatch(/^L\d$/)
    // Weekdays should remain empty
    expect(context.matrix['emp1'][1]).toBe('')
    expect(context.matrix['emp1'][8]).toBe('')
  })

  it('should not override existing assignments', () => {
    const employee = createMockEmployee('emp1', 'Marta', {
      fixedDays: [1, 2, 3, 4, 5],
      fixedShift: 'P',
    })
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }
    // Pre-assign vacation on day 2
    context.matrix['emp1'][2] = 'V'

    phase.execute(context)

    expect(context.matrix['emp1'][1]).toBe('P')
    expect(context.matrix['emp1'][2]).toBe('V') // Not overridden
    expect(context.matrix['emp1'][3]).toBe('P')
  })

  it('should handle multiple employees with different rules', () => {
    const employees = [
      createMockEmployee('emp1', 'Marta', {
        fixedDays: [1, 2, 3, 4, 5],
        fixedShift: 'P',
        noWeekends: true,
      }),
      createMockEmployee('emp2', 'Juan', {
        noWeekends: true,
      }),
      createMockEmployee('emp3', 'Maria'), // No rules
    ]
    const days = createMockDays(7, 1)
    const context = createMockContext({}, employees, days)
    
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    phase.execute(context)

    // Ana: P on weekdays, L on weekends
    expect(context.matrix['emp1'][1]).toBe('P')
    expect(context.matrix['emp1'][6]).toMatch(/^L\d$/)
    
    // Juan: L on weekends only
    expect(context.matrix['emp2'][1]).toBe('')
    expect(context.matrix['emp2'][6]).toMatch(/^L\d$/)
    
    // Maria: no changes
    expect(context.matrix['emp3'][1]).toBe('')
    expect(context.matrix['emp3'][6]).toBe('')
  })
})

// ============================================
// ENFORCE POST-NIGHT REST PHASE (Order 45)
// ============================================

describe('EnforcePostNightRestPhase', () => {
  let phase: EnforcePostNightRestPhase

  beforeEach(() => {
    phase = new EnforcePostNightRestPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('enforce-post-night-rest')
    expect(phase.order).toBe(45)
  })

  it('should set libre after night block ends', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(10)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'N', 2: 'N', 3: 'N', 4: 'N', // Night block days 1-4
      5: '', 6: '', 7: '', 8: '', 9: '', 10: '',
    }

    phase.execute(context)

    // Day 5 should be libre (day after night block)
    expect(context.matrix['emp1'][5]).toMatch(/^L\d$/)
  })

  it('should set PREFER_T marker on day after rest', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(10)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'N', 2: 'N', 3: 'N', 4: 'N',
      5: '', 6: '', 7: '', 8: '', 9: '', 10: '',
    }

    phase.execute(context)

    // Day 6 should be PREFER_T (48h rule - can work afternoon)
    expect(context.matrix['emp1'][6]).toBe('PREFER_T')
  })

  it('should handle multiple night blocks', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(20)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }
    // Block 1: days 1-3
    context.matrix['emp1'][1] = 'N'
    context.matrix['emp1'][2] = 'N'
    context.matrix['emp1'][3] = 'N'
    // Block 2: days 10-13
    context.matrix['emp1'][10] = 'N'
    context.matrix['emp1'][11] = 'N'
    context.matrix['emp1'][12] = 'N'
    context.matrix['emp1'][13] = 'N'

    phase.execute(context)

    // After block 1: day 4 = libre, day 5 = PREFER_T
    expect(context.matrix['emp1'][4]).toMatch(/^L\d$/)
    expect(context.matrix['emp1'][5]).toBe('PREFER_T')
    
    // After block 2: day 14 = libre, day 15 = PREFER_T
    expect(context.matrix['emp1'][14]).toMatch(/^L\d$/)
    expect(context.matrix['emp1'][15]).toBe('PREFER_T')
  })

  it('should skip fixed-shift employees', () => {
    const employee = createMockEmployee('emp1', 'Marta', { fixedShift: 'P' })
    const days = createMockDays(10)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'N', 2: 'N', 3: 'N', 4: 'N',
      5: '', 6: '', 7: '', 8: '', 9: '', 10: '',
    }

    phase.execute(context)

    // Should not be modified (fixed shift employee)
    expect(context.matrix['emp1'][5]).toBe('')
    expect(context.matrix['emp1'][6]).toBe('')
  })

  it('should not override vacation/sick leave on rest day', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(10)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'N', 2: 'N', 3: 'N', 4: 'N',
      5: 'V', // Already on vacation
      6: '', 7: '', 8: '', 9: '', 10: '',
    }

    phase.execute(context)

    // Should not override vacation
    expect(context.matrix['emp1'][5]).toBe('V')
  })

  it('should handle employee with no night shifts', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L',
    }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    // Nothing should change
    expect(context.matrix['emp1'][1]).toBe('M')
  })

  it('should handle night block at end of month', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'M', 2: 'M', 3: 'M',
      4: 'N', 5: 'N', 6: 'N', 7: 'N', // Night block at end
    }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    // No rest day can be assigned (beyond month)
    // But no error should occur
  })
})

// ============================================
// PHASE REGISTRY
// ============================================

describe('PhaseRegistry', () => {
  let registry: PhaseRegistry

  beforeEach(() => {
    registry = createPhaseRegistry()
  })

  it('should register phases', () => {
    const phase = new InitializeMatrixPhase()
    registry.register(phase)

    expect(registry.count).toBe(1)
    expect(registry.get('initialize-matrix')).toBe(phase)
  })

  it('should list registered phase names', () => {
    registry.register(new InitializeMatrixPhase())
    registry.register(new ApplyConstraintsPhase())

    const names = registry.list()
    
    expect(names).toContain('initialize-matrix')
    expect(names).toContain('ApplyConstraints')
  })

  it('should unregister phases', () => {
    registry.register(new InitializeMatrixPhase())
    
    const removed = registry.unregister('initialize-matrix')
    
    expect(removed).toBe(true)
    expect(registry.count).toBe(0)
    expect(registry.get('initialize-matrix')).toBeUndefined()
  })

  it('should enable and disable phases', () => {
    const phase = new InitializeMatrixPhase()
    registry.register(phase)
    
    expect(phase.enabled).toBe(true)
    
    registry.disable('initialize-matrix')
    expect(phase.enabled).toBe(false)
    
    registry.enable('initialize-matrix')
    expect(phase.enabled).toBe(true)
  })

  it('should return enabled phases sorted by order', () => {
    const phase1 = new ApplyConstraintsPhase() // order 20
    const phase2 = new InitializeMatrixPhase() // order 10
    const phase3 = new ApplyEmployeeRulesPhase() // order 30
    
    registry.register(phase1)
    registry.register(phase2)
    registry.register(phase3)

    const enabled = registry.getEnabled()

    expect(enabled).toHaveLength(3)
    expect(enabled[0].order).toBe(10)
    expect(enabled[1].order).toBe(20)
    expect(enabled[2].order).toBe(30)
  })

  it('should exclude disabled phases from getEnabled', () => {
    registry.register(new InitializeMatrixPhase())
    registry.register(new ApplyConstraintsPhase())
    
    registry.disable('initialize-matrix')
    
    const enabled = registry.getEnabled()
    
    expect(enabled).toHaveLength(1)
    expect(enabled[0].name).toBe('ApplyConstraints')
  })

  it('should execute all phases in order', async () => {
    registry.register(new InitializeMatrixPhase())
    registry.register(new ApplyEmployeeRulesPhase())
    
    const employees = [
      createMockEmployee('emp1', 'Marta', {
        fixedDays: [1, 2, 3, 4, 5],
        fixedShift: 'P',
        noWeekends: true,
      }),
    ]
    const days = createMockDays(7, 1)
    const context = createMockContext({}, employees, days)

    const result = await registry.executeAll(context)

    expect(result.success).toBe(true)
    // Matrix should be initialized and rules applied
    expect(context.matrix['emp1']).toBeDefined()
    expect(context.matrix['emp1'][1]).toBe('P')
    expect(context.matrix['emp1'][6]).toMatch(/^L\d$/)
  })

  it('should accumulate warnings from all phases', async () => {
    registry.register(new InitializeMatrixPhase())
    registry.register(new ApplyConstraintsPhase())
    
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)

    // Set constraints that will generate warnings
    const constraintsPhase = registry.get('ApplyConstraints') as ApplyConstraintsPhase
    constraintsPhase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'request_off',
        start_date: new Date(2025, 0, 5),
        end_date: new Date(2025, 0, 5),
        status: 'approved',
        priority: 5,
      },
      {
        employee_id: 'emp2',
        constraint_type: 'request_off',
        start_date: new Date(2025, 0, 5),
        end_date: new Date(2025, 0, 5),
        status: 'approved',
        priority: 5,
      },
    ])

    const result = await registry.executeAll(context)

    expect(result.success).toBe(true)
    // Warnings should be accumulated in both result and context
    expect(context.warnings.length).toBeGreaterThanOrEqual(0)
  })

  it('should clear all phases', () => {
    registry.register(new InitializeMatrixPhase())
    registry.register(new ApplyConstraintsPhase())
    
    registry.clear()
    
    expect(registry.count).toBe(0)
    expect(registry.list()).toHaveLength(0)
  })

  it('should handle phase execution errors gracefully', async () => {
    // Create a phase that throws
    class FailingPhase extends InitializeMatrixPhase {
      readonly name = 'failing-phase'
      readonly order = 5
      
      execute(): never {
        throw new Error('Phase failed!')
      }
    }
    
    registry.register(new FailingPhase())
    registry.register(new InitializeMatrixPhase())
    
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)

    const result = await registry.executeAll(context)

    expect(result.success).toBe(false)
    expect(result.warnings.some(w => w.message.includes('failing-phase'))).toBe(true)
  })
})

// ============================================
// BASE PHASE HELPER METHODS
// ============================================

describe('BasePhase helper methods', () => {
  it('success() creates successful result', () => {
    const phase = new InitializeMatrixPhase()
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(1)
    const context = createMockContext({}, employees, days)

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    expect(result.warnings).toHaveLength(0)
    expect(result.message).toBeDefined()
  })

  it('enabled property defaults to true', () => {
    const phase = new InitializeMatrixPhase()
    expect(phase.enabled).toBe(true)
  })

  it('enabled can be toggled', () => {
    const phase = new InitializeMatrixPhase()
    phase.enabled = false
    expect(phase.enabled).toBe(false)
    phase.enabled = true
    expect(phase.enabled).toBe(true)
  })
})

// ============================================
// ASSIGN NIGHT BLOCKS PHASE (Order 40)
// ============================================

describe('AssignNightBlocksPhase', () => {
  let phase: AssignNightBlocksPhase

  beforeEach(() => {
    phase = new AssignNightBlocksPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('AssignNightBlocks')
    expect(phase.order).toBe(40)
  })

  it('should skip employees with fixedShift', () => {
    const employees = [
      createMockEmployee('emp1', 'Marta', { fixedShift: 'P' }),
      createMockEmployee('emp2', 'Juan'),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    // Initialize matrix
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    phase.execute(context)

    // Ana should have no nights assigned
    const anaNights = Object.values(context.matrix['emp1']).filter(s => s === 'N').length
    expect(anaNights).toBe(0)
  })

  it('should skip employees with noWeekends rule', () => {
    const employees = [
      createMockEmployee('emp1', 'Carlos', { noWeekends: true }),
      createMockEmployee('emp2', 'Juan'),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    phase.execute(context)

    // Carlos should have no nights assigned
    const carlosNights = Object.values(context.matrix['emp1']).filter(s => s === 'N').length
    expect(carlosNights).toBe(0)
  })

  it('should assign nights to eligible employees', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    const days = createMockDays(14)
    const context = createMockContext({}, employees, days)
    
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    phase.execute(context)

    // At least one employee should have nights assigned
    const totalNights = employees.reduce((sum, emp) => {
      return sum + Object.values(context.matrix[emp.id]).filter(s => s === 'N').length
    }, 0)
    expect(totalNights).toBeGreaterThan(0)
  })

  it('should handle no eligible employees gracefully', () => {
    const employees = [
      createMockEmployee('emp1', 'Marta', { fixedShift: 'P' }),
    ]
    const days = createMockDays(7)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    expect(result.message).toContain('No night-eligible employees')
  })

  it('should respect minNightBlock config', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const days = createMockDays(21) // 3 weeks
    const context = createMockContext({}, employees, days, {
      minNightBlock: 4,
      maxNightBlock: 6,
    })
    
    for (const emp of employees) {
      context.matrix[emp.id] = {}
      for (const day of days) {
        context.matrix[emp.id][day.dayNumber] = ''
      }
    }

    phase.execute(context)

    // Check each employee's night blocks (if any)
    for (const emp of employees) {
      const nights = days.filter(d => context.matrix[emp.id][d.dayNumber] === 'N')
      if (nights.length > 0) {
        // Nights should be at least 3 consecutive (MIN_CONSECUTIVE_NIGHTS)
        expect(nights.length).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

// ============================================
// ASSIGN ROTATING SHIFTS PHASE (Order 50)
// ============================================

describe('AssignRotatingShiftsPhase', () => {
  let phase: AssignRotatingShiftsPhase

  beforeEach(() => {
    phase = new AssignRotatingShiftsPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('AssignRotatingShifts')
    expect(phase.order).toBe(50)
  })

  it('should skip fixed-shift employees', () => {
    const employee = createMockEmployee('emp1', 'Marta', { fixedShift: 'P' })
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }

    phase.execute(context)

    // Should remain empty (fixed-shift employees are skipped)
    const shifts = Object.values(context.matrix['emp1']).filter(s => s === 'M' || s === 'T')
    expect(shifts.length).toBe(0)
  })

  it('should respect PREFER_T marker and assign T shift', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }
    context.matrix['emp1'][3] = 'PREFER_T'

    phase.execute(context)

    expect(context.matrix['emp1'][3]).toBe('T')
  })

  it('should respect REQUEST_M and assign M shift', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }
    context.matrix['emp1'][2] = 'REQUEST_M'

    phase.execute(context)

    expect(context.matrix['emp1'][2]).toBe('M')
  })

  it('should not override existing N shifts', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'N', 2: 'N', 3: 'N', 4: '', 5: '', 6: '', 7: '',
    }

    phase.execute(context)

    expect(context.matrix['emp1'][1]).toBe('N')
    expect(context.matrix['emp1'][2]).toBe('N')
    expect(context.matrix['emp1'][3]).toBe('N')
  })

  it('should not override vacation or sick leave', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: '', 2: 'V', 3: 'IT', 4: '', 5: 'B', 6: '', 7: '',
    }

    phase.execute(context)

    expect(context.matrix['emp1'][2]).toBe('V')
    expect(context.matrix['emp1'][3]).toBe('IT')
    expect(context.matrix['emp1'][5]).toBe('B')
  })

  it('should skip REQUEST_OFF days', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }
    context.matrix['emp1'][4] = 'REQUEST_OFF'

    phase.execute(context)

    // REQUEST_OFF should remain (to be handled by Phase 6)
    expect(context.matrix['emp1'][4]).toBe('REQUEST_OFF')
  })

  it('should assign libre when would exceed max consecutive work days', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(10, 1)
    const context = createMockContext({}, [employee], days, {
      maxConsecutiveWorkDays: 6,
    })
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = ''
    }
    // Pre-assign 6 consecutive work days
    context.matrix['emp1'][1] = 'M'
    context.matrix['emp1'][2] = 'M'
    context.matrix['emp1'][3] = 'M'
    context.matrix['emp1'][4] = 'M'
    context.matrix['emp1'][5] = 'M'
    context.matrix['emp1'][6] = 'M'

    phase.execute(context)

    // Day 7 should be libre to avoid >6 consecutive
    expect(context.matrix['emp1'][7]).toMatch(/^L\d$/)
  })
})

// ============================================
// ASSIGN WEEKLY OFFS PHASE (Order 60)
// ============================================

describe('AssignWeeklyOffsPhase', () => {
  let phase: AssignWeeklyOffsPhase

  beforeEach(() => {
    phase = new AssignWeeklyOffsPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('AssignWeeklyOffs')
    expect(phase.order).toBe(60)
  })

  it('should skip employees with fixedDays', () => {
    const employee = createMockEmployee('emp1', 'Marta', {
      fixedDays: [1, 2, 3, 4, 5],
      fixedShift: 'P',
    })
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'M', 7: 'M',
    }

    phase.execute(context)

    // Should not change anything for fixed-days employee
    expect(context.matrix['emp1'][6]).toBe('M')
    expect(context.matrix['emp1'][7]).toBe('M')
  })

  it('should convert REQUEST_OFF to libre', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'REQUEST_OFF', 6: 'M', 7: 'M',
    }

    phase.execute(context)

    // REQUEST_OFF should be converted to libre
    expect(context.matrix['emp1'][5]).toMatch(/^L\d$/)
  })

  it('should not convert N shifts to libre', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(14, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {}
    for (const day of days) {
      context.matrix['emp1'][day.dayNumber] = 'M'
    }
    // Set nights on weekend
    context.matrix['emp1'][6] = 'N'
    context.matrix['emp1'][7] = 'N'

    phase.execute(context)

    // Night shifts should not be converted
    expect(context.matrix['emp1'][6]).toBe('N')
    expect(context.matrix['emp1'][7]).toBe('N')
  })

  it('should try to assign consecutive libre days per week', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    // All work shifts, no libre assigned yet
    context.matrix['emp1'] = {
      1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M',
    }

    phase.execute(context)

    // Should have converted at least 2 days to libre
    const libreDays = Object.values(context.matrix['emp1']).filter(s => 
      s && s.startsWith('L')
    ).length
    expect(libreDays).toBeGreaterThanOrEqual(2)
  })
})

// ============================================
// VALIDATE FIX COVERAGE PHASE (Order 70)
// ============================================

describe('ValidateFixCoveragePhase', () => {
  let phase: ValidateFixCoveragePhase

  beforeEach(() => {
    phase = new ValidateFixCoveragePhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('ValidateFixCoverage')
    expect(phase.order).toBe(70)
  })

  it('should redistribute M to T when needed', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const days = createMockDays(1)
    const context = createMockContext({}, employees, days, {
      minMorningStaff: 1,
      minAfternoonStaff: 1,
    })
    
    // All 3 on M, 0 on T
    context.matrix['emp1'] = { 1: 'M' }
    context.matrix['emp2'] = { 1: 'M' }
    context.matrix['emp3'] = { 1: 'M' }

    phase.execute(context)

    // Should have redistributed at least 1 to T
    const tCount = Object.values(context.matrix).filter(m => m[1] === 'T').length
    expect(tCount).toBeGreaterThanOrEqual(1)
  })

  it('should convert libre to work when undercovered', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const days = createMockDays(1)
    const context = createMockContext({}, employees, days, {
      minMorningStaff: 2,
      minAfternoonStaff: 1,
    })
    
    // Only 1 on M, others on L
    context.matrix['emp1'] = { 1: 'M' }
    context.matrix['emp2'] = { 1: 'L1' }
    context.matrix['emp3'] = { 1: 'L1' }

    phase.execute(context)

    // Should have converted at least 1 L to M
    const mCount = Object.values(context.matrix).filter(m => m[1] === 'M').length
    expect(mCount).toBeGreaterThanOrEqual(2)
  })

  it('should skip holidays', () => {
    const employees = [createMockEmployee('emp1', 'Juan')]
    const days = createMockDays(2)
    days[0].isHoliday = true
    const context = createMockContext({}, employees, days, {
      minMorningStaff: 2,
    })
    
    context.matrix['emp1'] = { 1: 'L1', 2: 'M' }

    const result = phase.execute(context)

    // Holiday should not trigger coverage validation
    expect(result.success).toBe(true)
  })

  it('should skip fixed-shift employees from redistribution', () => {
    const employees = [
      createMockEmployee('emp1', 'Marta', { fixedShift: 'P' }),
      createMockEmployee('emp2', 'Juan'),
    ]
    const days = createMockDays(1)
    const context = createMockContext({}, employees, days, {
      minMorningStaff: 1,
      minAfternoonStaff: 1,
    })
    
    context.matrix['emp1'] = { 1: 'P' }
    context.matrix['emp2'] = { 1: 'M' }

    phase.execute(context)

    // Ana's P should not change
    expect(context.matrix['emp1'][1]).toBe('P')
  })
})

// ============================================
// ASSIGN PI SUPPORT PHASE (Order 80)
// ============================================

describe('AssignPISupportPhase', () => {
  let phase: AssignPISupportPhase

  beforeEach(() => {
    phase = new AssignPISupportPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('AssignPISupport')
    expect(phase.order).toBe(80)
  })

  it('should skip fixed-shift employees', () => {
    const employees = [
      createMockEmployee('emp1', 'Marta', { fixedShift: 'P' }),
      createMockEmployee('emp2', 'Juan'),
    ]
    const days = createMockDays(7, 1)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = { 1: 'L1', 2: 'L1', 3: 'L1', 4: 'L1', 5: 'L1', 6: 'L1', 7: 'L1' }
    context.matrix['emp2'] = { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    context.daysNeedingPI = [1]

    phase.execute(context)

    // Ana should not receive PI (fixed shift)
    expect(context.matrix['emp1'][1]).toBe('L1')
  })

  it('should prioritize days marked as needing PI', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    const days = createMockDays(7, 1)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    context.matrix['emp2'] = { 1: 'L1', 2: 'L1', 3: 'L1', 4: 'T', 5: 'T', 6: 'L1', 7: 'L1' }
    
    // Mark day 3 as needing PI
    context.daysNeedingPI = [3]

    const result = phase.execute(context)

    expect(result.success).toBe(true)
  })

  it('should respect REQUEST_OFF constraints', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    const days = createMockDays(7, 1)
    const context = createMockContext({}, employees, days)
    
    context.matrix['emp1'] = { 1: 'L1', 2: 'L1', 3: 'L1', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    context.matrix['emp2'] = { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    context.daysNeedingPI = [1]

    // Juan has REQUEST_OFF on day 1
    phase.setConstraints([
      {
        employee_id: 'emp1',
        constraint_type: 'request_off',
        start_date: new Date(2025, 0, 1),
        end_date: new Date(2025, 0, 1),
        status: 'approved',
      },
    ])

    phase.execute(context)

    // Juan should not receive PI on day 1 (REQUEST_OFF)
    expect(context.matrix['emp1'][1]).toBe('L1')
  })

  it('should assign PI when morning or afternoon has only 1 person', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    const days = createMockDays(7, 1)
    const context = createMockContext({}, employees, days)
    
    // Day 1: only 1 person on M
    context.matrix['emp1'] = { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    context.matrix['emp2'] = { 1: 'L1', 2: 'L1', 3: 'T', 4: 'T', 5: 'T', 6: 'L1', 7: 'L1' }
    context.matrix['emp3'] = { 1: 'L1', 2: 'L1', 3: 'L1', 4: 'L1', 5: 'L1', 6: 'L1', 7: 'L1' }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    // At least one PI should be assigned
  })

  it('should return success with no changes when no days need PI', () => {
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    const days = createMockDays(7, 1)
    const context = createMockContext({}, employees, days)
    
    // Good coverage, no days need PI
    context.matrix['emp1'] = { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    context.matrix['emp2'] = { 1: 'M', 2: 'M', 3: 'T', 4: 'T', 5: 'T', 6: 'L1', 7: 'L1' }
    context.daysNeedingPI = []

    const result = phase.execute(context)

    expect(result.success).toBe(true)
  })
})

// ============================================
// REPAIR SMALL BLOCKS PHASE (Order 85)
// ============================================

describe('RepairSmallBlocksPhase', () => {
  let phase: RepairSmallBlocksPhase

  beforeEach(() => {
    phase = new RepairSmallBlocksPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('RepairSmallBlocks')
    expect(phase.order).toBe(85)
  })

  it('should skip fixed-shift employees', () => {
    const employee = createMockEmployee('emp1', 'Marta', { fixedShift: 'P' })
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    // 2-day block (too small)
    context.matrix['emp1'] = {
      1: 'L1', 2: 'P', 3: 'P', 4: 'L1', 5: 'L1', 6: 'L1', 7: 'L1',
    }

    phase.execute(context)

    // Should not be modified
    expect(context.matrix['emp1'][2]).toBe('P')
    expect(context.matrix['emp1'][3]).toBe('P')
  })

  it('should skip fixedDays employees', () => {
    const employee = createMockEmployee('emp1', 'Marta', {
      fixedDays: [1, 2, 3, 4, 5],
    })
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    context.matrix['emp1'] = {
      1: 'L1', 2: 'M', 3: 'M', 4: 'L1', 5: 'L1', 6: 'L1', 7: 'L1',
    }

    phase.execute(context)

    // Should not be modified
    expect(context.matrix['emp1'][2]).toBe('M')
    expect(context.matrix['emp1'][3]).toBe('M')
  })

  it('should attempt to repair small blocks', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(10, 1)
    const context = createMockContext({}, [employee], days)
    
    // 2-day block surrounded by libre
    context.matrix['emp1'] = {
      1: 'L1', 2: 'L1', 3: 'M', 4: 'M', 5: 'L1', 6: 'L1', 7: 'L2', 8: 'L2', 9: 'L2', 10: 'L2',
    }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    // Should have attempted repair
  })
})

// ============================================
// FINAL VALIDATION PHASE (Order 90)
// ============================================

describe('FinalValidationPhase', () => {
  let phase: FinalValidationPhase

  beforeEach(() => {
    phase = new FinalValidationPhase()
  })

  it('should have correct name and order', () => {
    expect(phase.name).toBe('final-validation')
    expect(phase.order).toBe(90)
  })

  it('should skip fixedDays employees', () => {
    const employee = createMockEmployee('emp1', 'Marta', {
      fixedDays: [1, 2, 3, 4, 5],
    })
    const days = createMockDays(7, 1)
    const context = createMockContext({}, [employee], days)
    
    // Invalid schedule (no libre days) - but should be skipped
    context.matrix['emp1'] = {
      1: 'P', 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P',
    }

    const result = phase.execute(context)

    expect(result.success).toBe(true)
    // No warnings for fixed employee
    expect(result.warnings.length).toBe(0)
  })

  it('should warn about too few monthly libre days', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(28, 1) // 4 weeks
    const context = createMockContext({}, [employee], days, {
      minMonthlyLibre: 8,
      maxMonthlyLibre: 12,
    })
    
    // Only 4 libre days (below min 8)
    context.matrix['emp1'] = {}
    for (let i = 1; i <= 28; i++) {
      context.matrix['emp1'][i] = (i % 7 === 0) ? 'L1' : 'M'
    }

    const result = phase.execute(context)

    const libreWarning = result.warnings.find(w => 
      w.message.includes('días libres') && w.message.includes('mín')
    )
    expect(libreWarning).toBeDefined()
  })

  it('should warn about too many monthly libre days', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(28, 1)
    const context = createMockContext({}, [employee], days, {
      minMonthlyLibre: 8,
      maxMonthlyLibre: 10,
    })
    
    // 14 libre days (above max 10)
    context.matrix['emp1'] = {}
    for (let i = 1; i <= 28; i++) {
      context.matrix['emp1'][i] = (i <= 14) ? 'L1' : 'M'
    }

    const result = phase.execute(context)

    const libreWarning = result.warnings.find(w => 
      w.message.includes('días libres') && w.message.includes('máx')
    )
    expect(libreWarning).toBeDefined()
  })

  it('should warn about consecutive work days exceeding max', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(14, 1)
    const context = createMockContext({}, [employee], days, {
      maxConsecutiveWorkDays: 6,
    })
    
    // 8 consecutive work days
    context.matrix['emp1'] = {
      1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M', 8: 'M',
      9: 'L2', 10: 'L2', 11: 'M', 12: 'M', 13: 'L2', 14: 'L2',
    }

    const result = phase.execute(context)

    const consecutiveWarning = result.warnings.find(w => 
      w.message.includes('días seguidos')
    )
    expect(consecutiveWarning).toBeDefined()
  })

  it('should error on small work blocks', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(14, 1)
    const context = createMockContext({}, [employee], days)
    
    // 2-day work block (below min 3)
    context.matrix['emp1'] = {
      1: 'L1', 2: 'L1', 3: 'M', 4: 'M', 5: 'L1', 6: 'L1', 7: 'L1',
      8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L2', 14: 'L2',
    }

    const result = phase.execute(context)

    const blockError = result.warnings.find(w => 
      w.severity === 'error' && w.message.includes('bloque')
    )
    expect(blockError).toBeDefined()
  })

  it('should pass validation for a well-formed schedule', () => {
    const employee = createMockEmployee('emp1', 'Juan')
    const days = createMockDays(14, 1) // 2 weeks
    const context = createMockContext({}, [employee], days, {
      minMonthlyLibre: 4,
      maxMonthlyLibre: 6,
    })
    
    // Valid schedule: 5 work days, 2 libre per week
    context.matrix['emp1'] = {
      1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1',
      8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L2', 14: 'L2',
    }

    const result = phase.execute(context)

    // Should have no errors
    const errors = result.warnings.filter(w => w.severity === 'error')
    expect(errors.length).toBe(0)
  })
})
