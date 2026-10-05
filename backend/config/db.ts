// config/db.ts

import mysql from 'mysql2/promise'
import type { Pool } from 'mysql2/promise' // ← AÑADIDO
import { logger } from './logger.js'
import { dbConfig as config, environment } from './db-config.js'

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

// For one-off connections with other options (services/demo: multipleStatements)
export { dbConfig } from './db-config.js'

export default pool
