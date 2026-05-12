// services/scheduling/constraints/registry.ts
// Constraint registry for managing and executing constraints

import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'
import type { BaseConstraint } from './base-constraint.js'

/**
 * Registry for managing constraints
 * Allows dynamic registration and execution of constraints
 */
export class ConstraintRegistry {
  private constraints: Map<string, BaseConstraint> = new Map()

  /**
   * Register a constraint
   */
  register(constraint: BaseConstraint): void {
    this.constraints.set(constraint.name, constraint)
  }

  /**
   * Unregister a constraint by name
   */
  unregister(name: string): boolean {
    return this.constraints.delete(name)
  }

  /**
   * Get a constraint by name
   */
  get(name: string): BaseConstraint | undefined {
    return this.constraints.get(name)
  }

  /**
   * Enable a constraint
   */
  enable(name: string): void {
    const constraint = this.constraints.get(name)
    if (constraint) {
      constraint.enabled = true
    }
  }

  /**
   * Disable a constraint
   */
  disable(name: string): void {
    const constraint = this.constraints.get(name)
    if (constraint) {
      constraint.enabled = false
    }
  }

  /**
   * Get all enabled constraints sorted by priority (highest first)
   */
  getEnabled(): BaseConstraint[] {
    return Array.from(this.constraints.values())
      .filter((c) => c.enabled)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Check all enabled constraints
   * @returns Combined result with all violations and aggregated soft penalty
   */
  checkAll(context: GeneratorContext): ConstraintResult {
    const allViolations: GenerationWarning[] = []
    let allSatisfied = true
    let totalSoftPenalty = 0
    const totalBreakdown: Record<string, number> = {}

    for (const constraint of this.getEnabled()) {
      const result = constraint.check(context)
      if (!result.satisfied) {
        allSatisfied = false
      }
      allViolations.push(...result.violations)
      if (result.softPenalty) {
        totalSoftPenalty += result.softPenalty
        for (const [key, val] of Object.entries(result.softPenaltyBreakdown ?? {})) {
          totalBreakdown[key] = (totalBreakdown[key] ?? 0) + val
        }
      }
    }

    return {
      satisfied: allSatisfied,
      violations: allViolations,
      softPenalty: totalSoftPenalty,
      softPenaltyBreakdown: totalBreakdown,
    }
  }

  /**
   * Try to fix all constraint violations
   * @returns Number of fixes made
   */
  fixAll(context: GeneratorContext): number {
    let fixCount = 0

    for (const constraint of this.getEnabled()) {
      if (constraint.fix) {
        const fixed = constraint.fix(context)
        if (fixed) fixCount++
      }
    }

    return fixCount
  }

  /**
   * Get list of registered constraint names
   */
  list(): string[] {
    return Array.from(this.constraints.keys())
  }

  /**
   * Clear all constraints
   */
  clear(): void {
    this.constraints.clear()
  }

  /**
   * Get constraint count
   */
  get count(): number {
    return this.constraints.size
  }
}

// Global registry instance
let globalRegistry: ConstraintRegistry | null = null

/**
 * Get the global constraint registry
 */
export function getConstraintRegistry(): ConstraintRegistry {
  if (!globalRegistry) {
    globalRegistry = new ConstraintRegistry()
  }
  return globalRegistry
}

/**
 * Create a new isolated registry (for testing)
 */
export function createConstraintRegistry(): ConstraintRegistry {
  return new ConstraintRegistry()
}
