// tests/scheduling/edge-cases.test.ts
// Tests for edge cases: 0 employees, impossible coverage, short periods, large teams, etc.

import { describe, it, expect } from 'vitest'
import { createPhaseRegistry } from '../../services/scheduling/phases/registry.js'
import { InitializeMatrixPhase } from '../../services/scheduling/phases/initialize-matrix.phase.js'
import { ApplyConstraintsPhase } from '../../services/scheduling/phases/apply-constraints.phase.js'
import { AssignNightBlocksPhase } from '../../services/scheduling/phases/assign-night-blocks.phase.js'
import { AssignRotatingShiftsPhase } from '../../services/scheduling/phases/assign-rotating-shifts.phase.js'
import { ValidateFixCoveragePhase } from '../../services/scheduling/phases/validate-fix-coverage.phase.js'
import { FinalValidationPhase } from '../../services/scheduling/phases/final-validation.phase.js'
import { CoverageConstraint } from '../../services/scheduling/constraints/coverage.constraint.js'
import { validateProposalStructure, validateAndApplyChanges } from '../../services/scheduling/ai/ai-proposal-validator.js'
import type { GeneratorContext, DayInfo, Employee, ScheduleMatrix, ShiftInfo } from '../../services/scheduling/types/index.js'
import type { AIProposal } from '../../services/scheduling/ai/types.js'

// ============================================
// TEST HELPERS
// ============================================

function createMockDays(count: number = 28): DayInfo[] {
  const days: DayInfo[] = []
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

function createMockShifts(): ShiftInfo[] {
  return [
    { id: 1, code: 'M', name: 'Mañana', startTime: '07:00', endTime: '15:00', hours: 8, color: '#4CAF50', isWorkShift: true, isPaid: true, displayOrder: 1, isActive: true },
    { id: 2, code: 'T', name: 'Tarde', startTime: '15:00', endTime: '23:00', hours: 8, color: '#2196F3', isWorkShift: true, isPaid: true, displayOrder: 2, isActive: true },
    { id: 3, code: 'N', name: 'Noche', startTime: '23:00', endTime: '07:00', hours: 8, color: '#9C27B0', isWorkShift: true, isPaid: true, displayOrder: 3, isActive: true },
    { id: 4, code: 'L', name: 'Libre', startTime: null, endTime: null, hours: 0, color: '#9E9E9E', isWorkShift: false, isPaid: false, displayOrder: 4, isActive: true },
    { id: 5, code: 'V', name: 'Vacaciones', startTime: null, endTime: null, hours: 0, color: '#FF9800', isWorkShift: false, isPaid: true, displayOrder: 5, isActive: true },
    { id: 6, code: 'IT', name: 'Baja médica', startTime: null, endTime: null, hours: 0, color: '#F44336', isWorkShift: false, isPaid: true, displayOrder: 6, isActive: true },
    { id: 7, code: 'B', name: 'Festivo', startTime: null, endTime: null, hours: 0, color: '#E91E63', isWorkShift: false, isPaid: true, displayOrder: 7, isActive: true },
    { id: 8, code: 'P', name: 'Presencial', startTime: '09:00', endTime: '17:00', hours: 8, color: '#00BCD4', isWorkShift: true, isPaid: true, displayOrder: 8, isActive: true },
    { id: 9, code: 'PI', name: 'Presencial Intermedio', startTime: '11:00', endTime: '19:00', hours: 8, color: '#009688', isWorkShift: true, isPaid: true, displayOrder: 9, isActive: true },
  ]
}

function createMockContext(
  employees: Employee[],
  days: DayInfo[],
  matrix: ScheduleMatrix = {},
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
    shifts: createMockShifts(),
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
// EDGE CASE: 0 EMPLOYEES
// ============================================

describe('EDGE CASE: Zero employees', () => {
  it('should handle empty employee list gracefully', async () => {
    const days = createMockDays(7)
    const context = createMockContext([], days)
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    expect(context.matrix).toEqual({})
  })

  it('should report coverage errors when no employees', () => {
    const days = createMockDays(7)
    const context = createMockContext([], days)
    context.matrix = {}
    
    const constraint = new CoverageConstraint()
    const result = constraint.check(context)
    
    expect(result.satisfied).toBe(false)
    expect(result.violations.length).toBeGreaterThan(0)
    expect(result.violations.some(v => v.message.includes('Mañana'))).toBe(true)
    expect(result.violations.some(v => v.message.includes('Tarde'))).toBe(true)
    expect(result.violations.some(v => v.message.includes('Noche'))).toBe(true)
  })

  it('should not crash during full pipeline with 0 employees', async () => {
    const days = createMockDays(7)
    const context = createMockContext([], days)
    
    const registry = createPhaseRegistry()
    registry.register(new InitializeMatrixPhase())
    registry.register(new AssignNightBlocksPhase())
    registry.register(new AssignRotatingShiftsPhase())
    registry.register(new ValidateFixCoveragePhase())
    registry.register(new FinalValidationPhase())
    
    await expect(registry.executeAll(context)).resolves.not.toThrow()
    
    const errors = context.warnings.filter(w => w.severity === 'error')
    expect(errors.length).toBeGreaterThan(0)
  })
})

// ============================================
// EDGE CASE: IMPOSSIBLE COVERAGE
// ============================================

describe('EDGE CASE: Impossible coverage', () => {
  it('should detect when minimum coverage exceeds available employees', () => {
    const days = createMockDays(7)
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M' },
      emp2: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'T', 7: 'T' },
    }
    
    const context = createMockContext(employees, days, matrix, {
      minMorningStaff: 2,
      minAfternoonStaff: 2,
      minNightStaff: 1,
    })
    
    const constraint = new CoverageConstraint()
    const result = constraint.check(context)
    
    expect(result.satisfied).toBe(false)
    expect(result.violations.some(v => v.severity === 'error')).toBe(true)
  })
})

// ============================================
// EDGE CASE: AI INVALID RESPONSES
// ============================================

describe('EDGE CASE: AI invalid responses', () => {
  it('should reject invalid proposal structure', () => {
    const invalidProposals = [
      null,
      'not an object',
      {},
      { changes: 'not array' },
      { changes: [], analysis: '', confidence: 2 }, // confidence out of range
    ]
    
    for (const proposal of invalidProposals) {
      const result = validateProposalStructure(proposal)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  it('should reject AI changes with invalid employee ID', () => {
    const days = createMockDays(7)
    const employees = [createMockEmployee('emp1', 'Juan')]
    const context = createMockContext(employees, days, {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    })
    
    const proposal: AIProposal = {
      analysis: 'Test analysis',
      changes: [
        { employeeId: 'non_existent', day: 1, from: 'M', to: 'T', reason: 'Test reason' }
      ],
      confidence: 0.8,
    }
    
    const result = validateAndApplyChanges(context, proposal)
    
    expect(result.appliedChanges.length).toBe(0)
    expect(result.rejectedChanges.length).toBe(1)
  })

  it('should reject AI changes with invalid day number', () => {
    const days = createMockDays(7)
    const employees = [createMockEmployee('emp1', 'Juan')]
    const context = createMockContext(employees, days, {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    })
    
    const proposal: AIProposal = {
      analysis: 'Test analysis',
      changes: [
        { employeeId: 'emp1', day: 99, from: 'M', to: 'T', reason: 'Test reason' },
      ],
      confidence: 0.8,
    }
    
    const result = validateAndApplyChanges(context, proposal)
    
    expect(result.appliedChanges.length).toBe(0)
    expect(result.rejectedChanges.length).toBe(1)
  })

  it('should reject AI changes with mismatched current shift', () => {
    const days = createMockDays(7)
    const employees = [createMockEmployee('emp1', 'Juan')]
    const context = createMockContext(employees, days, {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L1', 7: 'L1' }
    })
    
    const proposal: AIProposal = {
      analysis: 'Test analysis',
      changes: [
        { employeeId: 'emp1', day: 1, from: 'T', to: 'N', reason: 'Test reason' } // Day 1 is M, not T
      ],
      confidence: 0.8,
    }
    
    const result = validateAndApplyChanges(context, proposal)
    
    expect(result.appliedChanges.length).toBe(0)
    expect(result.rejectedChanges.length).toBe(1)
  })
})

// ============================================
// EDGE CASE: VERY SHORT PERIOD
// ============================================

describe('EDGE CASE: Very short period', () => {
  it('should handle 1 day schedule', async () => {
    const days = createMockDays(1)
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
    ]
    
    const context = createMockContext(employees, days, {}, {
      minMorningStaff: 1,
      minAfternoonStaff: 1,
      minNightStaff: 1,
    })
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    expect(Object.keys(context.matrix)).toHaveLength(3)
    for (const empId of Object.keys(context.matrix)) {
      expect(context.matrix[empId][1]).toBeDefined()
    }
  })

  it('should handle 3 day schedule', async () => {
    const days = createMockDays(3)
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    
    const context = createMockContext(employees, days, {}, {
      minNightBlock: 4, // Can't have 4 nights in 3 days
      minMorningStaff: 1,
      minAfternoonStaff: 1,
      minNightStaff: 1,
    })
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    const nightPhase = new AssignNightBlocksPhase()
    await nightPhase.execute(context)
    
    expect(context.matrix).toBeDefined()
  })
})

// ============================================
// EDGE CASE: ALL FIXED SHIFT EMPLOYEES
// ============================================

describe('EDGE CASE: All fixed shift employees', () => {
  it('should handle all employees with fixedShift: P', async () => {
    const days = createMockDays(7)
    const employees = [
      createMockEmployee('emp1', 'Juan', { fixedShift: 'P' }),
      createMockEmployee('emp2', 'Maria', { fixedShift: 'P' }),
      createMockEmployee('emp3', 'Pedro', { fixedShift: 'P' }),
    ]
    
    const context = createMockContext(employees, days)
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    const nightPhase = new AssignNightBlocksPhase()
    await nightPhase.execute(context)
    
    // No one should have N shifts
    for (const empId of Object.keys(context.matrix)) {
      for (let day = 1; day <= 7; day++) {
        expect(context.matrix[empId][day]).not.toBe('N')
      }
    }
    
    // Coverage should fail for nights
    const constraint = new CoverageConstraint()
    const result = constraint.check(context)
    expect(result.violations.some(v => v.message.includes('Noche'))).toBe(true)
  })

  it('should handle mix of fixed and rotating employees', async () => {
    const days = createMockDays(7)
    const employees = [
      createMockEmployee('emp1', 'Juan', { fixedShift: 'P', fixedDays: [1, 2, 3, 4, 5], noWeekends: true }),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
      createMockEmployee('emp4', 'Marta'),
    ]
    
    const context = createMockContext(employees, days, {}, {
      minMorningStaff: 1,
      minAfternoonStaff: 1,
      minNightStaff: 1,
    })
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    const nightPhase = new AssignNightBlocksPhase()
    await nightPhase.execute(context)
    
    // emp1 should never have N
    for (let day = 1; day <= 7; day++) {
      if (context.matrix['emp1'][day]) {
        expect(context.matrix['emp1'][day]).not.toBe('N')
      }
    }
    
    // At least one rotating employee should have nights
    const rotatingWithNights = ['emp2', 'emp3', 'emp4'].filter(empId => {
      for (let day = 1; day <= 7; day++) {
        if (context.matrix[empId][day] === 'N') return true
      }
      return false
    })
    
    expect(rotatingWithNights.length).toBeGreaterThan(0)
  })
})

// ============================================
// EDGE CASE: HOLIDAYS
// ============================================

describe('EDGE CASE: All days are holidays', () => {
  it('should handle week with all holidays', async () => {
    const days = createMockDays(7)
    days.forEach(d => { d.isHoliday = true; d.holidayName = 'Test Holiday' })
    
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    
    const context = createMockContext(employees, days)
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    const constraint = new CoverageConstraint()
    const result = constraint.check(context)
    
    expect(result.violations).toBeDefined()
  })
})

// ============================================
// EDGE CASE: CONFLICTING RULES
// ============================================

describe('EDGE CASE: Conflicting employee rules', () => {
  it('should handle noWeekends with fixedDays including weekend', async () => {
    const days = createMockDays(7)
    const employees = [
      createMockEmployee('emp1', 'Juan', {
        noWeekends: true,
        fixedDays: [1, 2, 3, 4, 5, 6, 7],
      }),
    ]
    
    const context = createMockContext(employees, days)
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    expect(context.matrix['emp1']).toBeDefined()
  })

  it('should handle fixedShift with minShiftPerMonth conflicting', async () => {
    const days = createMockDays(7)
    const employees = [
      createMockEmployee('emp1', 'Juan', {
        fixedShift: 'P',
        minShiftPerMonth: { N: 5 },
      }),
    ]
    
    const context = createMockContext(employees, days)
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    const nightPhase = new AssignNightBlocksPhase()
    await nightPhase.execute(context)
    
    // fixedShift takes precedence - no N shifts
    for (let day = 1; day <= 7; day++) {
      if (context.matrix['emp1'][day]) {
        expect(context.matrix['emp1'][day]).not.toBe('N')
      }
    }
  })
})

// ============================================
// EDGE CASE: LARGE TEAM
// ============================================

describe('EDGE CASE: Large team', () => {
  it('should handle 25 employees without crashing', async () => {
    const days = createMockDays(28)
    const employees = Array.from({ length: 25 }, (_, i) => 
      createMockEmployee(`emp${i + 1}`, `Employee ${i + 1}`)
    )
    
    const context = createMockContext(employees, days, {}, {
      minMorningStaff: 3,
      minAfternoonStaff: 3,
      minNightStaff: 2,
    })
    
    const startTime = Date.now()
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    const nightPhase = new AssignNightBlocksPhase()
    await nightPhase.execute(context)
    
    const rotatePhase = new AssignRotatingShiftsPhase()
    await rotatePhase.execute(context)
    
    const endTime = Date.now()
    
    expect(endTime - startTime).toBeLessThan(5000)
    expect(Object.keys(context.matrix)).toHaveLength(25)
  })
})

// ============================================
// EDGE CASE: EMPTY DAYS
// ============================================

describe('EDGE CASE: Empty days array', () => {
  it('should handle zero days gracefully', async () => {
    const days: DayInfo[] = []
    const employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
    ]
    
    const context = createMockContext(employees, days)
    
    const initPhase = new InitializeMatrixPhase()
    await initPhase.execute(context)
    
    expect(context.matrix).toBeDefined()
    expect(Object.keys(context.matrix['emp1'] || {}).length).toBe(0)
    expect(Object.keys(context.matrix['emp2'] || {}).length).toBe(0)
  })
})
