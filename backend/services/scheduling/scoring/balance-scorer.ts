// services/scheduling/scoring/balance-scorer.ts
// ============================================
// BALANCE SCORER
// ============================================
//
// Favorece distribucion equitativa de turnos entre empleados.
// Factores considerados:
// - Turnos totales del mes vs promedio del equipo
// - Balance M vs T para el empleado
// - Noches asignadas vs promedio
// - Fines de semana trabajados vs otros
//
// Rango tipico: -20 a +30
//
// ============================================

import type { Employee } from '../types/index.js'
import type { IScorer, ScoringContext } from './scoring-types.js'
import { isWorkShift } from '../utils/matrix.js'

/**
 * Scorer que favorece distribucion equitativa
 */
export class BalanceScorer implements IScorer {
  name = 'balance'

  /**
   * Calcula el score de balance para un empleado
   * @returns Score basado en que tan "equilibrado" esta el empleado
   */
  calculate(employee: Employee, context: ScoringContext): number {
    const { generator, shiftType } = context
    const { matrix, days, employees } = generator
    let score = 0

    // 1. Comparar turnos totales con el promedio del equipo
    const empTotalShifts = this.countTotalShifts(matrix, days, employee.id)
    const teamAverage = this.calculateTeamAverage(matrix, days, employees)
    const diff = teamAverage - empTotalShifts

    // Bonus si tiene menos turnos que el promedio (max +20)
    score += Math.min(20, Math.max(-20, diff * 5))

    // 2. Balance M/T para este empleado
    if (shiftType === 'M' || shiftType === 'T') {
      const mCount = this.countShiftType(matrix, days, employee.id, 'M')
      const tCount = this.countShiftType(matrix, days, employee.id, 'T')
      const imbalance = Math.abs(mCount - tCount)

      // Bonus si este turno mejora el balance
      if (
        (shiftType === 'M' && tCount > mCount) ||
        (shiftType === 'T' && mCount > tCount)
      ) {
        score += 10
      } else if (imbalance > 3) {
        // Penalizar si empeora un desbalance existente
        score -= 10
      }
    }

    // 3. Balance de noches vs promedio
    if (shiftType === 'N') {
      const empNights = this.countShiftType(matrix, days, employee.id, 'N')
      const avgNights = this.calculateAverageNights(matrix, days, employees)
      const nightDiff = avgNights - empNights

      // Bonus si tiene menos noches que promedio
      score += Math.min(15, Math.max(-15, nightDiff * 3))
    }

    // 4. Fines de semana trabajados
    const weekendShifts = this.countWeekendShifts(matrix, days, employee.id)
    const avgWeekendShifts = this.calculateAverageWeekendShifts(
      matrix,
      days,
      employees
    )
    const weekendDiff = avgWeekendShifts - weekendShifts

    // Bonus si ha trabajado menos fines de semana
    score += Math.min(10, Math.max(-10, weekendDiff * 2))

    return score // Rango tipico: -20 a +30
  }

  /**
   * Cuenta turnos totales de trabajo de un empleado
   */
  private countTotalShifts(
    matrix: Record<string, Record<number, string>>,
    days: { dayNumber: number }[],
    employeeId: string
  ): number {
    let count = 0
    for (const day of days) {
      const shift = matrix[employeeId]?.[day.dayNumber]
      if (isWorkShift(shift)) {
        count++
      }
    }
    return count
  }

  /**
   * Calcula promedio de turnos del equipo
   */
  private calculateTeamAverage(
    matrix: Record<string, Record<number, string>>,
    days: { dayNumber: number }[],
    employees: { id: string }[]
  ): number {
    if (employees.length === 0) return 0
    let total = 0
    for (const emp of employees) {
      total += this.countTotalShifts(matrix, days, emp.id)
    }
    return total / employees.length
  }

  /**
   * Calcula promedio de noches del equipo
   */
  private calculateAverageNights(
    matrix: Record<string, Record<number, string>>,
    days: { dayNumber: number }[],
    employees: { id: string }[]
  ): number {
    if (employees.length === 0) return 0
    let total = 0
    for (const emp of employees) {
      total += this.countShiftType(matrix, days, emp.id, 'N')
    }
    return total / employees.length
  }

  /**
   * Cuenta turnos de un tipo especifico para un empleado
   */
  private countShiftType(
    matrix: Record<string, Record<number, string>>,
    days: { dayNumber: number }[],
    employeeId: string,
    shiftCode: string
  ): number {
    let count = 0
    for (const day of days) {
      if (matrix[employeeId]?.[day.dayNumber] === shiftCode) {
        count++
      }
    }
    return count
  }

  /**
   * Cuenta turnos en fines de semana
   */
  private countWeekendShifts(
    matrix: Record<string, Record<number, string>>,
    days: Array<{ dayNumber: number; dayOfWeek: string }>,
    employeeId: string
  ): number {
    let count = 0
    for (const day of days) {
      if (day.dayOfWeek === 'S' || day.dayOfWeek === 'D') {
        const shift = matrix[employeeId]?.[day.dayNumber]
        if (isWorkShift(shift)) {
          count++
        }
      }
    }
    return count
  }

  /**
   * Calcula promedio de turnos de fin de semana del equipo
   */
  private calculateAverageWeekendShifts(
    matrix: Record<string, Record<number, string>>,
    days: Array<{ dayNumber: number; dayOfWeek: string }>,
    employees: { id: string }[]
  ): number {
    if (employees.length === 0) return 0
    let total = 0
    for (const emp of employees) {
      total += this.countWeekendShifts(matrix, days, emp.id)
    }
    return total / employees.length
  }
}

// Instancia singleton para uso directo
export const balanceScorer = new BalanceScorer()
