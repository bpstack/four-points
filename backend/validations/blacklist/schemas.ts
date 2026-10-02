// src/validations/blacklist/schemas.ts
/**
 * Esquemas de validación Zod para el módulo Blacklist
 * Compatible con Zod 4.x
 */

import { z } from 'zod'
// Date.parse accepts 2026-02-31 (as 3 March), which MySQL then rejects
import { isCalendarDate } from '../common/calendar-date.js'
import { isOwnCloudinaryFileIn, CLOUDINARY_FOLDERS } from '../../services/uploads/cloudinary-url.js'

// Only images uploaded through POST /api/blacklist/upload: any other URL
// (an external site, another module's file) would be shown as a guest photo
const blacklistImageUrl = z
  .string()
  .url('Cada imagen debe ser una URL válida')
  .refine(
    (url) => isOwnCloudinaryFileIn(url, CLOUDINARY_FOLDERS.blacklist),
    'Cada imagen debe haberse subido desde la lista negra'
  )

// ========================================
// ENUMS (reutilizables)
// ========================================

export const documentTypeEnum = z.enum(['DNI', 'PASSPORT', 'NIE', 'OTHER'])

export const severityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export const statusFilterEnum = z.enum(['ACTIVE', 'DELETED', 'ALL'])

// ========================================
// SCHEMA: CREAR ENTRADA
// ========================================

export const createBlacklistSchema = z
  .object({
    guest_name: z
      .string({ message: 'El nombre es obligatorio' })
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(255, 'El nombre no puede exceder 255 caracteres')
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras y espacios'),

    document_type: documentTypeEnum,

    document_number: z
      .string({ message: 'El número de documento es obligatorio' })
      .trim()
      .min(5, 'El documento debe tener al menos 5 caracteres')
      .max(20, 'El documento no puede exceder 20 caracteres')
      .regex(/^[A-Z0-9-]+$/i, 'El documento solo puede contener letras, números y guiones')
      .transform((val) => val.toUpperCase()),

    check_in_date: z
      .string({ message: 'La fecha de entrada es obligatoria' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine(isCalendarDate, 'Fecha de entrada inválida'),

    check_out_date: z
      .string({ message: 'La fecha de salida es obligatoria' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine(isCalendarDate, 'Fecha de salida inválida'),

    reason: z
      .string({ message: 'El motivo es obligatorio' })
      .trim()
      .min(10, 'El motivo debe tener al menos 10 caracteres')
      .max(1000, 'El motivo no puede exceder 1000 caracteres'),

    severity: severityEnum,

    comments: z
      .string({ message: 'Los comentarios son obligatorios' })
      .trim()
      .min(10, 'Los comentarios deben tener al menos 10 caracteres')
      .max(2000, 'Los comentarios no pueden exceder 2000 caracteres'),

    images: z
      .array(blacklistImageUrl)
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
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(255, 'El nombre no puede exceder 255 caracteres')
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras y espacios')
      .optional(),

    document_type: documentTypeEnum.optional(),

    document_number: z
      .string()
      .trim()
      .min(5, 'El documento debe tener al menos 5 caracteres')
      .max(20, 'El documento no puede exceder 20 caracteres')
      .regex(/^[A-Z0-9-]+$/i, 'El documento solo puede contener letras, números y guiones')
      .transform((val) => val.toUpperCase())
      .optional(),

    check_in_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine(isCalendarDate, 'Fecha de entrada inválida')
      .optional(),

    check_out_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
      .refine(isCalendarDate, 'Fecha de salida inválida')
      .optional(),

    reason: z
      .string()
      .trim()
      .min(10, 'El motivo debe tener al menos 10 caracteres')
      .max(1000, 'El motivo no puede exceder 1000 caracteres')
      .optional(),

    severity: severityEnum.optional(),

    comments: z
      .string()
      .trim()
      .min(10, 'Los comentarios deben tener al menos 10 caracteres')
      .max(2000, 'Los comentarios no pueden exceder 2000 caracteres')
      .optional(),

    images: z.array(blacklistImageUrl).max(5, 'No puedes incluir más de 5 imágenes').optional(),
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
    .refine(isCalendarDate, 'La fecha no existe')
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to_date debe tener formato YYYY-MM-DD')
    .refine(isCalendarDate, 'La fecha no existe')
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

export type IdParamInput = z.infer<typeof idParamSchema>
