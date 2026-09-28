// validations/auth/user-validation.ts

import { z } from 'zod'
import type { ValidationErrors } from '../../models/auth/index.js'

// Esquema de validación para un nuevo usuario
const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.string().optional(),
})

// Esquema para actualizar perfil (username)
const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(50, 'El nombre de usuario no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'El nombre de usuario solo puede contener letras, números y guiones bajos'),
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
})

// Esquema para que un admin edite un usuario
const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
      .max(50, 'El nombre de usuario no puede exceder 50 caracteres')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'El nombre de usuario solo puede contener letras, números, _, . y -')
      .optional(),
    email: z.string().trim().email('Email no válido').max(255).optional(),
    role: z.string().trim().min(1).max(50).optional(),
  })
  .refine((d) => d.username !== undefined || d.email !== undefined || d.role !== undefined, {
    message: 'No hay campos para actualizar',
  })

// Esquema para actualizar contraseña
const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña no puede exceder 100 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contraseña debe ser diferente a la actual',
  path: ['newPassword'],
})

export type UserInput = z.infer<typeof userSchema>
export type UserValidationResult = ReturnType<typeof userSchema.safeParse>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateProfileValidationResult = ReturnType<typeof updateProfileSchema.safeParse>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type UpdatePasswordValidationResult = ReturnType<typeof updatePasswordSchema.safeParse>

// ✔️ Validación completa para creación de usuario
export function validateUser(input: unknown): UserValidationResult {
  return userSchema.safeParse(input)
}

// ✔️ Validación para actualizar perfil
export function validateUpdateProfile(input: unknown): UpdateProfileValidationResult {
  return updateProfileSchema.safeParse(input)
}

export function validateUpdateUser(input: unknown) {
  return updateUserSchema.safeParse(input)
}

// ✔️ Validación para actualizar contraseña
export function validateUpdatePassword(input: unknown): UpdatePasswordValidationResult {
  return updatePasswordSchema.safeParse(input)
}

// ❌ Formatea errores de validación en un objeto plano
export function getValidationErrors(result: { success: boolean; error?: z.ZodError }): ValidationErrors | null {
  if (result.success) return null
  if (!result.error) return null

  const errors: ValidationErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !errors[field]) {
      errors[field] = issue.message
    }
  }

  return errors
}

// 🔍 Validaciones individuales por campo
export const Validation = {
  username: (value: unknown): string =>
    z.string().min(3, 'Username must be at least 3 characters long').parse(value),

  password: (value: unknown): string =>
    z.string().min(6, 'Password must be at least 6 characters long').parse(value),

  role: (value: unknown): string | undefined => z.string().optional().parse(value),
}
