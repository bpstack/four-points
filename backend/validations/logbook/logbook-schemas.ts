// validations/logbook/logbook-schemas.ts

import { z } from 'zod'
import { ERROR_CODES } from '../../config/error-codes.js'

// ============================================
// BASE SCHEMAS
// ============================================

const importanceLevelEnum = z.enum(['baja', 'media', 'alta', 'urgente'])

const departmentIdSchema = z.number().int().positive({
  message: 'El department_id debe ser un número entero positivo',
})

// trim() first: checks run in order, so a later trim() let "     " pass min(3)
// and be stored as an empty message
const messageSchema = z
  .string()
  .trim()
  .min(3, 'El mensaje debe tener al menos 3 caracteres')
  .max(5000, 'El mensaje no puede exceder 5000 caracteres')

const commentSchema = z
  .string()
  .trim()
  .min(3, 'El comentario debe tener al menos 3 caracteres')
  .max(5000, 'El comentario no puede exceder 5000 caracteres')

// The format alone lets 2026-02-31 through, and MySQL then fails with a 500
function isCalendarDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Usa YYYY-MM-DD')
  .refine(isCalendarDate, 'La fecha no existe')

const dateSchema = calendarDateSchema.optional()

const authorIdSchema = z.string().uuid('El author_id debe ser un UUID válido')

// ============================================
// LOGBOOK SCHEMAS
// ============================================

export const createLogbookSchema = z.object({
  message: messageSchema,
  importance_level: importanceLevelEnum,
  department_id: departmentIdSchema,
  author_id: authorIdSchema,
  date: dateSchema,
})

export const updateLogbookSchema = createLogbookSchema
  .pick({
    message: true,
    importance_level: true,
    department_id: true,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

// ============================================
// COMMENT SCHEMAS
// ============================================

export const createCommentSchema = z.object({
  comment: commentSchema,
  department_id: departmentIdSchema.optional(),
  importance_level: importanceLevelEnum.optional(),
})

export const updateCommentSchema = createCommentSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

// ============================================
// ROUTE PARAMS AND QUERY
// ============================================

export const logbookIdParam = z.coerce.number().int().min(1)
export const departmentIdParam = z.coerce.number().int().min(1)
export const authorIdParam = authorIdSchema
export const dayParam = calendarDateSchema

// Every :param used by routes/logbook/logbook-routes.ts
export const LOGBOOK_PARAM_RULES = [
  ['id', logbookIdParam, ERROR_CODES.INVALID_ID],
  ['logbookId', logbookIdParam, ERROR_CODES.INVALID_ID],
  ['commentId', logbookIdParam, ERROR_CODES.INVALID_ID],
  ['departmentId', departmentIdParam, ERROR_CODES.INVALID_ID],
  ['authorId', authorIdParam, ERROR_CODES.INVALID_ID],
  ['day', dayParam, ERROR_CODES.INVALID_DATE_FORMAT],
] as const

// The repository caps limit at 500; a negative offset reached MySQL as is
export const logbookListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  date_from: calendarDateSchema.optional(),
  date_to: calendarDateSchema.optional(),
  importance_level: importanceLevelEnum.optional(),
  include_trashed: z.enum(['true', 'false']).optional(),
})

// ============================================
// INFERRED TYPES
// ============================================

export type CreateLogbookInput = z.infer<typeof createLogbookSchema>
export type UpdateLogbookInput = z.infer<typeof updateLogbookSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>
export type LogbookListQuery = z.infer<typeof logbookListQuerySchema>
