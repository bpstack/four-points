// src/validation/logbook-schemas.js
import { z } from 'zod'

// ════════════════════════════════════════════════════════════
// BASE SCHEMAS
// ════════════════════════════════════════════════════════════

const importanceLevelEnum = z.enum(['baja', 'media', 'alta', 'urgente'], {
  errorMap: () => ({
    message: 'Nivel de importancia inválido. Usa: baja, media, alta o urgente',
  }),
})

const departmentIdSchema = z.number().int().positive({
  message: 'El department_id debe ser un número entero positivo',
})

const messageSchema = z
  .string()
  .min(3, 'El mensaje debe tener al menos 3 caracteres')
  .max(5000, 'El mensaje no puede exceder 5000 caracteres')
  .trim()

const commentSchema = z
  .string()
  .min(3, 'El comentario debe tener al menos 3 caracteres')
  .max(5000, 'El comentario no puede exceder 5000 caracteres')
  .trim()

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Usa YYYY-MM-DD')
  .optional()

const authorIdSchema = z.string().uuid('El author_id debe ser un UUID válido')

// ════════════════════════════════════════════════════════════
// LOGBOOK SCHEMAS
// ════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════
// COMMENT SCHEMAS
// ════════════════════════════════════════════════════════════

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
