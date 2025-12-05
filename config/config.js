// src/config/config.js
// Cargar variables de entorno desde .env si estás usando dotenv
import dotenv from 'dotenv'
dotenv.config()

// Verificación crítica: asegúrate de tener la clave secreta JWT
if (!process.env.SECRET_JWT_KEY) {
  throw new Error('Falta la variable SECRET_JWT_KEY en el entorno')
}

export const { PORT = 3000, SECRET_JWT_KEY } = process.env

export const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10)

/* PARKING invoces*/

// // src/config.js
// export const STORAGE = {
//   // Valores por defecto → desarrollo local
//   TYPE: process.env.STORAGE_TYPE || 'local', // 'local' | 's3'
//   BUCKET: process.env.AWS_BUCKET || 'parking-invoices', // solo S3
//   LOCAL_PATH: process.env.LOCAL_PDF_PATH || 'uploads/invoices', // carpeta dentro del proyecto
// }
