// services/scheduling/scoring/fatigue-scorer.ts
// ============================================
// FATIGUE SCORER
// ============================================
//
// Penaliza empleados que han trabajado mucho recientemente.
// Factores considerados:
// - Dias consecutivos trabajados antes del dia actual
// - Si trabajo ayer
// - Turnos acumulados en la semana actual
// - Dias desde el ultimo descanso
//
// Rango tipico: -60 a 0 (siempre penalizacion)
//
// ============================================

import type { Employee } from '../types/index.js'
import type { IScorer, ScoringContext } from './scoring-types.js'
import { isWorkShift } from '../utils/matrix.js'

/**
 * Scorer que penaliza empleados con fatiga acumulada
 */
export class FatigueScorer implements IScorer {
  name = 'fatigue'

  /**
   * Calcula el score de fatiga para un empleado
   * @returns Score negativo (penalizacion) basado en fatiga
   */
  calculate(employee: Employee, context: ScoringContext): number {
    const { generator, day } = context
    const { matrix, days } = generator
    let score = 0

    // 1. Dias consecutivos trabajados ANTES de este dia
    const consecutiveBefore = this.countConsecutiveWorkBefore(
      matrix,
      days,
      employee.id,
      day.dayNumber
    )
    score -= consecutiveBefore * 10 // -10 por cada dia consecutivo

    // 2. Trabajo ayer? (penalizacion adicional)
    if (this.workedYesterday(matrix, employee.id, day.dayNumber)) {
      score -= 15
    }

    // 3. Turnos esta semana
    const weekShifts = this.countWeekShifts(
      matrix,
      days,
      employee.id,
      day.weekNumber
    )
    score -= weekShifts * 2 // -2 por cada turno esta semana

    // 4. Dias desde ultimo descanso (si > 4, penalizar)
    const daysSinceRest = this.daysSinceLastRest(
      matrix,
      days,
      employee.id,
      day.dayNumber
    )
    if (daysSinceRest > 4) {
      score -= 5
    }

    return score // Rango tipico: -60 a 0
  }

  /**
   * Cuenta dias consecutivos de trabajo antes de un dia
   */
  private countConsecutiveWorkBefore(
    matrix: Record<string, Record<number, string>>,
    _days: { dayNumber: number }[],
    employeeId: string,
    dayNumber: number
  ): number {
    let count = 0
    for (let d = dayNumber - 1; d >= 1; d--) {
      const shift = matrix[employeeId]?.[d]
      if (isWorkShift(shift)) {
        count++
      } else {
        break
      }
    }
    return count
  }

  /**
   * Verifica si el empleado trabajo ayer
   */
  private workedYesterday(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    dayNumber: number
  ): boolean {
    if (dayNumber <= 1) return false
    const yesterdayShift = matrix[employeeId]?.[dayNumber - 1]
    return isWorkShift(yesterdayShift)
  }

  /**
   * Cuenta turnos de trabajo en una semana
   */
  private countWeekShifts(
    matrix: Record<string, Record<number, string>>,
    days: { dayNumber: number; weekNumber: number }[],
    employeeId: string,
    weekNumber: number
  ): number {
    let count = 0
    for (const day of days) {
      if (day.weekNumber === weekNumber) {
        const shift = matrix[employeeId]?.[day.dayNumber]
        if (isWorkShift(shift)) {
          count++
        }
      }
    }
    return count
  }

  /**
   * Cuenta dias desde el ultimo descanso
   */
  private daysSinceLastRest(
    matrix: Record<string, Record<number, string>>,
    _days: { dayNumber: number }[],
    employeeId: string,
    dayNumber: number
  ): number {
    let count = 0
    for (let d = dayNumber - 1; d >= 1; d--) {
      const shift = matrix[employeeId]?.[d]
      if (!isWorkShift(shift) && shift) {
        // Encontro descanso
        break
      }
      count++
    }
    return count
  }
}

// Instancia singleton para uso directo
export const fatigueScorer = new FatigueScorer()
