// models/notifications/index.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

// ═══════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════

export enum NotificationModule {
  GROUPS = 'groups',
  PARKING = 'parking',
  LOGBOOKS = 'logbooks',
  SYSTEM = 'system',
}

export enum NotificationRelatedTo {
  PAYMENT = 'payment',
  ROOMING = 'rooming',
  BALANCE = 'balance',
  CONTRACT = 'contract',
  ARRIVAL = 'arrival',
  GENERAL = 'general',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  READ = 'read',
}

// ═══════════════════════════════════════════════════════
// DATABASE MODELS
// ═══════════════════════════════════════════════════════

export interface Notification extends RowDataPacket {
  id: number
  module: NotificationModule
  group_id: number | null
  related_to: NotificationRelatedTo
  related_id: number | null
  direct_link: string | null // ← AÑADIR ESTA LÍNEA
  title: string
  message: string | null
  priority: NotificationPriority
  status: NotificationStatus
  scheduled_for: Date | null
  sent_at: Date | null
  email_sent: boolean
  email_sent_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface NotificationRecipient extends RowDataPacket {
  id: number
  notification_id: number
  user_id: string
  is_read: boolean
  read_at: Date | null
  created_at: Date
}

// ═══════════════════════════════════════════════════════
// DTOs (Data Transfer Objects)
// ═══════════════════════════════════════════════════════

export interface CreateNotificationDTO {
  module?: NotificationModule
  group_id?: number
  related_to: NotificationRelatedTo
  related_id?: number
  direct_link?: string // ← AÑADIR ESTA LÍNEA
  title: string
  message?: string
  priority?: NotificationPriority
  status?: NotificationStatus
  scheduled_for?: Date | string
}

// ═══════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════

export interface NotificationFilters {
  status?: 'read' | 'unread'
  priority?: NotificationPriority
  module?: NotificationModule
  limit?: number
}

// ═══════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════

export interface NotificationWithRecipient extends Notification {
  is_read?: boolean
  read_at?: Date | null
  group_name?: string
}

export interface NotificationWithUser extends NotificationRecipient {
  username?: string
  email?: string
}

// ═══════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════

export type DatabaseResult = ResultSetHeader
