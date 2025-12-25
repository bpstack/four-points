// services/scheduling/ai/providers/ollama-provider.ts
// Ollama local AI provider (via Open WebUI or direct)

import type { IAIProvider, AIProviderConfig } from '../types.js'

/**
 * Response structure from Ollama API
 */
interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
  error?: string
}

/**
 * Ollama AI Provider for local models
 * 
 * Works with:
 * - Ollama directly (default port 11434)
 * - Open WebUI (default port 7777, proxies to Ollama)
 * 
 * API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export class OllamaProvider implements IAIProvider {
  readonly name = 'Ollama'
  private config: AIProviderConfig
  private baseUrl: string

  constructor(config: AIProviderConfig) {
    this.config = config
    // Default to localhost:11434 (Ollama default)
    // Can also use localhost:7777 for Open WebUI
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }

  isAvailable(): boolean {
    // Ollama doesn't need API key, just needs to be running
    // We'll check connectivity when sending the request
    return true
  }

  async sendPrompt(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/api/generate`

    const body = {
      model: this.config.model,
      prompt: prompt,
      stream: false, // Get complete response at once
      options: {
        temperature: this.config.temperature,
        num_predict: this.config.maxTokens,
      },
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
      }

      const data: OllamaResponse = await response.json()

      if (data.error) {
        throw new Error(`Ollama error: ${data.error}`)
      }

      if (!data.response) {
        throw new Error('No response from Ollama')
      }

      return data.response.trim()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Ollama request timeout after ${this.config.timeout}ms`)
        }
        
        // Connection refused = Ollama not running
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new Error(`Ollama not reachable at ${this.baseUrl}. Is Docker/Ollama running?`)
        }
      }

      throw error
    }
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkHealth(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        return { ok: false, error: `Ollama returned ${response.status}` }
      }

      const data = await response.json()
      const models = data.models || []
      const modelNames = models.map((m: { name: string }) => m.name)

      if (!modelNames.some((name: string) => name.includes(this.config.model.split(':')[0]))) {
        return { 
          ok: false, 
          error: `Model ${this.config.model} not found. Available: ${modelNames.join(', ')}` 
        }
      }

      return { ok: true }
    } catch (error) {
      return { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}
