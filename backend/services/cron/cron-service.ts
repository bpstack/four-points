// services/cron/cron-service.ts

import cron from 'node-cron'
import { NotificationGeneratorService } from '../notifications/notification-generator-service'
import { BackofficeRepository } from '../../repositories/backoffice/backoffice-repository.js'
import {
  dailyReset as checklistDailyReset,
  purgeOldEventLogs,
} from '../checklist/checklist.service.js'
import { logger } from '../../config/logger.js'
import { extendAvailability } from '../../repositories/parking/parking.repository.js'
import { claimRun, finishRun } from '../../repositories/cron/cron-job-runs-repository.js'
import {
  CRON_EXPRESSIONS,
  CRON_JOBS,
  batchPaymentTarget,
  duePeriod,
  type CronJob,
} from './cron-schedule.js'

/**
 * Servicio de tareas programadas (Cron Jobs)
 *
 * Ejecuta tareas automáticas en intervalos definidos (horas en cron-schedule.ts).
 * - Notificaciones: 1x al día a las 7:00 AM
 * - Batch Payment: Día 10 de cada mes a las 23:59 (facturas validated del mes anterior -> paid)
 */
export class CronService {
  private static isRunning = false
  // Inactive user of 20261014_cron_catch_up.sql: updated_by and changed_by are foreign keys
  private static readonly SYSTEM_USER_ID = 'system-cron'

  /**
   * Iniciar todos los cron jobs
   *
   * Render free duerme el backend y node-cron pierde sus horas: al arrancar se
   * ejecutan las tareas que tocaban y no se hicieron (catchUp), y cada hora de
   * node-cron pasa por runIfDue, que no repite un periodo ya hecho.
   */
  static start(): void {
    if (this.isRunning) {
      logger.info('Cron jobs ya están corriendo')
      return
    }

    this.isRunning = true
    logger.info('Iniciando cron jobs')

    for (const job of CRON_JOBS) {
      cron.schedule(CRON_EXPRESSIONS[job], () => void this.runIfDue(job), {
        timezone: 'Europe/Madrid',
      })
    }
    void this.catchUp()

    // ═══════════════════════════════════════════════════════
    // PARKING CALENDAR - Al arrancar y todos los días a las 03:00 (Europe/Madrid)
    // ═══════════════════════════════════════════════════════
    // Mantiene parking_availability cubriendo los próximos 365 días.
    // Al arrancar también, porque Render free duerme y puede saltarse el cron.
    void this.runParkingCalendarNow()
    cron.schedule('0 3 * * *', () => void this.runParkingCalendarNow(), {
      timezone: 'Europe/Madrid',
    })

    logger.info('Cron jobs iniciados (Europe/Madrid; al arrancar se ponen al día)')
    logger.info('   - Notificaciones: Todos los días a las 7:00 AM')
    logger.info('   - Batch Payment: Día 10 de cada mes a las 23:59')
    logger.info('   - Checklist Reset: Todos los días a las 6:30 AM')
    logger.info('   - Checklist Event Log Purge: Cada lunes a las 4:00 AM')
    logger.info('   - Parking Calendar: Al arrancar y todos los días a las 3:00 AM')
  }

  /**
   * Ejecuta las tareas cuyo periodo actual toca y no se ha hecho, una tras otra
   */
  static async catchUp(now: Date = new Date()): Promise<void> {
    for (const job of CRON_JOBS) {
      await this.runIfDue(job, now)
    }
  }

  /**
   * Ejecuta `job` si su periodo actual ya toca y nadie lo ha hecho. Nunca lanza:
   * un fallo queda en cron_job_runs y se reintenta en el siguiente arranque.
   */
  static async runIfDue(
    job: CronJob,
    now: Date = new Date()
  ): Promise<'not-due' | 'done' | 'ok' | 'error'> {
    const period = duePeriod(job, now)
    if (!period) return 'not-due'

    try {
      if (!(await claimRun(job, period))) return 'done'
    } catch (error) {
      logger.error({ err: error, job, period }, '[CRON] No se pudo reservar la tarea')
      return 'error'
    }

    logger.info({ job, period }, '[CRON] Ejecutando')
    const startTime = Date.now()
    try {
      await this.runJob(job, period)
      await finishRun(job)
      logger.info({ job, period, duration: Date.now() - startTime }, '[CRON] Completado')
      return 'ok'
    } catch (error) {
      logger.error({ err: error, job, period }, '[CRON] Falló')
      await finishRun(job, error).catch((err) =>
        logger.error({ err, job }, '[CRON] No se pudo anotar el fallo')
      )
      return 'error'
    }
  }

  private static async runJob(job: CronJob, period: string): Promise<void> {
    switch (job) {
      case 'notifications':
        await NotificationGeneratorService.processPendingNotifications()
        return
      case 'checklist-reset': {
        const count = await checklistDailyReset()
        logger.info({ count }, '[CRON] Checklist reset completado')
        return
      }
      case 'checklist-purge': {
        const deleted = await purgeOldEventLogs(7)
        logger.info({ deleted }, '[CRON] Checklist event log purgado')
        return
      }
      case 'batch-payment': {
        const { year, month } = batchPaymentTarget(period)
        const result = await this.runBatchPaymentNow(year, month)
        if (!result.success) throw new Error(result.error ?? 'Batch payment falló')
        return
      }
    }
  }

  /**
   * Amplía el calendario de disponibilidad de parking (idempotente)
   */
  static async runParkingCalendarNow(): Promise<void> {
    try {
      const result = await extendAvailability(365)
      logger.info(result, '[CRON] Calendario de parking ampliado')
    } catch (error) {
      logger.error({ err: error }, '[CRON] Error ampliando el calendario de parking')
    }
  }

  /**
   * Ejecutar manualmente la verificación de notificaciones
   * Útil para testing o trigger manual desde endpoint
   */
  static async runNotificationsNow(): Promise<{
    success: boolean
    results?: unknown
    error?: string
    duration?: number
  }> {
    logger.info('[MANUAL] Ejecutando verificación de notificaciones')
    const startTime = Date.now()

    try {
      const results = await NotificationGeneratorService.processPendingNotifications()
      const duration = Date.now() - startTime

      logger.info({ duration }, '[MANUAL] Notificaciones procesadas')

      return {
        success: true,
        results,
        duration,
      }
    } catch (error) {
      logger.error({ err: error }, '[MANUAL] Error procesando notificaciones')

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

    logger.info({ month, year }, '[BATCH PAYMENT] Processing validated invoices')

    try {
      // First, get preview of what will be updated
      const preview = await BackofficeRepository.getValidatedInvoicesCountByMonth(year, month)

      if (preview.count === 0) {
        logger.info({ month, year }, '[BATCH PAYMENT] No validated invoices found')
        return {
          success: true,
          count: 0,
          invoiceIds: [],
          year,
          month,
          duration: Date.now() - startTime,
        }
      }

      logger.info(
        { count: preview.count, total: preview.total_amount.toFixed(2) },
        '[BATCH PAYMENT] Found validated invoices'
      )

      // Execute batch update
      const result = await BackofficeRepository.markValidatedInvoicesAsPaid(
        year,
        month,
        executingUserId
      )
      const duration = Date.now() - startTime

      logger.info({ count: result.count, duration }, '[BATCH PAYMENT] Marked invoices as paid')

      return {
        success: true,
        count: result.count,
        invoiceIds: result.invoiceIds,
        year,
        month,
        duration,
      }
    } catch (error) {
      logger.error({ err: error }, '[BATCH PAYMENT] Error')

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
    if (
      now.getDate() > 10 ||
      (now.getDate() === 10 && now.getHours() >= 23 && now.getMinutes() >= 59)
    ) {
      nextBatchPayment.setMonth(nextBatchPayment.getMonth() + 1)
    }

    return {
      isRunning: this.isRunning,
      nextNotificationRun: nextNotification.toISOString(),
      nextBatchPaymentRun: nextBatchPayment.toISOString(),
    }
  }
}
