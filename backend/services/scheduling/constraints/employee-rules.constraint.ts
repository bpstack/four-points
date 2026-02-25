// services/scheduling/constraints/employee-rules.constraint.ts
// Validates employee-specific rules are being followed

import { BaseConstraint } from './base-constraint.js'
import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'
import { getEmployeeShiftCounts } from '../utils/matrix.js'
import { isWeekend } from '../utils/day-helpers.js'

/**
 * Validates that employee-specific rules are being followed
 * - Turno fijo no respetado → warning
 * - Fin de semana asignado con regla no_weekends → warning
 * - Max/min turnos por mes excedidos → warning
 * - Prioridad de turno no respetada → info/warning
 */
export class EmployeeRulesConstraint extends BaseConstraint {
  readonly name = 'employee-rules'
  readonly priority = 75

  check(context: GeneratorContext): ConstraintResult {
    const violations: GenerationWarning[] = []
    const { matrix, days, employees } = context

    for (const employee of employees) {
      const shiftCounts = getEmployeeShiftCounts(matrix, days, employee.id)

      // RULE 1: Fixed shift (turno fijo)
      if (employee.rules.fixedShift) {
        const actualShift = shiftCounts[employee.rules.fixedShift] || 0
        if (actualShift > 0) {
          const totalWork = Object.entries(shiftCounts)
            .filter(([code]) => ['M', 'T', 'N', 'P', 'PI'].includes(code))
            .reduce((sum, [, count]) => sum + count, 0)
          
          if (totalWork > 0 && shiftCounts[employee.rules.fixedShift] !== totalWork) {
            violations.push(
              this.warn(
                `${employee.name}: tiene turno fijo ${employee.rules.fixedShift} pero trabaja otros turnos`,
                { type: 'constraint', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
              )
            )
          }
        }
      }

      // RULE 2: No weekends
      if (employee.rules.noWeekends) {
        const weekendWorkDays = days.filter(d => {
          if (!isWeekend(d.dayOfWeek)) return false
          const shift = matrix[employee.id]?.[d.dayNumber]
          return shift && ['M', 'T', 'N', 'P', 'PI'].includes(shift)
        })

        if (weekendWorkDays.length > 0) {
          const weekendDays = weekendWorkDays.map(d => `${d.dayOfWeek}${d.dayNumber}`).join(', ')
          violations.push(
            this.warn(
              `${employee.name}: tiene regla 'sin fines de semana' pero trabaja ${weekendWorkDays.length} días de fin de semana (${weekendDays})`,
              { type: 'constraint', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }
      }

      // RULE 3: Max shifts per month
      if (employee.rules.maxShiftPerMonth) {
        for (const [shiftCode, maxCount] of Object.entries(employee.rules.maxShiftPerMonth)) {
          const actual = shiftCounts[shiftCode] || 0
          if (actual > maxCount) {
            violations.push(
              this.warn(
                `${employee.name}: ${actual} turnos ${shiftCode} (máx ${maxCount})`,
                { type: 'constraint', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
              )
            )
          }
        }
      }

      // RULE 4: Min shifts per month
      if (employee.rules.minShiftPerMonth) {
        for (const [shiftCode, minCount] of Object.entries(employee.rules.minShiftPerMonth)) {
          const actual = shiftCounts[shiftCode] || 0
          if (actual < minCount) {
            violations.push(
              this.warn(
                `${employee.name}: ${actual} turnos ${shiftCode} (mín ${minCount})`,
                { type: 'constraint', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
              )
            )
          }
        }
      }

      // RULE 5: Shift priority preference
      if (employee.rules.shiftPriority) {
        const preferredShift = employee.rules.shiftPriority
        const preferredCount = shiftCounts[preferredShift] || 0
        const otherRotatingShifts = (shiftCounts['M'] || 0) + (shiftCounts['T'] || 0) + (shiftCounts['N'] || 0)
        
        if (otherRotatingShifts > 0 && preferredCount === 0) {
          violations.push(
            this.warn(
              `${employee.name}: prioridad de turno ${preferredShift} no respetada (0 turnos ${preferredShift})`,
              { type: 'constraint', severity: 'info', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }
      }

      // RULE 6: Fixed days - check if works on non-fixed days
      if (employee.rules.fixedDays && employee.rules.fixedDays.length > 0) {
        const fixedDaysSet = new Set(employee.rules.fixedDays)
        const nonFixedWorkDays = days.filter(d => {
          if (fixedDaysSet.has(d.dayNumber)) return false
          const shift = matrix[employee.id]?.[d.dayNumber]
          return shift && ['M', 'T', 'N', 'P', 'PI'].includes(shift)
        })

        if (nonFixedWorkDays.length > 0) {
          violations.push(
            this.warn(
              `${employee.name}: trabaja ${nonFixedWorkDays.length} días fuera de sus días fijos (${employee.rules.fixedDays.join(',')})`,
              { type: 'constraint', severity: 'warning', employeeId: employee.id, employeeName: employee.name }
            )
          )
        }
      }
    }

    return violations.length > 0
      ? this.failure(violations)
      : this.success()
  }
}
