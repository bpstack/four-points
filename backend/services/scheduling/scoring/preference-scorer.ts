// services/scheduling/scoring/preference-scorer.ts
// ============================================
// PREFERENCE SCORER
// ============================================
//
// Respeta las preferencias configuradas del empleado.
// Factores considerados:
// - shiftPriority: Turno preferido (M, T, N)
// - fixedDays: Dias fijos de trabajo
// - noWeekends: No trabaja fines de semana
// - Request off: Solicitud de dia libre
//
// Rango tipico: -100 a +45
//
// ============================================

import type { Employee } from '../types/index.js'
import type { IScorer, ScoringContext } from './scoring-types.js'
import { hasRequestOff } from '../utils/matrix.js'

/**
 * Scorer que respeta preferencias del empleado
 */
export class PreferenceScorer implements IScorer {
  name = 'preference'

  /**
   * Calcula el score de preferencias para un empleado
   * @returns Score basado en coincidencia con preferencias
   */
  calculate(employee: Employee, context: ScoringContext): number {
    const { generator, day, shiftType } = context
    const { matrix } = generator
    const rules = employee.rules
    let score = 0

    // 1. Preferencia de turno (shiftPriority)
    if (rules.shiftPriority) {
      if (rules.shiftPriority === shiftType) {
        score += 25 // Bonus por turno preferido
      } else {
        score -= 15 // Penalizacion por turno no preferido
      }
    }

    // 2. Dias fijos (fixedDays)
    if (rules.fixedDays && rules.fixedDays.length > 0) {
      const dayOfWeekNum = this.dayOfWeekToNumber(day.dayOfWeek)
      if (rules.fixedDays.includes(dayOfWeekNum)) {
        score += 20 // Bonus por ser uno de sus dias fijos
      }
    }

    // 3. No fines de semana (noWeekends)
    if (rules.noWeekends) {
      if (this.isWeekend(day.dayOfWeek)) {
        score -= 30 // Penalizacion fuerte por fin de semana
      }
    }

    // 4. Solicitud de dia libre (REQUEST_OFF)
    if (hasRequestOff(matrix, employee.id, day.dayNumber)) {
      score -= 100 // Penalizacion muy fuerte - casi hard constraint
    }

    // 5. Max shifts per month (si esta cerca del limite, penalizar)
    if (rules.maxShiftPerMonth) {
      const currentCount = this.countShiftTypeForEmployee(
        generator,
        employee.id,
        shiftType
      )
      const maxAllowed = rules.maxShiftPerMonth[shiftType]
      if (maxAllowed !== undefined) {
        if (currentCount >= maxAllowed) {
          score -= 50 // Ya alcanzo el maximo
        } else if (currentCount >= maxAllowed - 1) {
          score -= 20 // Esta cerca del maximo
        }
      }
    }

    // 6. Min shifts per month (bonus si necesita mas de este tipo)
    if (rules.minShiftPerMonth) {
      const currentCount = this.countShiftTypeForEmployee(
        generator,
        employee.id,
        shiftType
      )
      const minRequired = rules.minShiftPerMonth[shiftType]
      if (minRequired !== undefined && currentCount < minRequired) {
        score += 15 // Necesita mas de este tipo
      }
    }

    return score // Rango tipico: -100 a +45
  }

  /**
   * Convierte dia de semana a numero (L=1, M=2, X=3, J=4, V=5, S=6, D=7)
   */
  private dayOfWeekToNumber(dayOfWeek: string): number {
    const map: Record<string, number> = {
      L: 1,
      M: 2,
      X: 3,
      J: 4,
      V: 5,
      S: 6,
      D: 7,
    }
    return map[dayOfWeek] || 0
  }

  /**
   * Verifica si es fin de semana
   */
  private isWeekend(dayOfWeek: string): boolean {
    return dayOfWeek === 'S' || dayOfWeek === 'D'
  }

  /**
   * Cuenta turnos de un tipo para un empleado
   */
  private countShiftTypeForEmployee(
    generator: { matrix: Record<string, Record<number, string>>; days: { dayNumber: number }[] },
    employeeId: string,
    shiftType: string
  ): number {
    let count = 0
    for (const day of generator.days) {
      if (generator.matrix[employeeId]?.[day.dayNumber] === shiftType) {
        count++
      }
    }
    return count
  }
}

// Instancia singleton para uso directo
export const preferenceScorer = new PreferenceScorer()
