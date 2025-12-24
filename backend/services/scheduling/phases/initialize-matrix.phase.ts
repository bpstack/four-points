// services/scheduling/phases/initialize-matrix.phase.ts
// Phase 1: Initialize the schedule matrix with empty values

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult } from '../types/index.js'
import { createEmptyMatrix } from '../utils/matrix.js'

/**
 * Initialize Matrix Phase
 *
 * Creates an empty schedule matrix with all employees and days.
 * Each cell is initialized to empty string ('').
 */
export class InitializeMatrixPhase extends BasePhase {
  readonly name = 'initialize-matrix'
  readonly order = 10 // First phase

  execute(context: GeneratorContext): PhaseResult {
    this.log(`Initializing matrix for ${context.employees.length} employees and ${context.days.length} days`)

    // Create empty matrix
    context.matrix = createEmptyMatrix(context.employees, context.days)

    // Reset tracking sets
    context.employeesWithCompletedNightBlock = new Set()
    context.daysNeedingPI = []

    this.log(`Matrix initialized with ${Object.keys(context.matrix).length} employees`)

    return this.success(`Matrix initialized for ${context.employees.length} employees`)
  }
}
