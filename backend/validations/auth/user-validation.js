// validations/user-validation.js

import { z } from 'zod'

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

// ✔️ Validación completa para creación de usuario
export function validateUser(input) {
  return userSchema.safeParse(input)
}

// ❌ Formatea errores de validación en un objeto plano
export function getValidationErrors(result) {
  if (result.success) return null

  const errors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (!errors[field]) {
      errors[field] = issue.message
    }
  }

  return errors
}

// 🔍 Validaciones individuales por campo
export const Validation = {
  username: (value) =>
    z
      .string()
      .min(3, 'Username must be at least 3 characters long')
      .parse(value),

  password: (value) =>
    z
      .string()
      .min(6, 'Password must be at least 6 characters long')
      .parse(value),

  role: (value) => z.string().optional().parse(value),
}

/*
Ejemplo de uso:

const result = validateUser({
  username: 'bo',
  email: 'bademail',
  password: '123'
})

const errors = getValidationErrors(result)
console.log(errors)
// Resultado:
// {
//   username: 'Username must be at least 3 characters long',
//   email: 'Invalid email address',
//   password: 'Password must be at least 6 characters long'
// }
*/
