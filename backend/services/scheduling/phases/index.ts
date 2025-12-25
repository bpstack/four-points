// services/scheduling/phases/index.ts
// Export all phases and registry

// Base class
export { BasePhase } from './base-phase.js'

// Registry
export { PhaseRegistry, createPhaseRegistry } from './registry.js'

// Individual phases (in execution order)
export { InitializeMatrixPhase } from './initialize-matrix.phase.js'
export { ApplyConstraintsPhase } from './apply-constraints.phase.js'
export { ApplyEmployeeRulesPhase } from './apply-employee-rules.phase.js'
export { AssignNightBlocksPhase } from './assign-night-blocks.phase.js'
export { EnforcePostNightRestPhase } from './enforce-post-night-rest.phase.js'
export { AssignRotatingShiftsPhase } from './assign-rotating-shifts.phase.js'
export { AssignWeeklyOffsPhase } from './assign-weekly-offs.phase.js'
export { RepairSmallBlocksPhase } from './repair-small-blocks.phase.js'
export { ValidateFixCoveragePhase } from './validate-fix-coverage.phase.js'
export { AssignPISupportPhase } from './assign-pi-support.phase.js'
export { FinalValidationPhase } from './final-validation.phase.js'
export { AIOptimizationPhase } from './ai-optimization.phase.js'

// Re-export types for convenience
export type { IPhase, PhaseResult } from '../types/index.js'

// Import phases for default registry
import { InitializeMatrixPhase } from './initialize-matrix.phase.js'
import { ApplyConstraintsPhase } from './apply-constraints.phase.js'
import { ApplyEmployeeRulesPhase } from './apply-employee-rules.phase.js'
import { AssignNightBlocksPhase } from './assign-night-blocks.phase.js'
import { EnforcePostNightRestPhase } from './enforce-post-night-rest.phase.js'
import { AssignRotatingShiftsPhase } from './assign-rotating-shifts.phase.js'
import { AssignWeeklyOffsPhase } from './assign-weekly-offs.phase.js'
import { RepairSmallBlocksPhase } from './repair-small-blocks.phase.js'
import { ValidateFixCoveragePhase } from './validate-fix-coverage.phase.js'
import { AssignPISupportPhase } from './assign-pi-support.phase.js'
import { FinalValidationPhase } from './final-validation.phase.js'
import { AIOptimizationPhase } from './ai-optimization.phase.js'
import { PhaseRegistry } from './registry.js'

/**
 * Create a phase registry with all default phases pre-registered
 * NOTE: This registry does NOT include AI phase - AI runs separately after the loop
 *
 * Phase execution order:
 * 1. InitializeMatrix (10) - Create empty schedule matrix
 * 2. ApplyConstraints (20) - Apply fixed constraints (holidays, vacations, sick leave)
 * 3. ApplyEmployeeRules (30) - Apply employee-specific rules (EMP_01 R fixed days, etc)
 * 4. AssignNightBlocks (40) - Assign 3-6 consecutive nights per employee
 * 5. EnforcePostNightRest (45) - Enforce 48h rest after night blocks
 * 6. AssignRotatingShifts (50) - Assign M/T shifts for remaining days
 * 7. AssignWeeklyOffs (60) - Ensure 2 consecutive libre days per week
 * 8. ValidateFixCoverage (70) - Validate and fix coverage issues
 * 9. AssignPISupport (80) - Assign PI (intervention support) where needed
 * 10. RepairSmallBlocks (85) - Fix work blocks smaller than 3 days
 * 11. FinalValidation (90) - Final validation and warning generation
 */
export function createDefaultPhaseRegistry(): PhaseRegistry {
  const registry = new PhaseRegistry()

  // Register all phases in order (NO AI - it runs separately)
  registry.register(new InitializeMatrixPhase())
  registry.register(new ApplyConstraintsPhase())
  registry.register(new ApplyEmployeeRulesPhase())
  registry.register(new AssignNightBlocksPhase())
  registry.register(new EnforcePostNightRestPhase())
  registry.register(new AssignRotatingShiftsPhase())
  registry.register(new AssignWeeklyOffsPhase())
  registry.register(new RepairSmallBlocksPhase())
  registry.register(new ValidateFixCoveragePhase())
  registry.register(new AssignPISupportPhase())
  registry.register(new FinalValidationPhase())
  // AIOptimizationPhase is NOT included here - it runs ONCE after the best attempt is found

  return registry
}

/**
 * Create an AI-only phase registry for post-generation optimization
 * This runs ONCE after the best attempt is found, not in the loop
 */
export function createAIPhaseRegistry(): PhaseRegistry {
  const registry = new PhaseRegistry()
  registry.register(new AIOptimizationPhase())
  return registry
}
