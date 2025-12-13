// validations/auth/user-validation.ts

import { z } from 'zod'
import type { ValidationErrors } from '../../models/auth/index.js'

// Esquema de validación para un nuevo usuario
const userSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
      invalid_type_error: 'Username must be a string',
    })
    .min(3, 'Username must be at least 3 characters long'),
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email('Invalid email address'),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(6, 'Password must be at least 6 characters long'),
  role: z.string().optional(),
})

export type UserInput = z.infer<typeof userSchema>
export type UserValidationResult = z.SafeParseReturnType<UserInput, UserInput>

// ✔️ Validación completa para creación de usuario
export function validateUser(input: unknown): UserValidationResult {
  return userSchema.safeParse(input)
}

// ❌ Formatea errores de validación en un objeto plano
export function getValidationErrors(result: UserValidationResult): ValidationErrors | null {
  if (result.success) return null

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
    z
      .string()
      .min(3, 'Username must be at least 3 characters long')
      .parse(value),

  password: (value: unknown): string =>
    z
      .string()
      .min(6, 'Password must be at least 6 characters long')
      .parse(value),

  role: (value: unknown): string | undefined => 
    z.string().optional().parse(value),
}
