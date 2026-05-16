// services/cron/cron-service.ts

import cron from 'node-cron'
import { NotificationGeneratorService } from '../notifications/notification-generator-service'
import { BackofficeRepository } from '../../repositories/backoffice/backoffice-repository.js'
import { dailyReset as checklistDailyReset } from '../checklist/checklist.service.js'

/**
 * Servicio de tareas programadas (Cron Jobs)
 *
 * Ejecuta tareas automáticas en intervalos definidos.
 * - Notificaciones: 1x al día a las 7:00 AM
 * - Batch Payment: Día 10 de cada mes a las 23:59 (facturas validated del mes anterior -> paid)
 */
export class CronService {
  private static isRunning = false
  // System user ID for automated actions
  private static readonly SYSTEM_USER_ID = 'system-cron'

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
    }, { timezone: 'Europe/Madrid' })

    // ═══════════════════════════════════════════════════════
    // BATCH PAYMENT - Día 10 de cada mes a las 23:59
    // ═══════════════════════════════════════════════════════
    // Marca todas las facturas 'validated' del mes anterior como 'paid'
    // '59 23 10 * *' = A las 23:59 del día 10 de cada mes

    cron.schedule('59 23 10 * *', async () => {
      console.log('💰 [CRON] Ejecutando batch payment de facturas...')
      const startTime = Date.now()

      try {
        const result = await this.runBatchPaymentNow()
        const duration = Date.now() - startTime
        
        if (result.success) {
          console.log(`✅ [CRON] Batch payment completado en ${duration}ms - ${result.count} facturas marcadas como pagadas`)
        } else {
          console.error(`❌ [CRON] Batch payment falló: ${result.error}`)
        }
      } catch (error) {
        console.error('❌ [CRON] Error en batch payment:', error)
      }
    }, { timezone: 'Europe/Madrid' })

    // ═══════════════════════════════════════════════════════
    // CHECKLIST RESET - Todos los días a las 06:30 (Europe/Madrid)
    // ═══════════════════════════════════════════════════════
    cron.schedule('30 6 * * *', async () => {
      console.log('📋 [CRON] Ejecutando reset diario de checklists...')
      try {
        const count = await checklistDailyReset()
        console.log(`✅ [CRON] Checklist reset completado — ${count} runs cerrados`)
      } catch (error) {
        console.error('❌ [CRON] Error en checklist reset:', error)
      }
    }, { timezone: 'Europe/Madrid' })

    console.log('✅ Cron jobs iniciados:')
    console.log('   - Notificaciones: Todos los días a las 7:00 AM')
    console.log('   - Batch Payment: Día 10 de cada mes a las 23:59')
    console.log('   - Checklist Reset: Todos los días a las 6:30 AM (Europe/Madrid)')
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
   * Ejecutar batch payment manualmente
   * Marca todas las facturas 'validated' del mes anterior como 'paid'
   * 
   * @param targetYear - Año objetivo (opcional, default: mes anterior)
   * @param targetMonth - Mes objetivo 1-12 (opcional, default: mes anterior)
   * @param userId - ID del usuario que ejecuta (opcional, default: system-cron)
   */
  static async runBatchPaymentNow(
    targetYear?: number,
    targetMonth?: number,
    userId?: string
  ): Promise<{
    success: boolean
    count?: number
    invoiceIds?: number[]
    year?: number
    month?: number
    error?: string
    duration?: number
  }> {
    const startTime = Date.now()

    // Calculate previous month if not specified
    const now = new Date()
    let year = targetYear
    let month = targetMonth

    if (!year || !month) {
      // Get previous month
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      year = previousMonth.getFullYear()
      month = previousMonth.getMonth() + 1 // getMonth() is 0-indexed
    }

    const executingUserId = userId || this.SYSTEM_USER_ID

    console.log(`💰 [BATCH PAYMENT] Processing validated invoices for ${month}/${year}...`)

    try {
      // First, get preview of what will be updated
      const preview = await BackofficeRepository.getValidatedInvoicesCountByMonth(year, month)
      
      if (preview.count === 0) {
        console.log(`ℹ️  [BATCH PAYMENT] No validated invoices found for ${month}/${year}`)
        return {
          success: true,
          count: 0,
          invoiceIds: [],
          year,
          month,
          duration: Date.now() - startTime,
        }
      }

      console.log(`💰 [BATCH PAYMENT] Found ${preview.count} validated invoices totaling €${preview.total_amount.toFixed(2)}`)

      // Execute batch update
      const result = await BackofficeRepository.markValidatedInvoicesAsPaid(year, month, executingUserId)
      const duration = Date.now() - startTime

      console.log(`✅ [BATCH PAYMENT] Marked ${result.count} invoices as paid in ${duration}ms`)

      return {
        success: true,
        count: result.count,
        invoiceIds: result.invoiceIds,
        year,
        month,
        duration,
      }
    } catch (error) {
      console.error('❌ [BATCH PAYMENT] Error:', error)

      return {
        success: false,
        year,
        month,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }
    }
  }

  /**
   * Preview batch payment without executing
   * Shows how many invoices would be marked as paid
   */
  static async previewBatchPayment(
    targetYear?: number,
    targetMonth?: number
  ): Promise<{
    year: number
    month: number
    count: number
    total_amount: number
  }> {
    const now = new Date()
    let year = targetYear
    let month = targetMonth

    if (!year || !month) {
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      year = previousMonth.getFullYear()
      month = previousMonth.getMonth() + 1
    }

    const preview = await BackofficeRepository.getValidatedInvoicesCountByMonth(year, month)

    return {
      year,
      month,
      count: preview.count,
      total_amount: preview.total_amount,
    }
  }

  /**
   * Estado del servicio
   */
  static getStatus(): { 
    isRunning: boolean
    nextNotificationRun: string
    nextBatchPaymentRun: string
  } {
    const now = new Date()
    
    // Next notification run (7:00 AM daily)
    const nextNotification = new Date()
    nextNotification.setHours(7, 0, 0, 0)
    if (now.getHours() >= 7) {
      nextNotification.setDate(nextNotification.getDate() + 1)
    }

    // Next batch payment run (23:59 on day 10)
    const nextBatchPayment = new Date()
    nextBatchPayment.setHours(23, 59, 0, 0)
    nextBatchPayment.setDate(10)
    
    // If we're past day 10 this month, next run is next month
    if (now.getDate() > 10 || (now.getDate() === 10 && now.getHours() >= 23 && now.getMinutes() >= 59)) {
      nextBatchPayment.setMonth(nextBatchPayment.getMonth() + 1)
    }

    return {
      isRunning: this.isRunning,
      nextNotificationRun: nextNotification.toISOString(),
      nextBatchPaymentRun: nextBatchPayment.toISOString(),
    }
  }
}
