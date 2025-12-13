// validations/parking/vehicle-validation.ts

import { z } from 'zod'

/**
 * Normaliza espacios Y guiones: convierte múltiples en uno solo
 */
const normalizeSpacesAndDashes = (str: string): string => {
  return str
    .replace(/\s+/g, ' ') // Múltiples espacios → 1 espacio
    .replace(/-+/g, '-') // Múltiples guiones → 1 guión
    .trim() // Quitar espacios al inicio/final
    .replace(/^-+|-+$/g, '') // Quitar guiones al inicio/final
}

/**
 * Validación para matrícula de vehículo
 * - Formato universal (todos los países)
 * - 3-12 caracteres
 * - Letras, números, espacios y guiones
 * - Se convierte automáticamente a mayúsculas
 */
const plateNumberSchema = z
  .string()
  .min(1, 'La matrícula es requerida')
  .transform((val) => normalizeSpacesAndDashes(val).toUpperCase())
  .pipe(
    z
      .string()
      .min(3, 'La matrícula debe tener al menos 3 caracteres')
      .max(12, 'La matrícula no puede superar 12 caracteres')
      .regex(
        /^[A-Z0-9\s\-]+$/,
        'La matrícula solo puede contener letras, números, espacios y guiones'
      )
  )

/**
 * Validación para nombre del propietario
 * - 3-35 caracteres
 * - Letras (con acentos), números, espacios, guiones y apóstrofes
 * - Permite nombres compuestos y de diferentes idiomas
 */
const ownerNameSchema = z
  .string()
  .min(1, 'El nombre del propietario es requerido')
  .transform((val) => normalizeSpacesAndDashes(val))
  .pipe(
    z
      .string()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(35, 'El nombre no puede superar 35 caracteres')
      .regex(
        /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'\-]+$/,
        'El nombre solo puede contener letras, números, espacios, guiones y apóstrofes'
      )
  )

/**
 * Validación para modelo del vehículo
 * OPCIONAL - permite vacío o undefined
 */
const modelSchema = z
  .string()
  .transform((val) => {
    if (!val || val.trim() === '') return undefined
    return normalizeSpacesAndDashes(val)
  })
  .optional()
  .refine(
    (val) => !val || (val.length >= 3 && val.length <= 35),
    'El modelo debe tener entre 3 y 35 caracteres'
  )
  .refine(
    (val) => !val || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.\-]+$/.test(val),
    'El modelo solo puede contener letras, números, espacios, puntos y guiones'
  )

/**
 * Schema completo para registro de vehículo
 */
export const registerVehicleSchema = z.object({
  plate_number: plateNumberSchema,
  owner_name: ownerNameSchema,
  model: modelSchema,
})

/**
 * Schema para actualización de vehículo (todos los campos opcionales)
 */
export const updateVehicleSchema = z.object({
  plate_number: plateNumberSchema.optional(),
  owner_name: ownerNameSchema.optional(),
  model: modelSchema.optional(),
})

/**
 * Schema para búsqueda por matrícula
 */
export const searchByPlateSchema = z.object({
  plate_number: plateNumberSchema,
})

/**
 * Schema para búsqueda por propietario
 */
export const searchByOwnerSchema = z.object({
  owner_name: ownerNameSchema,
})

// Type exports
export type RegisterVehicleInput = z.infer<typeof registerVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
export type SearchByPlateInput = z.infer<typeof searchByPlateSchema>
export type SearchByOwnerInput = z.infer<typeof searchByOwnerSchema>
