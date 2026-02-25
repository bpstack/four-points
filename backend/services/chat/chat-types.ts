// services/chat/chat-types.ts
// Chat types

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
