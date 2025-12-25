// config/startup-logger.ts
// ============================================
// STARTUP LOGGING UTILITIES
// ============================================
//
// Este modulo centraliza los logs de inicio del servidor.
// Mantiene el index.ts limpio y facilita el mantenimiento.
//
// Funciones disponibles:
// - logServerInfo(): Muestra info basica del servidor (puerto, env)
// - logAIStatus(): Muestra estado de integracion AI (providers, config)
//
// Uso en index.ts:
//   import { logServerInfo, logAIStatus } from './config/startup-logger.js'
//
//   app.listen(PORT, async () => {
//     logServerInfo(PORT)
//     await logAIStatus()
//     CronService.start()
//   })
//
// ============================================

import db from './db.js'
import type { RowDataPacket } from 'mysql2'

interface ConfigRow extends RowDataPacket {
  config_value: string
}

/**
 * Muestra informacion basica del servidor al iniciar
 * @param port - Puerto en el que corre el servidor
 */
export function logServerInfo(port: number): void {
  console.log(`🚀 Server running at http://localhost:${port}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
}

/**
 * Muestra el estado de la integracion de AI
 * - Lee el proveedor activo desde la BD (scheduling_config)
 * - Detecta las API keys disponibles en el entorno
 * - Muestra un resumen de proveedores configurados
 *
 * Proveedores soportados:
 * - Claude (Anthropic) - Requiere CLAUDE_API_KEY
 * - Gemini (Google) - Requiere GEMINI_API_KEY
 * - Ollama (Local) - No requiere key, usa OLLAMA_BASE_URL
 */
export async function logAIStatus(): Promise<void> {
  const aiEnabled =
    process.env.AI_ENABLED?.toLowerCase() === 'true' || process.env.AI_ENABLED === '1'

  // Obtener proveedor activo desde la BD
  let activeProvider = 'none'
  try {
    const [rows] = await db.query<ConfigRow[]>(
      "SELECT config_value FROM scheduling_config WHERE config_key = 'ai_provider'"
    )
    activeProvider = rows[0]?.config_value || 'none'
  } catch {
    // BD no lista o tabla no existe - normal en primer inicio
    activeProvider = 'unknown'
  }

  // Detectar providers disponibles por sus API keys
  const claudeKey = process.env.CLAUDE_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama2:latest'

  // Modelos por defecto
  const claudeModel = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514'
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  // Log del estado
  console.log(`🤖 AI Integration: ${aiEnabled ? '✅ enabled' : '❌ disabled'}`)
  console.log(`   ⚡ Active: ${activeProvider.toUpperCase()}`)
  console.log(`   📦 Claude: ${claudeKey ? '✅ ' + claudeModel : '❌ no key'}`)
  console.log(`   📦 Gemini: ${geminiKey ? '✅ ' + geminiModel : '❌ no key'}`)
  console.log(`   📦 Ollama: ✅ ${ollamaModel} @ ${ollamaUrl}`)
}
