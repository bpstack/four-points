// modules/groups/index.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

// ═══════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════

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

export enum HistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  PAYMENT_UPDATED = 'payment_updated',
}

// ═══════════════════════════════════════════════════════
// DATABASE MODELS (representan las tablas)
// ═══════════════════════════════════════════════════════

export interface Group extends RowDataPacket {
  id: number
  name: string
  agency: string | null
  arrival_date: Date
  departure_date: Date
  status: GroupStatus
  total_amount: number | null
  currency: string
  notes: string | null
  created_by: string | null
  created_at: Date
  updated_by: string | null
  updated_at: Date
}

export interface GroupContact extends RowDataPacket {
  id: number
  group_id: number
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  is_primary: boolean
  created_at: Date
  updated_at: Date
}

export interface GroupRoom extends RowDataPacket {
  id: number
  group_id: number
  room_type: RoomType
  quantity: number
  guests_per_room: number
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface GroupStatusRecord extends RowDataPacket {
  id: number
  group_id: number
  booking_confirmed: boolean
  booking_confirmed_date: Date | null
  contract_signed: boolean
  contract_signed_date: Date | null
  rooming_status: RoomingStatus
  rooming_requested_date: Date | null
  rooming_received_date: Date | null
  rooming_deadline: Date | null
  balance_status: BalanceStatus
  balance_requested_date: Date | null
  balance_paid_date: Date | null
  created_at: Date
  updated_at: Date
}

export interface GroupPayment extends RowDataPacket {
  id: number
  group_id: number
  payment_name: string
  payment_order: number
  percentage: number | null
  amount: number
  amount_paid: number
  due_date: Date
  status: PaymentStatus
  status_updated_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface GroupHistory extends RowDataPacket {
  id: number
  group_id: number
  action: HistoryAction
  table_affected: string | null
  record_id: number | null
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: Date
  notes: string | null
}

// ═══════════════════════════════════════════════════════
// DTOs (Data Transfer Objects) - Para crear/actualizar
// ═══════════════════════════════════════════════════════

export interface CreateGroupDTO {
  name: string
  agency?: string
  arrival_date: Date | string
  departure_date: Date | string
  status?: GroupStatus
  total_amount?: number
  currency?: string
  notes?: string
  created_by: string
}

export interface UpdateGroupDTO {
  name?: string
  agency?: string
  arrival_date?: Date | string
  departure_date?: Date | string
  status?: GroupStatus
  total_amount?: number
  currency?: string
  notes?: string
  updated_by: string
}

export interface CreateGroupContactDTO {
  group_id: number
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
  group_id: number
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

export interface UpdateGroupStatusDTO {
  booking_confirmed?: boolean
  booking_confirmed_date?: Date | string
  contract_signed?: boolean
  contract_signed_date?: Date | string
  rooming_status?: RoomingStatus
  rooming_requested_date?: Date | string
  rooming_received_date?: Date | string
  rooming_deadline?: Date | string
  balance_status?: BalanceStatus
  balance_requested_date?: Date | string
  balance_paid_date?: Date | string
}

export interface UpdateBookingDTO {
  confirmed: boolean
  date?: Date | string
}

export interface UpdateContractDTO {
  signed: boolean
  date?: Date | string
}

export interface UpdateRoomingDTO {
  rooming_status?: RoomingStatus
  rooming_requested_date?: Date | string
  rooming_received_date?: Date | string
  rooming_deadline?: Date | string
}

export interface UpdateBalanceDTO {
  balance_status?: BalanceStatus
  balance_requested_date?: Date | string
  balance_paid_date?: Date | string
}

export interface CreateGroupPaymentDTO {
  group_id: number
  payment_name: string
  payment_order?: number
  percentage?: number
  amount: number
  amount_paid?: number
  due_date: Date | string
  status?: PaymentStatus
  notes?: string
}

export interface UpdateGroupPaymentDTO {
  payment_name?: string
  payment_order?: number
  percentage?: number
  amount?: number
  amount_paid?: number
  due_date?: Date | string
  status?: PaymentStatus
  notes?: string
}

export interface CreateGroupHistoryDTO {
  group_id: number
  action: HistoryAction
  table_affected?: string
  record_id?: number
  field_changed?: string
  old_value?: string
  new_value?: string
  changed_by: string
  notes?: string
}

// ═══════════════════════════════════════════════════════
// FILTERS - Para búsquedas y listados
// ═══════════════════════════════════════════════════════

export interface GroupFilters {
  status?: GroupStatus
  arrival_from?: Date | string
  arrival_to?: Date | string
  departure_from?: Date | string
  departure_to?: Date | string
  agency?: string
  sort?: string
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

// ═══════════════════════════════════════════════════════
// RESPONSE TYPES - Con datos relacionados
// ═══════════════════════════════════════════════════════

export interface GroupWithDetails extends Group {
  created_by_username?: string
  updated_by_username?: string
  booking_confirmed?: boolean
  booking_confirmed_date?: Date | null
  contract_signed?: boolean
  contract_signed_date?: Date | null
  rooming_status?: RoomingStatus
  rooming_requested_date?: Date | null
  rooming_received_date?: Date | null
  rooming_deadline?: Date | null
  balance_status?: BalanceStatus
  balance_requested_date?: Date | null
  balance_paid_date?: Date | null
}

export interface PaymentWithGroupInfo extends GroupPayment {
  group_name?: string
  group_total_amount?: number
  agency?: string
  days_until_due?: number
  days_overdue?: number
}

export interface HistoryWithUser extends GroupHistory {
  changed_by_username?: string
}

// ═══════════════════════════════════════════════════════
// DASHBOARD / STATISTICS
// ═══════════════════════════════════════════════════════

export interface DashboardOverview extends RowDataPacket {
  total_groups: number
  confirmed_groups: number
  active_groups: number
  pending_groups: number
  total_revenue: number | null
}

export interface GroupTimeline extends RowDataPacket {
  id: number
  name: string
  agency: string | null
  arrival_date: Date
  departure_date: Date
  status: GroupStatus
  total_amount: number | null
  month: string
}

export interface PaymentsSummary extends RowDataPacket {
  total_payments: number
  total_paid: number
  total_pending: number
  total_partial: number
  total_expected: number
}

export interface RoomsSummary extends RowDataPacket {
  total_rooms: number
  total_guests: number
}

// ═══════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════

export type DatabaseResult = ResultSetHeader

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ═══════════════════════════════════════════════════════
// REQUEST TYPES - Para controllers
// ═══════════════════════════════════════════════════════

export interface UpdateGroupStatusRequest {
  new_status: GroupStatus
  notes?: string
}

export interface UpdateBookingRequest {
  confirmed: boolean
  date?: Date | string
}

export interface UpdateContractRequest {
  signed: boolean
  date?: Date | string
}

export interface UpdateRoomingRequest {
  rooming_status?: RoomingStatus
  rooming_requested_date?: Date | string
  rooming_received_date?: Date | string
  rooming_deadline?: Date | string
}

export interface UpdateBalanceRequest {
  balance_status?: BalanceStatus
  balance_requested_date?: Date | string
  balance_paid_date?: Date | string
}
