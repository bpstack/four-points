// app/lib/messaging/types.ts
export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  subject: string
  content: string
  read: boolean
  created_at: string
  updated_at: string
  sender?: {
    id: string
    username: string
    role: string
  }
  receiver?: {
    id: string
    username: string
    role: string
  }
}

export interface MessageThread {
  user: {
    id: string
    username: string
    role: string
  }
  lastMessage: Message
  unreadCount: number
}

export interface SendMessageRequest {
  receiver_id: string
  subject: string
  content: string
}
