// backend/validations/maintenance/schemas.ts
/**
 * Esquemas de validación Zod para el módulo de Maintenance
 * Compatible con Zod 4.x
 */

import { z } from 'zod'

// ========================================
// ENUMS (reutilizables)
// ========================================

export const locationTypeEnum = z.enum(['room', 'common_area', 'exterior', 'facilities', 'other'])

export const reportStatusEnum = z.enum([
  'reported',
  'assigned',
  'in_progress',
  'waiting',
  'completed',
  'closed',
  'canceled',
])

export const reportPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])

export const assignedTypeEnum = z.enum(['internal', 'external'])

export const historyActionEnum = z.enum([
  'created',
  'status_changed',
  'priority_changed',
  'updated',
  'assigned',
  'resolved',
  'closed',
  'deleted',
  'restored',
])

// ========================================
// SCHEMA: CREAR REPORTE
// ========================================

export const createReportSchema = z
  .object({
    title: z
      .string({ message: 'El título es obligatorio' })
      .min(3, 'El título debe tener al menos 3 caracteres')
      .max(150, 'El título no puede exceder 150 caracteres')
      .trim(),

    description: z
      .string({ message: 'La descripción es obligatoria' })
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .trim(),

    location_type: locationTypeEnum,

    location_description: z
      .string({ message: 'La descripción de ubicación es obligatoria' })
      .min(3, 'La descripción de ubicación debe tener al menos 3 caracteres')
      .max(200, 'La descripción de ubicación no puede exceder 200 caracteres')
      .trim(),

    room_number: z
      .string()
      .max(10, 'El número de habitación no puede exceder 10 caracteres')
      .trim()
      .optional()
      .nullable(),

    room_out_of_service: z.boolean().optional().default(false),

    priority: reportPriorityEnum.optional().default('medium'),

    assigned_to: z
      .string()
      .uuid('assigned_to debe ser un UUID válido')
      .optional()
      .nullable(),

    assigned_type: assignedTypeEnum.optional().nullable(),

    external_company_name: z
      .string()
      .max(150, 'El nombre de empresa no puede exceder 150 caracteres')
      .trim()
      .optional()
      .nullable(),

    external_contact: z
      .string()
      .max(100, 'El contacto no puede exceder 100 caracteres')
      .trim()
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Si location_type es 'room', room_number es obligatorio
      if (data.location_type === 'room' && !data.room_number) {
        return false
      }
      return true
    },
    {
      message: 'El número de habitación es obligatorio para ubicación tipo "room"',
      path: ['room_number'],
    }
  )
  .refine(
    (data) => {
      // Si assigned_type es 'external', external_company_name es obligatorio
      if (data.assigned_type === 'external' && !data.external_company_name) {
        return false
      }
      return true
    },
    {
      message: 'El nombre de empresa es obligatorio para asignación externa',
      path: ['external_company_name'],
    }
  )

// ========================================
// SCHEMA: ACTUALIZAR REPORTE
// ========================================

export const updateReportSchema = z
  .object({
    title: z
      .string()
      .min(3, 'El título debe tener al menos 3 caracteres')
      .max(150, 'El título no puede exceder 150 caracteres')
      .trim()
      .optional(),

    description: z
      .string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .trim()
      .optional(),

    location_type: locationTypeEnum.optional(),

    location_description: z
      .string()
      .min(3, 'La descripción de ubicación debe tener al menos 3 caracteres')
      .max(200, 'La descripción de ubicación no puede exceder 200 caracteres')
      .trim()
      .optional(),

    room_number: z
      .string()
      .max(10, 'El número de habitación no puede exceder 10 caracteres')
      .trim()
      .optional()
      .nullable(),

    room_out_of_service: z.boolean().optional(),

    priority: reportPriorityEnum.optional(),

    status: reportStatusEnum.optional(),

    assigned_to: z
      .string()
      .uuid('assigned_to debe ser un UUID válido')
      .optional()
      .nullable(),

    assigned_type: assignedTypeEnum.optional().nullable(),

    external_company_name: z
      .string()
      .max(150, 'El nombre de empresa no puede exceder 150 caracteres')
      .trim()
      .optional()
      .nullable(),

    external_contact: z
      .string()
      .max(100, 'El contacto no puede exceder 100 caracteres')
      .trim()
      .optional()
      .nullable(),

    resolution_notes: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      // Si location_type es 'room' y se está actualizando, room_number debe estar presente
      if (data.location_type === 'room' && data.room_number === null) {
        return false
      }
      return true
    },
    {
      message: 'El número de habitación es obligatorio para ubicación tipo "room"',
      path: ['room_number'],
    }
  )

// ========================================
// SCHEMA: ACTUALIZAR ESTADO
// ========================================

export const updateStatusSchema = z.object({
  status: reportStatusEnum,
  notes: z.string().trim().optional(),
})

// ========================================
// SCHEMA: ACTUALIZAR PRIORIDAD
// ========================================

export const updatePrioritySchema = z.object({
  priority: reportPriorityEnum,
})

// ========================================
// SCHEMA: AGREGAR NOTAS DE RESOLUCIÓN
// ========================================

export const addResolutionNotesSchema = z.object({
  notes: z
    .string({ message: 'Las notas son obligatorias' })
    .min(5, 'Las notas deben tener al menos 5 caracteres')
    .trim(),
})

// ========================================
// SCHEMA: FILTROS DE BÚSQUEDA
// ========================================

export const reportFiltersSchema = z.object({
  status: reportStatusEnum.optional(),
  priority: reportPriorityEnum.optional(),
  location_type: locationTypeEnum.optional(),
  assigned_to: z.string().uuid('assigned_to debe ser un UUID válido').optional(),
  created_by: z.string().uuid('created_by debe ser un UUID válido').optional(),
  room_number: z.string().max(10).optional(),
  search: z.string().max(255).optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_from debe tener formato YYYY-MM-DD')
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_to debe tener formato YYYY-MM-DD')
    .optional(),
  include_deleted: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// ========================================
// SCHEMA: PARÁMETRO ID
// Formato: DDMMYY-XXX (ej: 120625-001)
// ========================================

export const idParamSchema = z.object({
  id: z
    .string({ message: 'El ID es obligatorio' })
    .regex(
      /^\d{6}-\d{3}$/,
      'El ID debe tener formato DDMMYY-XXX (ej: 120625-001)'
    ),
})

// ========================================
// SCHEMA: AGREGAR IMAGEN
// ========================================

export const addImageSchema = z.object({
  file_name: z.string().max(255),
  file_path: z.string().url('file_path debe ser una URL válida'),
  file_size: z.number().int().positive().max(5 * 1024 * 1024, 'El archivo no puede exceder 5MB'),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  public_id: z.string().optional(),
  auto_delete_on_close: z.boolean().optional().default(true),
})

// ========================================
// SCHEMA: ASIGNAR REPORTE
// ========================================

export const assignReportSchema = z
  .object({
    assigned_type: assignedTypeEnum,
    assigned_to: z
      .string()
      .uuid('assigned_to debe ser un UUID válido')
      .optional()
      .nullable(),
    external_company_name: z
      .string()
      .max(150)
      .trim()
      .optional()
      .nullable(),
    external_contact: z
      .string()
      .max(100)
      .trim()
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.assigned_type === 'internal' && !data.assigned_to) {
        return false
      }
      return true
    },
    {
      message: 'assigned_to es obligatorio para asignación interna',
      path: ['assigned_to'],
    }
  )
  .refine(
    (data) => {
      if (data.assigned_type === 'external' && !data.external_company_name) {
        return false
      }
      return true
    },
    {
      message: 'external_company_name es obligatorio para asignación externa',
      path: ['external_company_name'],
    }
  )

// ========================================
// TIPOS INFERIDOS
// ========================================

export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateReportInput = z.infer<typeof updateReportSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>
export type AddResolutionNotesInput = z.infer<typeof addResolutionNotesSchema>
export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>
export type IdParamInput = z.infer<typeof idParamSchema>
export type AddImageInput = z.infer<typeof addImageSchema>
export type AssignReportInput = z.infer<typeof assignReportSchema>
