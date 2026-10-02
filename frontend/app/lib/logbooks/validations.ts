// app/lib/logbooks/validation.ts
import { z } from 'zod'

// ════════════════════════════════════════════════════════════
// BASE SCHEMAS
// ════════════════════════════════════════════════════════════

export const importanceLevelEnum = z.enum(['baja', 'media', 'alta', 'urgente'], {
  errorMap: () => ({ message: 'Nivel de importancia inválido' }),
})

export const departmentIdSchema = z.number().int().positive({
  message: 'Selecciona un departamento válido',
})

export const messageSchema = z
  .string()
  .min(3, 'El mensaje debe tener al menos 3 caracteres')
  .max(5000, 'El mensaje no puede exceder 5000 caracteres')
  .trim()

export const commentTextSchema = z
  .string()
  .min(3, 'El comentario debe tener al menos 3 caracteres')
  .max(5000, 'El comentario no puede exceder 5000 caracteres')
  .trim()

// ════════════════════════════════════════════════════════════
// LOGBOOK SCHEMAS
// ════════════════════════════════════════════════════════════

export const updateLogbookSchema = z
  .object({
    message: messageSchema.optional(),
    importance_level: importanceLevelEnum.optional(),
    department_id: departmentIdSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

// ════════════════════════════════════════════════════════════
// COMMENT SCHEMAS
// ════════════════════════════════════════════════════════════

export const updateCommentSchema = z
  .object({
    comment: commentTextSchema.optional(),
    department_id: departmentIdSchema.optional(),
    importance_level: importanceLevelEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

export type ImportanceLevel = z.infer<typeof importanceLevelEnum>
