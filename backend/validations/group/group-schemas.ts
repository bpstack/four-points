// validations/group/group-schemas.ts

import { z } from 'zod'
import { isCalendarDate } from '../common/calendar-date.js'
import {
  GroupStatus,
  RoomType,
  RoomingStatus,
  BalanceStatus,
  PaymentStatus,
} from '../../models/group/index.js'
import { ERROR_CODES } from '../../config/error-codes.js'

// YYYY-MM-DD, optionally with a time part (the status cards may send ISO strings)
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/, 'Fecha no válida')
  .refine((v) => isCalendarDate(v.slice(0, 10)), 'La fecha no existe')
const money = z.number().min(0, 'El importe no puede ser negativo').max(99_999_999)
const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)

// Only these columns may be used to sort; they are interpolated into ORDER BY
export const GROUP_SORT_FIELDS = [
  'arrival_date',
  'departure_date',
  'name',
  'agency',
  'status',
  'total_amount',
  'created_at',
  'updated_at',
] as const

export const groupListQuerySchema = z.object({
  status: z.enum(GroupStatus).optional(),
  arrival_from: dateString.optional(),
  arrival_to: dateString.optional(),
  departure_from: dateString.optional(),
  departure_to: dateString.optional(),
  agency: text(100).optional(),
  sort: z.enum(GROUP_SORT_FIELDS).optional(),
  order: z
    .enum(['ASC', 'DESC', 'asc', 'desc'])
    .transform((o) => o.toUpperCase() as 'ASC' | 'DESC')
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const groupFields = {
  name: text(100).min(1, 'El nombre del grupo es requerido'),
  agency: text(100).nullish(),
  arrival_date: dateString,
  departure_date: dateString,
  status: z.enum(GroupStatus),
  total_amount: money.nullish(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, 'Moneda no válida')
    .optional(),
  notes: text(2000).nullish(),
}

const departureNotBeforeArrival = (d: { arrival_date?: string; departure_date?: string }) =>
  !d.arrival_date ||
  !d.departure_date ||
  d.departure_date.slice(0, 10) >= d.arrival_date.slice(0, 10)
const departureMessage = {
  message: 'La fecha de salida no puede ser anterior a la de llegada',
  path: ['departure_date'],
}

export const createGroupSchema = z
  .object({ ...groupFields, status: groupFields.status.optional() })
  .refine(departureNotBeforeArrival, departureMessage)

export const updateGroupSchema = z
  .object(groupFields)
  .partial()
  .refine(departureNotBeforeArrival, departureMessage)

const paymentFields = {
  payment_name: text(100).min(1, 'El nombre del pago es requerido'),
  payment_order: z.number().int().min(1).max(99).optional(),
  percentage: z.number().min(0).max(100).nullish(),
  amount: money.nullish(),
  amount_paid: money.optional(),
  due_date: dateString,
  status: z.enum(PaymentStatus).optional(),
  notes: text(500).nullish(),
}

// Unknown keys are stripped, so an update can end up empty: 400, not a repository error
const hasFields = (d: object) => Object.keys(d).length > 0
const noFieldsError = { message: 'No hay campos para actualizar', path: ['body'] }

export const createPaymentSchema = z.object(paymentFields)
export const updatePaymentSchema = z
  .object(paymentFields)
  .partial()
  .refine(hasFields, noFieldsError)
export const paymentStatusSchema = z.object({ status: z.enum(PaymentStatus) })
export const amountPaidSchema = z.object({ amount_paid: money })

const contactFields = {
  contact_name: text(100),
  contact_email: z.union([z.literal(''), z.email('Email no válido').max(255)]).nullish(),
  contact_phone: text(20).nullish(),
  is_primary: z.boolean().optional(),
}

export const createContactSchema = z.object(contactFields)
export const updateContactSchema = z
  .object(contactFields)
  .partial()
  .refine(hasFields, noFieldsError)

const roomFields = {
  room_type: z.enum(RoomType),
  quantity: z.number().int().min(1).max(999),
  guests_per_room: z.number().int().min(1).max(10).optional(),
  notes: text(500).nullish(),
}

export const createRoomSchema = z.object(roomFields)
export const updateRoomSchema = z.object(roomFields).partial().refine(hasFields, noFieldsError)

export const bookingSchema = z.object({
  confirmed: z.boolean(),
  date: dateString.optional().or(z.literal('')),
})

export const contractSchema = z.object({
  signed: z.boolean(),
  date: dateString.optional().or(z.literal('')),
})

export const roomingSchema = z.object({
  rooming_status: z.enum(RoomingStatus).optional(),
  rooming_requested_date: dateString.nullish().or(z.literal('')),
  rooming_received_date: dateString.nullish().or(z.literal('')),
  rooming_deadline: dateString.nullish().or(z.literal('')),
})

export const balanceSchema = z.object({
  balance_status: z.enum(BalanceStatus).optional(),
  balance_requested_date: dateString.nullish(),
  balance_paid_date: dateString.nullish(),
})

export const groupHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export const upcomingPaymentsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
})

export const timelineQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})

/** 400 body: first message per field, same shape as the auth validators. */
export function validationError(error: z.ZodError) {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : 'body'
    if (!errors[key]) errors[key] = issue.message
  }
  return { success: false, error: ERROR_CODES.INVALID_DATA, code: ERROR_CODES.INVALID_DATA, errors }
}
