// src/validations/blacklist/schemas.ts
/**
 * Esquemas de validación Zod para el módulo Blacklist
 * Compatible con Zod 4.x
 */

import { z } from 'zod'

// ========================================
// ENUMS (reutilizables)
// ========================================

export const documentTypeEnum = z.enum(['DNI', 'PASSPORT', 'NIE', 'OTHER'])

export const severityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export const statusEnum = z.enum(['ACTIVE', 'DELETED'])

export const statusFilterEnum = z.enum(['ACTIVE', 'DELETED', 'ALL'])

// ========================================
// SCHEMA: CREAR ENTRADA
// ========================================

export const createBlacklistSchema = z
  .object({
    guest_name: z
      .string({ message: 'El nombre es obligatorio' })
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(255, 'El nombre no puede exceder 255 caracteres')
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras y espacios')
      .trim(),

    document_type: documentTypeEnum,

    document_number: z
      .string({ message: 'El número de documento es obligatorio' })
      .min(5, 'El documento debe tener al menos 5 caracteres')
      .max(20, 'El documento no puede exceder 20 caracteres')
      .regex(/^[A-Z0-9-]+$/i, 'El documento solo puede contener letras, números y guiones')
      .trim()
      .transform((val) => val.toUpperCase()),

    check_in_date: z
      .string({ message: 'La fecha de entrada es obligatoria' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine((date) => !isNaN(Date.parse(date)), 'Fecha de entrada inválida'),

    check_out_date: z
      .string({ message: 'La fecha de salida es obligatoria' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine((date) => !isNaN(Date.parse(date)), 'Fecha de salida inválida'),

    reason: z
      .string({ message: 'El motivo es obligatorio' })
      .min(10, 'El motivo debe tener al menos 10 caracteres')
      .max(1000, 'El motivo no puede exceder 1000 caracteres')
      .trim(),

    severity: severityEnum,

    comments: z
      .string({ message: 'Los comentarios son obligatorios' })
      .min(10, 'Los comentarios deben tener al menos 10 caracteres')
      .max(2000, 'Los comentarios no pueden exceder 2000 caracteres')
      .trim(),

    images: z
      .array(z.string().url('Cada imagen debe ser una URL válida'))
      .max(5, 'No puedes incluir más de 5 imágenes')
      .optional()
      .default([]),
  })
  .refine((data) => new Date(data.check_out_date) > new Date(data.check_in_date), {
    message: 'La fecha de salida debe ser posterior a la fecha de entrada',
    path: ['check_out_date'],
  })

// ========================================
// SCHEMA: ACTUALIZAR ENTRADA
// ========================================

export const updateBlacklistSchema = z
  .object({
    guest_name: z
      .string()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(255, 'El nombre no puede exceder 255 caracteres')
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras y espacios')
      .trim()
      .optional(),

    document_type: documentTypeEnum.optional(),

    document_number: z
      .string()
      .min(5, 'El documento debe tener al menos 5 caracteres')
      .max(20, 'El documento no puede exceder 20 caracteres')
      .regex(/^[A-Z0-9-]+$/i, 'El documento solo puede contener letras, números y guiones')
      .trim()
      .transform((val) => val.toUpperCase())
      .optional(),

    check_in_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine((date) => !isNaN(Date.parse(date)), 'Fecha de entrada inválida')
      .optional(),

    check_out_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine((date) => !isNaN(Date.parse(date)), 'Fecha de salida inválida')
      .optional(),

    reason: z
      .string()
      .min(10, 'El motivo debe tener al menos 10 caracteres')
      .max(1000, 'El motivo no puede exceder 1000 caracteres')
      .trim()
      .optional(),

    severity: severityEnum.optional(),

    comments: z
      .string()
      .min(10, 'Los comentarios deben tener al menos 10 caracteres')
      .max(2000, 'Los comentarios no pueden exceder 2000 caracteres')
      .trim()
      .optional(),

    images: z
      .array(z.string().url('Cada imagen debe ser una URL válida'))
      .max(5, 'No puedes incluir más de 5 imágenes')
      .optional(),
  })
  .refine(
    (data) => {
      // Solo validar si ambas fechas están presentes
      if (data.check_in_date && data.check_out_date) {
        return new Date(data.check_out_date) > new Date(data.check_in_date)
      }
      return true
    },
    {
      message: 'La fecha de salida debe ser posterior a la fecha de entrada',
      path: ['check_out_date'],
    }
  )

// ========================================
// SCHEMA: FILTROS DE BÚSQUEDA (query params)
// ========================================

export const blacklistFiltersSchema = z.object({
  q: z.string().max(255).optional(),
  document: z.string().max(20).optional(),
  severity: severityEnum.optional(),
  status: statusFilterEnum.optional(),
  created_by: z.string().uuid('created_by debe ser un UUID válido').optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from_date debe tener formato YYYY-MM-DD')
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date debe tener formato YYYY-MM-DD')
    .optional(),
  page: z.coerce.number().int('page debe ser entero').positive('page debe ser positivo').default(1),
  limit: z.coerce
    .number()
    .int('limit debe ser entero')
    .positive('limit debe ser positivo')
    .max(100, 'limit no puede exceder 100')
    .default(50),
})

// ========================================
// SCHEMA: PARÁMETRO ID
// ========================================

export const idParamSchema = z.object({
  id: z.coerce
    .number({ message: 'El ID es obligatorio y debe ser un número' })
    .int('El ID debe ser un número entero')
    .positive('El ID debe ser positivo'),
})

// ========================================
// TIPOS INFERIDOS
// ========================================

export type CreateBlacklistInput = z.infer<typeof createBlacklistSchema>
export type UpdateBlacklistInput = z.infer<typeof updateBlacklistSchema>
export type BlacklistFiltersInput = z.infer<typeof blacklistFiltersSchema>
export type IdParamInput = z.infer<typeof idParamSchema>
