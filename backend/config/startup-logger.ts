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
//
// Uso en index.ts:
//   import { logServerInfo } from './config/startup-logger.js'
//
//   app.listen(PORT, async () => {
//     logServerInfo(PORT)
//     CronService.start()
//   })
//
// ============================================

/**
 * Muestra informacion basica del servidor al iniciar
 * @param port - Puerto en el que corre el servidor
 */
export function logServerInfo(port: number): void {
  console.log(`🚀 Server running at http://localhost:${port}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
}
