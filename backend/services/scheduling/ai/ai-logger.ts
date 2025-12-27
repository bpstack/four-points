// services/scheduling/ai/ai-logger.ts
// Logging utilities for AI operations (minimal output)

import type { AIContext, AIProposal, AIValidationResult } from './types.js'

// Enable debug mode via environment variable
const DEBUG = process.env.AI_DEBUG === 'true'

/**
 * Logger for AI operations - minimal output
 */
export class AILogger {
  private static PREFIX = '[AI]'

  /**
   * Log AI request details (debug mode only)
   */
  static logRequest(context: AIContext): void {
    if (!DEBUG) return
    console.log(`${this.PREFIX} === REQUEST CONTEXT ===`)
    console.log(`${this.PREFIX} Employees: ${context.employees.length}`)
    console.log(`${this.PREFIX} Warnings: ${context.warnings.length}`)
    console.log(`${this.PREFIX} Matrix preview (JSON):`)
    // Show first 3 employees from matrix
    const employeeKeys = Object.keys(context.matrix).slice(0, 3)
    employeeKeys.forEach(key => {
      const days = context.matrix[key]
      const preview = Object.entries(days).slice(0, 5).map(([d, s]) => `${d}:${s}`).join(', ')
      console.log(`${this.PREFIX}   ${key}: {${preview}...}`)
    })
    if (Object.keys(context.matrix).length > 3) {
      console.log(`${this.PREFIX}   ... (${Object.keys(context.matrix).length - 3} more employees)`)
    }
  }

  /**
   * Log AI response details (debug mode only)
   */
  static logResponse(proposal: AIProposal, timeMs: number): void {
    if (!DEBUG) return
    console.log(`${this.PREFIX} === RESPONSE (${timeMs}ms) ===`)
    console.log(`${this.PREFIX} Analysis: ${proposal.analysis}`)
    console.log(`${this.PREFIX} Confidence: ${proposal.confidence}`)
    console.log(`${this.PREFIX} Changes proposed: ${proposal.changes.length}`)
    proposal.changes.forEach((c, i) => {
      console.log(`${this.PREFIX}   ${i + 1}. ${c.employeeId} day ${c.day}: ${c.from} -> ${c.to} (${c.reason})`)
    })
  }

  /**
   * Log validation results - shows rejections with details
   */
  static logValidation(result: AIValidationResult): void {
    if (result.appliedChanges.length > 0) {
      console.log(`${this.PREFIX} Applied ${result.appliedChanges.length} changes`)
    }
    
    // Always show rejections with full details
    if (result.rejectedChanges.length > 0) {
      console.log(`${this.PREFIX} Rejected ${result.rejectedChanges.length} changes:`)
      result.rejectedChanges.forEach(({ change, reason }) => {
        console.log(`${this.PREFIX} \u2717 ${change.employeeId} day ${change.day}: ${reason}`)
      })
    }
  }

  /**
   * Log error
   */
  static logError(message: string, error?: unknown): void {
    console.error(`${this.PREFIX} Error: ${message}`, error instanceof Error ? error.message : '')
  }

  /**
   * Log info (debug mode only)
   */
  static log(message: string): void {
    if (!DEBUG) return
    console.log(`${this.PREFIX} ${message}`)
  }

  /**
   * Log retry attempt (debug mode only)
   */
  static logRetry(attempt: number, maxRetries: number): void {
    if (!DEBUG) return
    console.log(`${this.PREFIX} Retry ${attempt}/${maxRetries}`)
  }

  /**
   * Log matrix cell for debugging mismatches
   */
  static logMatrixMismatch(employeeId: string, day: number, expected: string, actual: string): void {
    console.log(`${this.PREFIX} MISMATCH: ${employeeId} day ${day}: AI expected "${expected}", actual is "${actual}"`)
  }
}
