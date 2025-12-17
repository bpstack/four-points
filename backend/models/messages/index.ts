// models/messages/index.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

// ===============================================
// ENUMS
// ===============================================

export enum ConversationType {
  DM = 'dm',
  GROUP = 'group',
}

// ===============================================
// DATABASE MODELS
// ===============================================

export interface Conversation extends RowDataPacket {
  id: number
  type: ConversationType
  name: string | null
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface ConversationParticipant extends RowDataPacket {
  id: number
  conversation_id: number
  user_id: string
  joined_at: Date
  last_read_at: Date | null
  is_admin: boolean
  is_active: boolean
}

export interface Message extends RowDataPacket {
  id: number
  conversation_id: number
  sender_id: string
  content: string
  notify: boolean
  is_edited: boolean
  edited_at: Date | null
  deleted_at: Date | null
  created_at: Date
}

// ===============================================
// EXTENDED MODELS (con JOINs)
// ===============================================

export interface ConversationWithDetails extends Conversation {
  // Para DMs: info del otro participante
  // Para grupos: lista de participantes
  participant_count?: number
  last_message?: string
  last_message_at?: Date
  unread_count?: number
  // Info del otro usuario en DMs
  other_user_id?: string
  other_username?: string
  other_role?: string
}

export interface MessageWithSender extends Message {
  sender_username: string
  sender_role?: string
}

export interface ParticipantWithUser extends ConversationParticipant {
  username: string
  email: string
  role_name?: string
}

// ===============================================
// DTOs (Data Transfer Objects)
// ===============================================

export interface CreateConversationDTO {
  type: ConversationType
  name?: string // Solo para grupos
  participant_ids: string[] // IDs de usuarios a incluir
}

export interface CreateMessageDTO {
  conversation_id: number
  content: string
  notify?: boolean
}

export interface UpdateMessageDTO {
  content: string
}

export interface AddParticipantsDTO {
  user_ids: string[]
}

// ===============================================
// FILTERS & PAGINATION
// ===============================================

export interface ConversationFilters {
  type?: ConversationType
  search?: string // Buscar por nombre de grupo o participante
}

export interface MessageFilters {
  before_id?: number // Para paginacion cursor-based
  limit?: number
  search?: string // Busqueda fulltext
}

export interface PaginationParams {
  page?: number
  limit?: number
}

// ===============================================
// RESPONSE TYPES
// ===============================================

export interface ConversationListResponse {
  conversations: ConversationWithDetails[]
  total: number
}

export interface MessageListResponse {
  messages: MessageWithSender[]
  has_more: boolean
  oldest_id?: number
}

export interface UnreadCountResponse {
  total_unread: number
  by_conversation: {
    conversation_id: number
    unread_count: number
  }[]
}

export interface UserSearchResult extends RowDataPacket {
  id: string
  username: string
  email: string
  role_name: string
  existing_dm_id?: number // Si ya existe un DM con este usuario
}

// ===============================================
// CONSTANTS
// ===============================================

export const MESSAGE_CONSTANTS = {
  MAX_CONTENT_LENGTH: 5000,
  MAX_GROUP_PARTICIPANTS: 10,
  MAX_GROUP_NAME_LENGTH: 100,
  DEFAULT_MESSAGES_LIMIT: 50,
  RETENTION_DAYS: 90,
} as const

// ===============================================
// QUERY RESULT HELPERS (para mysql2)
// ===============================================

export interface CountResult extends RowDataPacket {
  count: number
}

export interface IdResult extends RowDataPacket {
  id: number
}

export interface UserIdResult extends RowDataPacket {
  user_id: string
}

export interface UnreadByConversationResult extends RowDataPacket {
  conversation_id: number
  unread_count: number
}

// ===============================================
// UTILITY TYPES
// ===============================================

export type DatabaseResult = ResultSetHeader
