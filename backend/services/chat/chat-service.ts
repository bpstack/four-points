// services/chat/chat-service.ts
// Servicio de chat con IA para preguntas sobre la aplicación
// Usa el mismo sistema de proveedores que scheduling

import type { AIProviderType, IAIProvider, AIProviderConfig } from '../scheduling/ai/types.js'
import { createProvider, getProviderConfigFromEnv } from '../scheduling/ai/providers/index.js'
import * as schedulingRepo from '../../repositories/scheduling/scheduling-repository.js'
import { APP_KNOWLEDGE } from './app-knowledge.js'

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  history?: ChatMessage[]
}

export interface ChatResponse {
  reply: string
  success: boolean
  error?: string
}

// ============================================
// SYSTEM PROMPT - Contexto de la aplicación
// ============================================

const SYSTEM_PROMPT = `Eres un asistente de ayuda para "Four Points PMS", un sistema de gestión hotelera.

## INSTRUCCIONES CRÍTICAS:
- **SIEMPRE responde en ESPAÑOL. NUNCA uses inglés.**
- Sé preciso y basado en hechos. Solo usa la información proporcionada en el contexto.
- Si no sabes algo específico, indícalo honestamente en lugar de inventar.

## Tu rol:
- Responde preguntas sobre cómo usar la aplicación
- Explica las funcionalidades de cada módulo
- **También puedes explicar cómo funciona el código internamente** (arquitectura, algoritmos, fases, etc.)
- Ayuda a resolver dudas tanto operativas como técnicas
- Sé conciso y directo en tus respuestas
- No inventes funcionalidades que no se han descrito

## Formato de respuestas:
- Usa respuestas cortas y claras
- Si es una lista, usa viñetas
- Para código o rutas de archivo, usa formato \`código\`
- Ve al punto directamente
- **IMPORTANTE: Responde SOLO en español. No mezcles idiomas.**

${APP_KNOWLEDGE}`

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if AI is enabled via environment variable
 */
function isAIEnabled(): boolean {
  const enabled = process.env.AI_ENABLED
  return enabled?.toLowerCase() === 'true' || enabled === '1'
}

/**
 * Get active provider from database configuration
 */
async function getActiveProvider(): Promise<AIProviderType> {
  try {
    const configMap = await schedulingRepo.getConfigMap()
    return configMap.aiProvider || 'none'
  } catch (error) {
    console.error('[ChatService] Error getting config from DB:', error)
    return 'none'
  }
}

/**
 * Create provider instance based on type
 */
function createChatProvider(providerType: AIProviderType): IAIProvider | null {
  const config = getProviderConfigFromEnv(providerType)
  
  // Override config for chat (allow more tokens for responses)
  const chatConfig: AIProviderConfig = {
    ...config,
    maxTokens: 2048, // Increased for better responses
    temperature: 0.3, // Lower temperature for more precise, consistent responses
  }
  
  return createProvider(chatConfig)
}

// ============================================
// CHAT SERVICE CLASS
// ============================================

class ChatService {
  /**
   * Verifica si el servicio está disponible
   */
  async isAvailable(): Promise<boolean> {
    if (!isAIEnabled()) return false
    
    const providerType = await getActiveProvider()
    if (providerType === 'none') return false
    
    const provider = createChatProvider(providerType)
    return provider?.isAvailable() ?? false
  }

  /**
   * Envía un mensaje al chat y obtiene respuesta
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // Check if AI is enabled
    if (!isAIEnabled()) {
      return {
        reply: '',
        success: false,
        error: 'El servicio de IA está desactivado. Contacta al administrador.',
      }
    }

    // Get active provider from DB
    const providerType = await getActiveProvider()
    if (providerType === 'none') {
      return {
        reply: '',
        success: false,
        error: 'No hay proveedor de IA configurado. Configúralo en Scheduling > Config.',
      }
    }

    // Create provider
    const provider = createChatProvider(providerType)
    if (!provider || !provider.isAvailable()) {
      return {
        reply: '',
        success: false,
        error: `El proveedor ${providerType} no está disponible. Verifica la API key.`,
      }
    }

    try {
      // Build conversation for the provider
      const conversationPrompt = this.buildConversationPrompt(request)
      
      // Send to provider
      const response = await provider.sendPrompt(conversationPrompt)

      return {
        reply: response.trim(),
        success: true,
      }
    } catch (error) {
      console.error('[ChatService] Error:', error)

      let errorMessage = 'Error desconocido al procesar tu mensaje'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Mejorar mensajes de error comunes
        if (error.message.includes('Insufficient Balance') || error.message.includes('Saldo insuficiente')) {
          errorMessage = 'El proveedor de IA no tiene créditos suficientes. Cambia a otro proveedor en Configuración > Scheduling > General, o recarga créditos en la plataforma del proveedor.'
        } else if (error.message.includes('API key')) {
          errorMessage = 'API key no configurada o inválida. Verifica la configuración en el servidor.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'El proveedor de IA tardó demasiado en responder. Intenta de nuevo o cambia a otro proveedor.'
        }
      }

      return {
        reply: '',
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Build the full prompt with system context and conversation history
   */
  private buildConversationPrompt(request: ChatRequest): string {
    let prompt = `${SYSTEM_PROMPT}\n\n`
    
    // Add conversation history if exists
    if (request.history && request.history.length > 0) {
      prompt += '## Conversación anterior:\n'
      for (const msg of request.history) {
        const role = msg.role === 'user' ? 'Usuario' : 'Asistente'
        prompt += `${role}: ${msg.content}\n`
      }
      prompt += '\n'
    }
    
    // Add current message
    prompt += `## Mensaje actual del usuario:\n${request.message}\n\n`
    prompt += `## Tu respuesta (IMPORTANTE: Responde SOLO en español, sé conciso y preciso):`
    
    return prompt
  }

  /**
   * Obtiene el estado del servicio
   */
  async getStatus(): Promise<{ available: boolean; provider: string }> {
    if (!isAIEnabled()) {
      return { available: false, provider: 'Desactivado' }
    }

    const providerType = await getActiveProvider()
    if (providerType === 'none') {
      return { available: false, provider: 'No configurado' }
    }

    const provider = createChatProvider(providerType)
    const available = provider?.isAvailable() ?? false

    return {
      available,
      provider: provider?.name || providerType,
    }
  }
}

// Singleton
export const chatService = new ChatService()
