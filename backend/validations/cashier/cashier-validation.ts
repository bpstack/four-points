// validations/cashier/cashier-validation.ts

import { z } from 'zod'
import { ERROR_CODES } from '../../config/error-codes.js'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida (AAAA-MM-DD)')
const money = z.number().min(0, 'El importe no puede ser negativo').max(10_000_000)
const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)
const limit = (max: number) => z.coerce.number().int().min(1).max(max)
const offset = z.coerce.number().int().min(0)
const order = z
  .enum(['ASC', 'DESC', 'asc', 'desc'])
  .transform((o) => o.toUpperCase() as 'ASC' | 'DESC')

const shiftType = z.enum(['night', 'morning', 'afternoon', 'closing'])
const shiftStatus = z.enum(['open', 'in_progress', 'closed', 'audited'])
const voucherStatus = z.enum(['pending', 'justified', 'cancelled'])
const historyAction = z.enum([
  'created',
  'updated',
  'deleted',
  'status_changed',
  'adjustment',
  'voucher_created',
  'voucher_repaid',
  'daily_closed',
  'daily_reopened',
])

const VALID_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]

// Only these columns may be used to sort; they are interpolated into ORDER BY
export const SORT_FIELDS = {
  daily: ['date', 'status', 'grand_total', 'created_at', 'updated_at'],
  shifts: ['shift_date', 'id', 'created_at'],
  vouchers: ['created_at', 'amount', 'id'],
  history: ['changed_at', 'id'],
} as const

/** Returns the field when it is allow-listed, otherwise the default. */
export function safeSort(
  field: string | undefined,
  allowed: readonly string[],
  fallback: string
): string {
  return field && allowed.includes(field) ? field : fallback
}

export function safeOrder(value: string | undefined, fallback: 'ASC' | 'DESC'): 'ASC' | 'DESC' {
  const v = value?.toUpperCase()
  return v === 'ASC' || v === 'DESC' ? v : fallback
}

// ═══════════════════════════════════════════════════════
// ROUTE PARAMS
// ═══════════════════════════════════════════════════════

export const dateParam = date
export const idParam = z.coerce.number().int().min(1)
export const yearParam = z.coerce.number().int().min(2000).max(2100)
export const monthParam = z.coerce.number().int().min(1).max(12)

// ═══════════════════════════════════════════════════════
// BODIES
// ═══════════════════════════════════════════════════════

export const initializeDaySchema = z.object({
  primary_user_id: z.uuid('Responsable no válido'),
  secondary_user_ids: z.array(z.uuid('Responsable no válido')).max(10).optional(),
})

export const closeDaySchema = z.object({ notes: text(2000).optional() })

export const reopenSchema = z.object({ reason: text(1000).optional() })

export const updateShiftSchema = z
  .object({
    income: money.optional(),
    income_breakdown: z
      .object({
        alojamiento: money.optional(),
        restaurante: money.optional(),
        bar: money.optional(),
        otros: money.optional(),
      })
      .optional(),
    comments: text(2000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'No hay campos para actualizar',
    path: ['body'],
  })

export const shiftUsersSchema = z.object({
  primary_user_id: z.uuid('Responsable no válido'),
  secondary_user_ids: z.array(z.uuid('Responsable no válido')).max(10).optional(),
})

const denomination = z.object({
  denomination: z.number().refine((v) => VALID_DENOMINATIONS.includes(v), {
    message: 'Denominación no válida',
  }),
  quantity: z.number().int('La cantidad debe ser entera').min(0).max(100_000),
})

export const denominationSchema = denomination
export const replaceDenominationsSchema = z.object({
  denominations: z.array(denomination).max(VALID_DENOMINATIONS.length),
})
export const denominationQuantitySchema = z.object({
  quantity: denomination.shape.quantity,
})

const payment = z.object({
  payment_method_id: z.number().int().min(1),
  amount: money,
})

export const paymentSchema = payment
export const replacePaymentsSchema = z.object({ payments: z.array(payment).max(50) })
export const paymentAmountSchema = z.object({ amount: money })

export const createVoucherSchema = z.object({
  amount: money.min(0.01, 'El importe debe ser mayor que 0'),
  reason: text(1000).min(1, 'El motivo es obligatorio'),
  notes: text(2000).optional(),
})

export const updateVoucherSchema = z
  .object({
    amount: money.min(0.01, 'El importe debe ser mayor que 0').optional(),
    reason: text(1000).min(1).optional(),
    notes: text(2000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'No hay campos para actualizar',
    path: ['body'],
  })

export const justifyVoucherSchema = z.object({ shift_id: z.number().int().min(1) })

// ═══════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════

export const dailyListQuerySchema = z.object({
  from_date: date.optional(),
  to_date: date.optional(),
  status: z.enum(['open', 'closed']).optional(),
  sort: z.enum(SORT_FIELDS.daily).optional(),
  order: order.optional(),
  limit: limit(500).optional(),
  offset: offset.optional(),
})

export const shiftListQuerySchema = z.object({
  shift_date: date.optional(),
  from_date: date.optional(),
  to_date: date.optional(),
  shift_type: shiftType.optional(),
  status: shiftStatus.optional(),
  opened_by: z.uuid().optional(),
  closed_by: z.uuid().optional(),
  sort: z.enum(SORT_FIELDS.shifts).optional(),
  order: order.optional(),
  limit: limit(500).optional(),
  offset: offset.optional(),
})

export const voucherListQuerySchema = z.object({
  status: voucherStatus.optional(),
  created_by: z.uuid().optional(),
  from_date: date.optional(),
  to_date: date.optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  shift_id: z.coerce.number().int().min(1).optional(),
  sort: z.enum(SORT_FIELDS.vouchers).optional(),
  order: order.optional(),
  limit: limit(500).optional(),
  offset: offset.optional(),
})

export const historyListQuerySchema = z.object({
  shift_id: z.coerce.number().int().min(1).optional(),
  action: historyAction.optional(),
  table_affected: text(100).optional(),
  changed_by: z.uuid().optional(),
  from_date: date.optional(),
  to_date: date.optional(),
  limit: limit(500).optional(),
  offset: offset.optional(),
  sort: z.enum(SORT_FIELDS.history).optional(),
  order: order.optional(),
})

export const dateRangeQuerySchema = z.object({
  from_date: date.optional(),
  to_date: date.optional(),
})

export const requiredDateRangeQuerySchema = z.object({
  from_date: date,
  to_date: date,
})

export const vouchersHistoryQuerySchema = z.object({
  status: z.union([voucherStatus, z.literal('all')]).optional(),
  from_date: date.optional(),
  to_date: date.optional(),
  limit: limit(500).optional(),
})

export const recentHistoryQuerySchema = z.object({ limit: limit(500).optional() })

/** 400 body: first message per field. */
export function validationError(error: z.ZodError) {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : 'body'
    if (!errors[key]) errors[key] = issue.message
  }
  return { success: false, error: ERROR_CODES.INVALID_DATA, code: ERROR_CODES.INVALID_DATA, errors }
}
