// services/scheduling/schedule-generator.ts
// Core algorithm for generating staff schedules

import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import type {
  SchedulingConfigMap,
  SchedulingShiftRow,
  SchedulingDayRow,
  SchedulingConstraintWithDetails,
  SchedulingEmployeeRuleWithEmployee,
  GenerationResult,
  GenerationWarning,
  BulkAssignmentDTO,
  EmployeeStats,
  DailyStats,
  DayOfWeek,
} from '../../models/scheduling/index.js'

// ============================================
// TYPES FOR GENERATOR
// ============================================

interface Employee {
  id: string
  name: string
  rules: {
    shiftPriority?: string // M, T, N
    maxShiftPerMonth?: { [key: string]: number } // { T: 5 }
    minShiftPerMonth?: { [key: string]: number }
    fixedDays?: number[] // 1,2,3,4,5 (Mon-Fri)
    fixedShift?: string // P
    noWeekends?: boolean
  }
}

interface ScheduleMatrix {
  [employeeId: string]: {
    [dayNumber: number]: string // shift code
  }
}

interface DayInfo {
  id: number
  dayNumber: number
  date: Date
  dayOfWeek: DayOfWeek
  weekNumber: number
  isHoliday: boolean
  holidayName?: string
}

/**
 * Previous month history for continuity
 */
interface PreviousMonthHistory {
  // Last shifts per employee (last 7 days)
  lastShifts: Map<string, { dayNumber: number; shiftCode: string }[]>
  // Employees who ended with incomplete night blocks (need to continue)
  incompleteNightBlocks: Map<string, number> // employeeId -> nights done at end of month
  // Last shift type (M/T) per employee for rotation
  lastShiftType: Map<string, 'M' | 'T'>
  // Did employee end with night? (needs 48h rest)
  endedWithNight: Map<string, boolean>
}

// ============================================
// SCHEDULE GENERATOR CLASS
// ============================================

export class ScheduleGenerator {
  private monthId: number
  private year: number
  private month: number
  private config: SchedulingConfigMap
  private shifts: SchedulingShiftRow[]
  private days: DayInfo[]
  private employees: Employee[]
  private constraints: SchedulingConstraintWithDetails[]
  private matrix: ScheduleMatrix = {}
  private warnings: GenerationWarning[] = []
  private seed: number // For randomization
  private previousMonthHistory: PreviousMonthHistory | null = null
  // Track employees who have completed their night block (cannot receive more nights)
  private employeesWithCompletedNightBlock: Set<string> = new Set()
  // Track days that need PI (reinforcement) due to reduced coverage (3-4 staff)
  private daysNeedingPI: number[] = []

  // ============================================
  // RANDOMIZATION HELPERS
  // ============================================

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  private shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  // randomChoice removed - not used

  /**
   * Get random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // ============================================
  // CENTRAL EXPANSION ORDER (GAUSS BELL)
  // ============================================

  // getCentralExpansionOrder and getDayProcessingOrder removed - central expansion disabled, using LINEAR strategy

  constructor(
    monthId: number,
    year: number,
    month: number,
    config: SchedulingConfigMap,
    shifts: SchedulingShiftRow[],
    days: SchedulingDayRow[],
    employees: Employee[],
    constraints: SchedulingConstraintWithDetails[]
  ) {
    this.monthId = monthId
    this.year = year
    this.month = month
    this.config = config
    this.shifts = shifts
    this.days = days.map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      date: new Date(d.date),
      dayOfWeek: d.day_of_week,
      weekNumber: d.week_number,
      isHoliday: d.is_holiday === 1,
      holidayName: d.holiday_name || undefined,
    }))
    this.employees = employees
    this.constraints = constraints
    this.seed = Date.now() // Use current timestamp as seed for randomization
    console.log(`[ScheduleGenerator] Initialized with seed: ${this.seed}`)
  }

  /**
   * Load and analyze previous month's schedule for continuity
   */
  async loadPreviousMonthHistory(): Promise<void> {
    const prevAssignments = await repo.getPreviousMonthEndAssignments(this.year, this.month, 7)
    
    if (prevAssignments.length === 0) {
      console.log(`[ScheduleGenerator] No previous month history found`)
      this.previousMonthHistory = null
      return
    }
    
    console.log(`[ScheduleGenerator] Loaded ${prevAssignments.length} assignments from previous month`)
    
    const history: PreviousMonthHistory = {
      lastShifts: new Map(),
      incompleteNightBlocks: new Map(),
      lastShiftType: new Map(),
      endedWithNight: new Map(),
    }
    
    // Group by employee
    const byEmployee = new Map<string, { dayNumber: number; shiftCode: string }[]>()
    for (const a of prevAssignments) {
      if (!byEmployee.has(a.employeeId)) {
        byEmployee.set(a.employeeId, [])
      }
      byEmployee.get(a.employeeId)!.push({ dayNumber: a.dayNumber, shiftCode: a.shiftCode })
    }
    
    // Analyze each employee's end-of-month pattern
    for (const [empId, shifts] of byEmployee) {
      // Sort by day descending (most recent first)
      shifts.sort((a, b) => b.dayNumber - a.dayNumber)
      history.lastShifts.set(empId, shifts)
      
      // Check if ended with night shifts (count consecutive nights at end)
      let consecutiveNights = 0
      for (const s of shifts) {
        if (s.shiftCode === 'N') {
          consecutiveNights++
        } else {
          break // Stop at first non-night
        }
      }
      
      if (consecutiveNights > 0) {
        history.endedWithNight.set(empId, true)
        // If less than minNightBlock, they need to continue
        const minBlock = this.config.minNightBlock || 4
        if (consecutiveNights < minBlock) {
          history.incompleteNightBlocks.set(empId, consecutiveNights)
          console.log(`[ScheduleGenerator] ${empId} has incomplete night block: ${consecutiveNights} nights (needs ${minBlock - consecutiveNights} more)`)
        }
      } else {
        history.endedWithNight.set(empId, false)
      }
      
      // Find last M/T shift for rotation continuity
      for (const s of shifts) {
        if (s.shiftCode === 'M' || s.shiftCode === 'T') {
          history.lastShiftType.set(empId, s.shiftCode as 'M' | 'T')
          break
        }
      }
    }
    
    this.previousMonthHistory = history
  }

  // ============================================
  // MAIN GENERATE METHOD
  // ============================================

  async generate(): Promise<GenerationResult> {
    const maxAttempts = 50 // Maximum retry attempts - keep trying until 0 errors
    let bestResult: GenerationResult | null = null
    let bestErrorCount = Infinity
    
    console.log(`[ScheduleGenerator] Starting generation with up to ${maxAttempts} attempts (until 0 errors)`)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startTime = Date.now()
      
      // Reset warnings for this attempt
      this.warnings = []
      
      // Reset completed night blocks tracker for this attempt
      this.employeesWithCompletedNightBlock = new Set()
      
      // Reset days needing PI reinforcement
      this.daysNeedingPI = []
      
      // Phase 0: Load previous month history for continuity (only on first attempt)
      if (attempt === 1) {
        await this.loadPreviousMonthHistory()
      }

      // Phase 1: Initialize matrix (reset for each attempt)
      this.initializeMatrix()

      // Phase 2: Apply fixed constraints (holidays, vacations, sick leave)
      this.applyFixedConstraints()

      // Phase 3: Apply employee-specific rules (EMP_01 R, etc.)
      this.applyEmployeeRules()

      // Phase 4: Assign night blocks (everyone does 4-6 consecutive nights/month)
      this.assignNightBlocks()

      // Phase 4.5: Enforce 48h rest after night blocks
      this.enforcePostNightRest()

      // Phase 5: Assign rotating shifts for remaining days
      this.assignRotatingShifts()

      // Phase 6: Assign weekly offs (L1, L2, etc.)
      this.assignWeeklyOffs()

      // Phase 7: Validate and fix coverage
      this.validateAndFixCoverage()

      // Phase 8: Assign PI (intervention support) where needed
      this.assignPISupport()

      // Phase 9: Final validation
      this.finalValidation()

      // Count errors
      const errorCount = this.warnings.filter((w) => w.severity === 'error').length
      const endTime = Date.now()
      
      console.log(`[ScheduleGenerator] Attempt ${attempt}: ${errorCount} errors, ${this.warnings.length} total warnings (${endTime - startTime}ms)`)
      
      // If no errors, we're done!
      if (errorCount === 0) {
        console.log(`[ScheduleGenerator] Success on attempt ${attempt}!`)
        const assignments = this.matrixToAssignments()
        const stats = this.calculateStats()
        
        return {
          success: true,
          monthId: this.monthId,
          assignmentsCount: assignments.length,
          generationTimeMs: endTime - startTime,
          warnings: this.warnings,
          stats,
          attempt, // Include which attempt succeeded
        }
      }
      
      // Keep track of best result (fewest errors)
      if (errorCount < bestErrorCount) {
        bestErrorCount = errorCount
        bestResult = {
          success: false,
          monthId: this.monthId,
          assignmentsCount: 0, // Will be calculated later
          generationTimeMs: endTime - startTime,
          warnings: [...this.warnings],
          stats: this.calculateStats(),
          attempt,
        }
      }
    }
    
    // All attempts failed - return the best result we got
    console.log(`[ScheduleGenerator] All ${maxAttempts} attempts failed. Best had ${bestErrorCount} errors.`)
    
    if (bestResult) {
      const assignments = this.matrixToAssignments()
      bestResult.assignmentsCount = assignments.length
      return bestResult
    }
    
    // Fallback (shouldn't happen)
    return {
      success: false,
      monthId: this.monthId,
      assignmentsCount: 0,
      generationTimeMs: 0,
      warnings: this.warnings,
      stats: this.calculateStats(),
    }
  }

  // ============================================
  // PHASE 1: INITIALIZE MATRIX
  // ============================================

  private initializeMatrix(): void {
    this.matrix = {}
    for (const employee of this.employees) {
      this.matrix[employee.id] = {}
      for (const day of this.days) {
        this.matrix[employee.id][day.dayNumber] = '' // Empty = not assigned
      }
    }
  }

  // ============================================
  // PHASE 2: APPLY FIXED CONSTRAINTS
  // ============================================

  private applyFixedConstraints(): void {
    // Apply company holidays (B for all)
    for (const day of this.days) {
      if (day.isHoliday) {
        for (const employee of this.employees) {
          // Skip if employee has special fixed shift
          if (!employee.rules.fixedShift) {
            this.matrix[employee.id][day.dayNumber] = 'B'
          }
        }
      }
    }

    // Apply individual constraints (vacations, sick leave, etc.)
    for (const constraint of this.constraints) {
      if (constraint.status !== 'approved') continue

      // Extract day numbers from constraint dates
      // MySQL DATE columns return dates at midnight UTC, but when converted to local timezone
      // they can shift to the previous day. We use getDate() (local) to get the correct day.
      const startDate = new Date(constraint.start_date)
      const endDate = new Date(constraint.end_date)
      
      // Use local date to get the day number (MySQL stores DATE as local date)
      // Adding 12 hours to avoid timezone boundary issues
      const startDateAdjusted = new Date(startDate.getTime() + 12 * 60 * 60 * 1000)
      const endDateAdjusted = new Date(endDate.getTime() + 12 * 60 * 60 * 1000)
      const startDay = startDateAdjusted.getUTCDate()
      const endDay = endDateAdjusted.getUTCDate()
      
      // Log constraint processing
      console.log(`[Constraints] Processing constraint for employee ${constraint.employee_id}:`, {
        type: constraint.constraint_type,
        rawStartDate: constraint.start_date,
        rawEndDate: constraint.end_date,
        startDay,
        endDay,
        status: constraint.status
      })

      for (const day of this.days) {
        // Compare by day number directly (much simpler and avoids timezone issues)
        if (day.dayNumber >= startDay && day.dayNumber <= endDay) {
          console.log(`[Constraints] Day ${day.dayNumber} matches constraint range (${startDay}-${endDay})`)
          let shiftCode = ''
          
          switch (constraint.constraint_type) {
            case 'vacation':
              shiftCode = 'V'
              break
            case 'sick_leave':
            case 'sick_day':
              shiftCode = constraint.constraint_type === 'sick_leave' ? 'IT' : 'E'
              break
            case 'training':
              shiftCode = 'FO'
              break
            case 'holiday':
              shiftCode = 'B'
              break
            case 'request_off':
              // Will be handled as L in weekly offs
              console.log(`[Constraints] Setting REQUEST_OFF for employee ${constraint.employee_id} on day ${day.dayNumber}`)
              this.matrix[constraint.employee_id][day.dayNumber] = 'REQUEST_OFF'
              continue
            case 'request_shift':
              // Will try to assign this shift
              this.matrix[constraint.employee_id][day.dayNumber] = `REQUEST_${constraint.shift_code}`
              continue
            case 'request_no_shift':
              // Will try to avoid this shift
              this.matrix[constraint.employee_id][day.dayNumber] = `AVOID_${constraint.shift_code}`
              continue
          }

          if (shiftCode) {
            this.matrix[constraint.employee_id][day.dayNumber] = shiftCode
          }
        }
      }
    }
    
    // Validate that we have enough staff after applying constraints
    this.validateConstraintsCoverage()
  }
  
  /**
   * Check if too many employees requested off on the same day
   * 
   * Coverage rules:
   * - CRITICAL MINIMUM: 3 staff (1M + 1T + 1N) - MUST be met, cancel REQUEST_OFF if needed
   * - IDEAL WITH PI: 5 staff (2M + 2T + 1N) - mark days needing PI reinforcement
   * 
   * If 3-4 available: suggest PI reinforcement (preferible pero no obligatorio)
   * If <3 available: cancel REQUEST_OFF from lowest priority employees
   */
  private validateConstraintsCoverage(): void {
    const CRITICAL_MINIMUM = 3  // 1M + 1T + 1N - absolute minimum
    const IDEAL_COVERAGE = 5    // 2M + 2T + 1N - full coverage with reinforcement
    
    console.log(`[validateConstraintsCoverage] Starting validation: ${this.employees.length} employees`)
    console.log(`[validateConstraintsCoverage] Critical minimum: ${CRITICAL_MINIMUM}, Ideal: ${IDEAL_COVERAGE}`)
    
    // Track days that need PI reinforcement
    this.daysNeedingPI = this.daysNeedingPI || []
    
    for (const day of this.days) {
      if (day.isHoliday) continue
      
      // Count employees with REQUEST_OFF or other absences on this day
      let unavailable = 0
      const unavailableNames: string[] = []
      
      for (const employee of this.employees) {
        const assignment = this.matrix[employee.id][day.dayNumber]
        if (assignment === 'REQUEST_OFF' || assignment === 'V' || 
            assignment === 'B' || assignment === 'IT' || assignment === 'E' || 
            assignment === 'FO') {
          unavailable++
          unavailableNames.push(employee.name)
        }
      }
      
      const available = this.employees.length - unavailable
      
      // Log for days with significant absences
      if (unavailable >= 3) {
        console.log(`[validateConstraintsCoverage] Day ${day.dayNumber}: ${available} available, ${unavailable} unavailable (${unavailableNames.join(', ')})`)
      }
      
      // Case 1: Below critical minimum - MUST cancel some REQUEST_OFF
      if (available < CRITICAL_MINIMUM) {
        console.log(`[Constraints] CRITICAL: Day ${day.dayNumber} has only ${available} employees (need ${CRITICAL_MINIMUM}). Unavailable: ${unavailableNames.join(', ')}`)
        
        const requestOffEmployees = this.employees.filter(e => 
          this.matrix[e.id][day.dayNumber] === 'REQUEST_OFF'
        )
        
        if (requestOffEmployees.length > 0) {
          // Get constraints for this day, sorted by priority (higher number = lower priority = cancel first)
          const dayConstraints = this.constraints
            .filter(c => {
              if (c.constraint_type !== 'request_off') return false
              const startDateAdjusted = new Date(new Date(c.start_date).getTime() + 12 * 60 * 60 * 1000)
              const endDateAdjusted = new Date(new Date(c.end_date).getTime() + 12 * 60 * 60 * 1000)
              return day.dayNumber >= startDateAdjusted.getUTCDate() && 
                     day.dayNumber <= endDateAdjusted.getUTCDate()
            })
            .sort((a, b) => (b.priority || 5) - (a.priority || 5)) // Lower priority first
          
          // Cancel REQUEST_OFF until we reach critical minimum
          let needed = CRITICAL_MINIMUM - available
          for (const constraint of dayConstraints) {
            if (needed <= 0) break
            
            const employee = this.employees.find(e => e.id === constraint.employee_id)
            if (!employee) continue
            
            // Clear the REQUEST_OFF - they will be assigned a shift
            this.matrix[employee.id][day.dayNumber] = ''
            needed--
            
            console.log(`[Constraints] Overriding REQUEST_OFF for ${employee.name} on day ${day.dayNumber} (priority: ${constraint.priority || 5})`)
            
            this.warnings.push({
              type: 'constraint',
              severity: 'warning',
              message: `${employee.name}: Petición de libre para día ${day.dayNumber} no pudo ser respetada por falta de cobertura`,
              employeeId: employee.id,
              employeeName: employee.name,
            })
          }
        }
      }
      // Case 2: Between critical and ideal - mark for PI reinforcement
      else if (available < IDEAL_COVERAGE) {
        console.log(`[Constraints] Day ${day.dayNumber}: ${available} available (suggest PI reinforcement)`)
        this.daysNeedingPI.push(day.dayNumber)
      }
    }
    
    if (this.daysNeedingPI.length > 0) {
      console.log(`[validateConstraintsCoverage] Days needing PI reinforcement: ${this.daysNeedingPI.join(', ')}`)
    }
  }

  // ============================================
  // PHASE 3: APPLY EMPLOYEE RULES
  // ============================================

  private applyEmployeeRules(): void {
    for (const employee of this.employees) {
      // EMP_01 R type: fixed days (Mon-Fri) with fixed shift (P)
      if (employee.rules.fixedDays && employee.rules.fixedShift) {
        for (const day of this.days) {
          // Convert day of week to number (1=Mon, 5=Fri, 6=Sat, 0=Sun)
          const dayNum = this.dayOfWeekToNumber(day.dayOfWeek)
          
          if (employee.rules.fixedDays.includes(dayNum)) {
            // Working day
            if (!this.matrix[employee.id][day.dayNumber]) {
              this.matrix[employee.id][day.dayNumber] = employee.rules.fixedShift
            }
          } else if (employee.rules.noWeekends) {
            // Weekend = libre
            if (!this.matrix[employee.id][day.dayNumber]) {
              this.matrix[employee.id][day.dayNumber] = `L${day.weekNumber}`
            }
          }
        }
      }
    }
  }

  // ============================================
  // PHASE 4: ASSIGN NIGHT BLOCKS
  // ============================================

  private assignNightBlocks(): void {
    // Get employees who can do nights (not fixed shift like EMP_01 R)
    const nightEligible = this.employees.filter(
      (e) => !e.rules.fixedShift && !e.rules.noWeekends
    )

    if (nightEligible.length === 0) return

    // Get all non-holiday days that need night coverage
    const nightDays = this.days.filter((d) => !d.isHoliday)
    const totalNights = nightDays.length
    const minBlock = this.config.minNightBlock || 4
    const maxBlock = this.config.maxNightBlock || 6

    const numEmployees = nightEligible.length
    
    // Track assigned nights per employee
    const employeeNights: Map<string, number[]> = new Map()
    nightEligible.forEach(e => employeeNights.set(e.id, []))
    
    // CRITICAL: Track which employees have completed their night block (cannot receive more nights)
    const employeeHasCompletedBlock: Set<string> = new Set()
    
    console.log(`[NightBlocks] ${totalNights} nights, ${numEmployees} employees, minBlock=${minBlock}, maxBlock=${maxBlock}`)

    // ========================================
    // PHASE 4.1: CONTINUE INCOMPLETE BLOCKS FROM PREVIOUS MONTH
    // ========================================
    const employeesWithContinuation: Set<string> = new Set()
    
    if (this.previousMonthHistory && this.previousMonthHistory.incompleteNightBlocks.size > 0) {
      console.log(`[NightBlocks] Continuing ${this.previousMonthHistory.incompleteNightBlocks.size} incomplete night blocks from previous month`)
      
      for (const [empId, nightsDone] of this.previousMonthHistory.incompleteNightBlocks) {
        const employee = nightEligible.find(e => e.id === empId)
        if (!employee) continue
        
        const nightsNeeded = minBlock - nightsDone
        console.log(`[NightBlocks] ${employee.name} needs ${nightsNeeded} more nights to complete block (had ${nightsDone})`)
        
        // Assign nights at START of month to continue the block
        // CRITICAL: Nights MUST be consecutive - stop if any day is blocked
        let assigned = 0
        for (let i = 0; i < nightsNeeded && i < nightDays.length; i++) {
          const day = nightDays[i]
          
          // Check if this day already has night coverage
          const existingNight = this.countShiftOnDay(day.dayNumber, 'N')
          if (existingNight >= 1) {
            // Day already covered - STOP here to maintain consecutive block
            console.log(`[NightBlocks] ${employee.name}: day ${day.dayNumber} already has coverage, stopping continuation at ${assigned} nights`)
            break
          }
          
          // Check if employee is available
          const currentAssignment = this.matrix[employee.id][day.dayNumber]
          // REQUEST_OFF must be respected - employee requested this day off
          const isRequestOff = currentAssignment === 'REQUEST_OFF'
          const isAvailable = !isRequestOff && (!currentAssignment || currentAssignment.startsWith('REQUEST') || currentAssignment.startsWith('AVOID'))
          const notAvoiding = currentAssignment !== 'AVOID_N'
          
          if (isAvailable && notAvoiding) {
            this.matrix[employee.id][day.dayNumber] = 'N'
            employeeNights.get(employee.id)!.push(day.dayNumber)
            assigned++
          } else {
            // Employee can't work this day - STOP here to maintain consecutive block
            if (isRequestOff) {
              console.log(`[NightBlocks] ${employee.name}: day ${day.dayNumber} is REQUEST_OFF, stopping continuation at ${assigned} nights`)
            } else {
              console.log(`[NightBlocks] ${employee.name}: can't work day ${day.dayNumber}, stopping continuation at ${assigned} nights`)
            }
            break
          }
        }
        
        if (assigned > 0) {
          employeesWithContinuation.add(empId)
          console.log(`[NightBlocks] ${employee.name}: continued with ${assigned} nights at start of month`)
          
          // CRITICAL: Mark as completed - they already have nights from previous month plus this continuation
          // They should NOT receive any more nights this month
          employeeHasCompletedBlock.add(empId)
          this.employeesWithCompletedNightBlock.add(empId)
          console.log(`[NightBlocks] ${employee.name}: marked as COMPLETED (continuation from previous month)`)
        }
      }
    }
    
    // ========================================
    // PHASE 4.2: ASSIGN REST DAY FOR EMPLOYEES WHO ENDED WITH NIGHTS
    // ========================================
    if (this.previousMonthHistory && this.previousMonthHistory.endedWithNight.size > 0) {
      for (const [empId, endedWithNight] of this.previousMonthHistory.endedWithNight) {
        if (!endedWithNight) continue
        if (employeesWithContinuation.has(empId)) continue // Already continuing nights
        
        const employee = nightEligible.find(e => e.id === empId)
        if (!employee) continue
        
        // This employee ended previous month with nights but completed their block
        // They need 48h rest, so day 1 should be libre and day 2 prefer T
        const day1 = this.days.find(d => d.dayNumber === 1)
        const day2 = this.days.find(d => d.dayNumber === 2)
        
        if (day1 && !this.matrix[employee.id][day1.dayNumber]) {
          this.matrix[employee.id][day1.dayNumber] = `L${day1.weekNumber}`
          console.log(`[NightBlocks] ${employee.name}: day 1 set to L (post-night rest from prev month)`)
        }
        if (day2 && !this.matrix[employee.id][day2.dayNumber]) {
          this.matrix[employee.id][day2.dayNumber] = 'PREFER_T'
          console.log(`[NightBlocks] ${employee.name}: day 2 set to PREFER_T (48h rest rule)`)
        }
      }
    }
    
    // ========================================
    // PHASE 4.3: ASSIGN NIGHT BLOCKS
    // ========================================
    // Strategy depends on whether this is first month or not:
    // - First month: Use central expansion (start from center, expand outward)
    // - Consecutive months: Use linear order (start from day 1)
    
    const shuffledEmployees = this.shuffle(nightEligible)
    console.log(`[NightBlocks] Available employees: ${shuffledEmployees.map(e => e.name).join(', ')}`)
    
    // Get days that need night coverage (excluding already assigned from continuation)
    const unassignedDays = nightDays
      .filter(d => this.countShiftOnDay(d.dayNumber, 'N') === 0)
    
    // IMPORTANT: We now use LINEAR strategy for ALL months (first month and consecutive)
    // CENTRAL EXPANSION was causing scattered night blocks because segments sorted by 
    // center proximity could assign non-adjacent segments to the same employee.
    // LINEAR (day 1 → day 31) guarantees consecutive night blocks.
    
    // ========================================
    // LINEAR STRATEGY (ALL months - central expansion removed)
    // ========================================
    // Standard linear assignment from day 1 to day 31
    // This guarantees consecutive night blocks because:
    // 1. Days are processed in order (1, 2, 3... 31)
    // 2. Employees are marked as COMPLETED after receiving any nights
    // 3. Later days cannot be assigned to completed employees
    
    console.log(`[NightBlocks] Using LINEAR strategy (guarantees consecutive night blocks)`)
    
    // CRITICAL: Minimum 3 consecutive nights is MANDATORY
    const MIN_CONSECUTIVE_NIGHTS = 3
    
    const sortedDays = [...unassignedDays].sort((a, b) => a.dayNumber - b.dayNumber)
    let dayIndex = 0
    
    while (dayIndex < sortedDays.length) {
      // Get the current day we're trying to assign
      const currentDay = sortedDays[dayIndex].dayNumber
      
      // Find available employees (haven't reached max nights AND can do at least MIN_CONSECUTIVE)
      // CRITICAL: Only consider employees with NO nights yet OR whose existing nights are ADJACENT
      const availableEmployees = this.shuffle(
        shuffledEmployees.filter(emp => {
          // Skip employees who already completed their night block
          if (employeeHasCompletedBlock.has(emp.id)) return false
          
          const existingNights = employeeNights.get(emp.id)!
          const remainingCapacity = maxBlock - existingNights.length
          if (remainingCapacity < MIN_CONSECUTIVE_NIGHTS) return false
          
          // If employee has existing nights, check if this day would be adjacent
          if (existingNights.length > 0) {
            const sortedExisting = [...existingNights].sort((a, b) => a - b)
            const existingFirst = sortedExisting[0]
            const existingLast = sortedExisting[sortedExisting.length - 1]
            
            // Current day must be immediately before or after existing nights
            const isAdjacentBefore = currentDay === existingFirst - 1
            const isAdjacentAfter = currentDay === existingLast + 1
            
            if (!isAdjacentBefore && !isAdjacentAfter) {
              return false // Would create scattered nights
            }
          }
          
          return true
        })
      )
      
      // If no employee can do MIN_CONSECUTIVE with adjacency, find any with capacity that has NO nights
      const fallbackEmployees = availableEmployees.length === 0 
        ? this.shuffle(shuffledEmployees.filter(emp => {
            // Skip completed employees
            if (employeeHasCompletedBlock.has(emp.id)) return false
            const existingNights = employeeNights.get(emp.id)!
            // CRITICAL: Only employees with ZERO nights can be fallback (to avoid scattered)
            return existingNights.length === 0 && existingNights.length < maxBlock
          }))
        : []
      
      const employeesToUse = availableEmployees.length > 0 ? availableEmployees : fallbackEmployees
      
      if (employeesToUse.length === 0) {
        console.log(`[NightBlocks] No more available employees at day index ${dayIndex}`)
        break
      }
      
      // Pick a random employee for this block
      const employee = employeesToUse[this.randomInt(0, employeesToUse.length - 1)]
      const currentNights = employeeNights.get(employee.id)!.length
      const remainingCapacity = maxBlock - currentNights
      const remainingDays = sortedDays.length - dayIndex
      
      // Determine block size - minimum 3 nights
      let blockSize = this.randomInt(Math.max(minBlock, MIN_CONSECUTIVE_NIGHTS), maxBlock)
      blockSize = Math.min(blockSize, remainingCapacity, remainingDays)
      
      // If blockSize < MIN_CONSECUTIVE_NIGHTS, this will be handled in gap-fill phase
      if (blockSize < MIN_CONSECUTIVE_NIGHTS && remainingDays >= MIN_CONSECUTIVE_NIGHTS) {
        console.log(`[NightBlocks] ${employee.name} can only do ${blockSize} nights, skipping to gap-fill`)
        // Skip remaining days to gap-fill phase
        break
      }
      
      console.log(`[NightBlocks] ${employee.name} will do ${blockSize} nights`)
      
      // Assign consecutive nights
      let assigned = 0
      for (let i = 0; i < blockSize && dayIndex < sortedDays.length; i++) {
        const day = sortedDays[dayIndex]
        const currentAssignment = this.matrix[employee.id][day.dayNumber]
        // REQUEST_OFF must be respected - employee requested this day off
        const isRequestOff = currentAssignment === 'REQUEST_OFF'
        const isAvailable = !isRequestOff && (!currentAssignment || currentAssignment === '' || 
                           currentAssignment.startsWith('REQUEST') || currentAssignment.startsWith('AVOID'))
        const notAvoiding = currentAssignment !== 'AVOID_N'
        
        if (isAvailable && notAvoiding) {
          this.matrix[employee.id][day.dayNumber] = 'N'
          employeeNights.get(employee.id)!.push(day.dayNumber)
          assigned++
          dayIndex++
        } else {
          // CRITICAL: Employee can't work this day - STOP block to maintain consecutiveness
          // Don't skip days, as that would create gaps in the night block
          if (isRequestOff) {
            console.log(`[NightBlocks] ${employee.name}: day ${day.dayNumber} is REQUEST_OFF, stopping block at ${assigned} nights`)
          } else {
            console.log(`[NightBlocks] ${employee.name}: can't work day ${day.dayNumber}, stopping block at ${assigned} nights`)
          }
          // DON'T increment dayIndex here - let this day be handled by another employee
          break
        }
      }
      
      const nightsList = employeeNights.get(employee.id)!
      console.log(`[NightBlocks] ${employee.name}: assigned ${assigned} nights (total: ${nightsList.length}, days: ${nightsList.join(',')})`)
      
      // CRITICAL: ALWAYS mark employee as completed after receiving ANY nights
      // This ensures each employee only gets ONE contiguous block of nights
      if (nightsList.length > 0) {
        employeeHasCompletedBlock.add(employee.id)
        this.employeesWithCompletedNightBlock.add(employee.id)
        console.log(`[NightBlocks] ${employee.name}: marked as COMPLETED (${nightsList.length} nights - no more nights can be assigned)`)
      }
    }
    
    // ========================================
    // PHASE 4.4: FILL REMAINING GAPS (RESPECTING MIN 3 CONSECUTIVE)
    // ========================================
    const MIN_CONSECUTIVE = 3
    let remainingDays = nightDays.filter(d => this.countShiftOnDay(d.dayNumber, 'N') === 0)
    
    if (remainingDays.length > 0) {
      console.log(`[NightBlocks] Phase 4.4: ${remainingDays.length} days still need night coverage: ${remainingDays.map(d => d.dayNumber).join(', ')}`)
    }
    
    // Strategy: Find consecutive gaps and assign as blocks, or extend existing blocks
    while (remainingDays.length > 0) {
      remainingDays = nightDays.filter(d => this.countShiftOnDay(d.dayNumber, 'N') === 0)
      if (remainingDays.length === 0) break
      
      // Find consecutive segments in remaining days
      const segments: DayInfo[][] = []
      let currentSeg: DayInfo[] = []
      const sorted = [...remainingDays].sort((a, b) => a.dayNumber - b.dayNumber)
      
      for (const day of sorted) {
        if (currentSeg.length === 0) {
          currentSeg.push(day)
        } else if (day.dayNumber === currentSeg[currentSeg.length - 1].dayNumber + 1) {
          currentSeg.push(day)
        } else {
          segments.push(currentSeg)
          currentSeg = [day]
        }
      }
      if (currentSeg.length > 0) segments.push(currentSeg)
      
      let madeProgress = false
      
      for (const segment of segments) {
        if (segment.length >= MIN_CONSECUTIVE) {
          // Segment is big enough - assign as a block
          // CRITICAL: Only assign to employees with NO existing nights OR adjacent existing nights
          const segmentFirst = segment[0].dayNumber
          const segmentLast = segment[segment.length - 1].dayNumber
          
          const candidates = this.shuffle([...shuffledEmployees])
            .filter(emp => {
              // Skip employees who already completed their night block
              if (employeeHasCompletedBlock.has(emp.id)) return false
              
              const existingNights = employeeNights.get(emp.id)!
              
              // Check if employee can take this segment (availability)
              const allAvailable = segment.every(day => {
                const current = this.matrix[emp.id][day.dayNumber]
                // REQUEST_OFF must be respected
                if (current === 'REQUEST_OFF') return false
                return !current || current === '' || current.startsWith('REQUEST') || current.startsWith('AVOID')
              })
              if (!allAvailable) return false
              
              // Check capacity
              if (existingNights.length + segment.length > maxBlock + 2) return false
              
              // CRITICAL: If employee has existing nights, they must be ADJACENT to this segment
              if (existingNights.length > 0) {
                const sortedExisting = [...existingNights].sort((a, b) => a - b)
                const existingFirst = sortedExisting[0]
                const existingLast = sortedExisting[sortedExisting.length - 1]
                
                // Segment must be immediately before or after existing nights
                const isAdjacentBefore = segmentLast === existingFirst - 1
                const isAdjacentAfter = segmentFirst === existingLast + 1
                
                if (!isAdjacentBefore && !isAdjacentAfter) {
                  return false // Would create scattered nights
                }
              }
              
              return true
            })
            // Prefer employees with NO nights (fresh blocks), then by least nights
            .sort((a, b) => {
              const aNights = employeeNights.get(a.id)!.length
              const bNights = employeeNights.get(b.id)!.length
              if (aNights === 0 && bNights > 0) return -1
              if (bNights === 0 && aNights > 0) return 1
              return aNights - bNights
            })
          
          if (candidates.length > 0) {
            const chosen = candidates[0]
            for (const day of segment) {
              this.matrix[chosen.id][day.dayNumber] = 'N'
              employeeNights.get(chosen.id)!.push(day.dayNumber)
            }
            const nightsList = employeeNights.get(chosen.id)!
            const hadNights = nightsList.length > segment.length
            console.log(`[NightBlocks] Gap-fill: ${chosen.name} assigned ${segment.length} nights (days ${segment.map(d => d.dayNumber).join(',')})${hadNights ? ' - extended existing block' : ' - new block'}`)
            
            // CRITICAL: ALWAYS mark as completed after receiving ANY nights
            // This prevents gap-fill loop from giving them more non-adjacent nights later
            employeeHasCompletedBlock.add(chosen.id)
            this.employeesWithCompletedNightBlock.add(chosen.id)
            console.log(`[NightBlocks] ${chosen.name}: marked as COMPLETED (${nightsList.length} nights - no more nights can be assigned)`)
            madeProgress = true
          } else {
            console.log(`[NightBlocks] Gap-fill BLOCKED: Cannot assign segment days ${segment.map(d => d.dayNumber).join(',')} - no valid candidates without creating scattered nights`)
          }
        } else {
          // Segment is too small - try to extend an adjacent employee's block
          const firstDay = segment[0].dayNumber
          const lastDay = segment[segment.length - 1].dayNumber
          
          // Check who has night on day before or after this segment
          const dayBefore = firstDay - 1
          const dayAfter = lastDay + 1
          
          let extendEmployee: Employee | null = null
          
          // Find employee with night on adjacent day
          for (const emp of shuffledEmployees) {
            // Skip employees who already completed their night block
            if (employeeHasCompletedBlock.has(emp.id)) continue
            
            const hasNightBefore = this.matrix[emp.id]?.[dayBefore] === 'N'
            const hasNightAfter = this.matrix[emp.id]?.[dayAfter] === 'N'
            
            if (hasNightBefore || hasNightAfter) {
              // Check if they can take these extra days
              const currentNights = employeeNights.get(emp.id)!.length
              const canExtend = segment.every(day => {
                const current = this.matrix[emp.id][day.dayNumber]
                // REQUEST_OFF must be respected
                if (current === 'REQUEST_OFF') return false
                return !current || current === '' || current.startsWith('REQUEST') || current.startsWith('AVOID')
              })
              
              if (canExtend && currentNights + segment.length <= maxBlock + 2) {
                extendEmployee = emp
                break
              }
            }
          }
          
          if (extendEmployee) {
            for (const day of segment) {
              this.matrix[extendEmployee.id][day.dayNumber] = 'N'
              employeeNights.get(extendEmployee.id)!.push(day.dayNumber)
            }
            console.log(`[NightBlocks] Extended ${extendEmployee.name}'s block with ${segment.length} nights (days ${segment.map(d => d.dayNumber).join(',')})`)
            
            // CRITICAL: ALWAYS mark as completed after receiving ANY nights
            // This prevents gap-fill loop from giving them more non-adjacent nights later
            const nightsList = employeeNights.get(extendEmployee.id)!
            employeeHasCompletedBlock.add(extendEmployee.id)
            this.employeesWithCompletedNightBlock.add(extendEmployee.id)
            console.log(`[NightBlocks] ${extendEmployee.name}: marked as COMPLETED after extension (${nightsList.length} nights - no more nights can be assigned)`)
            madeProgress = true
          } else {
            // Can't extend - ONLY assign to employees with NO nights yet (to avoid scattered assignments)
            // This ensures we never create non-consecutive night assignments
            const freshCandidates = this.shuffle([...shuffledEmployees])
              .filter(emp => {
                // Skip employees who already completed their night block
                if (employeeHasCompletedBlock.has(emp.id)) return false
                
                const existingNights = employeeNights.get(emp.id)!
                // CRITICAL: Only allow employees with ZERO nights assigned
                if (existingNights.length > 0) return false
                
                const allAvailable = segment.every(day => {
                  const current = this.matrix[emp.id][day.dayNumber]
                  // REQUEST_OFF must be respected
                  if (current === 'REQUEST_OFF') return false
                  return !current || current === '' || current.startsWith('REQUEST') || current.startsWith('AVOID')
                })
                return allAvailable
              })
            
            if (freshCandidates.length > 0) {
              const chosen = freshCandidates[0]
              for (const day of segment) {
                this.matrix[chosen.id][day.dayNumber] = 'N'
                employeeNights.get(chosen.id)!.push(day.dayNumber)
              }
              console.log(`[NightBlocks] Gap-fill (fresh employee): ${chosen.name} assigned ${segment.length} nights (days ${segment.map(d => d.dayNumber).join(',')}) - small block, may trigger retry`)
              
              // CRITICAL: ALWAYS mark as completed after receiving ANY nights
              // This prevents gap-fill loop from giving them more non-adjacent nights later
              const nightsList = employeeNights.get(chosen.id)!
              employeeHasCompletedBlock.add(chosen.id)
              this.employeesWithCompletedNightBlock.add(chosen.id)
              console.log(`[NightBlocks] ${chosen.name}: marked as COMPLETED (${nightsList.length} nights - no more nights can be assigned)`)
              madeProgress = true
            } else {
              // NO fresh employees available - DO NOT assign to anyone with existing nights
              // This will cause validation to fail and trigger a retry with different randomization
              console.log(`[NightBlocks] Gap-fill BLOCKED: Cannot assign days ${segment.map(d => d.dayNumber).join(',')} without creating scattered nights - will retry`)
              // Don't set madeProgress = true, let the loop exit and validation fail
            }
          }
        }
      }
      
      if (!madeProgress) {
        // No progress made - log errors for remaining days
        for (const day of remainingDays) {
          this.warnings.push({
            type: 'coverage',
            severity: 'error',
            message: `Día ${day.dayNumber}: No hay cobertura de noche disponible`,
            day: day.dayNumber,
          })
        }
        break
      }
    }
    
    // ========================================
    // PHASE 4.5: VALIDATE NIGHT BLOCK CONSECUTIVENESS
    // ========================================
    const MIN_CONSECUTIVE_NIGHTS_REQUIRED = 3 // CRITICAL: Minimum 3 consecutive nights
    
    for (const employee of nightEligible) {
      const nights = employeeNights.get(employee.id)!.sort((a, b) => a - b)
      const nightCount = nights.length
      
      if (nightCount === 0) continue // No nights assigned is OK
      
      // Check that nights are consecutive (form a single block)
      let isConsecutive = true
      for (let i = 1; i < nights.length; i++) {
        if (nights[i] !== nights[i - 1] + 1) {
          isConsecutive = false
          break
        }
      }
      
      // ERROR if nights are not consecutive (scattered nights)
      if (!isConsecutive) {
        this.warnings.push({
          type: 'night_block',
          severity: 'error',
          message: `${employee.name}: noches no consecutivas (días ${nights.join(', ')}) - deben ser en bloque`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }
      // ERROR if less than 3 consecutive nights (mandatory minimum)
      else if (nightCount < MIN_CONSECUTIVE_NIGHTS_REQUIRED) {
        this.warnings.push({
          type: 'night_block',
          severity: 'error',
          message: `${employee.name}: ${nightCount} noches asignadas (mínimo obligatorio ${MIN_CONSECUTIVE_NIGHTS_REQUIRED})`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }
      // WARNING if less than recommended (4)
      else if (nightCount < minBlock) {
        this.warnings.push({
          type: 'night_block',
          severity: 'warning',
          message: `${employee.name}: ${nightCount} noches asignadas (mínimo recomendado ${minBlock})`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }
      
      // WARNING if more than max
      if (nightCount > maxBlock) {
        this.warnings.push({
          type: 'night_block',
          severity: 'warning',
          message: `${employee.name}: ${nightCount} noches asignadas (máximo recomendado ${maxBlock})`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }
    }
  }

  // findAvailableForNight removed - not used

  // ============================================
  // PHASE 4.5: ENFORCE POST-NIGHT REST (48h)
  // ============================================

  private enforcePostNightRest(): void {
    // After a night block ends, employee needs 48h rest
    // This means: 1 full rest day (L), then next work shift must be T (not M)
    // Night ends at ~7am, so:
    // - Day after last night = REST (libre)
    // - Day after rest = can work T (starts at 3pm = 32h after night end)
    // - Cannot work M (starts at 7am = only 24h after night end)

    for (const employee of this.employees) {
      if (employee.rules.fixedShift) continue

      // Find the last night shift day for this employee
      const nightDays = this.days
        .filter((d) => this.matrix[employee.id][d.dayNumber] === 'N')
        .sort((a, b) => a.dayNumber - b.dayNumber)

      if (nightDays.length === 0) continue

      // Find blocks of consecutive nights
      for (let i = 1; i <= nightDays.length; i++) {
        const current = nightDays[i]?.dayNumber
        const previous = nightDays[i - 1].dayNumber

        // If gap or end of array, we found end of a block
        if (!current || current !== previous + 1) {
          const blockEnd = previous
          
          // Enforce rest after this block ends
          const restDay = this.days.find((d) => d.dayNumber === blockEnd + 1)
          const returnDay = this.days.find((d) => d.dayNumber === blockEnd + 2)

          if (restDay) {
            // Day immediately after night block = mandatory rest
            const currentRest = this.matrix[employee.id][restDay.dayNumber]
            if (!currentRest || !['V', 'B', 'IT', 'E', 'FO'].includes(currentRest)) {
              this.matrix[employee.id][restDay.dayNumber] = `L${restDay.weekNumber}`
            }
          }

          if (returnDay) {
            // Day after rest = mark to prefer T (afternoon) shift
            // We'll store a marker that Phase 5 will respect
            const currentReturn = this.matrix[employee.id][returnDay.dayNumber]
            if (!currentReturn || currentReturn === '') {
              // Mark this day to avoid M shift (will be handled in Phase 5)
              this.matrix[employee.id][returnDay.dayNumber] = 'PREFER_T'
            }
          }
        }
      }
    }
  }

  // ============================================
  // PHASE 5: ASSIGN ROTATING SHIFTS
  // ============================================

  private assignRotatingShifts(): void {
    // For each employee, assign M or T for remaining unassigned days
    // Respecting weekly rotation rule (same shift type for M/T weeks)
    // IMPORTANT: Night shifts are already assigned in Phase 4, don't touch them
    // NOTE: We assign work to ALL available days first, Phase 6 will convert some to libre
    
    // RANDOMIZATION: Shuffle employee order for processing
    const shuffledEmployees = this.shuffle(this.employees)
    
    console.log(`[RotatingShifts] Assigning M/T shifts for ${shuffledEmployees.length} employees`)
    
    for (const employee of shuffledEmployees) {
      // Skip fixed-shift employees (like EMP_01 R with P shift)
      if (employee.rules.fixedShift) {
        console.log(`[RotatingShifts] Skipping ${employee.name} - fixed shift`)
        continue
      }

      const weeks = this.getWeeksInMonth()
      
      for (const week of weeks) {
        const weekDays = this.days
          .filter((d) => d.weekNumber === week.weekNumber)
          .sort((a, b) => a.dayNumber - b.dayNumber)

        // ========================================
        // STEP 1: Determine week shift type (M or T)
        // ========================================
        
        // Check if any day has PREFER_T (post-night rest requirement)
        const preferTDays = weekDays.filter(
          (d) => this.matrix[employee.id][d.dayNumber] === 'PREFER_T'
        )
        const hasPreferT = preferTDays.length > 0

        // For M/T weeks: determine which shift type for this week
        const existingMT = weekDays
          .map((d) => this.matrix[employee.id][d.dayNumber])
          .filter((s) => s && ['M', 'T'].includes(s))

        let weekShift = ''
        if (hasPreferT) {
          // Post-night rest: must be T week (48h rule)
          weekShift = 'T'
        } else if (existingMT.includes('M')) {
          weekShift = 'M'
        } else if (existingMT.includes('T')) {
          weekShift = 'T'
        } else {
          // Determine based on priority and balance
          weekShift = this.determineWeekShift(employee, week.weekNumber)
        }

        // ========================================
        // STEP 2: Assign shifts to all available days
        // ========================================
        
        for (const day of weekDays) {
          const current = this.matrix[employee.id][day.dayNumber]
          
          // Skip already assigned work shifts (N, M, T, P, etc) or special leaves
          if (current === 'N' || current === 'M' || current === 'T' || 
              current === 'P' || current === 'V' || current === 'B' || 
              current === 'IT' || current === 'E' || current === 'FO' ||
              (current && current.startsWith('L'))) {
            continue
          }
          
          // Handle request_off - mark for libre in Phase 6
          if (current === 'REQUEST_OFF') {
            console.log(`[RotatingShifts] ${employee.name} day ${day.dayNumber}: skipping - REQUEST_OFF`)
            continue
          }
          
          // CRITICAL: Check if assigning work would cause >6 consecutive work days
          // This needs to be checked BEFORE assigning any shift
          if (this.wouldExceedConsecutiveWorkDays(employee.id, day.dayNumber, 6)) {
            // Must leave as libre to break the streak
            this.matrix[employee.id][day.dayNumber] = `L${week.weekNumber}`
            console.log(`[RotatingShifts] ${employee.name} day ${day.dayNumber}: forced L to prevent >6 consecutive work days`)
            continue
          }
          
          // Handle PREFER_T marker (post-night rest)
          if (current === 'PREFER_T') {
            this.matrix[employee.id][day.dayNumber] = 'T'
            continue
          }
          
          // Handle specific shift request
          if (current && current.startsWith('REQUEST_')) {
            const requested = current.replace('REQUEST_', '')
            if (requested === 'M' || requested === 'T') {
              this.matrix[employee.id][day.dayNumber] = requested
            }
            continue
          }
          
          // Handle avoid shift
          if (current && current.startsWith('AVOID_')) {
            const avoided = current.replace('AVOID_', '')
            if (weekShift !== avoided) {
              this.matrix[employee.id][day.dayNumber] = weekShift
            } else {
              // Assign the other shift
              this.matrix[employee.id][day.dayNumber] = weekShift === 'M' ? 'T' : 'M'
            }
            continue
          }
          
          // Normal assignment - empty slot gets the week shift
          if (!current || current === '') {
            this.matrix[employee.id][day.dayNumber] = weekShift
          }
        }
        
        // Log what we assigned
        const assigned = weekDays.filter(d => 
          this.matrix[employee.id][d.dayNumber] === 'M' || 
          this.matrix[employee.id][d.dayNumber] === 'T'
        ).length
        const nightsThisWeek = weekDays.filter(d => 
          this.matrix[employee.id][d.dayNumber] === 'N'
        ).length
        console.log(`[RotatingShifts] ${employee.name} week ${week.weekNumber}: ${weekShift} shift, ${assigned} M/T, ${nightsThisWeek} N`)
      }
    }
  }

  // ============================================
  // PHASE 6: ASSIGN WEEKLY OFFS
  // ============================================

  private assignWeeklyOffs(): void {
    const minConsecutiveLibre = 2 // CRITICAL: 2 consecutive days off per week (48h rest)

    // RANDOMIZATION: Shuffle employee order for processing
    const shuffledEmployees = this.shuffle(this.employees)
    
    console.log(`[WeeklyOffs] Assigning 2+ consecutive libre days per week (respecting coverage)`)

    for (const employee of shuffledEmployees) {
      // Skip if employee has fixed days (already handled - like EMP_01 R)
      if (employee.rules.fixedDays) {
        console.log(`[WeeklyOffs] Skipping ${employee.name} - has fixed days`)
        continue
      }

      const weeks = this.getWeeksInMonth()
      
      for (const week of weeks) {
        const weekDays = this.days
          .filter((d) => d.weekNumber === week.weekNumber)
          .sort((a, b) => a.dayNumber - b.dayNumber)
        
        // Handle REQUEST_OFF first
        for (const day of weekDays) {
          if (this.matrix[employee.id][day.dayNumber] === 'REQUEST_OFF') {
            this.matrix[employee.id][day.dayNumber] = `L${week.weekNumber}`
          }
        }
        
        // Check if employee already has 2+ consecutive libre days
        const hasConsecutiveLibre = this.hasConsecutiveLibreDays(employee.id, weekDays, minConsecutiveLibre)
        
        if (!hasConsecutiveLibre) {
          // CRITICAL: Must assign 2 consecutive libre days
          // Find best consecutive pair that won't break coverage
          const consecutivePair = this.findBestConsecutivePairForLibreWithCoverage(employee.id, weekDays, week.weekNumber)
          
          if (consecutivePair) {
            for (const day of consecutivePair) {
              const currentShift = this.matrix[employee.id][day.dayNumber]
              // Don't override special absences
              if (!currentShift || this.isWorkShift(currentShift)) {
                this.matrix[employee.id][day.dayNumber] = `L${week.weekNumber}`
              }
            }
            console.log(`[WeeklyOffs] ${employee.name} week ${week.weekNumber}: assigned consecutive libre on days ${consecutivePair.map(d => d.dayNumber).join(', ')}`)
          } else {
            // Couldn't find consecutive pair without breaking coverage - emit warning
            this.warnings.push({
              type: 'rest',
              severity: 'warning',
              message: `${employee.name}: Semana ${week.weekNumber} no tiene 2 días libres consecutivos (48h descanso)`,
              employeeId: employee.id,
              employeeName: employee.name,
            })
          }
        }
      }
    }
  }
  
  /**
   * Find the best consecutive pair for libre that respects minimum coverage
   */
  private findBestConsecutivePairForLibreWithCoverage(employeeId: string, days: DayInfo[], _weekNumber: number): DayInfo[] | null {
    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
    const minMorning = this.config.minMorningStaff || 1
    const minAfternoon = this.config.minAfternoonStaff || 1
    
    // Build list of consecutive pairs with their viability score
    const pairs: { days: DayInfo[], score: number, viable: boolean }[] = []
    
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const day1 = sortedDays[i]
      const day2 = sortedDays[i + 1]
      
      // Must be consecutive days
      if (day2.dayNumber !== day1.dayNumber + 1) continue
      
      const shift1 = this.matrix[employeeId][day1.dayNumber]
      const shift2 = this.matrix[employeeId][day2.dayNumber]
      
      // Skip if either day has protected absence or NIGHT shift
      // CRITICAL: Never convert night shifts to libre - this would scatter night blocks
      if (shift1 === 'V' || shift1 === 'B' || shift1 === 'IT' || shift1 === 'E' || shift1 === 'FO' || shift1 === 'N') continue
      if (shift2 === 'V' || shift2 === 'B' || shift2 === 'IT' || shift2 === 'E' || shift2 === 'FO' || shift2 === 'N') continue
      
      // Skip if either day is already libre
      if (shift1?.startsWith('L') || shift2?.startsWith('L')) continue
      
      // Check if converting both would break coverage
      let viable = true
      let score = 0
      
      // Check day 1 coverage
      if (shift1 === 'N') {
        // Night shift - check if there's another person on night
        const nightCoverage = this.countShiftOnDay(day1.dayNumber, 'N')
        if (nightCoverage <= 1) viable = false
        score -= 50 // Discourage converting night shifts
      } else if (shift1 === 'M') {
        const coverage = this.countShiftOnDay(day1.dayNumber, 'M')
        if (coverage <= minMorning) viable = false
        score += (coverage - minMorning) * 10 // Prefer days with excess coverage
      } else if (shift1 === 'T') {
        const coverage = this.countShiftOnDay(day1.dayNumber, 'T')
        if (coverage <= minAfternoon) viable = false
        score += (coverage - minAfternoon) * 10
      }
      
      // Check day 2 coverage
      if (shift2 === 'N') {
        const nightCoverage = this.countShiftOnDay(day2.dayNumber, 'N')
        if (nightCoverage <= 1) viable = false
        score -= 50
      } else if (shift2 === 'M') {
        const coverage = this.countShiftOnDay(day2.dayNumber, 'M')
        if (coverage <= minMorning) viable = false
        score += (coverage - minMorning) * 10
      } else if (shift2 === 'T') {
        const coverage = this.countShiftOnDay(day2.dayNumber, 'T')
        if (coverage <= minAfternoon) viable = false
        score += (coverage - minAfternoon) * 10
      }
      
      // Prefer weekends (S=Saturday, D=Sunday)
      if (day1.dayOfWeek === 'S' || day1.dayOfWeek === 'D') score += 15
      if (day2.dayOfWeek === 'S' || day2.dayOfWeek === 'D') score += 15
      
      // RANDOMIZATION
      score += this.randomInt(0, 10)
      
      pairs.push({ days: [day1, day2], score, viable })
    }
    
    // First try to find a viable pair
    const viablePairs = pairs.filter(p => p.viable).sort((a, b) => b.score - a.score)
    if (viablePairs.length > 0) {
      return viablePairs[0].days
    }
    
    // If no viable pair, return the best non-viable (will cause coverage warning but respects rest)
    const nonViable = pairs.sort((a, b) => b.score - a.score)
    if (nonViable.length > 0) {
      console.log(`[WeeklyOffs] Warning: No viable consecutive pair for employee, using best available`)
      return nonViable[0].days
    }
    
    return null
  }

  /**
   * Check if employee has at least N consecutive libre days in the given days
   */
  private hasConsecutiveLibreDays(employeeId: string, days: DayInfo[], minConsecutive: number): boolean {
    let consecutive = 0
    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
    
    for (let i = 0; i < sortedDays.length; i++) {
      const shift = this.matrix[employeeId][sortedDays[i].dayNumber]
      // Include RESERVED_L as libre (reserved for libre in Phase 5)
      const isLibre = shift && (shift.startsWith('L') || shift.startsWith('RESERVED_L') || shift === 'V' || shift === 'B' || shift === 'IT' || shift === 'E' || shift === 'FO')
      
      if (isLibre) {
        // Check if consecutive with previous
        if (i > 0 && sortedDays[i].dayNumber === sortedDays[i-1].dayNumber + 1) {
          consecutive++
        } else {
          consecutive = 1
        }
        
        if (consecutive >= minConsecutive) {
          return true
        }
      } else {
        consecutive = 0
      }
    }
    
    return false
  }

  // findBestConsecutivePairForLibre removed - replaced by findBestConsecutivePairForLibreWithCoverage

  // ============================================
  // PHASE 7: VALIDATE AND FIX COVERAGE
  // ============================================

  private validateAndFixCoverage(): void {
    // Get employees who can be reassigned (not fixed shift)
    const flexibleEmployees = this.employees.filter(
      (e) => !e.rules.fixedShift
    )

    console.log(`[Coverage] Validating and fixing coverage for ${this.days.length} days`)

    // Process days in order (not random) for consistent coverage fixing
    const sortedDays = [...this.days].sort((a, b) => a.dayNumber - b.dayNumber)
    
    for (const day of sortedDays) {
      if (day.isHoliday) continue

      let morningCount = this.countShiftOnDay(day.dayNumber, 'M')
      let afternoonCount = this.countShiftOnDay(day.dayNumber, 'T')
      const minMorning = this.config.minMorningStaff || 1
      const minAfternoon = this.config.minAfternoonStaff || 1
      const maxMorning = this.config.maxMorningStaff || 2
      const maxAfternoon = this.config.maxAfternoonStaff || 2

      // ========================================
      // STEP 1: REDISTRIBUTE between M and T if needed
      // ========================================
      
      // If M has excess and T needs people, move from M to T
      while (morningCount > minMorning && afternoonCount < minAfternoon) {
        const moved = this.tryMoveShift(day, 'M', 'T', flexibleEmployees)
        if (moved) {
          morningCount--
          afternoonCount++
          console.log(`[Coverage] Day ${day.dayNumber}: Moved 1 from M to T`)
        } else {
          break
        }
      }
      
      // If T has excess and M needs people, move from T to M
      while (afternoonCount > minAfternoon && morningCount < minMorning) {
        const moved = this.tryMoveShift(day, 'T', 'M', flexibleEmployees)
        if (moved) {
          afternoonCount--
          morningCount++
          console.log(`[Coverage] Day ${day.dayNumber}: Moved 1 from T to M`)
        } else {
          break
        }
      }

      // ========================================
      // STEP 2: Convert libre to work if still under minimum
      // ========================================
      
      // Fix morning undercoverage by converting libre
      while (morningCount < minMorning) {
        const converted = this.tryConvertToShift(day, 'M', flexibleEmployees)
        if (converted) {
          morningCount++
        } else {
          break
        }
      }
      
      // Fix afternoon undercoverage by converting libre
      while (afternoonCount < minAfternoon) {
        const converted = this.tryConvertToShift(day, 'T', flexibleEmployees)
        if (converted) {
          afternoonCount++
        } else {
          break
        }
      }

      // ========================================
      // STEP 3: Fix overcoverage (convert excess to libre)
      // ========================================
      
      while (morningCount > maxMorning) {
        const reduced = this.reduceShiftCoverage(day, 'M')
        if (reduced) {
          morningCount--
        } else {
          break
        }
      }
      
      while (afternoonCount > maxAfternoon) {
        const reduced = this.reduceShiftCoverage(day, 'T')
        if (reduced) {
          afternoonCount--
        } else {
          break
        }
      }

      // ========================================
      // STEP 4: Emit warnings for remaining issues
      // ========================================
      
      if (morningCount < minMorning) {
        this.warnings.push({
          type: 'coverage',
          severity: morningCount === 0 ? 'error' : 'warning',
          message: `Día ${day.dayNumber}: Solo ${morningCount} personas en mañana (mín ${minMorning})`,
          day: day.dayNumber,
        })
      }
      
      if (afternoonCount < minAfternoon) {
        this.warnings.push({
          type: 'coverage',
          severity: afternoonCount === 0 ? 'error' : 'warning',
          message: `Día ${day.dayNumber}: Solo ${afternoonCount} personas en tarde (mín ${minAfternoon})`,
          day: day.dayNumber,
        })
      }

      // Check night coverage (should already be 1 from Phase 4)
      const nightCount = this.countShiftOnDay(day.dayNumber, 'N')
      const maxNight = this.config.maxNightStaff || 1
      
      if (nightCount === 0) {
        // Try to assign someone to night
        const converted = this.tryConvertToShift(day, 'N', flexibleEmployees)
        if (!converted) {
          this.warnings.push({
            type: 'coverage',
            severity: 'error',
            message: `Día ${day.dayNumber}: No hay cobertura de noche`,
            day: day.dayNumber,
          })
        }
      } else if (nightCount > maxNight) {
        // Too many on night - convert extras to libre
        this.reduceNightCoverage(day, nightCount - maxNight)
      }
      
      // Log coverage status for first few days
      if (day.dayNumber <= 5) {
        const finalM = this.countShiftOnDay(day.dayNumber, 'M')
        const finalT = this.countShiftOnDay(day.dayNumber, 'T')
        const finalN = this.countShiftOnDay(day.dayNumber, 'N')
        console.log(`[Coverage] Day ${day.dayNumber}: M=${finalM} T=${finalT} N=${finalN}`)
      }
    }
  }

  /**
   * Try to move an employee from one shift to another on the same day
   * Used for redistribution when one shift has excess and another needs coverage
   */
  private tryMoveShift(day: DayInfo, fromShift: string, toShift: string, candidates: Employee[]): boolean {
    // Find employees on fromShift who can be moved to toShift
    const moveCandidates = candidates
      .filter((emp) => {
        if (emp.rules.fixedShift) return false
        const current = this.matrix[emp.id][day.dayNumber]
        if (current !== fromShift) return false
        
        // Check weekly rotation consistency - can they do toShift this week?
        const weekShift = this.getEmployeeWeekShift(emp.id, day.weekNumber)
        // If they already have the opposite shift this week, don't move
        if (weekShift && weekShift !== toShift && weekShift !== fromShift) return false
        
        return true
      })
    
    // Shuffle to add randomness
    const shuffled = this.shuffle(moveCandidates)
    
    if (shuffled.length > 0) {
      const emp = shuffled[0]
      this.matrix[emp.id][day.dayNumber] = toShift
      return true
    }
    
    return false
  }

  /**
   * Reduce coverage for a shift by converting one person to libre
   * Used when there are more than max allowed on a shift
   */
  private reduceShiftCoverage(day: DayInfo, shiftCode: string): boolean {
    // Find employees on this shift who have the most work days this week
    // Converting the busiest person to libre helps balance workload
    const candidates = this.employees
      .filter((emp) => {
        if (emp.rules.fixedShift) return false
        return this.matrix[emp.id][day.dayNumber] === shiftCode
      })
      .sort((a, b) => {
        const weekWorkA = this.countWeekWorkDays(a.id, day.weekNumber)
        const weekWorkB = this.countWeekWorkDays(b.id, day.weekNumber)
        return weekWorkB - weekWorkA // Prefer employees with more shifts (to reduce)
      })
    
    if (candidates.length > 0) {
      const emp = candidates[0]
      this.matrix[emp.id][day.dayNumber] = `L${day.weekNumber}`
      console.log(`[Coverage] Reduced ${shiftCode} coverage on day ${day.dayNumber}: ${emp.name} -> L`)
      return true
    }
    
    return false
  }

  private tryConvertToShift(day: DayInfo, targetShift: string, candidates: Employee[]): boolean {
    // Find someone with L on this day who can work
    // Sort by who has fewest shifts this week (to balance workload)
    const availableCandidates = candidates
      .filter((emp) => {
        const current = this.matrix[emp.id][day.dayNumber]
        if (!current || !current.startsWith('L')) return false
        
        // Check they won't exceed weekly max
        const weekWork = this.countWeekWorkDays(emp.id, day.weekNumber)
        if (weekWork >= (this.config.maxWeeklyShifts || 6)) return false
        
        // CRITICAL: Check if converting this day would break 2 consecutive libre days
        if (this.wouldBreakConsecutiveLibre(emp.id, day)) {
          return false
        }
        
        // CRITICAL: Check if converting would cause more than 6 consecutive work days
        if (this.wouldExceedConsecutiveWorkDays(emp.id, day.dayNumber, 6)) {
          return false
        }
        
        // For M/T shifts, check weekly rotation consistency
        if (targetShift === 'M' || targetShift === 'T') {
          const weekShift = this.getEmployeeWeekShift(emp.id, day.weekNumber)
          if (weekShift && weekShift !== targetShift) return false
        }
        
        // For night shifts, check if employee can do nights
        if (targetShift === 'N') {
          if (emp.rules.fixedShift || emp.rules.noWeekends) return false
          
          // Check they don't already have too many nights
          const existingNights = this.days
            .filter((d) => this.matrix[emp.id][d.dayNumber] === 'N')
            .map((d) => d.dayNumber)
            .sort((a, b) => a - b)
          
          // DEBUG: Log the state for this employee
          const isInCompletedSet = this.employeesWithCompletedNightBlock.has(emp.id)
          console.log(`[Coverage] DEBUG CHECK: ${emp.name} for day ${day.dayNumber} N - existingNights=[${existingNights.join(',')}], inCompletedSet=${isInCompletedSet}`)
          
          if (existingNights.length >= (this.config.maxNightBlock || 6)) {
            console.log(`[Coverage] DEBUG: ${emp.name} rejected for day ${day.dayNumber} N - already has max nights (${existingNights.length})`)
            return false
          }
          
          // CRITICAL: If employee has existing nights, new night must be ADJACENT to them
          // This prevents creating scattered/non-consecutive night blocks
          if (existingNights.length > 0) {
            // FIRST: Check if existing nights are consecutive
            let existingAreConsecutive = true
            for (let i = 1; i < existingNights.length; i++) {
              if (existingNights[i] !== existingNights[i-1] + 1) {
                existingAreConsecutive = false
                break
              }
            }
            
            if (!existingAreConsecutive) {
              // Employee already has scattered nights - don't give them more
              console.log(`[Coverage] DEBUG: ${emp.name} REJECTED for day ${day.dayNumber} N - existing nights ${existingNights.join(',')} are ALREADY scattered`)
              return false
            }
            
            const firstNight = existingNights[0]
            const lastNight = existingNights[existingNights.length - 1]
            const isAdjacentBefore = day.dayNumber === firstNight - 1
            const isAdjacentAfter = day.dayNumber === lastNight + 1
            
            if (!isAdjacentBefore && !isAdjacentAfter) {
              // This would create scattered nights - reject this candidate
              console.log(`[Coverage] DEBUG: ${emp.name} REJECTED for day ${day.dayNumber} N - not adjacent to existing nights ${existingNights.join(',')} (first=${firstNight}, last=${lastNight})`)
              return false
            }
            console.log(`[Coverage] DEBUG: ${emp.name} ACCEPTED for day ${day.dayNumber} N - adjacent to existing nights ${existingNights.join(',')}`)
          } else {
            // Employee has NO existing nights
            // CRITICAL: If employee has already completed their night block, reject them
            // (they completed it in Phase 4 but got nights removed somehow, or it's a fresh employee)
            if (this.employeesWithCompletedNightBlock.has(emp.id)) {
              console.log(`[Coverage] DEBUG: ${emp.name} REJECTED for day ${day.dayNumber} N - already completed night block (no existing nights in matrix)`)
              return false
            }
            console.log(`[Coverage] DEBUG: ${emp.name} considered for day ${day.dayNumber} N - no existing nights, not in completed set`)
          }
        }
        
        return true
      })
      .sort((a, b) => {
        const weekWorkA = this.countWeekWorkDays(a.id, day.weekNumber)
        const weekWorkB = this.countWeekWorkDays(b.id, day.weekNumber)
        // RANDOMIZATION: Add small random factor to sorting
        return (weekWorkA - weekWorkB) + (Math.random() - 0.5) * 2
      })
    
    if (availableCandidates.length > 0) {
      // RANDOMIZATION: Sometimes pick from top candidates instead of always first
      let emp = availableCandidates[0]
      if (availableCandidates.length > 1 && Math.random() < 0.3) {
        const topCount = Math.min(3, availableCandidates.length)
        emp = availableCandidates[this.randomInt(0, topCount - 1)]
      }
      this.matrix[emp.id][day.dayNumber] = targetShift
      
      // For night shifts, log the assignment but DON'T mark as completed here
      // The adjacency check will prevent scattered nights, and we want to allow
      // extending the block with adjacent nights
      if (targetShift === 'N') {
        const existingNights = this.days
          .filter((d) => this.matrix[emp.id][d.dayNumber] === 'N')
          .map((d) => d.dayNumber)
          .sort((a, b) => a - b)
        console.log(`[Coverage] Converted ${emp.name} day ${day.dayNumber} from L to ${targetShift} (total nights: ${existingNights.join(',')})`)
      } else {
        console.log(`[Coverage] Converted ${emp.name} day ${day.dayNumber} from L to ${targetShift}`)
      }
      return true
    }
    
    return false
  }

  private reduceNightCoverage(day: DayInfo, excess: number): void {
    let reduced = 0
    for (const emp of this.employees) {
      if (reduced >= excess) break
      if (this.matrix[emp.id][day.dayNumber] === 'N') {
        // Convert to libre, but only if this employee has other nights
        const totalNights = this.days.filter(
          (d) => this.matrix[emp.id][d.dayNumber] === 'N'
        ).length
        if (totalNights > this.config.minNightBlock) {
          this.matrix[emp.id][day.dayNumber] = `L${day.weekNumber}`
          reduced++
        }
      }
    }
  }

  private getEmployeeWeekShift(employeeId: string, weekNumber: number): string | null {
    // Get the primary work shift for this employee in this week (M or T, not N)
    const weekDays = this.days.filter((d) => d.weekNumber === weekNumber)
    for (const day of weekDays) {
      const shift = this.matrix[employeeId][day.dayNumber]
      if (shift === 'M' || shift === 'T') {
        return shift
      }
    }
    return null
  }

  // ============================================
  // PHASE 8: ASSIGN PI SUPPORT
  // ============================================

  private assignPISupport(): void {
    // Prioritize days that were marked as needing PI due to reduced coverage (3-4 staff)
    // Then check other days that might need reinforcement
    
    const daysToCheck = this.days.filter(d => !d.isHoliday)
    
    // Sort to prioritize days marked as needing PI
    daysToCheck.sort((a, b) => {
      const aNeedsPI = this.daysNeedingPI.includes(a.dayNumber) ? 0 : 1
      const bNeedsPI = this.daysNeedingPI.includes(b.dayNumber) ? 0 : 1
      return aNeedsPI - bNeedsPI
    })
    
    console.log(`[PI Support] Checking ${daysToCheck.length} days, ${this.daysNeedingPI.length} marked as needing PI`)
    
    for (const day of daysToCheck) {
      const morningCount = this.countShiftOnDay(day.dayNumber, 'M')
      const afternoonCount = this.countShiftOnDay(day.dayNumber, 'T')
      const needsPI = this.daysNeedingPI.includes(day.dayNumber)

      // Assign PI if:
      // 1. Only 1 person in morning or afternoon, OR
      // 2. Day was marked as needing PI (3-4 available staff)
      if (morningCount === 1 || afternoonCount === 1 || needsPI) {
        // Find someone available for PI (not already working that day)
        // RANDOMIZATION: Shuffle employees before searching
        const shuffledEmployees = this.shuffle(this.employees)
        const available = shuffledEmployees.find((e) => {
          if (e.rules.fixedShift) return false
          const shift = this.matrix[e.id][day.dayNumber]
          // Must be empty or libre
          if (shift && !shift.startsWith('L')) return false
          
          // CRITICAL: Do NOT assign PI to employees who had REQUEST_OFF for this day
          // Check if this employee has a request_off constraint for this day
          const hasRequestOff = this.constraints.some(c => {
            if (c.constraint_type !== 'request_off' || c.status !== 'approved') return false
            if (c.employee_id !== e.id) return false
            const startDateAdjusted = new Date(new Date(c.start_date).getTime() + 12 * 60 * 60 * 1000)
            const endDateAdjusted = new Date(new Date(c.end_date).getTime() + 12 * 60 * 60 * 1000)
            return day.dayNumber >= startDateAdjusted.getUTCDate() && 
                   day.dayNumber <= endDateAdjusted.getUTCDate()
          })
          if (hasRequestOff) {
            return false
          }
          
          // CRITICAL: Check if converting this day would break 2 consecutive libre days
          if (shift?.startsWith('L') && this.wouldBreakConsecutiveLibre(e.id, day)) {
            return false
          }
          
          // CRITICAL: Check if converting would cause more than 6 consecutive work days
          if (this.wouldExceedConsecutiveWorkDays(e.id, day.dayNumber, 6)) {
            return false
          }
          
          return true
        })

        if (available) {
          // Only assign if they don't already have too many shifts this week
          const weekWorkDays = this.countWeekWorkDays(available.id, day.weekNumber)
          if (weekWorkDays < this.config.maxWeeklyShifts) {
            this.matrix[available.id][day.dayNumber] = 'PI'
            if (needsPI) {
              console.log(`[PI Support] Assigned PI to ${available.name} on day ${day.dayNumber} (marked as needing reinforcement)`)
            }
          }
        } else if (needsPI) {
          console.log(`[PI Support] Day ${day.dayNumber} needs PI but no one available`)
        }
      }
    }
  }

  // ============================================
  // PHASE 9: FINAL VALIDATION
  // ============================================

  private finalValidation(): void {
    const minMonthlyLibre = this.config.minMonthlyLibre || 8
    const maxMonthlyLibre = this.config.maxMonthlyLibre || 12
    const maxConsecutiveWorkDays = this.config.maxConsecutiveWorkDays || 6

    for (const employee of this.employees) {
      // Skip validation for fixed-shift employees (EMP_01 R)
      if (employee.rules.fixedDays) continue

      // Count shifts
      let totalWorkDays = 0
      let totalLibreDays = 0
      const shiftCounts: { [key: string]: number } = {}

      for (const day of this.days) {
        const shift = this.matrix[employee.id][day.dayNumber]
        if (this.isWorkShift(shift)) {
          totalWorkDays++
        }
        if (shift && (shift.startsWith('L') || shift === 'L')) {
          totalLibreDays++
        }
        if (shift) {
          // Normalize L1, L2, etc to L for counting
          const normalizedShift = shift.startsWith('L') ? 'L' : shift
          shiftCounts[normalizedShift] = (shiftCounts[normalizedShift] || 0) + 1
        }
      }

      // ========================================
      // VALIDATION 1: Monthly libre days (8-12)
      // ========================================
      if (totalLibreDays < minMonthlyLibre) {
        this.warnings.push({
          type: 'rest',
          severity: 'warning',
          message: `${employee.name}: Solo ${totalLibreDays} días libres al mes (mín ${minMonthlyLibre})`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }
      if (totalLibreDays > maxMonthlyLibre) {
        this.warnings.push({
          type: 'rest',
          severity: 'warning',
          message: `${employee.name}: ${totalLibreDays} días libres al mes (máx ${maxMonthlyLibre})`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }

      // ========================================
      // VALIDATION 2: Max consecutive work days (6)
      // ========================================
      const consecutiveWorkViolations = this.findConsecutiveWorkViolations(employee.id, maxConsecutiveWorkDays)
      for (const violation of consecutiveWorkViolations) {
        this.warnings.push({
          type: 'rest',
          severity: 'warning',
          message: `${employee.name}: ${violation.count} días seguidos trabajando (días ${violation.startDay}-${violation.endDay}, máx ${maxConsecutiveWorkDays})`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }

      // ========================================
      // VALIDATION 3: 2 consecutive libre per week
      // ========================================
      for (const week of this.getWeeksInMonth()) {
        const weekDays = this.days
          .filter((d) => d.weekNumber === week.weekNumber)
          .sort((a, b) => a.dayNumber - b.dayNumber)
        
        if (!this.hasConsecutiveLibreDays(employee.id, weekDays, 2)) {
          this.warnings.push({
            type: 'rest',
            severity: 'warning',
            message: `${employee.name}: Semana ${week.weekNumber} sin 2 días libres consecutivos (48h descanso)`,
            employeeId: employee.id,
            employeeName: employee.name,
          })
        }
      }

      // ========================================
      // VALIDATION 4: Max shifts per month rules (existing)
      // ========================================
      if (employee.rules.maxShiftPerMonth) {
        for (const [shiftCode, maxCount] of Object.entries(employee.rules.maxShiftPerMonth)) {
          const actual = shiftCounts[shiftCode] || 0
          if (actual > maxCount) {
            this.warnings.push({
              type: 'constraint',
              severity: 'warning',
              message: `${employee.name}: ${actual} turnos ${shiftCode} (máx ${maxCount})`,
              employeeId: employee.id,
              employeeName: employee.name,
            })
          }
        }
      }

      // ========================================
      // VALIDATION 5: Weekly shifts don't exceed max (existing)
      // ========================================
      for (const week of this.getWeeksInMonth()) {
        const weekWork = this.countWeekWorkDays(employee.id, week.weekNumber)
        if (weekWork > (this.config.maxWeeklyShifts || 6)) {
          this.warnings.push({
            type: 'hours',
            severity: 'warning',
            message: `${employee.name}: ${weekWork} turnos en semana ${week.weekNumber} (máx ${this.config.maxWeeklyShifts || 6})`,
            employeeId: employee.id,
            employeeName: employee.name,
          })
        }
      }

      // ========================================
      // VALIDATION 6: Night block - MINIMUM 3 CONSECUTIVE
      // ========================================
      const nightCount = shiftCounts['N'] || 0
      const MIN_NIGHTS_REQUIRED = 3
      
      if (nightCount > 0) {
        // Get all night days for this employee and check if consecutive
        const nightDays = this.days
          .filter(d => this.matrix[employee.id][d.dayNumber] === 'N')
          .map(d => d.dayNumber)
          .sort((a, b) => a - b)
        
        // Check consecutiveness
        let isConsecutive = true
        for (let i = 1; i < nightDays.length; i++) {
          if (nightDays[i] !== nightDays[i - 1] + 1) {
            isConsecutive = false
            break
          }
        }
        
        if (!isConsecutive) {
          // ERROR: Nights are scattered, not in a block
          this.warnings.push({
            type: 'night_block',
            severity: 'error',
            message: `${employee.name}: noches dispersas (días ${nightDays.join(', ')}) - deben ser consecutivas`,
            employeeId: employee.id,
            employeeName: employee.name,
          })
        } else if (nightCount < MIN_NIGHTS_REQUIRED) {
          // ERROR: Less than 3 consecutive nights
          this.warnings.push({
            type: 'night_block',
            severity: 'error',
            message: `${employee.name}: ${nightCount} noches (mínimo obligatorio ${MIN_NIGHTS_REQUIRED} consecutivas)`,
            employeeId: employee.id,
            employeeName: employee.name,
          })
        } else if (nightCount < (this.config.minNightBlock || 4)) {
          // WARNING: Less than recommended (4)
          this.warnings.push({
            type: 'night_block',
            severity: 'warning',
            message: `${employee.name}: ${nightCount} noches (mín recomendado ${this.config.minNightBlock || 4})`,
            employeeId: employee.id,
            employeeName: employee.name,
          })
        }
      }
      
      if (nightCount > (this.config.maxNightBlock || 6)) {
        this.warnings.push({
          type: 'night_block',
          severity: 'warning',
          message: `${employee.name}: ${nightCount} noches (máx ${this.config.maxNightBlock || 6})`,
          employeeId: employee.id,
          employeeName: employee.name,
        })
      }
    }
  }

  /**
   * Find violations of max consecutive work days rule
   */
  private findConsecutiveWorkViolations(employeeId: string, maxConsecutive: number): { startDay: number; endDay: number; count: number }[] {
    const violations: { startDay: number; endDay: number; count: number }[] = []
    const sortedDays = [...this.days].sort((a, b) => a.dayNumber - b.dayNumber)
    
    let consecutiveStart = -1
    let consecutiveCount = 0
    
    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i]
      const shift = this.matrix[employeeId][day.dayNumber]
      const isWork = this.isWorkShift(shift)
      
      if (isWork) {
        if (consecutiveCount === 0) {
          consecutiveStart = day.dayNumber
        }
        consecutiveCount++
      } else {
        // End of work streak
        if (consecutiveCount > maxConsecutive) {
          violations.push({
            startDay: consecutiveStart,
            endDay: sortedDays[i - 1].dayNumber,
            count: consecutiveCount,
          })
        }
        consecutiveCount = 0
        consecutiveStart = -1
      }
    }
    
    // Check final streak
    if (consecutiveCount > maxConsecutive) {
      violations.push({
        startDay: consecutiveStart,
        endDay: sortedDays[sortedDays.length - 1].dayNumber,
        count: consecutiveCount,
      })
    }
    
    return violations
  }

  /**
   * Check if converting a libre day to work would break the 2 consecutive libre requirement
   * Returns true if the conversion would violate the rule (should NOT convert)
   */
  private wouldBreakConsecutiveLibre(employeeId: string, day: DayInfo): boolean {
    const weekDays = this.days
      .filter((d) => d.weekNumber === day.weekNumber)
      .sort((a, b) => a.dayNumber - b.dayNumber)
    
    // Count current libre days in this week (including RESERVED_L)
    const libreDays = weekDays.filter((d) => {
      const shift = this.matrix[employeeId][d.dayNumber]
      return shift && (shift.startsWith('L') || shift.startsWith('RESERVED_L') || shift === 'V' || shift === 'B' || shift === 'IT' || shift === 'E' || shift === 'FO')
    })
    
    // If only 2 libre days left, check if this one is part of a consecutive pair
    if (libreDays.length <= 2) {
      // Find consecutive pairs
      for (let i = 0; i < libreDays.length - 1; i++) {
        if (libreDays[i + 1].dayNumber === libreDays[i].dayNumber + 1) {
          // Found a consecutive pair - check if target day is part of it
          if (libreDays[i].dayNumber === day.dayNumber || libreDays[i + 1].dayNumber === day.dayNumber) {
            // This day is part of the only consecutive pair - don't break it!
            return true
          }
        }
      }
      
      // If exactly 2 libre and they're NOT consecutive, we already have a problem
      // But removing one would make it worse, so still protect them
      if (libreDays.length === 2) {
        return true
      }
    }
    
    // If more than 2 libre days, simulate removal and check if 2 consecutive remain
    if (libreDays.length > 2) {
      const remainingLibre = libreDays.filter((d) => d.dayNumber !== day.dayNumber)
      
      // Check if remaining libre days have at least 2 consecutive
      let hasConsecutive = false
      for (let i = 0; i < remainingLibre.length - 1; i++) {
        if (remainingLibre[i + 1].dayNumber === remainingLibre[i].dayNumber + 1) {
          hasConsecutive = true
          break
        }
      }
      
      if (!hasConsecutive) {
        return true // Would break the 2 consecutive requirement
      }
    }
    
    return false // Safe to convert
  }

  /**
   * Check if converting a libre day to work would exceed max consecutive work days
   * Returns true if the conversion would violate the rule (should NOT convert)
   */
  private wouldExceedConsecutiveWorkDays(employeeId: string, dayNumber: number, maxConsecutive: number): boolean {
    const sortedDays = [...this.days].sort((a, b) => a.dayNumber - b.dayNumber)
    
    // Count consecutive work days including this day
    let consecutiveBefore = 0
    let consecutiveAfter = 0
    
    // Count backwards from this day
    for (let d = dayNumber - 1; d >= 1; d--) {
      const dayInfo = sortedDays.find((x) => x.dayNumber === d)
      if (!dayInfo) break
      const shift = this.matrix[employeeId][d]
      if (this.isWorkShift(shift)) {
        consecutiveBefore++
      } else {
        break
      }
    }
    
    // Count forwards from this day
    const maxDay = sortedDays[sortedDays.length - 1]?.dayNumber || 31
    for (let d = dayNumber + 1; d <= maxDay; d++) {
      const dayInfo = sortedDays.find((x) => x.dayNumber === d)
      if (!dayInfo) break
      const shift = this.matrix[employeeId][d]
      if (this.isWorkShift(shift)) {
        consecutiveAfter++
      } else {
        break
      }
    }
    
    // Total consecutive including this day would be: before + 1 (this day) + after
    const totalConsecutive = consecutiveBefore + 1 + consecutiveAfter
    
    return totalConsecutive > maxConsecutive
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private dayOfWeekToNumber(dow: DayOfWeek): number {
    // Returns 1-7 where 1=Monday, 7=Sunday
    const map: { [key: string]: number } = {
      L: 1,
      M: 2,
      X: 3,
      J: 4,
      V: 5,
      S: 6,
      D: 7,
    }
    return map[dow] || 0
  }

  private getWeeksInMonth(): { weekNumber: number }[] {
    const weeks = new Set<number>()
    for (const day of this.days) {
      weeks.add(day.weekNumber)
    }
    return Array.from(weeks)
      .sort((a, b) => a - b)
      .map((w) => ({ weekNumber: w }))
  }

  private isWorkShift(shift: string | undefined): boolean {
    if (!shift) return false
    return ['M', 'T', 'N', 'P', 'PI'].includes(shift)
  }

  private countShiftOnDay(dayNumber: number, shiftCode: string): number {
    let count = 0
    for (const employeeId of Object.keys(this.matrix)) {
      if (this.matrix[employeeId][dayNumber] === shiftCode) {
        count++
      }
    }
    return count
  }

  private countWeekWorkDays(employeeId: string, weekNumber: number): number {
    let count = 0
    for (const day of this.days) {
      if (day.weekNumber === weekNumber) {
        const shift = this.matrix[employeeId][day.dayNumber]
        if (this.isWorkShift(shift)) {
          count++
        }
      }
    }
    return count
  }

  private determineWeekShift(employee: Employee, weekNumber: number): string {
    // Count current M and T assignments for this employee
    let mCount = 0
    let tCount = 0
    
    for (const day of this.days) {
      const shift = this.matrix[employee.id][day.dayNumber]
      if (shift === 'M') mCount++
      if (shift === 'T') tCount++
    }

    // Check priority preference (Salvador=M, Andrés=T)
    if (employee.rules.shiftPriority) {
      const preferred = employee.rules.shiftPriority
      const other = preferred === 'M' ? 'T' : 'M'
      
      const currentOther = other === 'M' ? mCount : tCount
      const currentPreferred = preferred === 'M' ? mCount : tCount
      
      // Check if we've hit the max for the preferred shift
      const maxPreferred = employee.rules.maxShiftPerMonth?.[preferred]
      if (maxPreferred && currentPreferred >= maxPreferred) {
        return other
      }
      
      // Check if we've hit the max for the other shift (can't use it anymore)
      const maxOther = employee.rules.maxShiftPerMonth?.[other]
      if (maxOther && currentOther >= maxOther) {
        return preferred
      }
      
      // If other shift hasn't reached its required minimum yet
      const minOther = employee.rules.minShiftPerMonth?.[other]
      if (minOther && currentOther < minOther) {
        return other
      }
      
      // Default to preferred
      return preferred
    }

    // ========================================
    // CONTINUITY: Consider last shift from previous month
    // For week 1, prefer opposite of last month's ending shift
    // ========================================
    if (weekNumber === 1 && this.previousMonthHistory) {
      const lastShiftType = this.previousMonthHistory.lastShiftType.get(employee.id)
      if (lastShiftType && mCount === 0 && tCount === 0) {
        // First assignment this month - rotate from previous month
        // RANDOMIZATION: 80% chance to rotate, 20% chance to stay same
        const shouldRotate = Math.random() < 0.8
        const rotatedShift = shouldRotate 
          ? (lastShiftType === 'M' ? 'T' : 'M')
          : lastShiftType
        console.log(`[determineWeekShift] ${employee.name} week 1: ${shouldRotate ? 'rotating' : 'staying'} from ${lastShiftType} to ${rotatedShift} (continuity)`)
        return rotatedShift
      }
    }

    // RANDOMIZATION: For employees without priority, randomly choose M or T
    // with some balancing logic
    
    // If heavily imbalanced, correct it (but with some randomness)
    if (mCount > tCount + 5) {
      // 90% chance to correct imbalance, 10% to let it slide
      return Math.random() < 0.9 ? 'T' : 'M'
    }
    if (tCount > mCount + 5) {
      return Math.random() < 0.9 ? 'M' : 'T'
    }
    
    // RANDOMIZATION: Random choice with slight bias toward balancing
    const imbalance = mCount - tCount
    let mProbability = 0.5
    
    // Adjust probability based on current balance (max 30% adjustment)
    mProbability -= (imbalance / 20) // If mCount > tCount, reduce M probability
    mProbability = Math.max(0.2, Math.min(0.8, mProbability)) // Clamp between 0.2 and 0.8
    
    return Math.random() < mProbability ? 'M' : 'T'
  }

  // ============================================
  // CONVERT MATRIX TO ASSIGNMENTS
  // ============================================

  private matrixToAssignments(): BulkAssignmentDTO[] {
    const assignments: BulkAssignmentDTO[] = []
    
    // Valid shift codes from database
    const validShiftCodes = new Set(this.shifts.map(s => s.code))

    for (const employeeId of Object.keys(this.matrix)) {
      for (const day of this.days) {
        let shift = this.matrix[employeeId][day.dayNumber]
        if (shift && !shift.startsWith('REQUEST') && !shift.startsWith('AVOID')) {
          // Normalize shift codes: L1, L2, L3, etc. -> L
          if (shift.startsWith('L') && shift.length > 1 && /^L\d+$/.test(shift)) {
            shift = 'L'
          }
          
          // Only add if valid shift code
          if (validShiftCodes.has(shift)) {
            assignments.push({
              day_id: day.id,
              employee_id: employeeId,
              shift_code: shift,
            })
          } else {
            // Log warning for unknown shift codes
            this.warnings.push({
              type: 'constraint',
              severity: 'warning',
              message: `Código de turno desconocido: ${shift} (día ${day.dayNumber})`,
              employeeId,
            })
          }
        }
      }
    }

    return assignments
  }

  // ============================================
  // CALCULATE STATS
  // ============================================

  private calculateStats(): { byEmployee: EmployeeStats[]; byDay: DailyStats[] } {
    const byEmployee: EmployeeStats[] = []

    for (const employee of this.employees) {
      const stats: EmployeeStats = {
        L: 0,
        V: 0,
        B: 0,
        E: 0,
        IT: 0,
        M: 0,
        T: 0,
        N: 0,
        PI: 0,
        P: 0,
        FO: 0,
        A: 0,
        presencias: 0,
        horas: 0,
      }

      for (const day of this.days) {
        const shift = this.matrix[employee.id][day.dayNumber]
        if (!shift) continue

        if (shift.startsWith('L')) stats.L++
        else if (shift === 'V') stats.V++
        else if (shift === 'B') stats.B++
        else if (shift === 'E') stats.E++
        else if (shift === 'IT') stats.IT++
        else if (shift === 'M') stats.M++
        else if (shift === 'T') stats.T++
        else if (shift === 'N') stats.N++
        else if (shift === 'PI') stats.PI++
        else if (shift === 'P') stats.P++
        else if (shift === 'FO') stats.FO++
        else if (shift === 'A') stats.A++
      }

      stats.presencias = stats.M + stats.T + stats.N + stats.PI + stats.P
      stats.horas = stats.presencias * 8

      byEmployee.push(stats)
    }

    const byDay: DailyStats[] = this.days.map((day) => ({
      day: day.dayNumber,
      M: this.countShiftOnDay(day.dayNumber, 'M'),
      T: this.countShiftOnDay(day.dayNumber, 'T'),
      N: this.countShiftOnDay(day.dayNumber, 'N'),
      PI: this.countShiftOnDay(day.dayNumber, 'PI'),
      P: this.countShiftOnDay(day.dayNumber, 'P'),
    }))

    return { byEmployee, byDay }
  }

  // ============================================
  // GET ASSIGNMENTS (to save to DB)
  // ============================================

  getAssignments(): BulkAssignmentDTO[] {
    return this.matrixToAssignments()
  }

  /**
   * Get metadata about the generator context
   */
  getMetadata(): { year: number; month: number; totalDays: number; shiftCodes: string[] } {
    return {
      year: this.year,
      month: this.month,
      totalDays: this.days.length,
      shiftCodes: this.shifts.map(s => s.code),
    }
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export async function createScheduleGenerator(monthId: number): Promise<ScheduleGenerator | null> {
  // Load all required data
  const month = await repo.getMonthById(monthId)
  if (!month) return null

  const [config, shifts, days, constraints, allRules, schedulableUsers] = await Promise.all([
    repo.getConfigMap(),
    repo.getAllShifts(),
    repo.getDaysByMonth(monthId),
    repo.getConstraintsByMonth(monthId, { status: 'approved' }),
    repo.getAllEmployeeRules(),
    repo.getSchedulableEmployees(), // Get all reception staff from users table
  ])

  // Build rules map for quick lookup
  const rulesMap = new Map<string, SchedulingEmployeeRuleWithEmployee[]>()
  allRules.forEach((r) => {
    if (!rulesMap.has(r.employee_id)) {
      rulesMap.set(r.employee_id, [])
    }
    rulesMap.get(r.employee_id)!.push(r)
  })

  // Build employee objects from schedulable users (reception staff)
  // This ensures we always have employees to schedule, even without rules
  const employees: Employee[] = schedulableUsers.map((user) => {
    const empRules = rulesMap.get(user.id) || []
    const employee: Employee = {
      id: user.id,
      name: user.username,
      rules: {},
    }

    // Parse rules if any exist for this employee
    for (const rule of empRules) {
      switch (rule.rule_type) {
        case 'shift_priority':
          employee.rules.shiftPriority = rule.rule_value
          break
        case 'max_shift_per_month':
          if (!employee.rules.maxShiftPerMonth) {
            employee.rules.maxShiftPerMonth = {}
          }
          const [shiftCode, maxStr] = rule.rule_value.split(':')
          employee.rules.maxShiftPerMonth[shiftCode] = parseInt(maxStr)
          break
        case 'fixed_days':
          employee.rules.fixedDays = rule.rule_value.split(',').map(Number)
          break
        case 'fixed_shift':
          employee.rules.fixedShift = rule.rule_value
          break
        case 'no_weekends':
          employee.rules.noWeekends = rule.rule_value === 'true'
          break
      }
    }

    return employee
  })

  // Log for debugging
  console.log(`[ScheduleGenerator] Creating generator for month ${monthId}:`)
  console.log(`  - ${employees.length} schedulable employees`)
  console.log(`  - ${days.length} days in month`)
  console.log(`  - ${constraints.length} approved constraints`)
  console.log(`  - ${allRules.length} employee rules`)

  return new ScheduleGenerator(
    monthId,
    month.year,
    month.month,
    config,
    shifts,
    days,
    employees,
    constraints
  )
}
