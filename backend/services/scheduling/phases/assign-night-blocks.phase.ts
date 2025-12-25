// services/scheduling/phases/assign-night-blocks.phase.ts
// Phase 4: Assign night blocks (3-6 consecutive nights per employee)

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, GenerationWarning, DayInfo, Employee } from '../types/index.js'
import {
  shuffle,
  randomInt,
  countShiftOnDay,
  isEmptyOrSoftMarker,
  getWorkableDays,
  findConsecutiveSegments,
  areConsecutive,
  isAdjacentToAny,
} from '../utils/index.js'
import { selectBestCandidate } from '../scoring/index.js'

/**
 * Phase 4: Assign Night Blocks
 *
 * Everyone does 3-6 consecutive nights per month.
 * Rules:
 * - Nights MUST be consecutive (in a single block)
 * - Minimum 3 consecutive nights (mandatory)
 * - Recommended 4-6 nights (configurable)
 * - Only 1 person per night shift
 * - Employees marked as completed cannot receive more nights
 */
export class AssignNightBlocksPhase extends BasePhase {
  readonly name = 'AssignNightBlocks'
  readonly order = 40

  // Track nights per employee during execution
  private employeeNights: Map<string, number[]> = new Map()
  // Track employees who have completed their night block
  private completedEmployees: Set<string> = new Set()

  execute(context: GeneratorContext): PhaseResult {
    const warnings: GenerationWarning[] = []

    // Get employees who can do nights (not fixed shift like EMP_01 R)
    const nightEligible = context.employees.filter(
      (e) => !e.rules.fixedShift && !e.rules.noWeekends
    )

    if (nightEligible.length === 0) {
      this.log('No employees eligible for night shifts')
      return this.success('No night-eligible employees')
    }

    // Get all non-holiday days that need night coverage
    const nightDays = getWorkableDays(context.days)
    const totalNights = nightDays.length
    const minBlock = context.config.minNightBlock || 4
    const maxBlock = context.config.maxNightBlock || 6
    const MIN_CONSECUTIVE_NIGHTS = 3 // CRITICAL: Minimum 3 consecutive nights

    this.log(`${totalNights} nights, ${nightEligible.length} employees, minBlock=${minBlock}, maxBlock=${maxBlock}`)

    // Initialize tracking
    this.employeeNights = new Map()
    this.completedEmployees = new Set()
    nightEligible.forEach((e) => this.employeeNights.set(e.id, []))

    // ========================================
    // PHASE 4.1: CONTINUE INCOMPLETE BLOCKS FROM PREVIOUS MONTH
    // ========================================
    const continuationWarnings = this.continueIncompleteBlocks(context, nightEligible, nightDays, minBlock)
    warnings.push(...continuationWarnings)

    // ========================================
    // PHASE 4.2: ASSIGN REST DAY FOR EMPLOYEES WHO ENDED WITH NIGHTS
    // ========================================
    this.assignPostNightRestFromPrevMonth(context, nightEligible)

    // ========================================
    // PHASE 4.3: ASSIGN NIGHT BLOCKS (LINEAR STRATEGY)
    // ========================================
    const assignmentWarnings = this.assignNightBlocks(
      context,
      nightEligible,
      nightDays,
      minBlock,
      maxBlock,
      MIN_CONSECUTIVE_NIGHTS
    )
    warnings.push(...assignmentWarnings)

    // ========================================
    // PHASE 4.4: FILL REMAINING GAPS
    // ========================================
    const gapWarnings = this.fillRemainingGaps(context, nightEligible, nightDays, maxBlock, MIN_CONSECUTIVE_NIGHTS)
    warnings.push(...gapWarnings)

    // ========================================
    // PHASE 4.5: VALIDATE NIGHT BLOCK CONSECUTIVENESS
    // ========================================
    const validationWarnings = this.validateNightBlocks(context, nightEligible, minBlock, maxBlock, MIN_CONSECUTIVE_NIGHTS)
    warnings.push(...validationWarnings)

    // Copy completed employees to context
    for (const empId of this.completedEmployees) {
      context.employeesWithCompletedNightBlock.add(empId)
    }

    return this.successWithWarnings(warnings, `Assigned night blocks to ${this.completedEmployees.size} employees`)
  }

  /**
   * Continue incomplete night blocks from previous month
   */
  private continueIncompleteBlocks(
    context: GeneratorContext,
    nightEligible: Employee[],
    nightDays: DayInfo[],
    minBlock: number
  ): GenerationWarning[] {
    const warnings: GenerationWarning[] = []

    if (!context.previousMonthHistory || context.previousMonthHistory.incompleteNightBlocks.size === 0) {
      return warnings
    }

    this.log(`Continuing ${context.previousMonthHistory.incompleteNightBlocks.size} incomplete night blocks`)

    for (const [empId, nightsDone] of context.previousMonthHistory.incompleteNightBlocks) {
      const employee = nightEligible.find((e) => e.id === empId)
      if (!employee) continue

      const nightsNeeded = minBlock - nightsDone
      this.log(`${employee.name} needs ${nightsNeeded} more nights to complete block (had ${nightsDone})`)

      // Assign nights at START of month to continue the block
      // CRITICAL: Nights MUST be consecutive - stop if any day is blocked
      let assigned = 0
      for (let i = 0; i < nightsNeeded && i < nightDays.length; i++) {
        const day = nightDays[i]

        // Check if this day already has night coverage
        const existingNight = countShiftOnDay(context.matrix, day.dayNumber, 'N')
        if (existingNight >= 1) {
          this.log(`${employee.name}: day ${day.dayNumber} already has coverage, stopping continuation at ${assigned} nights`)
          break
        }

        // Check if employee is available
        const currentAssignment = context.matrix[employee.id][day.dayNumber]
        const isRequestOff = currentAssignment === 'REQUEST_OFF'
        const isAvailable = !isRequestOff && isEmptyOrSoftMarker(currentAssignment)
        const notAvoiding = currentAssignment !== 'AVOID_N'

        if (isAvailable && notAvoiding) {
          context.matrix[employee.id][day.dayNumber] = 'N'
          this.employeeNights.get(employee.id)!.push(day.dayNumber)
          assigned++
        } else {
          if (isRequestOff) {
            this.log(`${employee.name}: day ${day.dayNumber} is REQUEST_OFF, stopping continuation at ${assigned} nights`)
          } else {
            this.log(`${employee.name}: can't work day ${day.dayNumber}, stopping continuation at ${assigned} nights`)
          }
          break
        }
      }

      if (assigned > 0) {
        this.log(`${employee.name}: continued with ${assigned} nights at start of month`)
        // CRITICAL: Mark as completed - they already have nights from previous month plus this continuation
        this.completedEmployees.add(empId)
        this.log(`${employee.name}: marked as COMPLETED (continuation from previous month)`)
      }
    }

    return warnings
  }

  /**
   * Assign rest day for employees who ended previous month with nights
   */
  private assignPostNightRestFromPrevMonth(context: GeneratorContext, nightEligible: Employee[]): void {
    if (!context.previousMonthHistory || context.previousMonthHistory.endedWithNight.size === 0) {
      return
    }

    for (const [empId, endedWithNight] of context.previousMonthHistory.endedWithNight) {
      if (!endedWithNight) continue
      if (context.previousMonthHistory.incompleteNightBlocks.has(empId)) continue // Already continuing nights

      const employee = nightEligible.find((e) => e.id === empId)
      if (!employee) continue

      // This employee ended previous month with nights but completed their block
      // They need 48h rest, so day 1 should be libre and day 2 prefer T
      const day1 = context.days.find((d) => d.dayNumber === 1)
      const day2 = context.days.find((d) => d.dayNumber === 2)

      if (day1 && !context.matrix[employee.id][day1.dayNumber]) {
        context.matrix[employee.id][day1.dayNumber] = `L${day1.weekNumber}`
        this.log(`${employee.name}: day 1 set to L (post-night rest from prev month)`)
      }
      if (day2 && !context.matrix[employee.id][day2.dayNumber]) {
        context.matrix[employee.id][day2.dayNumber] = 'PREFER_T'
        this.log(`${employee.name}: day 2 set to PREFER_T (48h rest rule)`)
      }
    }
  }

  /**
   * Main night block assignment using LINEAR strategy
   */
  private assignNightBlocks(
    context: GeneratorContext,
    nightEligible: Employee[],
    nightDays: DayInfo[],
    minBlock: number,
    maxBlock: number,
    minConsecutive: number
  ): GenerationWarning[] {
    const warnings: GenerationWarning[] = []

    this.log('Using LINEAR strategy (guarantees consecutive night blocks)')

    // Get days that need night coverage (excluding already assigned from continuation)
    const unassignedDays = nightDays.filter((d) => countShiftOnDay(context.matrix, d.dayNumber, 'N') === 0)
    const sortedDays = [...unassignedDays].sort((a, b) => a.dayNumber - b.dayNumber)

    const shuffledEmployees = shuffle(nightEligible)
    this.log(`Available employees: ${shuffledEmployees.map((e) => e.name).join(', ')}`)

    let dayIndex = 0

    while (dayIndex < sortedDays.length) {
      const currentDay = sortedDays[dayIndex].dayNumber

      // Find available employees (haven't reached max nights AND can do at least minConsecutive)
      // CRITICAL: Only consider employees with NO nights yet OR whose existing nights are ADJACENT
      const availableEmployees = shuffle(
        shuffledEmployees.filter((emp) => {
          if (this.completedEmployees.has(emp.id)) return false

          const existingNights = this.employeeNights.get(emp.id)!
          const remainingCapacity = maxBlock - existingNights.length
          if (remainingCapacity < minConsecutive) return false

          // If employee has existing nights, check if this day would be adjacent
          if (existingNights.length > 0) {
            if (!isAdjacentToAny(currentDay, existingNights)) {
              return false // Would create scattered nights
            }
          }

          // ROTATION RULE: M/T can only do N if they've done at most 1 M/T shift before
          // Check how many M/T shifts this employee has before the night block would start
          if (existingNights.length === 0) {
            const mtShiftsBefore = this.countMTShiftsBefore(context, emp.id, currentDay)
            if (mtShiftsBefore > 1) {
              this.log(`${emp.name}: excluded from night block at day ${currentDay} (has ${mtShiftsBefore} M/T shifts, max 1 allowed before N)`)
              return false
            }
          }

          return true
        })
      )

      // Fallback: employees with NO nights yet
      const fallbackEmployees =
        availableEmployees.length === 0
          ? shuffle(
              shuffledEmployees.filter((emp) => {
                if (this.completedEmployees.has(emp.id)) return false
                const existingNights = this.employeeNights.get(emp.id)!
                if (existingNights.length > 0) return false
                
                // Also apply rotation rule in fallback
                const mtShiftsBefore = this.countMTShiftsBefore(context, emp.id, currentDay)
                if (mtShiftsBefore > 1) return false
                
                return true
              })
            )
          : []

      const employeesToUse = availableEmployees.length > 0 ? availableEmployees : fallbackEmployees

      if (employeesToUse.length === 0) {
        this.log(`No more available employees at day index ${dayIndex}`)
        break
      }

      // Use scoring system to pick the best employee for this night block
      const currentDayInfo = sortedDays[dayIndex]
      const selectionResult = selectBestCandidate(employeesToUse, currentDayInfo, 'N', context)
      
      if (!selectionResult.selected) {
        this.log(`No employee selected by scoring at day index ${dayIndex}`)
        break
      }
      
      const employee = selectionResult.selected
      
      // Log top 3 candidates for debugging
      if (selectionResult.candidates.length > 1) {
        this.log(`Scoring for day ${currentDayInfo.dayNumber} (N):`)
        selectionResult.candidates.slice(0, 3).forEach((c, i) => {
          const marker = i === 0 ? '>>>' : '   '
          this.log(`  ${marker} ${c.employeeName}: ${c.totalScore.toFixed(1)}`)
        })
      }
      
      const currentNights = this.employeeNights.get(employee.id)!.length
      const remainingCapacity = maxBlock - currentNights
      const remainingDays = sortedDays.length - dayIndex

      // Determine block size - minimum 3 nights
      let blockSize = randomInt(Math.max(minBlock, minConsecutive), maxBlock)
      blockSize = Math.min(blockSize, remainingCapacity, remainingDays)

      // If blockSize < minConsecutive, skip to gap-fill phase
      if (blockSize < minConsecutive && remainingDays >= minConsecutive) {
        this.log(`${employee.name} can only do ${blockSize} nights, skipping to gap-fill`)
        break
      }

      this.log(`${employee.name} will do ${blockSize} nights`)

      // Assign consecutive nights
      let assigned = 0
      for (let i = 0; i < blockSize && dayIndex < sortedDays.length; i++) {
        const day = sortedDays[dayIndex]
        const currentAssignment = context.matrix[employee.id][day.dayNumber]
        const isRequestOff = currentAssignment === 'REQUEST_OFF'
        const isAvailable = !isRequestOff && isEmptyOrSoftMarker(currentAssignment)
        const notAvoiding = currentAssignment !== 'AVOID_N'

        if (isAvailable && notAvoiding) {
          context.matrix[employee.id][day.dayNumber] = 'N'
          this.employeeNights.get(employee.id)!.push(day.dayNumber)
          assigned++
          dayIndex++
        } else {
          if (isRequestOff) {
            this.log(`${employee.name}: day ${day.dayNumber} is REQUEST_OFF, stopping block at ${assigned} nights`)
          } else {
            this.log(`${employee.name}: can't work day ${day.dayNumber}, stopping block at ${assigned} nights`)
          }
          break
        }
      }

      const nightsList = this.employeeNights.get(employee.id)!
      this.log(`${employee.name}: assigned ${assigned} nights (total: ${nightsList.length}, days: ${nightsList.join(',')})`)

      // CRITICAL: ALWAYS mark employee as completed after receiving ANY nights
      if (nightsList.length > 0) {
        this.completedEmployees.add(employee.id)
        this.log(`${employee.name}: marked as COMPLETED (${nightsList.length} nights - no more nights can be assigned)`)
      }
    }

    return warnings
  }

  /**
   * Count M/T shifts an employee has before a given day
   */
  private countMTShiftsBefore(context: GeneratorContext, employeeId: string, beforeDay: number): number {
    let count = 0
    for (let day = 1; day < beforeDay; day++) {
      const shift = context.matrix[employeeId]?.[day]
      if (shift === 'M' || shift === 'T') {
        count++
      }
    }
    return count
  }

  /**
   * Fill remaining gaps while respecting min consecutive nights
   */
  private fillRemainingGaps(
    context: GeneratorContext,
    nightEligible: Employee[],
    nightDays: DayInfo[],
    maxBlock: number,
    minConsecutive: number
  ): GenerationWarning[] {
    const warnings: GenerationWarning[] = []
    const shuffledEmployees = shuffle(nightEligible)

    let remainingDays = nightDays.filter((d) => countShiftOnDay(context.matrix, d.dayNumber, 'N') === 0)

    if (remainingDays.length > 0) {
      this.log(`Gap-fill: ${remainingDays.length} days still need night coverage: ${remainingDays.map((d) => d.dayNumber).join(', ')}`)
    }

    while (remainingDays.length > 0) {
      remainingDays = nightDays.filter((d) => countShiftOnDay(context.matrix, d.dayNumber, 'N') === 0)
      if (remainingDays.length === 0) break

      // Find consecutive segments in remaining days
      const segments = findConsecutiveSegments(remainingDays)

      let madeProgress = false

      for (const segment of segments) {
        const segmentFirst = segment[0].dayNumber
        const segmentLast = segment[segment.length - 1].dayNumber

        if (segment.length >= minConsecutive) {
          // Segment is big enough - assign as a block
          const candidates = shuffle([...shuffledEmployees])
            .filter((emp) => {
              if (this.completedEmployees.has(emp.id)) return false

              const existingNights = this.employeeNights.get(emp.id)!

              // Check availability
              const allAvailable = segment.every((day) => {
                const current = context.matrix[emp.id][day.dayNumber]
                if (current === 'REQUEST_OFF') return false
                return isEmptyOrSoftMarker(current)
              })
              if (!allAvailable) return false

              // Check capacity
              if (existingNights.length + segment.length > maxBlock + 2) return false

              // CRITICAL: If employee has existing nights, they must be ADJACENT to this segment
              if (existingNights.length > 0) {
                const sortedExisting = [...existingNights].sort((a, b) => a - b)
                const existingFirst = sortedExisting[0]
                const existingLast = sortedExisting[sortedExisting.length - 1]

                const isAdjacentBefore = segmentLast === existingFirst - 1
                const isAdjacentAfter = segmentFirst === existingLast + 1

                if (!isAdjacentBefore && !isAdjacentAfter) {
                  return false // Would create scattered nights
                }
              }

              return true
            })

          if (candidates.length > 0) {
            // Use scoring to select the best candidate
            const selectionResult = selectBestCandidate(candidates, segment[0], 'N', context)
            const chosen = selectionResult.selected || candidates[0]
            
            for (const day of segment) {
              context.matrix[chosen.id][day.dayNumber] = 'N'
              this.employeeNights.get(chosen.id)!.push(day.dayNumber)
            }
            const nightsList = this.employeeNights.get(chosen.id)!
            const hadNights = nightsList.length > segment.length
            this.log(
              `Gap-fill: ${chosen.name} assigned ${segment.length} nights (days ${segment.map((d) => d.dayNumber).join(',')})${hadNights ? ' - extended existing block' : ' - new block'}`
            )

            // Mark as completed
            this.completedEmployees.add(chosen.id)
            this.log(`${chosen.name}: marked as COMPLETED (${nightsList.length} nights)`)
            madeProgress = true
          } else {
            this.log(`Gap-fill BLOCKED: Cannot assign segment days ${segment.map((d) => d.dayNumber).join(',')} - no valid candidates`)
          }
        } else {
          // Segment is too small - try to extend an adjacent employee's block
          const extended = this.tryExtendAdjacentBlock(context, segment, shuffledEmployees, maxBlock)
          if (extended) {
            madeProgress = true
          } else {
            // Try assigning to fresh employees only
            const freshAssigned = this.tryAssignToFreshEmployee(context, segment, shuffledEmployees)
            if (freshAssigned) {
              madeProgress = true
            } else {
              this.log(`Gap-fill BLOCKED: Cannot assign days ${segment.map((d) => d.dayNumber).join(',')} without creating scattered nights`)
            }
          }
        }
      }

      if (!madeProgress) {
        // No progress made - log errors for remaining days
        for (const day of remainingDays) {
          warnings.push(
            this.error(`Día ${day.dayNumber}: No hay cobertura de noche disponible`, {
              type: 'coverage',
              day: day.dayNumber,
            })
          )
        }
        break
      }
    }

    return warnings
  }

  /**
   * Try to extend an adjacent employee's night block
   */
  private tryExtendAdjacentBlock(
    context: GeneratorContext,
    segment: DayInfo[],
    employees: Employee[],
    maxBlock: number
  ): boolean {
    const firstDay = segment[0].dayNumber
    const lastDay = segment[segment.length - 1].dayNumber
    const dayBefore = firstDay - 1
    const dayAfter = lastDay + 1

    for (const emp of employees) {
      if (this.completedEmployees.has(emp.id)) continue

      const hasNightBefore = context.matrix[emp.id]?.[dayBefore] === 'N'
      const hasNightAfter = context.matrix[emp.id]?.[dayAfter] === 'N'

      if (hasNightBefore || hasNightAfter) {
        const currentNights = this.employeeNights.get(emp.id)!.length
        const canExtend = segment.every((day) => {
          const current = context.matrix[emp.id][day.dayNumber]
          if (current === 'REQUEST_OFF') return false
          return isEmptyOrSoftMarker(current)
        })

        if (canExtend && currentNights + segment.length <= maxBlock + 2) {
          for (const day of segment) {
            context.matrix[emp.id][day.dayNumber] = 'N'
            this.employeeNights.get(emp.id)!.push(day.dayNumber)
          }
          this.log(`Extended ${emp.name}'s block with ${segment.length} nights (days ${segment.map((d) => d.dayNumber).join(',')})`)

          const nightsList = this.employeeNights.get(emp.id)!
          this.completedEmployees.add(emp.id)
          this.log(`${emp.name}: marked as COMPLETED after extension (${nightsList.length} nights)`)
          return true
        }
      }
    }

    return false
  }

  /**
   * Try to assign segment to a fresh employee (with no nights)
   */
  private tryAssignToFreshEmployee(context: GeneratorContext, segment: DayInfo[], employees: Employee[]): boolean {
    const freshCandidates = shuffle([...employees]).filter((emp) => {
      if (this.completedEmployees.has(emp.id)) return false
      const existingNights = this.employeeNights.get(emp.id)!
      if (existingNights.length > 0) return false // CRITICAL: Only fresh employees

      const allAvailable = segment.every((day) => {
        const current = context.matrix[emp.id][day.dayNumber]
        if (current === 'REQUEST_OFF') return false
        return isEmptyOrSoftMarker(current)
      })
      return allAvailable
    })

    if (freshCandidates.length > 0) {
      // Use scoring to select the best fresh candidate
      const selectionResult = selectBestCandidate(freshCandidates, segment[0], 'N', context)
      const chosen = selectionResult.selected || freshCandidates[0]
      
      for (const day of segment) {
        context.matrix[chosen.id][day.dayNumber] = 'N'
        this.employeeNights.get(chosen.id)!.push(day.dayNumber)
      }
      this.log(`Gap-fill (fresh employee): ${chosen.name} assigned ${segment.length} nights (days ${segment.map((d) => d.dayNumber).join(',')}) - small block, may trigger retry`)

      const nightsList = this.employeeNights.get(chosen.id)!
      this.completedEmployees.add(chosen.id)
      this.log(`${chosen.name}: marked as COMPLETED (${nightsList.length} nights)`)
      return true
    }

    return false
  }

  /**
   * Validate that all night blocks meet requirements
   */
  private validateNightBlocks(
    _context: GeneratorContext,
    nightEligible: Employee[],
    minBlock: number,
    maxBlock: number,
    minConsecutive: number
  ): GenerationWarning[] {
    const warnings: GenerationWarning[] = []

    for (const employee of nightEligible) {
      const nights = this.employeeNights.get(employee.id)!.sort((a, b) => a - b)
      const nightCount = nights.length

      if (nightCount === 0) continue // No nights assigned is OK

      // Check that nights are consecutive (form a single block)
      const isConsecutive = areConsecutive(nights)

      // ERROR if nights are not consecutive (scattered nights)
      if (!isConsecutive) {
        warnings.push(
          this.error(`${employee.name}: noches no consecutivas (días ${nights.join(', ')}) - deben ser en bloque`, {
            type: 'night_block',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      }
      // ERROR if less than 3 consecutive nights (mandatory minimum)
      else if (nightCount < minConsecutive) {
        warnings.push(
          this.error(`${employee.name}: ${nightCount} noches asignadas (mínimo obligatorio ${minConsecutive})`, {
            type: 'night_block',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      }
      // WARNING if less than recommended (4)
      else if (nightCount < minBlock) {
        warnings.push(
          this.warn(`${employee.name}: ${nightCount} noches asignadas (mínimo recomendado ${minBlock})`, {
            type: 'night_block',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      }

      // WARNING if more than max
      if (nightCount > maxBlock) {
        warnings.push(
          this.warn(`${employee.name}: ${nightCount} noches asignadas (máximo recomendado ${maxBlock})`, {
            type: 'night_block',
            employeeId: employee.id,
            employeeName: employee.name,
          })
        )
      }
    }

    return warnings
  }
}
