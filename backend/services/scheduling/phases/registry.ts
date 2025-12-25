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
    this.phases.set(phase.name, phase)
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
  async executeAll(context: GeneratorContext): Promise<PhaseResult> {
    const allWarnings: GenerationWarning[] = []
    let allSuccess = true

    const phases = this.getEnabled()

    for (const phase of phases) {
      try {
        const result = await phase.execute(context)

        if (!result.success) {
          allSuccess = false
        }

        allWarnings.push(...result.warnings)
        
        // Also add warnings to context so they accumulate
        context.warnings.push(...result.warnings)
      } catch (error) {
        allSuccess = false
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[Schedule] Phase ${phase.name} error: ${errorMessage}`)
        
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
