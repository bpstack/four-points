// services/scheduling/phases/registry.ts
// Phase registry for managing and executing phases in order

import type { GeneratorContext, PhaseResult, GenerationWarning } from '../types/index.js'
import type { BasePhase } from './base-phase.js'

/**
 * Registry for managing schedule generation phases
 * Phases are executed in order based on their `order` property
 */
export class PhaseRegistry {
  private phases: Map<string, BasePhase> = new Map()

  /**
   * Register a phase
   */
  register(phase: BasePhase): void {
    if (this.phases.has(phase.name)) {
      console.warn(`[PhaseRegistry] Overwriting existing phase: ${phase.name}`)
    }
    this.phases.set(phase.name, phase)
    console.log(`[PhaseRegistry] Registered phase: ${phase.name} (order: ${phase.order})`)
  }

  /**
   * Unregister a phase by name
   */
  unregister(name: string): boolean {
    return this.phases.delete(name)
  }

  /**
   * Get a phase by name
   */
  get(name: string): BasePhase | undefined {
    return this.phases.get(name)
  }

  /**
   * Enable a phase
   */
  enable(name: string): void {
    const phase = this.phases.get(name)
    if (phase) {
      phase.enabled = true
    }
  }

  /**
   * Disable a phase
   */
  disable(name: string): void {
    const phase = this.phases.get(name)
    if (phase) {
      phase.enabled = false
    }
  }

  /**
   * Get all enabled phases sorted by order (lowest first)
   */
  getEnabled(): BasePhase[] {
    return Array.from(this.phases.values())
      .filter((p) => p.enabled)
      .sort((a, b) => a.order - b.order)
  }

  /**
   * Execute all enabled phases in order
   * @returns Combined result with all warnings
   */
  executeAll(context: GeneratorContext): PhaseResult {
    const allWarnings: GenerationWarning[] = []
    let allSuccess = true

    const phases = this.getEnabled()
    console.log(`[PhaseRegistry] Executing ${phases.length} phases`)

    for (const phase of phases) {
      console.log(`[PhaseRegistry] Starting phase: ${phase.name}`)
      const startTime = Date.now()

      try {
        const result = phase.execute(context)

        if (!result.success) {
          allSuccess = false
          console.log(`[PhaseRegistry] Phase ${phase.name} failed: ${result.message || 'no message'}`)
        }

        allWarnings.push(...result.warnings)
        
        // Also add warnings to context so they accumulate
        context.warnings.push(...result.warnings)

        const duration = Date.now() - startTime
        console.log(
          `[PhaseRegistry] Completed phase: ${phase.name} (${duration}ms, ${result.warnings.length} warnings)`
        )
      } catch (error) {
        allSuccess = false
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[PhaseRegistry] Phase ${phase.name} threw error: ${errorMessage}`)
        
        allWarnings.push({
          type: 'validation',
          severity: 'error',
          message: `Error en fase ${phase.name}: ${errorMessage}`,
        })
      }
    }

    return {
      success: allSuccess,
      warnings: allWarnings,
      message: allSuccess ? 'All phases completed' : 'Some phases failed',
    }
  }

  /**
   * Get list of registered phase names
   */
  list(): string[] {
    return Array.from(this.phases.keys())
  }

  /**
   * Clear all phases
   */
  clear(): void {
    this.phases.clear()
  }

  /**
   * Get phase count
   */
  get count(): number {
    return this.phases.size
  }
}

/**
 * Create a new phase registry
 */
export function createPhaseRegistry(): PhaseRegistry {
  return new PhaseRegistry()
}
