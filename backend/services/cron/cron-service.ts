// services/cron/cron-service.ts

import cron from 'node-cron'
import { NotificationGeneratorService } from '../notifications/notification-generator-service'

/**
 * Servicio de tareas programadas (Cron Jobs)
 *
 * Ejecuta tareas automáticas en intervalos definidos.
 * Actualmente: Generación de notificaciones 1x al día a las 7:00 AM
 */
export class CronService {
  private static isRunning = false

  /**
   * Iniciar todos los cron jobs
   */
  static start(): void {
    if (this.isRunning) {
      console.log('⚠️  Cron jobs ya están corriendo')
      return
    }

    this.isRunning = true
    console.log('🕐 Iniciando cron jobs...')

    // ═══════════════════════════════════════════════════════
    // NOTIFICACIONES AUTOMÁTICAS - Todos los días a las 7:00 AM
    // ═══════════════════════════════════════════════════════
    // Formato cron: minuto hora día-mes mes día-semana
    // '0 7 * * *' = A las 7:00 AM todos los días

    cron.schedule('0 7 * * *', async () => {
      console.log('🔔 [CRON] Ejecutando verificación de notificaciones...')
      const startTime = Date.now()

      try {
        await NotificationGeneratorService.processPendingNotifications()
        const duration = Date.now() - startTime
        console.log(`✅ [CRON] Notificaciones procesadas en ${duration}ms`)
      } catch (error) {
        console.error('❌ [CRON] Error procesando notificaciones:', error)
      }
    })

    console.log('✅ Cron jobs iniciados:')
    console.log('   - Notificaciones: Todos los días a las 7:00 AM')
  }

  /**
   * Ejecutar manualmente la verificación de notificaciones
   * Útil para testing o trigger manual desde endpoint
   */
  static async runNotificationsNow(): Promise<{
    success: boolean
    results?: any
    error?: string
    duration?: number
  }> {
    console.log('🔔 [MANUAL] Ejecutando verificación de notificaciones...')
    const startTime = Date.now()

    try {
      const results = await NotificationGeneratorService.processPendingNotifications()
      const duration = Date.now() - startTime

      console.log(`✅ [MANUAL] Notificaciones procesadas en ${duration}ms`)

      return {
        success: true,
        results,
        duration,
      }
    } catch (error) {
      console.error('❌ [MANUAL] Error procesando notificaciones:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }
    }
  }

  /**
   * Estado del servicio
   */
  static getStatus(): { isRunning: boolean; nextRun: string } {
    const now = new Date()
    const next = new Date()
    next.setHours(7, 0, 0, 0)

    // Si ya pasó las 7:00 AM hoy, el próximo es mañana
    if (now.getHours() >= 7) {
      next.setDate(next.getDate() + 1)
    }

    return {
      isRunning: this.isRunning,
      nextRun: next.toISOString(),
    }
  }
}
