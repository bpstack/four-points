// services/scheduling/phases/apply-constraints.phase.ts
// Phase 2: Apply fixed constraints (holidays, vacations, sick leave)

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, GenerationWarning } from '../types/index.js'

// Interface for constraints from database
interface SchedulingConstraint {
  employee_id: string
  constraint_type: string
  start_date: string | Date
  end_date: string | Date
  shift_code?: string
  status: string
  priority?: number
}

/**
 * Apply Constraints Phase
 *
 * Applies fixed constraints to the schedule:
 * - Company holidays (B for all)
 * - Individual vacations (V)
 * - Sick leave (IT)
 * - Sick days (E)
 * - Training (FO)
 * - Request off (REQUEST_OFF marker)
 * - Shift requests (REQUEST_X marker)
 * - Avoid shift (AVOID_X marker)
 *
 * Also validates coverage after applying constraints.
 */
// Extended context type that includes constraints
interface ExtendedContext extends GeneratorContext {
  constraints?: SchedulingConstraint[]
}

export class ApplyConstraintsPhase extends BasePhase {
  readonly name = 'ApplyConstraints'
  readonly order = 20

  // Constraints can be set externally or passed via context
  private externalConstraints: SchedulingConstraint[] | null = null

  setConstraints(constraints: SchedulingConstraint[]): void {
    this.externalConstraints = constraints
  }

  private getConstraints(context: GeneratorContext): SchedulingConstraint[] {
    // First check if constraints were set externally
    if (this.externalConstraints) {
      return this.externalConstraints
    }
    // Then check if context has constraints (from V2 generator)
    const extContext = context as ExtendedContext
    if (extContext.constraints) {
      return extContext.constraints as SchedulingConstraint[]
    }
    // No constraints available
    return []
  }

  execute(context: GeneratorContext): PhaseResult {
    const warnings: GenerationWarning[] = []
    const constraints = this.getConstraints(context)

    this.log(`Processing ${constraints.length} constraints`)

    // Phase 2.1: Apply company holidays
    this.applyHolidays(context)

    // Phase 2.2: Apply individual constraints
    this.applyIndividualConstraints(context, constraints, warnings)

    // Phase 2.3: Validate coverage after constraints
    this.validateConstraintsCoverage(context, constraints, warnings)

    return warnings.length > 0
      ? this.successWithWarnings(warnings, 'Constraints applied with warnings')
      : this.success('Constraints applied successfully')
  }

  /**
   * Apply company holidays (B for all non-fixed employees)
   */
  private applyHolidays(context: GeneratorContext): void {
    let holidayCount = 0

    for (const day of context.days) {
      if (day.isHoliday) {
        for (const employee of context.employees) {
          // Skip if employee has special fixed shift
          if (!employee.rules.fixedShift) {
            context.matrix[employee.id][day.dayNumber] = 'B'
          }
        }
        holidayCount++
      }
    }

    if (holidayCount > 0) {
      this.log(`Applied ${holidayCount} holiday days`)
    }
  }

  /**
   * Apply individual constraints (vacations, sick leave, etc.)
   */
  private applyIndividualConstraints(context: GeneratorContext, constraints: SchedulingConstraint[], _warnings: GenerationWarning[]): void {
    for (const constraint of constraints) {
      if (constraint.status !== 'approved') continue

      // Extract day numbers from constraint dates
      // MySQL DATE columns return dates at midnight UTC, adjusting for timezone
      const startDate = new Date(constraint.start_date)
      const endDate = new Date(constraint.end_date)

      // Use adjusted time to avoid timezone boundary issues
      const startDateAdjusted = new Date(startDate.getTime() + 12 * 60 * 60 * 1000)
      const endDateAdjusted = new Date(endDate.getTime() + 12 * 60 * 60 * 1000)
      const startDay = startDateAdjusted.getUTCDate()
      const endDay = endDateAdjusted.getUTCDate()

      this.log(
        `Processing constraint for ${constraint.employee_id}: ${constraint.constraint_type} (days ${startDay}-${endDay})`
      )

      for (const day of context.days) {
        if (day.dayNumber >= startDay && day.dayNumber <= endDay) {
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
              context.matrix[constraint.employee_id][day.dayNumber] = 'REQUEST_OFF'
              continue
            case 'request_shift':
              context.matrix[constraint.employee_id][day.dayNumber] = `REQUEST_${constraint.shift_code}`
              continue
            case 'request_no_shift':
              context.matrix[constraint.employee_id][day.dayNumber] = `AVOID_${constraint.shift_code}`
              continue
          }

          if (shiftCode) {
            context.matrix[constraint.employee_id][day.dayNumber] = shiftCode
          }
        }
      }
    }
  }

  /**
   * Validate that we have enough staff after applying constraints
   * If below critical minimum, cancel REQUEST_OFF from lowest priority employees
   */
  private validateConstraintsCoverage(context: GeneratorContext, constraints: SchedulingConstraint[], warnings: GenerationWarning[]): void {
    const CRITICAL_MINIMUM = 3 // 1M + 1T + 1N - absolute minimum
    const IDEAL_COVERAGE = 5 // 2M + 2T + 1N - full coverage with reinforcement

    this.log(`Validating coverage: ${context.employees.length} employees`)

    for (const day of context.days) {
      if (day.isHoliday) continue

      // Count employees with absences on this day
      let unavailable = 0
      const unavailableNames: string[] = []

      for (const employee of context.employees) {
        const assignment = context.matrix[employee.id][day.dayNumber]
        if (
          assignment === 'REQUEST_OFF' ||
          assignment === 'V' ||
          assignment === 'B' ||
          assignment === 'IT' ||
          assignment === 'E' ||
          assignment === 'FO'
        ) {
          unavailable++
          unavailableNames.push(employee.name)
        }
      }

      const available = context.employees.length - unavailable

      // Case 1: Below critical minimum - MUST cancel some REQUEST_OFF
      if (available < CRITICAL_MINIMUM) {
        this.log(
          `CRITICAL: Day ${day.dayNumber} has only ${available} employees (need ${CRITICAL_MINIMUM})`
        )

        const requestOffEmployees = context.employees.filter(
          (e) => context.matrix[e.id][day.dayNumber] === 'REQUEST_OFF'
        )

        if (requestOffEmployees.length > 0) {
          // Get constraints for this day, sorted by priority (higher number = lower priority = cancel first)
          const dayConstraints = constraints
            .filter((c) => {
              if (c.constraint_type !== 'request_off') return false
              const startDateAdjusted = new Date(
                new Date(c.start_date).getTime() + 12 * 60 * 60 * 1000
              )
              const endDateAdjusted = new Date(new Date(c.end_date).getTime() + 12 * 60 * 60 * 1000)
              return (
                day.dayNumber >= startDateAdjusted.getUTCDate() &&
                day.dayNumber <= endDateAdjusted.getUTCDate()
              )
            })
            .sort((a, b) => (b.priority || 5) - (a.priority || 5)) // Lower priority first

          // Cancel REQUEST_OFF until we reach critical minimum
          let needed = CRITICAL_MINIMUM - available
          for (const constraint of dayConstraints) {
            if (needed <= 0) break

            const employee = context.employees.find((e) => e.id === constraint.employee_id)
            if (!employee) continue

            // Clear the REQUEST_OFF - they will be assigned a shift
            context.matrix[employee.id][day.dayNumber] = ''
            needed--

            this.log(
              `Overriding REQUEST_OFF for ${employee.name} on day ${day.dayNumber} (priority: ${constraint.priority || 5})`
            )

            warnings.push(
              this.warn(
                `${employee.name}: Petición de libre para día ${day.dayNumber} no pudo ser respetada por falta de cobertura`,
                {
                  type: 'constraint',
                  severity: 'warning',
                  employeeId: employee.id,
                  employeeName: employee.name,
                }
              )
            )
          }
        }
      }
      // Case 2: Between critical and ideal - mark for PI reinforcement
      else if (available < IDEAL_COVERAGE) {
        this.log(`Day ${day.dayNumber}: ${available} available (suggest PI reinforcement)`)
        context.daysNeedingPI.push(day.dayNumber)
      }
    }

    if (context.daysNeedingPI.length > 0) {
      this.log(`Days needing PI reinforcement: ${context.daysNeedingPI.join(', ')}`)
    }
  }
}
