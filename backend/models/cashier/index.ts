// models/cashier/index.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'

// ═══════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════

export enum ShiftType {
  NIGHT = 'night',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  CLOSING = 'closing',
}

export enum ShiftStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
  AUDITED = 'audited',
}

export enum DailyStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

// ✅ CORREGIDO: Ahora es type en lugar de enum
export type HistoryAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'adjustment'
  | 'voucher_created'
  | 'voucher_repaid'
  | 'daily_closed'
  | 'daily_reopened'

// ═══════════════════════════════════════════════════════
// DATABASE MODELS (representan las tablas)
// ═══════════════════════════════════════════════════════

export interface CashierVoucher extends RowDataPacket {
  id: number
  amount: number
  reason: string
  type: 'income' | 'expense'
  status: 'pending' | 'justified' | 'cancelled'
  notes: string | null
  is_repaid: boolean
  repaid_at: Date | null
  repaid_by: string | null
  justified_at: Date | null
  cancelled_at: Date | null
  created_at: Date
  created_by: string | null
}

export interface CashierShift extends RowDataPacket {
  id: number
  shift_date: string
  shift_type: ShiftType
  status: ShiftStatus
  opened_by: string | null
  initial_fund: number
  income: number
  income_breakdown: {
    alojamiento?: number
    restaurante?: number
    bar?: number
    otros?: number
  } | null
  cash_counted: number
  cash_expected: number
  difference: number
  payments_total: number
  grand_total: number
  comments: string | null
  created_at: Date
  updated_at: Date
  closed_at: Date | null
  closed_by_id: string | null
}

export interface CashierDaily extends RowDataPacket {
  id: number
  date: string
  total_cash: number
  total_card: number
  total_bacs: number
  total_web_payment: number
  total_transfer: number
  total_other: number
  grand_total: number
  status: DailyStatus
  closed_by: string | null
  closed_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface CashierDenomination extends RowDataPacket {
  id: number
  shift_id: number
  denomination: number
  quantity: number
  total: number
}

export interface CashierPayment extends RowDataPacket {
  id: number
  shift_id: number
  payment_method_id: number
  amount: number
}

export interface CashierHistory extends RowDataPacket {
  id: number
  shift_id: number
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

export interface CreateShiftDTO {
  shift_date: string
  shift_type: ShiftType
  opened_by: string
  primary_user_id: string
  secondary_user_ids?: string[]
  income?: number
  income_breakdown?: {
    alojamiento?: number
    restaurante?: number
    bar?: number
    otros?: number
  }
  initial_fund?: number
  comments?: string
}

export interface UpdateShiftDTO {
  income?: number
  income_breakdown?: {
    alojamiento?: number
    restaurante?: number
    bar?: number
    otros?: number
  }
  comments?: string
}

export interface CloseDailyDTO {
  notes?: string
}

export interface CreateVoucherDTO {
  amount: number
  reason: string
  created_by: string
  notes?: string
}

export interface UpdateVoucherDTO {
  amount?: number
  reason?: string
  notes?: string
}

export interface CreateDenominationDTO {
  denomination: number
  quantity: number
}

export interface CreatePaymentDTO {
  shift_id: number
  payment_method_id: number
  amount: number
}

export interface CreateHistoryDTO {
  shift_id: number
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

export interface ShiftFilters {
  shift_date?: string
  from_date?: string
  to_date?: string
  shift_type?: ShiftType
  status?: ShiftStatus
  opened_by?: string
  closed_by?: string
  sort?: 'shift_date' | 'id' | 'created_at'
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

export interface VoucherFilters {
  status?: 'pending' | 'justified' | 'cancelled'
  created_by?: string
  from_date?: string
  to_date?: string
  min_amount?: number
  max_amount?: number
  shift_id?: number
  sort?: 'created_at' | 'amount' | 'id'
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

export interface DailyFilters {
  from_date?: string
  to_date?: string
  status?: DailyStatus
  sort?: string
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

// ✅ CORREGIDO: changed_by en lugar de user_id
export interface HistoryFilters {
  shift_id?: number
  action?: HistoryAction
  table_affected?: string
  changed_by?: string
  from_date?: string
  to_date?: string
  sort?: 'changed_at' | 'id'
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

// ═══════════════════════════════════════════════════════
// RESPONSE TYPES - Con datos relacionados
// ═══════════════════════════════════════════════════════

export interface CashierShiftWithUsers extends CashierShift {
  users?: {
    user_id: string
    username: string
    is_primary: boolean
  }[]
  opened_by_username?: string
  closed_by_username?: string
  denominations?: CashierDenomination[]
  payments?: CashierPaymentWithMethod[]
  vouchers?: CashierVoucherWithUser[]
  active_vouchers_total?: number
}

export interface CashierDailyDetail extends CashierDaily {
  shifts: CashierShiftWithUsers[]
  active_vouchers: CashierVoucherWithUser[]
  active_vouchers_total: number
  all_shifts_closed: boolean
  can_close: boolean
  validation_errors: string[]
  closed_by_username?: string
}

export interface CashierPaymentWithMethod extends CashierPayment {
  payment_method_name?: string
}

export interface CashierVoucherWithUser extends CashierVoucher {
  created_by_username?: string
  repaid_by_username?: string
  shift_date?: string
  shift_type?: ShiftType
}

// ✅ AÑADIR ESTE TIPO
export interface HistoryWithDetails extends CashierHistory {
  shift_date?: string
  shift_type?: string
  username?: string | null
  shift_status?: string
}

// ═══════════════════════════════════════════════════════
// DASHBOARD / STATISTICS
// ═══════════════════════════════════════════════════════

export interface DashboardOverview extends RowDataPacket {
  total_shifts: number
  open_shifts: number
  closed_shifts: number
  total_cash_today: number
  total_payments_today: number
  grand_total_today: number
  active_vouchers_count: number
  active_vouchers_total: number
}

export interface MonthlyCashierSummary {
  period: {
    year: number
    month: number
    start: string
    end: string
    total_days: number
    days_closed: number
    days_open: number
  }
  totals: {
    total_cash: number
    total_card: number
    total_bacs: number
    total_web_payment: number
    total_transfer: number
    total_other: number
    grand_total: number
  }
  payment_methods_breakdown: {
    method_name: string
    total_amount: number
    percentage: number
  }[]
  daily_breakdown: {
    date: string
    status: DailyStatus
    total_cash: number
    grand_total: number
    has_discrepancy: boolean
  }[]
  validation_errors: string[]
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
