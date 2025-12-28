// services/scheduling/ai/ai-client.ts
// Multi-provider AI client for schedule optimization

import type { AIContext, AIProposal, AIProviderConfig, AIProviderType, IAIProvider } from './types.js'
import { PROVIDER_DEFAULTS } from './types.js'
import { buildPrompt } from './ai-prompt-builder.js'
import { validateProposalStructure } from './ai-proposal-validator.js'
import { AILogger } from './ai-logger.js'
import { createProvider, getProviderConfigFromEnv } from './providers/index.js'

/**
 * Check if AI is enabled via environment variable
 */
function isAIEnabled(): boolean {
  const enabled = process.env.AI_ENABLED
  return enabled?.toLowerCase() === 'true' || enabled === '1'
}

/**
 * Check if a specific provider is enabled via environment variable
 * Uses PROVIDER_ENABLED (e.g., CLAUDE_ENABLED, GEMINI_ENABLED)
 * If not set, defaults to true (enabled) - the API key check handles availability
 */
function isProviderEnabled(provider: AIProviderType): boolean {
  const envVarMap: Record<AIProviderType, string> = {
    claude: 'CLAUDE_ENABLED',
    gemini: 'GEMINI_ENABLED',
    openai: 'OPENAI_ENABLED',
    ollama: 'OLLAMA_ENABLED',
    groq: 'GROQ_ENABLED',
    none: '',
  }
  
  const envVar = envVarMap[provider]
  if (!envVar) return false
  
  const value = process.env[envVar]
  // If not set, default to true (provider is enabled by default)
  if (value === undefined) return true
  // Explicitly disabled
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Multi-provider AI Client for schedule optimization
 */
export class AIClient {
  private provider: IAIProvider | null = null
  private config: AIProviderConfig
  private enabled: boolean = false

  constructor(providerType?: AIProviderType, customConfig?: Partial<AIProviderConfig>) {
    // Check if AI is enabled first
    if (!isAIEnabled()) {
      this.config = { ...PROVIDER_DEFAULTS.none } as AIProviderConfig
      return
    }

    // Determine provider type
    const type = providerType || this.getDefaultProviderType()
    
    // Get config from env and merge with custom config
    const envConfig = getProviderConfigFromEnv(type)
    this.config = {
      ...envConfig,
      ...customConfig,
    }

    // Create provider
    this.provider = createProvider(this.config)
    this.enabled = this.provider?.isAvailable() ?? false
  }

  /**
   * Get default provider type from environment
   * Checks both API key existence AND if the provider is enabled
   */
  private getDefaultProviderType(): AIProviderType {
    // Check for specific API keys AND if provider is enabled
    if (process.env.CLAUDE_API_KEY && isProviderEnabled('claude')) return 'claude'
    if (process.env.GEMINI_API_KEY && isProviderEnabled('gemini')) return 'gemini'
    if (process.env.OPENAI_API_KEY && isProviderEnabled('openai')) return 'openai'
    if (isProviderEnabled('ollama')) return 'ollama'
    return 'none'
  }

  /**
   * Check if AI client is available
   */
  isAvailable(): boolean {
    return this.enabled && this.provider !== null
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider?.name || 'None'
  }

  /**
   * Get current configuration
   */
  getConfig(): AIProviderConfig {
    return { ...this.config }
  }

  /**
   * Optimize schedule using AI
   */
  async optimize(context: AIContext, retryCount = 0): Promise<AIProposal> {
    if (!this.provider || !this.enabled) {
      return this.unavailableProposal()
    }

    const startTime = Date.now()
    AILogger.logRequest(context)

    try {
      const prompt = buildPrompt(context)

      // Send to provider
      const responseText = await this.provider.sendPrompt(prompt)

      // Parse response
      const proposal = this.parseResponse(responseText)

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
      if (retryCount < this.config.maxRetries) {
        AILogger.logRetry(retryCount + 1, this.config.maxRetries)
        await this.delay(2000 * (retryCount + 1)) // Exponential backoff
        return this.optimize(context, retryCount + 1)
      }

      // All retries exhausted
      return this.fallbackProposal(error)
    }
  }

  /**
   * Parse AI response to extract JSON
   */
  private parseResponse(text: string): AIProposal {
    const trimmed = text.trim()

    // Try to find JSON in response
    // First try: direct parse
    try {
      return JSON.parse(trimmed)
    } catch {
      // Second try: find JSON object in text (handle markdown code blocks)
      const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/(\{[\s\S]*\})/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        return JSON.parse(jsonStr.trim())
      }
      throw new Error('No valid JSON found in response')
    }
  }

  /**
   * Return proposal when AI is unavailable
   */
  private unavailableProposal(): AIProposal {
    return {
      analysis: 'AI optimization unavailable (no API key configured or AI disabled)',
      changes: [],
      confidence: 0,
      cannotResolve: true,
      reasoning: 'No AI provider is available. Check AI_ENABLED and API key configuration.',
    }
  }

  /**
   * Return fallback proposal on error
   */
  private fallbackProposal(error: unknown): AIProposal {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      analysis: `AI optimization failed after ${this.config.maxRetries} retries`,
      changes: [],
      confidence: 0,
      cannotResolve: true,
      reasoning: message,
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Create AI client with specific provider
 */
export function createAIClient(
  providerType: AIProviderType,
  apiKey?: string,
  model?: string
): AIClient {
  const customConfig: Partial<AIProviderConfig> = {}
  
  if (apiKey) {
    customConfig.apiKey = apiKey
  }
  if (model) {
    customConfig.model = model
  }

  return new AIClient(providerType, customConfig)
}
