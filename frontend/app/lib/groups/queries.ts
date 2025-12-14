// app/lib/groups/queries.ts
// ✅ USA apiClient con auto-refresh automático

import apiClient from '@/app/lib/apiClient'
import type {
  Group,
  GroupWithDetails,
  GroupPayment,
  GroupContact,
  GroupRoom,
  GroupStatusRecord,
  GroupTimeline,
  GroupNotification,
  PaymentBalance,
  PaymentWithGroupInfo,
  DashboardOverview,
  GroupFilters,
  CreateGroupDTO,
  UpdateGroupDTO,
  CreateGroupPaymentDTO,
  UpdateGroupPaymentDTO,
  UpdateBookingDTO,
  UpdateContractDTO,
  UpdateRoomingDTO,
  UpdateBalanceDTO,
  CreateGroupContactDTO,
  UpdateGroupContactDTO,
  CreateGroupRoomDTO,
  UpdateGroupRoomDTO,
  CreateNotificationDTO,
  PaymentStatus,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api'

// =============== GROUPS API ===============

export const groupsApi = {
  // ========== GRUPOS ==========

  /**
   * Obtiene todos los grupos con filtros opcionales
   */
  getAll: async (
    filters?: GroupFilters
  ): Promise<{ success: boolean; data: Group[]; count: number }> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    const url = `${API_URL}/groups${params.toString() ? `?${params.toString()}` : ''}`
    return apiClient.get(url)
  },

  /**
   * Obtiene un grupo por ID con detalles completos
   */
  getById: async (id: number): Promise<{ success: boolean; data: GroupWithDetails }> => {
    return apiClient.get(`${API_URL}/groups/${id}`)
  },

  /**
   * Crea un nuevo grupo
   */
  create: async (
    data: CreateGroupDTO
  ): Promise<{ success: boolean; message: string; data: Group }> => {
    return apiClient.post(`${API_URL}/groups`, data)
  },

  /**
   * Actualiza un grupo existente
   */
  update: async (
    id: number,
    data: UpdateGroupDTO
  ): Promise<{ success: boolean; message: string; data: Group }> => {
    return apiClient.put(`${API_URL}/groups/${id}`, data)
  },

  /**
   * Elimina un grupo
   */
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`${API_URL}/groups/${id}`)
  },

  // ========== DASHBOARD ==========

  /**
   * Obtiene resumen del dashboard
   */
  getDashboardOverview: async (): Promise<{ success: boolean; data: DashboardOverview }> => {
    return apiClient.get(`${API_URL}/groups/dashboard/overview`)
  },

  /**
   * Obtiene timeline de grupos por mes
   */
  getDashboardTimeline: async (
    year?: number
  ): Promise<{ success: boolean; data: GroupTimeline[] }> => {
    const url = year
      ? `${API_URL}/groups/dashboard/timeline?year=${year}`
      : `${API_URL}/groups/dashboard/timeline`
    return apiClient.get(url)
  },

  // ========== PAGOS ==========

  /**
   * Obtiene todos los pagos de un grupo
   */
  getPayments: async (
    groupId: number
  ): Promise<{ success: boolean; data: { payments: GroupPayment[]; balance: PaymentBalance } }> => {
    return apiClient.get(`${API_URL}/groups/${groupId}/payments`)
  },

  /**
   * Crea un nuevo pago para un grupo
   */
  createPayment: async (
    groupId: number,
    data: CreateGroupPaymentDTO
  ): Promise<{ success: boolean; message: string; data: GroupPayment }> => {
    return apiClient.post(`${API_URL}/groups/${groupId}/payments`, data)
  },

  /**
   * Actualiza un pago completo
   */
  updatePayment: async (
    groupId: number,
    paymentId: number,
    data: UpdateGroupPaymentDTO
  ): Promise<{ success: boolean; message: string; data: GroupPayment }> => {
    return apiClient.put(`${API_URL}/groups/${groupId}/payments/${paymentId}`, data)
  },

  /**
   * Actualiza solo el estado de un pago
   */
  updatePaymentStatus: async (
    groupId: number,
    paymentId: number,
    status: PaymentStatus
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`${API_URL}/groups/${groupId}/payments/${paymentId}/status`, { status })
  },

  /**
   * Registra pago parcial o total
   */
  updateAmountPaid: async (
    groupId: number,
    paymentId: number,
    amount_paid: number
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`${API_URL}/groups/${groupId}/payments/${paymentId}/amount-paid`, {
      amount_paid,
    })
  },

  /**
   * Elimina un pago
   */
  deletePayment: async (
    groupId: number,
    paymentId: number
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`${API_URL}/groups/${groupId}/payments/${paymentId}`)
  },

  /**
   * Obtiene pagos próximos a vencer
   */
  getUpcomingPayments: async (
    days: number = 7
  ): Promise<{ success: boolean; data: PaymentWithGroupInfo[]; count: number; days: number }> => {
    return apiClient.get(`${API_URL}/groups/payments/upcoming?days=${days}`)
  },

  /**
   * Obtiene pagos vencidos
   */
  getOverduePayments: async (): Promise<{
    success: boolean
    data: PaymentWithGroupInfo[]
    count: number
  }> => {
    return apiClient.get(`${API_URL}/groups/payments/overdue`)
  },

  // ========== ESTADOS ==========

  /**
   * Obtiene el estado completo de un grupo
   */
  getStatus: async (groupId: number): Promise<{ success: boolean; data: GroupStatusRecord }> => {
    return apiClient.get(`${API_URL}/groups/${groupId}/status`)
  },

  /**
   * Actualiza booking/confirmación
   */
  updateBooking: async (
    groupId: number,
    data: UpdateBookingDTO
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.put(`${API_URL}/groups/${groupId}/status/booking`, data)
  },

  /**
   * Actualiza contrato
   */
  updateContract: async (
    groupId: number,
    data: UpdateContractDTO
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.put(`${API_URL}/groups/${groupId}/status/contract`, data)
  },

  /**
   * Actualiza rooming list
   */
  updateRooming: async (
    groupId: number,
    data: UpdateRoomingDTO
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.put(`${API_URL}/groups/${groupId}/status/rooming`, data)
  },

  /**
   * Actualiza balance
   */
  updateBalance: async (
    groupId: number,
    data: UpdateBalanceDTO
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.put(`${API_URL}/groups/${groupId}/status/balance`, data)
  },

  // ========== HABITACIONES ==========

  getRooms: async (
    groupId: number
  ): Promise<{ success: boolean; data: { rooms: GroupRoom[]; summary?: any } }> => {
    return apiClient.get(`${API_URL}/groups/${groupId}/rooms`)
  },

  /**
   * Crea/actualiza habitaciones (UPSERT)
   */
  createOrUpdateRoom: async (
    groupId: number,
    data: CreateGroupRoomDTO
  ): Promise<{ success: boolean; message: string; data: GroupRoom }> => {
    return apiClient.post(`${API_URL}/groups/${groupId}/rooms`, data)
  },

  /**
   * Actualiza una habitación específica
   */
  updateRoom: async (
    groupId: number,
    roomId: number,
    data: UpdateGroupRoomDTO
  ): Promise<{ success: boolean; message: string; data: GroupRoom }> => {
    return apiClient.put(`${API_URL}/groups/${groupId}/rooms/${roomId}`, data)
  },

  /**
   * Elimina una habitación
   */
  deleteRoom: async (
    groupId: number,
    roomId: number
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`${API_URL}/groups/${groupId}/rooms/${roomId}`)
  },

  // ========== CONTACTOS ==========

  /**
   * Obtiene todos los contactos de un grupo
   */
  getContacts: async (groupId: number): Promise<{ success: boolean; data: GroupContact[] }> => {
    return apiClient.get(`${API_URL}/groups/${groupId}/contacts`)
  },

  /**
   * Obtiene el contacto principal
   */
  getPrimaryContact: async (
    groupId: number
  ): Promise<{ success: boolean; data: GroupContact | null }> => {
    return apiClient.get(`${API_URL}/groups/${groupId}/contacts/primary`)
  },

  /**
   * Crea un nuevo contacto
   */
  createContact: async (
    groupId: number,
    data: CreateGroupContactDTO
  ): Promise<{ success: boolean; message: string; data: GroupContact }> => {
    return apiClient.post(`${API_URL}/groups/${groupId}/contacts`, data)
  },

  /**
   * Actualiza un contacto
   */
  updateContact: async (
    groupId: number,
    contactId: number,
    data: UpdateGroupContactDTO
  ): Promise<{ success: boolean; message: string; data: GroupContact }> => {
    return apiClient.put(`${API_URL}/groups/${groupId}/contacts/${contactId}`, data)
  },

  /**
   * Elimina un contacto
   */
  deleteContact: async (
    groupId: number,
    contactId: number
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`${API_URL}/groups/${groupId}/contacts/${contactId}`)
  },

  // ========== HISTORIAL ==========

  /**
   * Obtiene historial completo de un grupo
   */
  getHistory: async (
    groupId: number,
    limit?: number
  ): Promise<{ success: boolean; data: any[] }> => {
    const url = limit
      ? `${API_URL}/groups/${groupId}/history?limit=${limit}`
      : `${API_URL}/groups/${groupId}/history`
    return apiClient.get(url)
  },

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

// =============== NOTIFICATIONS API ===============

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
