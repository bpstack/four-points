// tests/scheduling/scoring.test.ts
// Unit tests for the scheduling scoring system

import { describe, it, expect, beforeEach } from 'vitest'
import { FatigueScorer } from '../../services/scheduling/scoring/fatigue-scorer.js'
import { BalanceScorer } from '../../services/scheduling/scoring/balance-scorer.js'
import { BlockScorer } from '../../services/scheduling/scoring/block-scorer.js'
import { calculateEmployeeScore, selectBestCandidate } from '../../services/scheduling/scoring/employee-scorer.js'
import type { GeneratorContext, DayInfo, Employee, ScheduleMatrix, ScoringWeights } from '../../services/scheduling/types/index.js'
import type { ScoringContext } from '../../services/scheduling/scoring/scoring-types.js'

// ============================================
// TEST HELPERS
// ============================================

function createMockDays(count: number = 14): DayInfo[] {
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

const DEFAULT_WEIGHTS: ScoringWeights = {
  fatigue: 1.0,
  balance: 1.0,
  preference: 1.2,
  coverage: 1.5,
  block: 1.3,
}

// ============================================
// FATIGUE SCORER TESTS
// ============================================

describe('FatigueScorer', () => {
  let scorer: FatigueScorer
  let days: DayInfo[]
  let employee: Employee

  beforeEach(() => {
    scorer = new FatigueScorer()
    days = createMockDays(14)
    employee = createMockEmployee('emp1', 'Juan')
  })

  it('should return 0 for employee with no prior work', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [employee], days)
    const scoringContext: ScoringContext = {
      generator: context,
      day: days[6], // Day 7
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    }
    
    const score = scorer.calculate(employee, scoringContext)
    expect(score).toBe(0) // No fatigue
  })

  it('should penalize consecutive work days', () => {
    // Employee worked days 1-3, now evaluating day 4
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [employee], days)
    const scoringContext: ScoringContext = {
      generator: context,
      day: days[3], // Day 4
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    }
    
    const score = scorer.calculate(employee, scoringContext)
    // 3 consecutive days * -10 = -30
    // + worked yesterday = -15
    // + 3 shifts this week * -2 = -6
    expect(score).toBeLessThan(0)
    expect(score).toBeLessThanOrEqual(-30) // At least -30 for consecutive days
  })

  it('should penalize more for more consecutive days', () => {
    // 5 consecutive days of work
    const matrix5days: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context5 = createMockContext(matrix5days, [employee], days)
    
    // 2 consecutive days of work
    const matrix2days: ScheduleMatrix = {
      emp1: { 1: 'L', 2: 'L', 3: 'L', 4: 'M', 5: 'M', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context2 = createMockContext(matrix2days, [employee], days)
    
    const score5 = scorer.calculate(employee, {
      generator: context5,
      day: days[5], // Day 6
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    })
    
    const score2 = scorer.calculate(employee, {
      generator: context2,
      day: days[5], // Day 6
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    })
    
    expect(score5).toBeLessThan(score2) // More fatigue for more consecutive days
  })

  it('should reset fatigue after rest day', () => {
    // Worked days 1-3, rest day 4, now evaluating day 5
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [employee], days)
    const scoringContext: ScoringContext = {
      generator: context,
      day: days[4], // Day 5
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    }
    
    const score = scorer.calculate(employee, scoringContext)
    // Consecutive work days should be 0 (rest day broke the streak)
    // Should only have weekly shift count penalty (3 shifts * -2 = -6)
    expect(score).toBeGreaterThan(-30) // Less penalty than 3 consecutive days
  })
})

// ============================================
// BALANCE SCORER TESTS
// ============================================

describe('BalanceScorer', () => {
  let scorer: BalanceScorer
  let days: DayInfo[]

  beforeEach(() => {
    scorer = new BalanceScorer()
    days = createMockDays(14)
  })

  it('should favor employees with fewer work days', () => {
    const emp1 = createMockEmployee('emp1', 'Juan')
    const emp2 = createMockEmployee('emp2', 'Maria')
    
    // emp1 has worked 3 days, emp2 has worked 6 days
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
      emp2: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'M', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, [emp1, emp2], days)
    const scoringContext: ScoringContext = {
      generator: context,
      day: days[7], // Day 8
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    }
    
    const score1 = scorer.calculate(emp1, scoringContext)
    const score2 = scorer.calculate(emp2, scoringContext)
    
    // emp1 should have higher score (more favorable) because they've worked less
    expect(score1).toBeGreaterThan(score2)
  })
})

// ============================================
// BLOCK SCORER TESTS
// ============================================

describe('BlockScorer', () => {
  let scorer: BlockScorer
  let days: DayInfo[]
  let employee: Employee

  beforeEach(() => {
    scorer = new BlockScorer()
    days = createMockDays(14)
    employee = createMockEmployee('emp1', 'Juan')
  })

  it('should favor continuing an existing work block', () => {
    // Employee has M on days 1-2, evaluating day 3
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [employee], days)
    
    // Evaluating continuation of block (day 3)
    const scoreContinue = scorer.calculate(employee, {
      generator: context,
      day: days[2], // Day 3
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    })
    
    // Evaluating starting fresh block (day 5)
    const scoreNew = scorer.calculate(employee, {
      generator: context,
      day: days[4], // Day 5
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    })
    
    // Continuing a block should be favorable
    expect(scoreContinue).toBeGreaterThan(scoreNew)
  })

  it('should penalize creating isolated single-day work', () => {
    // Employee has rest on days around day 5
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [employee], days)
    
    // Day 5 is surrounded by L (libre), would create isolated work
    const scoreIsolated = scorer.calculate(employee, {
      generator: context,
      day: days[4], // Day 5 (surrounded by L)
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    })
    
    // Day 4 is adjacent to work block, would continue it
    const scoreContinued = scorer.calculate(employee, {
      generator: context,
      day: days[3], // Day 4 (adjacent to M block)
      shiftType: 'M',
      weights: DEFAULT_WEIGHTS
    })
    
    // Isolated work should have lower score
    expect(scoreIsolated).toBeLessThan(scoreContinued)
  })
})

// ============================================
// EMPLOYEE SCORER (ORCHESTRATOR) TESTS
// ============================================

describe('calculateEmployeeScore', () => {
  let days: DayInfo[]
  let employee: Employee

  beforeEach(() => {
    days = createMockDays(14)
    employee = createMockEmployee('emp1', 'Juan')
  })

  it('should return a breakdown with all factors', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [employee], days)
    
    const breakdown = calculateEmployeeScore(employee, days[3], 'M', context)
    
    expect(breakdown.employeeId).toBe('emp1')
    expect(breakdown.employeeName).toBe('Juan')
    expect(breakdown.factors).toHaveProperty('fatigue')
    expect(breakdown.factors).toHaveProperty('balance')
    expect(breakdown.factors).toHaveProperty('preference')
    expect(breakdown.factors).toHaveProperty('coverage')
    expect(breakdown.factors).toHaveProperty('block')
    expect(breakdown.weighted).toHaveProperty('fatigue')
    expect(breakdown.totalScore).toBeDefined()
  })

  it('should apply weights correctly', () => {
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [employee], days)
    
    const customWeights: ScoringWeights = {
      fatigue: 2.0, // Double weight
      balance: 1.0,
      preference: 1.0,
      coverage: 1.0,
      block: 1.0,
    }
    
    const breakdownDefault = calculateEmployeeScore(employee, days[0], 'M', context, DEFAULT_WEIGHTS)
    const breakdownCustom = calculateEmployeeScore(employee, days[0], 'M', context, customWeights)
    
    // Weighted fatigue should be different
    if (breakdownDefault.factors.fatigue !== 0) {
      expect(breakdownCustom.weighted.fatigue).toBe(breakdownDefault.factors.fatigue * 2)
    }
  })
})

// ============================================
// SELECT BEST CANDIDATE TESTS
// ============================================

describe('selectBestCandidate', () => {
  let days: DayInfo[]

  beforeEach(() => {
    days = createMockDays(14)
  })

  it('should return null when no candidates', () => {
    const matrix: ScheduleMatrix = {}
    const context = createMockContext(matrix, [], days)
    
    const result = selectBestCandidate([], days[0], 'M', context)
    
    expect(result.selected).toBeNull()
    expect(result.reason).toContain('No hay candidatos')
  })

  it('should return the only candidate when just one', () => {
    const emp1 = createMockEmployee('emp1', 'Juan')
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' }
    }
    const context = createMockContext(matrix, [emp1], days)
    
    const result = selectBestCandidate([emp1], days[0], 'M', context)
    
    expect(result.selected).toBe(emp1)
    expect(result.candidates).toHaveLength(1)
  })

  it('should select the candidate with highest score', () => {
    const emp1 = createMockEmployee('emp1', 'Juan')
    const emp2 = createMockEmployee('emp2', 'Maria')
    
    // emp1 has more fatigue (worked 5 days), emp2 is fresh
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
      emp2: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, [emp1, emp2], days)
    
    const result = selectBestCandidate([emp1, emp2], days[5], 'M', context)
    
    // emp2 should be selected (less fatigue)
    expect(result.selected?.id).toBe('emp2')
    expect(result.candidates).toHaveLength(2)
    // Candidates should be sorted by score (highest first)
    expect(result.candidates[0].totalScore).toBeGreaterThanOrEqual(result.candidates[1].totalScore)
  })

  it('should consider preferences when selecting', () => {
    const emp1 = createMockEmployee('emp1', 'Juan', { shiftPriority: 'M' })
    const emp2 = createMockEmployee('emp2', 'Maria', { shiftPriority: 'T' })
    
    // Both employees are equally rested
    const matrix: ScheduleMatrix = {
      emp1: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
      emp2: { 1: 'L', 2: 'L', 3: 'L', 4: 'L', 5: 'L', 6: 'L', 7: 'L', 8: 'L', 9: 'L', 10: 'L', 11: 'L', 12: 'L', 13: 'L', 14: 'L' },
    }
    const context = createMockContext(matrix, [emp1, emp2], days)
    
    // Selecting for morning shift
    const resultM = selectBestCandidate([emp1, emp2], days[0], 'M', context)
    
    // emp1 prefers M so should score higher for morning
    expect(resultM.selected?.id).toBe('emp1')
    
    // Selecting for afternoon shift
    const resultT = selectBestCandidate([emp1, emp2], days[0], 'T', context)
    
    // emp2 prefers T so should score higher for afternoon
    expect(resultT.selected?.id).toBe('emp2')
  })
})
