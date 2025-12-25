// services/scheduling/ai/providers/gemini-provider.ts
// Google Gemini AI provider (AI Studio)

import type { IAIProvider, AIProviderConfig } from '../types.js'

/**
 * Response structure from Gemini API
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
  error?: {
    message: string
    code: number
  }
}

/**
 * Gemini AI Provider using Google AI Studio API
 * 
 * Get your API key at: https://aistudio.google.com/apikey
 */
export class GeminiProvider implements IAIProvider {
  readonly name = 'Gemini'
  private apiKey: string | null = null
  private config: AIProviderConfig
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(config: AIProviderConfig) {
    this.config = config
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || null
  }

  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured')
    }

    const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Gemini API error: ${response.status} - ${errorData?.error?.message || response.statusText}`
        )
      }

      const data: GeminiResponse = await response.json()

      if (data.error) {
        throw new Error(`Gemini error: ${data.error.message}`)
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('No text response from Gemini')
      }

      return text.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini request timeout after ${this.config.timeout}ms`)
      }
      
      throw error
    }
  }
}
