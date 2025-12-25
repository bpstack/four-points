// services/scheduling/scoring/index.ts
// ============================================
// SCORING SYSTEM - EXPORTS
// ============================================
//
// Sistema de puntuacion para seleccion inteligente de empleados.
//
// Uso basico:
//   import { selectBestCandidate } from './scoring/index.js'
//
//   const result = selectBestCandidate(candidates, day, 'M', context)
//   if (result.selected) {
//     matrix[result.selected.id][day.dayNumber] = 'M'
//   }
//
// Con logging:
//   import { selectBestCandidateWithLogging } from './scoring/index.js'
//
// ============================================

// Types
export type {
  ScoringWeights,
  ScoringBreakdown,
  SelectionResult,
  ScoringContext,
  IScorer,
} from './scoring-types.js'

export { DEFAULT_WEIGHTS, WORK_SHIFT_CODES, REST_SHIFT_CODES } from './scoring-types.js'

// Scorers individuales (por si se necesitan directamente)
export { FatigueScorer, fatigueScorer } from './fatigue-scorer.js'
export { BalanceScorer, balanceScorer } from './balance-scorer.js'
export { PreferenceScorer, preferenceScorer } from './preference-scorer.js'
export { CoverageScorer, coverageScorer } from './coverage-scorer.js'
export { BlockScorer, blockScorer } from './block-scorer.js'

// Funciones principales
export {
  calculateEmployeeScore,
  selectBestCandidate,
  selectBestCandidateWithLogging,
  getWeightsFromConfig,
} from './employee-scorer.js'
