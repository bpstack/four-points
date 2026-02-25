// services/chat/chat-service.ts
// Chat service - AI has been archived

import type { ChatRequest, ChatResponse } from './chat-types.js'

// ============================================
// CHAT SERVICE (ARCHIVED)
// ============================================

export const chatService = {
  async sendMessage(_request: ChatRequest): Promise<ChatResponse> {
    return {
      reply: '',
      success: false,
      error: 'El servicio de chat con IA ha sido archivado. Esta funcionalidad ya no está disponible.',
    }
  },

  isAvailable(): boolean {
    return false
  },

  getStatus(): { available: boolean; message: string } {
    return {
      available: false,
      message: 'El servicio de chat con IA ha sido archivado.',
    }
  },
}
