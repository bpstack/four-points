// services/scheduling/ai/ai-logger.ts
// Logging utilities for AI operations (minimal output)

import type { AIContext, AIProposal, AIValidationResult } from './types.js'

/**
 * Logger for AI operations - minimal output
 */
export class AILogger {
  private static PREFIX = '[AI]'

  /**
   * Log AI request details (silent)
   */
  static logRequest(_context: AIContext): void {
    // Silent
  }

  /**
   * Log AI response details (silent)
   */
  static logResponse(_proposal: AIProposal, _timeMs: number): void {
    // Silent
  }

  /**
   * Log validation results - only summary
   */
  static logValidation(result: AIValidationResult): void {
    if (result.appliedChanges.length > 0) {
      console.log(`${this.PREFIX} Applied ${result.appliedChanges.length} changes`)
    }
  }

  /**
   * Log error
   */
  static logError(message: string, error?: unknown): void {
    console.error(`${this.PREFIX} Error: ${message}`, error instanceof Error ? error.message : '')
  }

  /**
   * Log info (silent)
   */
  static log(_message: string): void {
    // Silent
  }

  /**
   * Log retry attempt (silent)
   */
  static logRetry(_attempt: number, _maxRetries: number): void {
    // Silent
  }
}
