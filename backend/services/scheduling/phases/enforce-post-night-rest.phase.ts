// services/scheduling/phases/enforce-post-night-rest.phase.ts
// Phase 4.5: Enforce 48h rest after night blocks

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult } from '../types/index.js'

/**
 * Enforce Post-Night Rest Phase
 *
 * After a night block ends, employee needs 48h rest:
 * - Night ends at ~7am
 * - Day after last night = REST (libre)
 * - Day after rest = can work T (starts at 3pm = 32h after night end)
 * - Cannot work M (starts at 7am = only 24h after night end)
 *
 * This phase:
 * 1. Finds night blocks for each employee
 * 2. Sets the day after each block to libre
 * 3. Marks the day after rest as PREFER_T (to be respected in Phase 5)
 */
export class EnforcePostNightRestPhase extends BasePhase {
  readonly name = 'enforce-post-night-rest'
  readonly order = 45 // After night blocks (40), before rotating shifts (50)

  execute(context: GeneratorContext): PhaseResult {
    const { matrix, days, employees } = context
    let restDaysAssigned = 0
    let preferTMarked = 0

    for (const employee of employees) {
      // Skip fixed-shift employees
      if (employee.rules.fixedShift) continue

      // Find all night shift days for this employee, sorted
      const nightDays = days
        .filter((d) => matrix[employee.id][d.dayNumber] === 'N')
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
          const restDay = days.find((d) => d.dayNumber === blockEnd + 1)
          const returnDay = days.find((d) => d.dayNumber === blockEnd + 2)

          if (restDay) {
            // Day immediately after night block = mandatory rest
            const currentRest = matrix[employee.id][restDay.dayNumber]
            // Don't override existing absences (V, B, IT, E, FO)
            if (!currentRest || !['V', 'B', 'IT', 'E', 'FO'].includes(currentRest)) {
              matrix[employee.id][restDay.dayNumber] = `L${restDay.weekNumber}`
              restDaysAssigned++
              this.log(`${employee.name}: day ${restDay.dayNumber} -> L (post-night rest)`)
            }
          }

          if (returnDay) {
            // Day after rest = mark to prefer T (afternoon) shift
            const currentReturn = matrix[employee.id][returnDay.dayNumber]
            if (!currentReturn || currentReturn === '') {
              // Mark this day to avoid M shift (will be handled in Phase 5)
              matrix[employee.id][returnDay.dayNumber] = 'PREFER_T'
              preferTMarked++
              this.log(`${employee.name}: day ${returnDay.dayNumber} -> PREFER_T (48h rule)`)
            }
          }
        }
      }
    }

    this.log(`Assigned ${restDaysAssigned} rest days, marked ${preferTMarked} PREFER_T`)

    return this.success(
      `Post-night rest enforced: ${restDaysAssigned} rest days, ${preferTMarked} PREFER_T markers`
    )
  }
}
