// services/scheduling/ai/providers/groq-provider.ts
// Groq AI provider (OpenAI-compatible API)

import type { IAIProvider, AIProviderConfig } from '../types.js'

/**
 * Response structure from Groq API (OpenAI-compatible)
 */
interface GroqResponse {
  choices?: Array<{
    message?: {
      role: string
      content: string
    }
    finish_reason?: string
  }>
  error?: {
    message: string
    type: string
  }
}

/**
 * Groq AI Provider using OpenAI-compatible API
 * 
 * Get your API key at: https://console.groq.com/keys
 * Free tier available with generous limits and very fast inference
 */
export class GroqProvider implements IAIProvider {
  readonly name = 'Groq'
  private apiKey: string | null = null
  private config: AIProviderConfig
  private baseUrl = 'https://api.groq.com/openai/v1'

  constructor(config: AIProviderConfig) {
    this.config = config
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || null
    if (config.baseUrl) {
      // If baseUrl is provided, ensure it has the correct path
      // Groq uses /openai/v1 not just /v1
      const base = config.baseUrl.replace(/\/+$/, '') // remove trailing slashes
      if (base.endsWith('/openai/v1')) {
        this.baseUrl = base
      } else if (base.endsWith('/v1')) {
        // User might have put /v1, fix it to /openai/v1
        this.baseUrl = base.replace(/\/v1$/, '/openai/v1')
      } else {
        this.baseUrl = `${base}/openai/v1`
      }
    }
  }

  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured')
    }

    const url = `${this.baseUrl}/chat/completions`

    const body = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData?.error?.message || response.statusText
        
        // Mensajes más claros para errores comunes
        if (response.status === 402 || response.status === 429) {
          throw new Error(
            'Groq: Límite de rate alcanzado o saldo insuficiente. Espera unos minutos o verifica tu cuenta en https://console.groq.com'
          )
        }
        if (response.status === 401) {
          throw new Error('Groq: API key inválida. Verifica GROQ_API_KEY en tu .env')
        }
        
        throw new Error(`Groq API error: ${response.status} - ${errorMsg}`)
      }

      const data: GroqResponse = await response.json()

      if (data.error) {
        throw new Error(`Groq error: ${data.error.message}`)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in Groq response')
      }

      return content.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Groq request timeout after ${this.config.timeout}ms`)
      }
      
      throw error
    }
  }
}

