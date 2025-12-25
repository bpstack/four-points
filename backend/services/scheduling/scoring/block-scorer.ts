// services/scheduling/scoring/block-scorer.ts
// ============================================
// BLOCK SCORER
// ============================================
//
// Evalua si la asignacion crea bloques de trabajo saludables.
// Factores considerados:
// - Crear bloque pequeno (1-2 dias aislados): Penalizacion fuerte
// - Extender bloque existente (3+ dias): Bonus
// - Romper descanso consecutivo: Penalizacion fuerte
// - Mantener noches consecutivas: Bonus
//
// Rango tipico: -50 a +35
//
// ============================================

import type { Employee, DayInfo } from '../types/index.js'
import type { IScorer, ScoringContext } from './scoring-types.js'
import {
  isWorkShift,
  isLibreShift,
  wouldCreateSmallWorkBlock,
} from '../utils/matrix.js'

/**
 * Scorer que favorece bloques de trabajo saludables
 */
export class BlockScorer implements IScorer {
  name = 'block'

  /**
   * Calcula el score de bloques para un empleado
   * @returns Score basado en calidad de bloques de trabajo
   */
  calculate(employee: Employee, context: ScoringContext): number {
    const { generator, day, shiftType } = context
    const { matrix, days } = generator
    let score = 0

    // 1. Verificar si crea bloque pequeno (< 3 dias)
    // Solo aplicar si estamos asignando trabajo a un dia libre
    const currentShift = matrix[employee.id]?.[day.dayNumber]
    if (!isWorkShift(currentShift) && isWorkShift(shiftType)) {
      if (this.wouldCreateIsolatedWorkBlock(matrix, days, employee.id, day.dayNumber)) {
        score -= 40 // Penalizacion fuerte por bloque aislado
      }
    }

    // 2. Bonus por extender bloque existente
    const currentBlockSize = this.getCurrentWorkBlockSize(
      matrix,
      days,
      employee.id,
      day.dayNumber
    )
    if (currentBlockSize >= 2) {
      score += 15 // Extiende un bloque saludable
    }

    // 3. Penalizar si rompe descanso consecutivo (2 libres seguidos)
    if (this.wouldBreakConsecutiveRest(matrix, days, employee.id, day.dayNumber)) {
      score -= 50 // Penalizacion fuerte
    }

    // 4. Para noches: bonus por mantener consecutividad
    if (shiftType === 'N') {
      if (this.isAdjacentToExistingNights(matrix, employee.id, day.dayNumber)) {
        score += 20 // Bonus por noches consecutivas
      } else if (this.hasAnyNights(matrix, days, employee.id)) {
        score -= 30 // Penalizacion por noches no consecutivas
      }
    }

    // 5. Penalizar si convierte libre a trabajo y crea fragmentacion
    if (isLibreShift(currentShift) && isWorkShift(shiftType)) {
      if (wouldCreateSmallWorkBlock(matrix, days, employee.id, [day.dayNumber])) {
        score -= 35
      }
    }

    return score // Rango tipico: -50 a +35
  }

  /**
   * Verifica si asignar trabajo crearia un bloque aislado (1-2 dias)
   */
  private wouldCreateIsolatedWorkBlock(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string,
    dayNumber: number
  ): boolean {
    // Contar dias de trabajo consecutivos si se asigna este dia
    let blockSize = 1 // El dia actual

    // Contar hacia atras
    for (let d = dayNumber - 1; d >= 1; d--) {
      const shift = matrix[employeeId]?.[d]
      if (isWorkShift(shift)) {
        blockSize++
      } else {
        break
      }
    }

    // Contar hacia adelante
    const maxDay = Math.max(...days.map((d) => d.dayNumber))
    for (let d = dayNumber + 1; d <= maxDay; d++) {
      const shift = matrix[employeeId]?.[d]
      if (isWorkShift(shift)) {
        blockSize++
      } else {
        break
      }
    }

    // Bloque aislado si < 3 dias
    return blockSize < 3
  }

  /**
   * Obtiene el tamaño del bloque de trabajo actual alrededor de un dia
   */
  private getCurrentWorkBlockSize(
    matrix: Record<string, Record<number, string>>,
    days: DayInfo[],
    employeeId: string,
    dayNumber: number
  ): number {
    let size = 0

    // Contar hacia atras
    for (let d = dayNumber - 1; d >= 1; d--) {
      const shift = matrix[employeeId]?.[d]
      if (isWorkShift(shift)) {
        size++
      } else {
        break
      }
    }

    // Contar hacia adelante
    const maxDay = Math.max(...days.map((d) => d.dayNumber))
    for (let d = dayNumber + 1; d <= maxDay; d++) {
      const shift = matrix[employeeId]?.[d]
      if (isWorkShift(shift)) {
        size++
      } else {
        break
      }
    }

    return size
  }

  /**
   * Verifica si asignar trabajo romperia un descanso de 2 dias consecutivos
   */
  private wouldBreakConsecutiveRest(
    matrix: Record<string, Record<number, string>>,
    _days: Array<{ dayNumber: number }>,
    employeeId: string,
    dayNumber: number
  ): boolean {
    const current = matrix[employeeId]?.[dayNumber]
    
    // Solo aplica si el dia actual es libre
    if (!isLibreShift(current)) {
      return false
    }

    // Verificar si hay un libre adyacente (antes o despues)
    const prevShift = matrix[employeeId]?.[dayNumber - 1]
    const nextShift = matrix[employeeId]?.[dayNumber + 1]

    const prevIsLibre = isLibreShift(prevShift) || prevShift === 'V' || prevShift === 'B'
    const nextIsLibre = isLibreShift(nextShift) || nextShift === 'V' || nextShift === 'B'

    // Si este libre es parte de un par consecutivo, romperlo es malo
    return prevIsLibre || nextIsLibre
  }

  /**
   * Verifica si el dia es adyacente a noches existentes
   */
  private isAdjacentToExistingNights(
    matrix: Record<string, Record<number, string>>,
    employeeId: string,
    dayNumber: number
  ): boolean {
    const prevShift = matrix[employeeId]?.[dayNumber - 1]
    const nextShift = matrix[employeeId]?.[dayNumber + 1]

    return prevShift === 'N' || nextShift === 'N'
  }

  /**
   * Verifica si el empleado tiene noches asignadas
   */
  private hasAnyNights(
    matrix: Record<string, Record<number, string>>,
    days: Array<{ dayNumber: number }>,
    employeeId: string
  ): boolean {
    for (const day of days) {
      if (matrix[employeeId]?.[day.dayNumber] === 'N') {
        return true
      }
    }
    return false
  }
}

// Instancia singleton para uso directo
export const blockScorer = new BlockScorer()
