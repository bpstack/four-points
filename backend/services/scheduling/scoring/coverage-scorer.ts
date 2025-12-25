// services/scheduling/scoring/coverage-scorer.ts
// ============================================
// COVERAGE SCORER
// ============================================
//
// Evalua como afecta la asignacion a la cobertura del equipo.
// Factores considerados:
// - Necesidad critica: Si el turno necesita mas gente
// - Exceso de cobertura: Si ya hay suficientes
// - Unico disponible: Si es el unico candidato viable
//
// Rango tipico: -20 a +80
//
// ============================================

import type { Employee } from '../types/index.js'
import type { IScorer, ScoringContext } from './scoring-types.js'
import { countShiftOnDay } from '../utils/matrix.js'

/**
 * Scorer que prioriza necesidades de cobertura
 */
export class CoverageScorer implements IScorer {
  name = 'coverage'

  /**
   * Calcula el score de cobertura para un empleado
   * @returns Score basado en necesidad de cobertura
   */
  calculate(_employee: Employee, context: ScoringContext): number {
    const { generator, day, shiftType } = context
    const { matrix, config, employees } = generator
    let score = 0

    // Obtener requerimientos de cobertura
    const minRequired = this.getMinRequired(shiftType, config)
    const maxAllowed = this.getMaxAllowed(shiftType, config)
    const currentCoverage = countShiftOnDay(matrix, day.dayNumber, shiftType)

    // 1. Necesidad critica - faltan personas
    if (currentCoverage < minRequired) {
      score += 30

      // Bonus extra si es el unico o de pocos disponibles
      const availableCount = this.countAvailableForShift(
        generator,
        day.dayNumber,
        shiftType,
        employees
      )
      if (availableCount === 1) {
        score += 50 // Unico candidato = prioridad maxima
      } else if (availableCount <= 3) {
        score += 20 // Pocos candidatos
      }
    }

    // 2. Cobertura suficiente pero no excesiva
    if (currentCoverage >= minRequired && currentCoverage < maxAllowed) {
      // Neutral - ni bonus ni penalizacion
      score += 5
    }

    // 3. Penalizar si ya hay exceso
    if (currentCoverage >= maxAllowed) {
      score -= 20
    }

    // 4. Bonus adicional para noches (siempre criticas)
    if (shiftType === 'N' && currentCoverage < config.minNightStaff) {
      score += 15 // Las noches son especialmente criticas
    }

    return score // Rango tipico: -20 a +80
  }

  /**
   * Obtiene el minimo requerido para un tipo de turno
   */
  private getMinRequired(
    shiftType: string,
    config: {
      minMorningStaff: number
      minAfternoonStaff: number
      minNightStaff: number
    }
  ): number {
    switch (shiftType) {
      case 'M':
        return config.minMorningStaff
      case 'T':
        return config.minAfternoonStaff
      case 'N':
        return config.minNightStaff
      default:
        return 1
    }
  }

  /**
   * Obtiene el maximo permitido para un tipo de turno
   */
  private getMaxAllowed(
    shiftType: string,
    config: {
      maxMorningStaff?: number
      maxAfternoonStaff?: number
      maxNightStaff: number
      minMorningStaff: number
      minAfternoonStaff: number
    }
  ): number {
    switch (shiftType) {
      case 'M':
        return config.maxMorningStaff || config.minMorningStaff + 2
      case 'T':
        return config.maxAfternoonStaff || config.minAfternoonStaff + 2
      case 'N':
        return config.maxNightStaff
      default:
        return 3
    }
  }

  /**
   * Cuenta cuantos empleados estan disponibles para un turno
   */
  private countAvailableForShift(
    generator: {
      matrix: Record<string, Record<number, string>>
      days: { dayNumber: number }[]
    },
    dayNumber: number,
    _shiftType: string,
    employees: { id: string }[]
  ): number {
    let count = 0
    for (const emp of employees) {
      const current = generator.matrix[emp.id]?.[dayNumber]
      // Disponible si no tiene asignacion o es marker suave
      if (
        !current ||
        current === '' ||
        current.startsWith('REQUEST') ||
        current.startsWith('PREFER')
      ) {
        count++
      }
    }
    return count
  }
}

// Instancia singleton para uso directo
export const coverageScorer = new CoverageScorer()
