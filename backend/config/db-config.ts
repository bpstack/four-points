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
    port: parseInt(process.env.AIVEN_DB_PORT || ''),
    user: process.env.AIVEN_DB_USER || '',
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
export const environment = process.env.DB_ENVIRONMENT || 'local'
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

if (environment === 'aiven' && (!config.user || !Number.isInteger(config.port))) {
  throw new Error('❌ Faltan AIVEN_DB_USER o AIVEN_DB_PORT en .env')
}

export const dbConfig = config
