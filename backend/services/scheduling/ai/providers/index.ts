// services/scheduling/ai/providers/index.ts
// Provider exports and factory

import type { IAIProvider, AIProviderConfig, AIProviderType } from '../types.js'
import { PROVIDER_DEFAULTS } from '../types.js'
import { ClaudeProvider } from './claude-provider.js'
import { GeminiProvider } from './gemini-provider.js'
import { OllamaProvider } from './ollama-provider.js'

export { ClaudeProvider } from './claude-provider.js'
export { GeminiProvider } from './gemini-provider.js'
export { OllamaProvider } from './ollama-provider.js'

/**
 * Create an AI provider based on configuration
 */
export function createProvider(config: AIProviderConfig): IAIProvider | null {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config)
    
    case 'gemini':
      return new GeminiProvider(config)
    
    case 'openai':
      // TODO: Implement OpenAI provider
      console.warn('[AI] OpenAI provider not yet implemented')
      return null
    
    case 'ollama':
      return new OllamaProvider(config)
    
    case 'none':
    default:
      return null
  }
}

/**
 * Get provider configuration from environment variables
 */
export function getProviderConfigFromEnv(provider: AIProviderType): AIProviderConfig {
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.none

  switch (provider) {
    case 'claude':
      return {
        ...defaults,
        provider: 'claude',
        apiKey: process.env.CLAUDE_API_KEY,
        model: process.env.CLAUDE_MODEL || defaults.model,
      } as AIProviderConfig

    case 'gemini':
      return {
        ...defaults,
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || defaults.model,
      } as AIProviderConfig

    case 'openai':
      return {
        ...defaults,
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || defaults.model,
      } as AIProviderConfig

    case 'ollama':
      return {
        ...defaults,
        provider: 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || defaults.baseUrl,
        model: process.env.OLLAMA_MODEL || defaults.model,
      } as AIProviderConfig

    default:
      return {
        provider: 'none',
        model: '',
        temperature: 0,
        maxTokens: 0,
        timeout: 0,
        maxRetries: 0,
      }
  }
}
