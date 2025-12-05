// app/api/notifications/route.ts
// ✅ USA apiClient con auto-refresh automático

import apiClient from '@/app/lib/apiClient'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api'

// =============== TIPOS ===============

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface GroupNotification {
  id: number
  group_id: number
  title: string
  message: string
  priority: NotificationPriority
  scheduled_for: string | null // Nueva propiedad
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  created_by: string | null
  created_at: string
}

export interface CreateNotificationDTO {
  title: string
  message: string
  priority: NotificationPriority
  scheduled_for?: string // Opcional: si no se envía, se programa para "ahora"
}

// ...existing code...

export const groupsApi = {
  // ...existing code...

  // ========== NOTIFICACIONES ==========

  /**
   * Crea una notificación para un grupo
   */
  createNotification: async (
    groupId: number,
    data: CreateNotificationDTO
  ): Promise<{ success: boolean; message: string; data: GroupNotification }> => {
    return apiClient.post(`${API_URL}/groups/${groupId}/notifications`, data)
  },

  /**
   * Obtiene notificaciones de un grupo
   */
  getNotifications: async (
    groupId: number
  ): Promise<{ success: boolean; data: GroupNotification[] }> => {
    return apiClient.get(`${API_URL}/groups/${groupId}/notifications`)
  },
}

export const notificationsApi = {
  /**
   * Verifica y procesa notificaciones pendientes manualmente
   */
  checkPending: async (): Promise<{
    success: boolean
    message: string
    data?: {
      checked: number
      sent: number
      failed: number
    }
  }> => {
    return apiClient.post(`${API_URL}/notifications/check-pending`)
  },
}
