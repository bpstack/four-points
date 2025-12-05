// app/api/groups/route.ts
// ✅ USA apiClient con auto-refresh automático

import apiClient from '@/app/lib/apiClient'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api'

// =============== TIPOS ===============

export enum GroupStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RoomType {
  SINGLE = 'single',
  DOUBLE_BED = 'double_bed',
  TWIN_BEDS = 'twin_beds',
}

export enum RoomingStatus {
  PENDING = 'pending',
  REQUESTED = 'requested',
  RECEIVED = 'received',
}

export enum BalanceStatus {
  PENDING = 'pending',
  REQUESTED = 'requested',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export enum PaymentStatus {
  PENDING = 'pending',
  REQUESTED = 'requested',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export interface Group {
  id: number
  name: string
  agency: string | null
  arrival_date: string
  departure_date: string
  status: GroupStatus
  total_amount: number | null
  currency: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
}

export interface GroupWithDetails extends Group {
  created_by_username?: string
  updated_by_username?: string
  booking_confirmed?: boolean
  booking_confirmed_date?: string | null
  contract_signed?: boolean
  contract_signed_date?: string | null
  rooming_status?: RoomingStatus
  rooming_requested_date?: string | null
  rooming_received_date?: string | null
  rooming_deadline?: string | null
  balance_status?: BalanceStatus
  balance_requested_date?: string | null
  balance_paid_date?: string | null
}

export interface GroupPayment {
  id: number
  group_id: number
  payment_name: string
  payment_order: number
  percentage: number | null
  amount: number
  amount_paid: number
  due_date: string
  status: PaymentStatus
  status_updated_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PaymentWithGroupInfo extends GroupPayment {
  group_name?: string
  group_total_amount?: number
  agency?: string
  days_until_due?: number
  days_overdue?: number
}

export interface GroupContact {
  id: number
  group_id: number
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface GroupRoom {
  id: number
  group_id: number
  room_type: RoomType
  quantity: number
  guests_per_room: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface GroupStatusRecord {
  id: number
  group_id: number
  booking_confirmed: boolean
  booking_confirmed_date: string | null
  contract_signed: boolean
  contract_signed_date: string | null
  rooming_status: RoomingStatus
  rooming_requested_date: string | null
  rooming_received_date: string | null
  rooming_deadline: string | null
  balance_status: BalanceStatus
  balance_requested_date: string | null
  balance_paid_date: string | null
  created_at: string
  updated_at: string
}

// ========== HISTORY ==========

export enum HistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  PAYMENT_UPDATED = 'payment_updated',
}

export interface GroupHistoryRecord {
  id: number
  group_id: number
  action: HistoryAction
  table_affected: string | null
  record_id: number | null
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: string
  notes: string | null
  // Joined fields
  changed_by_username?: string
}

export interface PaymentBalance {
  total_amount: number
  total_paid: number
  remaining: number
  percentage_paid: number
}

export interface DashboardOverview {
  total_groups: number
  confirmed_groups: number
  active_groups: number
  pending_groups: number
  total_revenue: number | null
}

export interface GroupTimeline {
  id: number
  name: string
  agency: string | null
  arrival_date: string
  departure_date: string
  status: GroupStatus
  total_amount: number | null
  month: string
}

// DTOs
export interface CreateGroupDTO {
  name: string
  agency?: string
  arrival_date: string
  departure_date: string
  status?: GroupStatus
  total_amount?: number
  currency?: string
  notes?: string
}

export interface UpdateGroupDTO {
  name?: string
  agency?: string
  arrival_date?: string
  departure_date?: string
  status?: GroupStatus
  total_amount?: number
  currency?: string
  notes?: string
}

export interface CreateGroupPaymentDTO {
  payment_name: string
  payment_order?: number
  percentage?: number
  amount?: number
  amount_paid?: number
  due_date: string
  status?: PaymentStatus
  notes?: string
}

export interface UpdateGroupPaymentDTO {
  payment_name?: string
  payment_order?: number
  percentage?: number
  amount?: number
  amount_paid?: number
  due_date?: string
  status?: PaymentStatus
  notes?: string
}

export interface UpdateGroupStatusDTO {
  booking_confirmed?: boolean
  booking_confirmed_date?: string
  contract_signed?: boolean
  contract_signed_date?: string
  rooming_status?: RoomingStatus
  rooming_requested_date?: string
  rooming_received_date?: string
  rooming_deadline?: string
  balance_status?: BalanceStatus
  balance_requested_date?: string
  balance_paid_date?: string
}

export interface UpdateBookingDTO {
  confirmed: boolean
  date?: string
}

export interface UpdateContractDTO {
  signed: boolean
  date?: string
}

export interface UpdateRoomingDTO {
  rooming_status?: RoomingStatus
  rooming_requested_date?: string
  rooming_received_date?: string
  rooming_deadline?: string
}

export interface UpdateBalanceDTO {
  balance_status?: BalanceStatus
  balance_requested_date?: string
  balance_paid_date?: string
}

export interface CreateGroupContactDTO {
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  is_primary?: boolean
}

export interface UpdateGroupContactDTO {
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  is_primary?: boolean
}

export interface CreateGroupRoomDTO {
  room_type: RoomType
  quantity: number
  guests_per_room?: number
  notes?: string
}

export interface UpdateGroupRoomDTO {
  room_type?: RoomType
  quantity?: number
  guests_per_room?: number
  notes?: string
}

// Filters
export interface GroupFilters {
  status?: GroupStatus
  arrival_from?: string
  arrival_to?: string
  departure_from?: string
  departure_to?: string
  agency?: string
  sort?: string
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

// =============== FUNCIONES DE API ===============

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
}
