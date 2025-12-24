// services/scheduling/phases/repair-small-blocks.phase.ts
// Phase 7: Repair small work blocks by extending them or merging with adjacent blocks

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, GenerationWarning } from '../types/index.js'
import { isWorkShift, isLibreShift, countShiftOnDay } from '../utils/index.js'

/**
 * Phase 7: Repair Small Work Blocks
 *
 * After weekly offs are assigned, some employees may have work blocks
 * smaller than the minimum (3 days). This phase tries to fix them by:
 * 1. Extending small blocks by converting adjacent libre days to work
 * 2. Or merging small blocks with adjacent blocks if possible
 */
export class RepairSmallBlocksPhase extends BasePhase {
  readonly name = 'RepairSmallBlocks'
  readonly order = 85 // After AssignPISupport (80), before FinalValidation (90)

  /** Minimum consecutive work days */
  private readonly MIN_WORK_BLOCK = 3

  execute(context: GeneratorContext): PhaseResult {
    const warnings: GenerationWarning[] = []
    let repairsAttempted = 0
    let repairsSuccessful = 0

    this.log(`Checking for small work blocks (<${this.MIN_WORK_BLOCK} days) and attempting repairs`)

    for (const employee of context.employees) {
      // Skip fixed-shift employees
      if (employee.rules.fixedDays || employee.rules.fixedShift) {
        continue
      }

      // Find all small work blocks
      const smallBlocks = this.findSmallWorkBlocks(context, employee.id)

      for (const block of smallBlocks) {
        repairsAttempted++
        const repaired = this.repairSmallBlock(context, employee.id, block)
        if (repaired) {
          repairsSuccessful++
          this.log(`${employee.name}: Repaired block days ${block.startDay}-${block.endDay}`)
        } else {
          this.log(`${employee.name}: Could not repair block days ${block.startDay}-${block.endDay}`)
        }
      }
    }

    this.log(`Repairs: ${repairsSuccessful}/${repairsAttempted} successful`)

    return this.successWithWarnings(warnings, `Repaired ${repairsSuccessful} of ${repairsAttempted} small blocks`)
  }

  /**
   * Find all work blocks smaller than MIN_WORK_BLOCK for an employee
   */
  private findSmallWorkBlocks(
    context: GeneratorContext,
    employeeId: string
  ): { startDay: number; endDay: number; size: number }[] {
    const blocks: { startDay: number; endDay: number; size: number }[] = []
    const sortedDays = [...context.days].sort((a, b) => a.dayNumber - b.dayNumber)

    let blockStart = -1
    let blockSize = 0

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i]
      const shift = context.matrix[employeeId][day.dayNumber]
      const isWork = isWorkShift(shift)

      if (isWork) {
        if (blockSize === 0) {
          blockStart = day.dayNumber
        }
        blockSize++
      } else {
        if (blockSize > 0 && blockSize < this.MIN_WORK_BLOCK) {
          blocks.push({
            startDay: blockStart,
            endDay: sortedDays[i - 1].dayNumber,
            size: blockSize,
          })
        }
        blockSize = 0
        blockStart = -1
      }
    }

    // Check final block
    if (blockSize > 0 && blockSize < this.MIN_WORK_BLOCK) {
      blocks.push({
        startDay: blockStart,
        endDay: sortedDays[sortedDays.length - 1].dayNumber,
        size: blockSize,
      })
    }

    return blocks
  }

  /**
   * Try to repair a small work block by extending it
   */
  private repairSmallBlock(
    context: GeneratorContext,
    employeeId: string,
    block: { startDay: number; endDay: number; size: number }
  ): boolean {
    const daysNeeded = this.MIN_WORK_BLOCK - block.size

    // Strategy 1: Try to extend before the block
    const extendedBefore = this.tryExtendBefore(context, employeeId, block, daysNeeded)
    if (extendedBefore >= daysNeeded) {
      return true
    }

    // Strategy 2: Try to extend after the block
    const remainingNeeded = daysNeeded - extendedBefore
    const extendedAfter = this.tryExtendAfter(context, employeeId, block, remainingNeeded)
    if (extendedBefore + extendedAfter >= daysNeeded) {
      return true
    }

    // Strategy 3: Convert the block to libre if it can't be repaired
    // This is a last resort - better to have more libre than invalid blocks
    if (block.size <= 2) {
      return this.convertBlockToLibre(context, employeeId, block)
    }

    return false
  }

  /**
   * Try to extend block by converting libre days BEFORE it to work days
   */
  private tryExtendBefore(
    context: GeneratorContext,
    employeeId: string,
    block: { startDay: number; endDay: number; size: number },
    maxDays: number
  ): number {
    let extended = 0

    // Get the shift type from the block to maintain consistency
    const blockShift = this.getBlockShiftType(context, employeeId, block)

    for (let day = block.startDay - 1; day >= 1 && extended < maxDays; day--) {
      const currentShift = context.matrix[employeeId][day]

      // Only convert libre days (not absences or nights)
      if (!isLibreShift(currentShift)) {
        break
      }

      // Check if we can add a shift here without exceeding coverage
      const currentCoverage = countShiftOnDay(context.matrix, day, blockShift)
      const maxCoverage = blockShift === 'M' 
        ? (context.config.maxMorningStaff || 3)
        : (context.config.maxAfternoonStaff || 3)

      if (currentCoverage >= maxCoverage) {
        // Try the other shift type
        const altShift = blockShift === 'M' ? 'T' : 'M'
        const altCoverage = countShiftOnDay(context.matrix, day, altShift)
        const altMax = altShift === 'M'
          ? (context.config.maxMorningStaff || 3)
          : (context.config.maxAfternoonStaff || 3)

        if (altCoverage < altMax) {
          context.matrix[employeeId][day] = altShift
          extended++
          this.log(`  Extended before: day ${day} = ${altShift}`)
        } else {
          break
        }
      } else {
        context.matrix[employeeId][day] = blockShift
        extended++
        this.log(`  Extended before: day ${day} = ${blockShift}`)
      }
    }

    return extended
  }

  /**
   * Try to extend block by converting libre days AFTER it to work days
   */
  private tryExtendAfter(
    context: GeneratorContext,
    employeeId: string,
    block: { startDay: number; endDay: number; size: number },
    maxDays: number
  ): number {
    let extended = 0
    const maxDay = Math.max(...context.days.map(d => d.dayNumber))

    // Get the shift type from the block to maintain consistency
    const blockShift = this.getBlockShiftType(context, employeeId, block)

    for (let day = block.endDay + 1; day <= maxDay && extended < maxDays; day++) {
      const currentShift = context.matrix[employeeId][day]

      // Only convert libre days (not absences or nights)
      if (!isLibreShift(currentShift)) {
        break
      }

      // Check coverage
      const currentCoverage = countShiftOnDay(context.matrix, day, blockShift)
      const maxCoverage = blockShift === 'M'
        ? (context.config.maxMorningStaff || 3)
        : (context.config.maxAfternoonStaff || 3)

      if (currentCoverage >= maxCoverage) {
        // Try the other shift type
        const altShift = blockShift === 'M' ? 'T' : 'M'
        const altCoverage = countShiftOnDay(context.matrix, day, altShift)
        const altMax = altShift === 'M'
          ? (context.config.maxMorningStaff || 3)
          : (context.config.maxAfternoonStaff || 3)

        if (altCoverage < altMax) {
          context.matrix[employeeId][day] = altShift
          extended++
          this.log(`  Extended after: day ${day} = ${altShift}`)
        } else {
          break
        }
      } else {
        context.matrix[employeeId][day] = blockShift
        extended++
        this.log(`  Extended after: day ${day} = ${blockShift}`)
      }
    }

    return extended
  }

  /**
   * Get the predominant shift type in a block
   */
  private getBlockShiftType(
    context: GeneratorContext,
    employeeId: string,
    block: { startDay: number; endDay: number }
  ): 'M' | 'T' {
    let mCount = 0
    let tCount = 0

    for (let day = block.startDay; day <= block.endDay; day++) {
      const shift = context.matrix[employeeId][day]
      if (shift === 'M') mCount++
      if (shift === 'T') tCount++
    }

    return mCount >= tCount ? 'M' : 'T'
  }

  /**
   * Convert a small block entirely to libre days (last resort)
   */
  private convertBlockToLibre(
    context: GeneratorContext,
    employeeId: string,
    block: { startDay: number; endDay: number }
  ): boolean {
    // Find the week number for the libre designation
    const firstDay = context.days.find(d => d.dayNumber === block.startDay)
    const weekNumber = firstDay?.weekNumber || 1

    for (let day = block.startDay; day <= block.endDay; day++) {
      const currentShift = context.matrix[employeeId][day]
      // Only convert work shifts, not absences
      if (isWorkShift(currentShift)) {
        context.matrix[employeeId][day] = `L${weekNumber}`
        this.log(`  Converted to libre: day ${day}`)
      }
    }

    return true
  }
}
