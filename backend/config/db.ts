// config/db.ts

import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise' // ← AÑADIDO
import { logger } from './logger.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Cargar variables de entorno
dotenv.config()

// Para usar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Detectar entorno
const isDevelopment = process.env.NODE_ENV === 'development'

// ========================================
// 🔧 INTERFAZ DE CONFIGURACIÓN
// ========================================
interface DBConfig {
  // ← AÑADIDO
  host: string
  port: number
  user: string
  password: string | undefined
  database: string
  ssl?: any
}

// ========================================
// 🎯 PRESETS DE CONFIGURACIÓN
// ========================================
const presets: Record<string, DBConfig> = {
  // ← MODIFICADO (añadido tipo)
  local: {
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '3306'), // ← MODIFICADO (añadido fallback)
    user: process.env.LOCAL_DB_USER || 'root',
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME || 'hotel_db',
  },
  aiven: {
    host: process.env.AIVEN_DB_HOST || '', // ← MODIFICADO (añadido fallback)
    port: parseInt(process.env.AIVEN_DB_PORT || '23225'), // ← MODIFICADO (añadido fallback)
    user: process.env.AIVEN_DB_USER || 'avnadmin',
    password: process.env.AIVEN_PASSWORD,
    database: process.env.AIVEN_DB_NAME || 'hotel_db',
    ssl: isDevelopment
      ? { rejectUnauthorized: false }
      : {
          ca: fs.readFileSync(path.join(__dirname, 'certs', 'ca-certificate.pem')),
          rejectUnauthorized: true,
        },
  },
}

// ========================================
// 🔍 VALIDACIÓN Y SELECCIÓN DE ENTORNO
// ========================================
const environment = process.env.DB_ENVIRONMENT || 'local'
const config = presets[environment]

// Validar que el entorno existe
if (!config) {
  throw new Error(`❌ Entorno no válido: ${environment}`)
}

// Validar credenciales críticas
if (!config.password) {
  throw new Error(
    `❌ Falta ${environment === 'local' ? 'LOCAL_DB_PASSWORD' : 'AIVEN_PASSWORD'} en .env`
  )
}

if (environment === 'aiven' && !config.host) {
  throw new Error('❌ Falta AIVEN_DB_HOST en .env')
}

// ========================================
// 📊 LOG DE CONFIGURACIÓN (sin passwords)
// ========================================
logger.info(
  {
    environment: environment.toUpperCase(),
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: config.ssl ? 'Enabled' : 'Disabled',
  },
  'MySQL configuration'
)

// ========================================
// 🔌 POOL DE CONEXIONES
// ========================================
const pool: Pool = mysql.createPool(config) // ← MODIFICADO (añadido tipo)

// Verify connection at startup with retries (Aiven can timeout on cold start)
async function connectWithRetry(retries = 3, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await pool.getConnection()
      logger.info('Conexión MySQL exitosa')
      connection.release()
      return
    } catch (err) {
      logger.error({ err, attempt, retries }, 'Error de conexión MySQL')
      if (attempt === retries) process.exit(1)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

connectWithRetry()

export default pool
