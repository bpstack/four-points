// services/scheduling/phases/base-phase.ts
// Base class for schedule generation phases

import type { GeneratorContext, PhaseResult, GenerationWarning } from '../types/index.js'

/**
 * Abstract base class for schedule generation phases
 * Each phase represents a step in the schedule generation process
 */
export abstract class BasePhase {
  /** Phase name for logging and identification */
  abstract readonly name: string

  /** Phase order (lower = earlier in the process) */
  abstract readonly order: number

  /** Whether this phase is enabled */
  enabled: boolean = true

  /**
   * Execute the phase
   * @param context Generator context with matrix and config
   * @returns Result with success status and any warnings
   */
  abstract execute(context: GeneratorContext): PhaseResult | Promise<PhaseResult>

  /**
   * Helper to create a successful result
   */
  protected success(message?: string): PhaseResult {
    return {
      success: true,
      warnings: [],
      message,
    }
  }

  /**
   * Helper to create a successful result with warnings
   */
  protected successWithWarnings(warnings: GenerationWarning[], message?: string): PhaseResult {
    return {
      success: true,
      warnings,
      message,
    }
  }

  /**
   * Helper to create a failed result
   */
  protected failure(warnings: GenerationWarning[], message?: string): PhaseResult {
    return {
      success: false,
      warnings,
      message,
    }
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
   * Helper to create an error warning
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
   * Log a message with phase name prefix (silent by default)
   * Only logs in debug mode
   */
  protected log(_message: string): void {
    // Silent by default - uncomment for debugging
    // console.log(`[${this.name}] ${message}`)
  }
}
