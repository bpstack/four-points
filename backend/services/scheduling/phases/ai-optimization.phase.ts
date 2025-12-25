// services/scheduling/phases/ai-optimization.phase.ts
// Phase 95: AI-assisted schedule optimization

import { BasePhase } from './base-phase.js'
import type { GeneratorContext, PhaseResult, GenerationWarning } from '../types/index.js'
import { AIClient } from '../ai/ai-client.js'
import { buildAIContext } from '../ai/ai-context-builder.js'
import { validateProposalStructure, validateAndApplyChanges } from '../ai/ai-proposal-validator.js'

/**
 * Phase 95: AI Optimization
 */
export class AIOptimizationPhase extends BasePhase {
  readonly name = 'AIOptimization'
  readonly order = 95

  private aiClient: AIClient

  constructor() {
    super()
    this.aiClient = new AIClient()
  }

  async execute(context: GeneratorContext): Promise<PhaseResult> {
    // Check if AI is enabled in config
    if (context.config.aiProvider === 'none') {
      return this.success('AI disabled in config')
    }

    // Check if AI client is available (API key set + AI_ENABLED=true)
    if (!this.aiClient.isAvailable()) {
      return this.success('AI unavailable')
    }

    // Only run if there are errors to resolve
    const errorsBefore = context.warnings.filter((w) => w.severity === 'error')
    if (errorsBefore.length === 0) {
      return this.success('No errors to optimize')
    }

    console.log(`\n[AI] ════════════════════════════════════════`)
    console.log(`[AI] 🤖 Starting optimization`)
    console.log(`[AI] 📊 Errors to resolve: ${errorsBefore.length}`)
    console.log(`[AI] ────────────────────────────────────────`)

    try {
      // Build context for AI
      const aiContext = buildAIContext(context)

      // Get AI proposal
      const startTime = Date.now()
      console.log(`[AI] 📤 Sending request to Claude...`)
      const proposal = await this.aiClient.optimize(aiContext)
      const elapsed = Date.now() - startTime

      console.log(`[AI] 📥 Response received (${elapsed}ms)`)

      // Validate proposal structure
      const structureValidation = validateProposalStructure(proposal)
      if (!structureValidation.valid) {
        console.log(`[AI] ❌ Invalid response structure`)
        console.log(`[AI] ════════════════════════════════════════\n`)
        return this.successWithWarnings(
          [this.warn(`AI proposal had invalid structure: ${structureValidation.errors[0]}`)],
          'AI proposal structure invalid'
        )
      }

      // Log AI analysis
      console.log(`[AI] 💭 Analysis: ${proposal.analysis}`)

      // If AI cannot resolve or no changes proposed
      if (proposal.cannotResolve) {
        console.log(`[AI] ⚠️ Cannot resolve: ${proposal.reasoning || 'No reason given'}`)
        console.log(`[AI] ════════════════════════════════════════\n`)
        return this.success(`AI cannot resolve: ${proposal.reasoning || proposal.analysis}`)
      }

      if (proposal.changes.length === 0) {
        console.log(`[AI] ℹ️ No changes proposed`)
        console.log(`[AI] ════════════════════════════════════════\n`)
        return this.success('AI found no safe changes to make')
      }

      // Log proposed changes
      console.log(`[AI] 📝 Proposed ${proposal.changes.length} changes (confidence: ${proposal.confidence}):`)
      proposal.changes.forEach((c, i) => {
        console.log(`[AI]    ${i + 1}. ${c.employeeId} día ${c.day}: ${c.from} → ${c.to} (${c.reason})`)
      })

      // Validate and apply changes
      console.log(`[AI] ────────────────────────────────────────`)
      console.log(`[AI] 🔍 Validating changes...`)
      const result = validateAndApplyChanges(context, proposal)

      // Log applied changes
      if (result.appliedChanges.length > 0) {
        console.log(`[AI] ✅ Applied ${result.appliedChanges.length} changes:`)
        result.appliedChanges.forEach((c) => {
          console.log(`[AI]    ✓ ${c.employeeId} día ${c.day}: ${c.from} → ${c.to}`)
        })
      }

      // Log rejected changes
      if (result.rejectedChanges.length > 0) {
        console.log(`[AI] ❌ Rejected ${result.rejectedChanges.length} changes:`)
        result.rejectedChanges.forEach((r) => {
          console.log(`[AI]    ✗ ${r.change.employeeId} día ${r.change.day}: ${r.reason}`)
        })
      }

      // Count errors after AI changes
      const errorsAfter = context.warnings.filter((w) => w.severity === 'error').length
      const improvement = errorsBefore.length - errorsAfter

      console.log(`[AI] ────────────────────────────────────────`)
      console.log(`[AI] 📈 Result: ${errorsBefore.length} errors → ${errorsAfter} errors`)
      if (improvement > 0) {
        console.log(`[AI] 🎉 Improved by ${improvement} errors!`)
      } else if (improvement === 0) {
        console.log(`[AI] 😐 No improvement`)
      } else {
        console.log(`[AI] 😰 Got worse by ${-improvement} errors`)
      }
      console.log(`[AI] ════════════════════════════════════════\n`)

      // Build warnings for rejected changes
      const warnings: GenerationWarning[] = result.rejectedChanges.map((r) => ({
        type: 'validation' as const,
        severity: 'info' as const,
        message: `AI change rejected: ${r.change.employeeId} day ${r.change.day} ${r.change.from}->${r.change.to}: ${r.reason}`,
      }))

      return this.successWithWarnings(
        warnings,
        `AI: ${result.appliedChanges.length} applied, ${result.rejectedChanges.length} rejected`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.log(`[AI] ❌ Error: ${message}`)
      console.log(`[AI] ════════════════════════════════════════\n`)
      return this.successWithWarnings(
        [this.warn(`AI optimization error: ${message}`)],
        'AI optimization failed'
      )
    }
  }
}
