// services/scheduling/scoring/employee-scorer.ts
// ============================================
// EMPLOYEE SCORER - ORQUESTADOR PRINCIPAL
// ============================================
//
// Combina todos los scorers para seleccionar el mejor
// candidato para una asignacion.
//
// Uso:
//   const result = selectBestCandidate(candidates, day, 'M', context)
//   if (result.selected) {
//     // Asignar turno al empleado seleccionado
//   }
//
// ============================================

import type { Employee, DayInfo, GeneratorContext } from '../types/index.js'
import type {
  ScoringWeights,
  ScoringBreakdown,
  SelectionResult,
  ScoringContext,
} from './scoring-types.js'
import { fatigueScorer } from './fatigue-scorer.js'
import { balanceScorer } from './balance-scorer.js'
import { preferenceScorer } from './preference-scorer.js'
import { coverageScorer } from './coverage-scorer.js'
import { blockScorer } from './block-scorer.js'

/**
 * Pesos por defecto
 */
const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  fatigue: 1.0,
  balance: 1.0,
  preference: 1.2,
  coverage: 1.5,
  block: 1.3,
}

/**
 * Calcula el score total para un empleado
 */
export function calculateEmployeeScore(
  employee: Employee,
  day: DayInfo,
  shiftType: string,
  generator: GeneratorContext,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoringBreakdown {
  const context: ScoringContext = {
    generator,
    day,
    shiftType,
    weights,
  }

  // Calcular cada factor
  const factors = {
    fatigue: fatigueScorer.calculate(employee, context),
    balance: balanceScorer.calculate(employee, context),
    preference: preferenceScorer.calculate(employee, context),
    coverage: coverageScorer.calculate(employee, context),
    block: blockScorer.calculate(employee, context),
  }

  // Aplicar pesos
  const weighted = {
    fatigue: factors.fatigue * weights.fatigue,
    balance: factors.balance * weights.balance,
    preference: factors.preference * weights.preference,
    coverage: factors.coverage * weights.coverage,
    block: factors.block * weights.block,
  }

  // Calcular total
  const totalScore =
    weighted.fatigue +
    weighted.balance +
    weighted.preference +
    weighted.coverage +
    weighted.block

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    totalScore,
    factors,
    weighted,
  }
}

/**
 * Selecciona el mejor candidato de una lista
 * @param candidates Lista de empleados candidatos (ya filtrados por hard constraints)
 * @param day Dia para el que se asigna
 * @param shiftType Tipo de turno a asignar
 * @param generator Contexto del generador
 * @param weights Pesos opcionales (default: DEFAULT_SCORING_WEIGHTS)
 * @returns Resultado con empleado seleccionado y desglose de scores
 */
export function selectBestCandidate(
  candidates: Employee[],
  day: DayInfo,
  shiftType: string,
  generator: GeneratorContext,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): SelectionResult {
  // Caso: sin candidatos
  if (candidates.length === 0) {
    return {
      selected: null,
      candidates: [],
      reason: 'No hay candidatos disponibles',
    }
  }

  // Caso: un solo candidato
  if (candidates.length === 1) {
    const breakdown = calculateEmployeeScore(
      candidates[0],
      day,
      shiftType,
      generator,
      weights
    )
    return {
      selected: candidates[0],
      candidates: [breakdown],
    }
  }

  // Calcular score para cada candidato
  const scoredCandidates: ScoringBreakdown[] = candidates.map((emp) =>
    calculateEmployeeScore(emp, day, shiftType, generator, weights)
  )

  // Ordenar por score (mayor primero)
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore)

  // Seleccionar el mejor
  const bestId = scoredCandidates[0].employeeId
  const selected = candidates.find((c) => c.id === bestId) || null

  return {
    selected,
    candidates: scoredCandidates,
  }
}

/**
 * Selecciona el mejor candidato con logging detallado
 * Util para debugging y analisis
 */
export function selectBestCandidateWithLogging(
  candidates: Employee[],
  day: DayInfo,
  shiftType: string,
  generator: GeneratorContext,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  logPrefix: string = '[SCORING]'
): SelectionResult {
  const result = selectBestCandidate(candidates, day, shiftType, generator, weights)

  // Log detallado
  console.log(`${logPrefix} Day ${day.dayNumber} Shift ${shiftType}:`)
  
  if (result.candidates.length === 0) {
    console.log(`${logPrefix}   No candidates available`)
  } else {
    // Mostrar top 3
    result.candidates.slice(0, 3).forEach((c, i) => {
      const marker = i === 0 ? '>>>' : '   '
      console.log(
        `${logPrefix} ${marker} ${i + 1}. ${c.employeeName}: ${c.totalScore.toFixed(1)} ` +
          `(F:${c.weighted.fatigue.toFixed(0)} B:${c.weighted.balance.toFixed(0)} ` +
          `P:${c.weighted.preference.toFixed(0)} C:${c.weighted.coverage.toFixed(0)} ` +
          `BL:${c.weighted.block.toFixed(0)})`
      )
    })
  }

  return result
}

/**
 * Obtiene los pesos desde la configuracion del generador
 * Los pesos se guardan en scheduling_config con keys:
 * - scoring_weight_fatigue
 * - scoring_weight_balance
 * - scoring_weight_preference
 * - scoring_weight_coverage
 * - scoring_weight_block
 */
export function getWeightsFromConfig(
  config: Record<string, unknown>
): ScoringWeights {
  return {
    fatigue: parseFloat(String(config['scoring_weight_fatigue'] || '1.0')),
    balance: parseFloat(String(config['scoring_weight_balance'] || '1.0')),
    preference: parseFloat(String(config['scoring_weight_preference'] || '1.2')),
    coverage: parseFloat(String(config['scoring_weight_coverage'] || '1.5')),
    block: parseFloat(String(config['scoring_weight_block'] || '1.3')),
  }
}
