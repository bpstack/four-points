// app/lib/chat/queries.ts
// API para el chat de ayuda con IA

import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  success: boolean
  reply?: string
  error?: string
}

export interface ChatStatusResponse {
  success: boolean
  available: boolean
  provider: string
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Envía un mensaje al asistente de ayuda
 */
export async function sendChatMessage(
  message: string,
  history?: ChatMessage[]
): Promise<ChatResponse> {
  return apiClient.post<ChatResponse>(`${API_BASE_URL}/api/chat/message`, {
    message,
    history,
  })
}

/**
 * Obtiene el estado del servicio de chat
 */
export async function getChatStatus(): Promise<ChatStatusResponse> {
  return apiClient.get<ChatStatusResponse>(`${API_BASE_URL}/api/chat/status`)
}
