// tests/scheduling/ai-validator.test.ts
// Unit tests for AI proposal validation

import { describe, it, expect, beforeEach } from 'vitest'
import { validateProposalStructure, validateAndApplyChanges } from '../../services/scheduling/ai/ai-proposal-validator.js'
import type { GeneratorContext, DayInfo, Employee, ScheduleMatrix, ShiftInfo } from '../../services/scheduling/types/index.js'
import type { AIProposal } from '../../services/scheduling/ai/types.js'

// ============================================
// TEST HELPERS
// ============================================

function createMockDays(count: number = 31): DayInfo[] {
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
    { id: 1, code: 'M', name: 'Mañana', startTime: '07:00', endTime: '15:00', hours: 8, color: '#FFD700', isWorkShift: true, isPaid: true, displayOrder: 1, isActive: true },
    { id: 2, code: 'T', name: 'Tarde', startTime: '15:00', endTime: '23:00', hours: 8, color: '#87CEEB', isWorkShift: true, isPaid: true, displayOrder: 2, isActive: true },
    { id: 3, code: 'N', name: 'Noche', startTime: '23:00', endTime: '07:00', hours: 8, color: '#191970', isWorkShift: true, isPaid: true, displayOrder: 3, isActive: true },
    { id: 4, code: 'L', name: 'Libre', startTime: null, endTime: null, hours: 0, color: '#90EE90', isWorkShift: false, isPaid: false, displayOrder: 4, isActive: true },
    { id: 5, code: 'V', name: 'Vacaciones', startTime: null, endTime: null, hours: 0, color: '#FFB6C1', isWorkShift: false, isPaid: true, displayOrder: 5, isActive: true },
    { id: 6, code: 'P', name: 'Presencia', startTime: '08:00', endTime: '15:00', hours: 7, color: '#DDA0DD', isWorkShift: true, isPaid: true, displayOrder: 6, isActive: true },
    { id: 7, code: 'PI', name: 'Presencia Intensiva', startTime: '08:00', endTime: '20:00', hours: 12, color: '#9370DB', isWorkShift: true, isPaid: true, displayOrder: 7, isActive: true },
    { id: 8, code: 'B', name: 'Baja', startTime: null, endTime: null, hours: 0, color: '#FF0000', isWorkShift: false, isPaid: false, displayOrder: 8, isActive: true },
    { id: 9, code: 'IT', name: 'Incapacidad Temporal', startTime: null, endTime: null, hours: 0, color: '#FFA500', isWorkShift: false, isPaid: false, displayOrder: 9, isActive: true },
  ]
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
      minMorningStaff: 1,  // Lowered for testing
      prefMorningStaff: 2,
      minAfternoonStaff: 1,  // Lowered for testing
      prefAfternoonStaff: 2,
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
// PROPOSAL STRUCTURE VALIDATION
// ============================================

describe('validateProposalStructure', () => {
  it('should accept valid proposal', () => {
    const proposal = {
      analysis: 'Coverage issue on day 5',
      changes: [
        { employeeId: 'emp1', day: 5, from: 'L', to: 'M', reason: 'Fill morning coverage gap' }
      ],
      confidence: 0.85
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject non-object response', () => {
    const result = validateProposalStructure(null)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Response is not a valid JSON object')
  })

  it('should reject missing analysis', () => {
    const proposal = {
      changes: [],
      confidence: 0.8
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('analysis'))).toBe(true)
  })

  it('should reject missing changes array', () => {
    const proposal = {
      analysis: 'Some analysis',
      confidence: 0.8
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('changes'))).toBe(true)
  })

  it('should reject invalid confidence', () => {
    const proposal = {
      analysis: 'Some analysis',
      changes: [],
      confidence: 1.5 // Invalid: must be 0-1
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Confidence'))).toBe(true)
  })

  it('should reject change with missing employeeId', () => {
    const proposal = {
      analysis: 'Issue',
      changes: [
        { day: 5, from: 'L', to: 'M', reason: 'Some reason here' }
      ],
      confidence: 0.8
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('employeeId'))).toBe(true)
  })

  it('should reject change with invalid day', () => {
    const proposal = {
      analysis: 'Issue',
      changes: [
        { employeeId: 'emp1', day: 35, from: 'L', to: 'M', reason: 'Some reason here' } // Invalid day
      ],
      confidence: 0.8
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('day'))).toBe(true)
  })

  it('should reject change with short reason', () => {
    const proposal = {
      analysis: 'Issue',
      changes: [
        { employeeId: 'emp1', day: 5, from: 'L', to: 'M', reason: 'Fix' } // Too short
      ],
      confidence: 0.8
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('reason'))).toBe(true)
  })

  it('should reject many changes with low confidence', () => {
    const proposal = {
      analysis: 'Complex issue',
      changes: [
        { employeeId: 'emp1', day: 1, from: 'L', to: 'M', reason: 'Change one here' },
        { employeeId: 'emp2', day: 2, from: 'L', to: 'M', reason: 'Change two here' },
        { employeeId: 'emp3', day: 3, from: 'L', to: 'M', reason: 'Change three here' },
        { employeeId: 'emp4', day: 4, from: 'L', to: 'M', reason: 'Change four here' }, // 4 changes
      ],
      confidence: 0.3 // Low confidence
    }
    const result = validateProposalStructure(proposal)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Too many changes'))).toBe(true)
  })
})

// ============================================
// CHANGE VALIDATION & APPLICATION
// ============================================

describe('validateAndApplyChanges', () => {
  let days: DayInfo[]
  let employees: Employee[]
  
  beforeEach(() => {
    days = createMockDays(14)
    employees = [
      createMockEmployee('emp1', 'Juan'),
      createMockEmployee('emp2', 'Maria'),
      createMockEmployee('emp3', 'Pedro'),
      createMockEmployee('emp4', 'Marta'),
      createMockEmployee('emp5', 'Carlos'),
    ]
  })

  it('should apply valid changes', () => {
    // Setup: emp1 on M, emp2 on T, emp3+4+5 provide coverage
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'L', 6: 'L', 7: 'T', 8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'L', 13: 'L', 14: 'T' },
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'L', 12: 'L', 13: 'M', 14: 'M' },
      emp5: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
    }
    const context = createMockContext(matrix, employees, days)
    
    // Change emp1 from M to T on day 1 (valid - still have coverage)
    const proposal: AIProposal = {
      analysis: 'Swap shifts for balance',
      changes: [
        { employeeId: 'emp1', day: 1, from: 'M', to: 'T', reason: 'Better balance needed' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(true)
    expect(result.appliedChanges).toHaveLength(1)
    expect(result.rejectedChanges).toHaveLength(0)
    expect(context.matrix.emp1[1]).toBe('T') // Change applied
  })

  it('should reject change for non-existent employee', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
    }
    const context = createMockContext(matrix, [employees[0]], days)
    
    const proposal: AIProposal = {
      analysis: 'Fix issue',
      changes: [
        { employeeId: 'emp99', day: 1, from: 'M', to: 'T', reason: 'Employee does not exist' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges).toHaveLength(1)
    expect(result.rejectedChanges[0].reason).toContain('Employee not found')
  })

  it('should reject change for non-existent day', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
    }
    const context = createMockContext(matrix, [employees[0]], days)
    
    const proposal: AIProposal = {
      analysis: 'Fix issue',
      changes: [
        { employeeId: 'emp1', day: 20, from: 'M', to: 'T', reason: 'Day does not exist' } // Only 14 days
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('Day not found')
  })

  it('should reject change when current shift does not match', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'T', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
    }
    const context = createMockContext(matrix, [employees[0]], days)
    
    const proposal: AIProposal = {
      analysis: 'Fix issue',
      changes: [
        { employeeId: 'emp1', day: 1, from: 'M', to: 'L', reason: 'Wrong current shift' } // Actually T
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('Current shift is T, not M')
  })

  it('should reject change to protected shift (vacation)', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'V', 2: 'V', 3: 'V', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
    }
    const context = createMockContext(matrix, [employees[0]], days)
    
    const proposal: AIProposal = {
      analysis: 'Need coverage',
      changes: [
        { employeeId: 'emp1', day: 1, from: 'V', to: 'M', reason: 'Cannot modify vacation' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('protected shift')
  })

  it('should reject change that breaks minimum coverage', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
    }
    // Min morning staff is 2, both are on M
    const context = createMockContext(matrix, employees.slice(0, 2), days, { minMorningStaff: 2 })
    
    const proposal: AIProposal = {
      analysis: 'Need to change',
      changes: [
        { employeeId: 'emp1', day: 1, from: 'M', to: 'L', reason: 'Would break coverage' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('morning staff')
  })

  it('should reject change that exceeds max consecutive work days', () => {
    // Ensure adequate coverage first
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', // 6 days
        7: 'L', // Rest day - changing this to M would create 7 consecutive
        8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' 
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'T', 7: 'T', 8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'L', 13: 'L', 14: 'T' },
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'N', 8: 'N', 9: 'N', 10: 'N', 11: 'L', 12: 'L', 13: 'M', 14: 'M' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    const proposal: AIProposal = {
      analysis: 'Fill gap',
      changes: [
        { employeeId: 'emp1', day: 7, from: 'L', to: 'M', reason: 'Would exceed 6 consecutive' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('consecutive work days')
  })

  it('should reject change that creates small work block', () => {
    // Setup where day 7 M->L would isolate days 8-9 as a 2-day block
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'M', 2: 'M', 3: 'M', 4: 'M', // 4 day block
        5: 'L', 6: 'L', // Rest
        7: 'M', 8: 'M', 9: 'M', // 3 day block - converting day 7 to L creates 2-day block
        10: 'L', 11: 'L', 12: 'M', 13: 'M', 14: 'M'
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'T', 7: 'T', 8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'L', 13: 'L', 14: 'T' },
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'N', 8: 'N', 9: 'N', 10: 'N', 11: 'L', 12: 'L', 13: 'M', 14: 'M' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    const proposal: AIProposal = {
      analysis: 'Adjust schedule',
      changes: [
        { employeeId: 'emp1', day: 7, from: 'M', to: 'L', reason: 'Would create 2-day block' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('work block')
  })

  it('should reject isolated night shift', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'L', 6: 'L', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'T', 7: 'T', 8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'L', 13: 'L', 14: 'T' },
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'N', 8: 'N', 9: 'N', 10: 'N', 11: 'L', 12: 'L', 13: 'M', 14: 'M' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    // Try to add isolated N to emp1 day 7 - no adjacent nights
    const proposal: AIProposal = {
      analysis: 'Add night shift',
      changes: [
        { employeeId: 'emp1', day: 7, from: 'M', to: 'N', reason: 'Isolated night' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('adjacent')
  })

  it('should allow night shift adjacent to existing night block', () => {
    // emp1 has night block on days 3-5, we want to add day 2 (adjacent)
    // Ensure all employees have clean work patterns (no small blocks)
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'L', 2: 'L', // Day 2 will be changed to N
        3: 'N', 4: 'N', 5: 'N', // Night block
        6: 'L', 7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L' 
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'L', 7: 'L', 8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L' },
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'L', 7: 'L', 8: 'N', 9: 'N', 10: 'N', 11: 'N', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    // Extend emp1's night block by adding N to day 2 (adjacent to day 3 which is N)
    const proposal: AIProposal = {
      analysis: 'Extend night block',
      changes: [
        { employeeId: 'emp1', day: 2, from: 'L', to: 'N', reason: 'Extend existing block' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(true)
    expect(result.appliedChanges).toHaveLength(1)
  })

  it('should reject work shift immediately after night shift (48h rest)', () => {
    // emp1 has nights days 3-6, day 7 is mandatory rest in week 1
    // Week 1: days 1-7, Week 2: days 8-14
    // We try to change day 7 from L to M - should fail because day before (6) is N
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'L', 2: 'L', // Rest days at start of week
        3: 'N', 4: 'N', 5: 'N', 6: 'N', // Night block ends day 6
        7: 'L', // MANDATORY rest day - trying to change to M
        8: 'L', // Second rest day (48h total)
        9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L'  // Valid work block + rest
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'M', 8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'L', 13: 'L', 14: 'M' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'L', 7: 'T', 8: 'L', 9: 'T', 10: 'T', 11: 'T', 12: 'L', 13: 'L', 14: 'T' },
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'N', 8: 'N', 9: 'N', 10: 'N', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    const proposal: AIProposal = {
      analysis: 'Need coverage',
      changes: [
        { employeeId: 'emp1', day: 7, from: 'L', to: 'M', reason: 'Violates 48h rest' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('48h rest required')
  })

  it('should reject morning shift 2 days after night (insufficient rest)', () => {
    // emp1 has nights days 3-6, day 7 is first rest, day 8 is second rest
    // We try to change day 8 to M (only 32h rest from end of night on day 6)
    // Week 1: days 1-7, Week 2: days 8-14
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'L', 2: 'L', // Rest at start
        3: 'N', 4: 'N', 5: 'N', 6: 'N', // Night block ends day 6
        7: 'L', // Day 1 of rest (mandatory)
        8: 'L', // Day 2 of rest - trying to change to M (only 32h rest)
        9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L'  // Valid 4-day block + rest
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'L', 7: 'L', 8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L' },
      // Night coverage for ALL days including day 7-8
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'N', 8: 'N', 9: 'N', 10: 'N', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    const proposal: AIProposal = {
      analysis: 'Need morning coverage',
      changes: [
        { employeeId: 'emp1', day: 8, from: 'L', to: 'M', reason: 'Only 32h rest' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    expect(result.rejectedChanges[0].reason).toContain('32h')
  })

  it('should allow afternoon shift 2 days after night (40h rest is OK)', () => {
    // emp1 has nights days 3-6, day 7 is first rest, day 8 is second rest
    // We change day 8 to T (T starts at 15:00, so 40h rest is acceptable)
    // Week 1: days 1-7, Week 2: days 8-14
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'L', 2: 'L', // Rest at start of week
        3: 'N', 4: 'N', 5: 'N', 6: 'N', // Night block ends day 6
        7: 'L', // Day 1 of rest (mandatory)
        8: 'L', // Day 2 of rest - trying to change to T (40h rest OK for T)
        9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L'  // Valid 4-day block + rest
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'T', 6: 'L', 7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L' },
      emp3: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L' },
      // Night coverage for ALL days including day 7-8
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 7: 'N', 8: 'N', 9: 'N', 10: 'N', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    const proposal: AIProposal = {
      analysis: 'Add afternoon coverage',
      changes: [
        { employeeId: 'emp1', day: 8, from: 'L', to: 'T', reason: '40h rest is acceptable for T' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(true)
  })

  it('should normalize L1, L2, L3 to L for comparison', () => {
    // emp1 has L1 on day 3 (middle of week 1), we want to change it to M
    // The AI sends "from: L" but matrix has "L1" - should match via normalization
    // Week 1: days 1-7 (emp1: M,M,L1,M,M,L,L = has 2 consecutive libre days 6-7)
    // Week 2: days 8-14
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'M', 2: 'M', // Work
        3: 'L1', // This L1 we'll change to M
        4: 'M', 5: 'M', // Work
        6: 'L', 7: 'L', // 2 consecutive libre days at end of week 1 - satisfies weekly rest
        8: 'M', 9: 'M', 10: 'M', 11: 'M', // Work block 4 days
        12: 'L', 13: 'L', // Rest
        14: 'L' // Extra rest
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L', 8: 'M', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'L', 14: 'L' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'L', 7: 'L', 8: 'T', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'L', 14: 'L' },
      // Night coverage for all days
      emp4: { 1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'N', 6: 'N', 7: 'N', 8: 'N', 9: 'N', 10: 'N', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, employees.slice(0, 4), days)
    
    // Change from L (AI sends L, matrix has L1) to M
    // After change: days 1-5 = M,M,M,M,M (5-day work block - OK)
    // Days 6-7 still have L,L = 2 consecutive libre days - satisfies weekly rest
    const proposal: AIProposal = {
      analysis: 'Fill coverage',
      changes: [
        { employeeId: 'emp1', day: 3, from: 'L', to: 'M', reason: 'L1 normalizes to L' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    // This should work because L1 normalizes to L
    expect(result.valid).toBe(true)
  })

  it('should reject employee with completed night block adding more nights', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 
        1: 'N', 2: 'N', 3: 'N', 4: 'N', 5: 'L', 6: 'L', 
        7: 'M', 8: 'M', 9: 'M', 10: 'M', 11: 'L', 12: 'L', 13: 'L', 14: 'M' 
      },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'L', 8: 'L', 9: 'M', 10: 'M', 11: 'M', 12: 'M', 13: 'N', 14: 'N' },
      emp3: { 1: 'T', 2: 'T', 3: 'T', 4: 'T', 5: 'T', 6: 'T', 7: 'L', 8: 'L', 9: 'T', 10: 'T', 11: 'T', 12: 'T', 13: 'N', 14: 'N' },
    }
    const context = createMockContext(matrix, employees.slice(0, 3), days, { minNightStaff: 0 })
    context.employeesWithCompletedNightBlock.add('emp1')
    
    const proposal: AIProposal = {
      analysis: 'Add more nights',
      changes: [
        // Day 12 is adjacent to day 11 (L), so technically would be isolated
        // But the main validation should catch "completed night block" first
        // Let's try day 14 adjacent to emp2/emp3 having N on 13-14
        { employeeId: 'emp1', day: 12, from: 'L', to: 'N', reason: 'Already completed night block' }
      ],
      confidence: 0.9
    }
    
    const result = validateAndApplyChanges(context, proposal)
    expect(result.valid).toBe(false)
    // Could fail for multiple reasons, but one should be about completed night block or isolated
    expect(result.rejectedChanges).toHaveLength(1)
  })
})
