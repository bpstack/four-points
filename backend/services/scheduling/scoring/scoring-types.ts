// services/scheduling/scoring/scoring-types.ts
// ============================================
// SCORING SYSTEM TYPES
// ============================================
//
// Sistema de puntuacion para seleccion de empleados.
// En lugar de elegir aleatoriamente, cada candidato recibe
// un score basado en multiples factores. Se elige el mejor.
//
// Factores:
// - Fatigue: Penaliza empleados cansados
// - Balance: Favorece distribucion equitativa
// - Preference: Respeta preferencias del empleado
// - Coverage: Prioriza necesidades del turno
// - Block: Crea bloques de trabajo saludables
//
// ============================================

import type { Employee, DayInfo, GeneratorContext } from '../types/index.js'

/**
 * Pesos configurables para cada factor de scoring.
 * Se cargan desde scheduling_config en BD.
 */
export interface ScoringWeights {
  /** Peso del factor fatiga (default: 1.0) */
  fatigue: number
  /** Peso del factor balance (default: 1.0) */
  balance: number
  /** Peso del factor preferencias (default: 1.2) */
  preference: number
  /** Peso del factor cobertura (default: 1.5) */
  coverage: number
  /** Peso del factor bloques (default: 1.3) */
  block: number
}

/**
 * Pesos por defecto si no estan configurados en BD
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  fatigue: 1.0,
  balance: 1.0,
  preference: 1.2,
  coverage: 1.5,
  block: 1.3,
}

/**
 * Resultado detallado del scoring de un empleado
 */
export interface ScoringBreakdown {
  /** ID del empleado */
  employeeId: string
  /** Nombre del empleado */
  employeeName: string
  /** Score total calculado */
  totalScore: number
  /** Desglose por factor */
  factors: {
    fatigue: number
    balance: number
    preference: number
    coverage: number
    block: number
  }
  /** Desglose con pesos aplicados */
  weighted: {
    fatigue: number
    balance: number
    preference: number
    coverage: number
    block: number
  }
}

/**
 * Resultado de seleccion de candidato
 */
export interface SelectionResult {
  /** Empleado seleccionado (null si no hay candidatos) */
  selected: Employee | null
  /** Todos los candidatos con sus scores */
  candidates: ScoringBreakdown[]
  /** Razon si no se pudo seleccionar */
  reason?: string
}

/**
 * Contexto para calcular scores
 */
export interface ScoringContext {
  /** Contexto del generador */
  generator: GeneratorContext
  /** Dia para el que se asigna */
  day: DayInfo
  /** Tipo de turno a asignar */
  shiftType: string
  /** Pesos a usar */
  weights: ScoringWeights
}

/**
 * Interface para un scorer individual
 */
export interface IScorer {
  /** Nombre del scorer para logging */
  name: string
  /** Calcular score para un empleado */
  calculate(employee: Employee, context: ScoringContext): number
}

/**
 * Shift codes que son turnos de trabajo
 */
export const WORK_SHIFT_CODES = ['M', 'T', 'N', 'P', 'PI'] as const

/**
 * Shift codes que son descanso/ausencia
 */
export const REST_SHIFT_CODES = ['L', 'V', 'B', 'IT', 'E', 'FO'] as const

/**
 * Tipo para turnos de trabajo
 */
export type WorkShiftCode = (typeof WORK_SHIFT_CODES)[number]

/**
 * Tipo para turnos de descanso
 */
export type RestShiftCode = (typeof REST_SHIFT_CODES)[number]
