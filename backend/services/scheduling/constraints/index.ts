// services/scheduling/constraints/index.ts
// Export all constraints and registry

// Base class
export { BaseConstraint } from './base-constraint.js'

// Registry
export { ConstraintRegistry } from './registry.js'

// Individual constraints
export { NightBlockConstraint } from './night-block.constraint.js'
export { ConsecutiveRestConstraint } from './consecutive-rest.constraint.js'
export { CoverageConstraint } from './coverage.constraint.js'
export { MaxConsecutiveWorkConstraint } from './max-consecutive-work.constraint.js'
export { MonthlyLibreConstraint } from './monthly-libre.constraint.js'
export { RotationContinuityConstraint } from './rotation-continuity.constraint.js'
export { EmployeeRulesConstraint } from './employee-rules.constraint.js'

// Re-export types for convenience
export type { IConstraint, ConstraintResult } from '../types/index.js'

/**
 * Create a registry with all default constraints registered
 */
import { ConstraintRegistry } from './registry.js'
import { NightBlockConstraint } from './night-block.constraint.js'
import { ConsecutiveRestConstraint } from './consecutive-rest.constraint.js'
import { CoverageConstraint } from './coverage.constraint.js'
import { MaxConsecutiveWorkConstraint } from './max-consecutive-work.constraint.js'
import { MonthlyLibreConstraint } from './monthly-libre.constraint.js'
import { RotationContinuityConstraint } from './rotation-continuity.constraint.js'
import { EmployeeRulesConstraint } from './employee-rules.constraint.js'

export function createDefaultConstraintRegistry(): ConstraintRegistry {
  const registry = new ConstraintRegistry()

  // Register all constraints (order doesn't matter - they're sorted by priority)
  registry.register(new CoverageConstraint()) // priority 100
  registry.register(new NightBlockConstraint()) // priority 100
  registry.register(new ConsecutiveRestConstraint()) // priority 95
  registry.register(new MaxConsecutiveWorkConstraint()) // priority 90
  registry.register(new RotationContinuityConstraint()) // priority 85
  registry.register(new EmployeeRulesConstraint()) // priority 75
  registry.register(new MonthlyLibreConstraint()) // priority 70

  return registry
}
