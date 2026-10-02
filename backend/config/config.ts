// config/config.ts
import dotenv from 'dotenv'

dotenv.config()

// Verificación crítica: asegúrate de tener la clave secreta JWT
if (!process.env.SECRET_JWT_KEY) {
  throw new Error('Falta la variable SECRET_JWT_KEY en el entorno')
}

if (process.env.SECRET_JWT_KEY.length < 32) {
  throw new Error('SECRET_JWT_KEY debe tener al menos 32 caracteres')
}

// Exportaciones tipadas
export const PORT: number = parseInt(process.env.PORT || '3000', 10)
export const SECRET_JWT_KEY: string = process.env.SECRET_JWT_KEY
export const SALT_ROUNDS: number = Number(process.env.SALT_ROUNDS || '10')

if (!Number.isInteger(SALT_ROUNDS) || SALT_ROUNDS < 10 || SALT_ROUNDS > 15) {
  throw new Error('SALT_ROUNDS debe ser un entero entre 10 y 15')
}
