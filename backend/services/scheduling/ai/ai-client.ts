// services/scheduling/ai/ai-client.ts
// Claude AI client for schedule optimization

import Anthropic from '@anthropic-ai/sdk'
import type { AIContext, AIProposal } from './types.js'
import { buildPrompt } from './ai-prompt-builder.js'
import { validateProposalStructure } from './ai-proposal-validator.js'
import { AILogger } from './ai-logger.js'

/**
 * AI Client configuration
 */
const AI_CONFIG = {
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  temperature: 0.1,
  maxTokens: 2000,
  timeout: 30000,
  maxRetries: 3,
}

/**
 * Check if AI is enabled via environment variable
 */
function isAIEnabled(): boolean {
  const enabled = process.env.AI_ENABLED
  return enabled?.toLowerCase() === 'true' || enabled === '1'
}

/**
 * Client for Claude AI optimization
 */
export class AIClient {
  private client: Anthropic | null = null
  private enabled: boolean = false

  constructor() {
    // Check if AI is enabled first
    if (!isAIEnabled()) {
      return
    }

    const apiKey = process.env.CLAUDE_API_KEY
    if (apiKey) {
      this.client = new Anthropic({ apiKey })
      this.enabled = true
    }
  }

  /**
   * Check if AI client is available
   */
  isAvailable(): boolean {
    return this.enabled && this.client !== null
  }

  /**
   * Optimize schedule using AI
   */
  async optimize(context: AIContext, retryCount = 0): Promise<AIProposal> {
    if (!this.client) {
      return this.unavailableProposal()
    }

    const startTime = Date.now()
    AILogger.logRequest(context)

    try {
      const prompt = buildPrompt(context)

      // Call Claude with timeout
      const response = await Promise.race([
        this.client.messages.create({
          model: AI_CONFIG.model,
          max_tokens: AI_CONFIG.maxTokens,
          temperature: AI_CONFIG.temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
        this.timeout(AI_CONFIG.timeout),
      ])

      // Parse response
      const proposal = this.parseResponse(response as Anthropic.Message)

      // Validate structure
      const validation = validateProposalStructure(proposal)
      if (!validation.valid) {
        throw new Error(`Invalid proposal structure: ${validation.errors.join('; ')}`)
      }

      AILogger.logResponse(proposal, Date.now() - startTime)
      return proposal

    } catch (error) {
      AILogger.logError(`Attempt ${retryCount + 1} failed`, error)

      // Retry if under limit
      if (retryCount < AI_CONFIG.maxRetries) {
        AILogger.logRetry(retryCount + 1, AI_CONFIG.maxRetries)
        await this.delay(2000 * (retryCount + 1)) // Exponential backoff
        return this.optimize(context, retryCount + 1)
      }

      // All retries exhausted
      return this.fallbackProposal(error)
    }
  }

  /**
   * Parse Claude's response to extract JSON
   */
  private parseResponse(response: Anthropic.Message): AIProposal {
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const text = content.text.trim()

    // Try to find JSON in response
    // First try: direct parse
    try {
      return JSON.parse(text)
    } catch {
      // Second try: find JSON object in text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No valid JSON found in response')
    }
  }

  /**
   * Return proposal when AI is unavailable
   */
  private unavailableProposal(): AIProposal {
    return {
      analysis: 'AI optimization unavailable (no API key configured)',
      changes: [],
      confidence: 0,
      cannotResolve: true,
      reasoning: 'CLAUDE_API_KEY environment variable is not set',
    }
  }

  /**
   * Return fallback proposal on error
   */
  private fallbackProposal(error: unknown): AIProposal {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      analysis: `AI optimization failed after ${AI_CONFIG.maxRetries} retries`,
      changes: [],
      confidence: 0,
      cannotResolve: true,
      reasoning: message,
    }
  }

  /**
   * Create a timeout promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timeout after ${ms}ms`)), ms)
    })
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
