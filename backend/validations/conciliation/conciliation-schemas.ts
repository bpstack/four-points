// validations/conciliation/conciliation-schemas.ts

import { z } from 'zod'
import { ERROR_CODES } from '../../config/error-codes.js'
import { calendarDateSchema } from '../common/calendar-date.js'

// Same lists as ReceptionReason and HousekeepingReason in models/conciliation.model.ts
export const RECEPTION_REASONS = [
  'base_rooms',
  'no_show',
  'room_change',
  'gratuity',
  'other',
] as const
export const HOUSEKEEPING_REASONS = [
  'cleaned',
  'do_not_disturb',
  'ooo_cleaned',
  'pending_cleaned',
  'pending_to_clean',
  'room_clean',
  'other',
] as const

// Room counts: the column is INT and the direction (add or subtract) comes
// from the reason, so a value is never negative
const valueSchema = z.number().int().min(0).max(9999)
const roomNumberSchema = z.string().max(255).optional()
const notesSchema = z.string().max(5000).optional()

function entrySchema<R extends readonly [string, ...string[]]>(reasons: R) {
  return z.object({
    reason: z.enum(reasons),
    value: valueSchema,
    room_number: roomNumberSchema,
    notes: notesSchema,
  })
}

// Every reason exactly once: the repository updates by reason, so a missing,
// repeated or unknown one used to be skipped without any error
function oneOfEach<R extends readonly string[]>(reasons: R) {
  return (entries: { reason: string }[]) =>
    entries.length === reasons.length &&
    new Set(entries.map((e) => e.reason)).size === reasons.length
}

export const createConciliationSchema = z.object({
  date: calendarDateSchema,
  notes: z.string().max(16000).nullish(),
  department_id: z.number().int().min(1).nullish(),
})

export const updateFormSchema = z.object({
  reception: z.array(entrySchema(RECEPTION_REASONS)).refine(oneOfEach(RECEPTION_REASONS), {
    message: `Se esperan las ${RECEPTION_REASONS.length} líneas de recepción, una por motivo`,
  }),
  housekeeping: z.array(entrySchema(HOUSEKEEPING_REASONS)).refine(oneOfEach(HOUSEKEEPING_REASONS), {
    message: `Se esperan las ${HOUSEKEEPING_REASONS.length} líneas de pisos, una por motivo`,
  }),
  // The form stores its general notes as a JSON string; TEXT holds 65,535
  // bytes, so 16,000 characters fit even at 4 bytes each
  notes: z.string().max(16000).optional(),
})

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'closed']),
})

export const CONCILIATION_PARAM_RULES = [
  ['id', z.coerce.number().int().min(1), ERROR_CODES.INVALID_ID],
  ['date', calendarDateSchema, ERROR_CODES.INVALID_DATE_FORMAT],
] as const
