// config/db-config.ts
// Connection settings only, without opening anything: scripts that create the
// database (scripts/setup-local.ts) read them before it exists. config/db.ts
// opens the pool with them.

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

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
  ssl?: object
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
  remote: {
    host: process.env.REMOTE_DB_HOST || '',
    port: parseInt(process.env.REMOTE_DB_PORT || ''),
    user: process.env.REMOTE_DB_USER || '',
    password: process.env.REMOTE_DB_PASSWORD,
    database: process.env.REMOTE_DB_NAME || 'hotel_db',
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
export const environment = process.env.DB_ENVIRONMENT || 'local'
const config = Object.hasOwn(presets, environment) ? presets[environment] : undefined

// Validar que el entorno existe
if (!config) {
  throw new Error(`❌ Entorno no válido: ${environment}`)
}

// Validar credenciales críticas
if (!config.password) {
  throw new Error(
    `❌ Falta ${environment === 'local' ? 'LOCAL_DB_PASSWORD' : 'REMOTE_DB_PASSWORD'} en .env`
  )
}

if (environment === 'remote' && !config.host) {
  throw new Error('❌ Falta REMOTE_DB_HOST en .env')
}

if (environment === 'remote' && (!config.user || !Number.isInteger(config.port))) {
  throw new Error('❌ Faltan REMOTE_DB_USER o REMOTE_DB_PORT en .env')
}

// mysql2 reads and writes DATETIME and DATE in UTC, whatever the machine's zone
// (ADR-047); config/db.ts sets the MySQL session to UTC too
export const dbConfig = { ...config, timezone: 'Z' }
