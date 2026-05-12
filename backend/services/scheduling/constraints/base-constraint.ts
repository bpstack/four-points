// services/scheduling/constraints/base-constraint.ts
// Base class and interfaces for constraints

import type { GeneratorContext, ConstraintResult, GenerationWarning } from '../types/index.js'
import { SOFT_WEIGHTS, type SoftWeightKey } from '../soft-weights.js'

/**
 * Abstract base class for constraints
 * Provides common functionality and enforces the interface
 */
export abstract class BaseConstraint {
  /** Constraint name for logging and identification */
  abstract readonly name: string

  /** Priority (higher = more important, checked first) */
  abstract readonly priority: number

  /** Whether this constraint is enabled */
  enabled: boolean = true

  /**
   * Check if the constraint is satisfied
   * @param context Generator context with matrix and config
   * @returns Result with satisfied status and any violations
   */
  abstract check(context: GeneratorContext): ConstraintResult

  /**
   * Attempt to fix violations (optional implementation)
   * @param context Generator context
   * @returns true if fixes were made
   */
  fix?(context: GeneratorContext): boolean

  /**
   * Helper to create a successful result
   */
  protected success(): ConstraintResult {
    return { satisfied: true, violations: [] }
  }

  /**
   * Helper to create a failed result with violations
   */
  protected failure(violations: GenerationWarning[]): ConstraintResult {
    return { satisfied: false, violations }
  }

  /**
   * Helper to create a warning
   */
  protected warn(
    message: string,
    options: {
      type?: GenerationWarning['type']
      severity?: GenerationWarning['severity']
      day?: number
      employeeId?: string
      employeeName?: string
    } = {}
  ): GenerationWarning {
    return {
      type: options.type || 'constraint',
      severity: options.severity || 'warning',
      message,
      day: options.day,
      employeeId: options.employeeId,
      employeeName: options.employeeName,
    }
  }

  /**
   * Helper to create an error
   */
  protected error(
    message: string,
    options: {
      type?: GenerationWarning['type']
      day?: number
      employeeId?: string
      employeeName?: string
    } = {}
  ): GenerationWarning {
    return this.warn(message, { ...options, severity: 'error' })
  }

  /**
   * Helper to create a soft (penalty-bearing) warning.
   * Returns the warning to push plus the penalty amount and breakdown key.
   * Units multiply the base weight: e.g. 2 missing staff = 2 units.
   */
  protected softWarn(
    weightKey: SoftWeightKey,
    units: number,
    message: string,
    options: {
      type?: GenerationWarning['type']
      day?: number
      employeeId?: string
      employeeName?: string
    } = {}
  ): { warning: GenerationWarning; penalty: number; breakdownKey: string } {
    const penalty = SOFT_WEIGHTS[weightKey] * units
    return {
      warning: this.warn(message, { ...options, severity: 'warning' }),
      penalty,
      breakdownKey: weightKey,
    }
  }
}
