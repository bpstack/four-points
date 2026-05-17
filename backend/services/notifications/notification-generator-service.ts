// services/notifications/notification-generator-service.ts

import { NotificationRepository } from '../../repositories/notifications/notification-repository'
import { GroupPaymentRepository } from '../../repositories/group/group-payment-repository'
import { GroupRepository } from '../../repositories/group/group-repository'
import { UserRepository } from '../../repositories/auth/user-repository'
import { PaymentStatus } from '../../models/group/index'
import {
  CreateNotificationDTO,
  NotificationPriority,
  NotificationRelatedTo,
  NotificationModule,
  NotificationStatus,
} from '../../models/notifications/index'

import { logger } from '../../config/logger.js'

// ═══════════════════════════════════════════════════════
// CONFIGURACIÓN CENTRALIZADA (MODIFICABLE)
// ═══════════════════════════════════════════════════════

const NOTIFICATION_CONFIG = {
  payment_upcoming: [15, 7], // 15 días antes y 7 días antes
  payment_overdue: [0], // Día del vencimiento
  rooming_list: [15, 7], // 15 y 7 días antes de deadline
  arrival: [3], // 3 días antes
  contract_unsigned: [10, 5], // 10 y 5 días antes de llegada
  balance_pending: [7], // 7 días después de salida
}

// ═══════════════════════════════════════════════════════
// SISTEMA DE LINKS DIRECTOS ESCALABLE
// ═══════════════════════════════════════════════════════

class NotificationLinkBuilder {
  /**
   * Link a pestaña de pagos con highlight
   */
  static payment(groupId: number, paymentId?: number): string {
    if (paymentId) {
      return `/dashboard/groups/${groupId}?tab=payments&highlight=${paymentId}`
    }
    return `/dashboard/groups/${groupId}?tab=payments`
  }

  /**
   * Link a pestaña de status (rooming list)
   */
  static rooming(groupId: number): string {
    return `/dashboard/groups/${groupId}?tab=status`
  }

  /**
   * Link a pestaña de overview (llegada)
   */
  static arrival(groupId: number): string {
    return `/dashboard/groups/${groupId}?tab=overview`
  }

  /**
   * Link genérico al grupo
   */
  static group(groupId: number): string {
    return `/dashboard/groups/${groupId}`
  }

  /**
   * Link a contrato (status tab)
   */
  static contract(groupId: number): string {
    return `/dashboard/groups/${groupId}?tab=status`
  }

  /**
   * Link a balance (payments tab)
   */
  static balance(groupId: number): string {
    return `/dashboard/groups/${groupId}?tab=payments`
  }

  // 📋 FUTUROS LINKS (comentados por ahora):
  // static groupEdit(groupId: number): string {
  //   return `/dashboard/groups/${groupId}?tab=overview&panel=edit-group`
  // }
  // static rooms(groupId: number): string {
  //   return `/dashboard/groups/${groupId}?tab=rooms`
  // }
  // static contacts(groupId: number): string {
  //   return `/dashboard/groups/${groupId}?tab=contacts`
  // }
}

// ═══════════════════════════════════════════════════════
// SERVICIO PRINCIPAL
// ═══════════════════════════════════════════════════════

export class NotificationGeneratorService {
  /**
   * Generar notificación de pago próximo a vencer
   */
  static async generatePaymentReminder(
    paymentId: number,
    daysBeforeDue: number = 7
  ): Promise<void> {
    try {
      const payment = await GroupPaymentRepository.getById(paymentId)

      if (!payment || payment.status === PaymentStatus.PAID) {
        return
      }

      const title = `Recordatorio: Pago "${payment.payment_name}" vence en ${daysBeforeDue} días`
      const message = `El pago "${payment.payment_name}" del grupo "${
        payment.group_name
      }" vence el ${new Date(payment.due_date).toLocaleDateString(
        'es-ES'
      )}. Monto pendiente: ${payment.amount - payment.amount_paid}€`

      const notificationData: CreateNotificationDTO = {
        module: NotificationModule.GROUPS,
        group_id: payment.group_id,
        related_to: NotificationRelatedTo.PAYMENT,
        related_id: paymentId,
        direct_link: NotificationLinkBuilder.payment(payment.group_id, paymentId),
        title,
        message,
        priority: daysBeforeDue <= 3 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
        status: NotificationStatus.PENDING,
        scheduled_for: new Date(),
      }

      const notification = await NotificationRepository.create(notificationData)
      await this.addGroupAdminRecipients(notification.id)
    } catch (error) {
      logger.error({ err: error }, 'Error generando notificación de pago:')
      throw error
    }
  }

  /**
   * Generar notificación de pago vencido
   */
  static async generateOverduePaymentNotification(paymentId: number): Promise<void> {
    try {
      const payment = await GroupPaymentRepository.getById(paymentId)

      if (!payment || payment.status === PaymentStatus.PAID) {
        return
      }

      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )

      const title = `⚠️ URGENTE: Pago vencido - "${payment.payment_name}"`
      const message = `El pago "${payment.payment_name}" del grupo "${
        payment.group_name
      }" venció hace ${daysOverdue} días. Monto pendiente: ${payment.amount - payment.amount_paid}€`

      const notificationData: CreateNotificationDTO = {
        module: NotificationModule.GROUPS,
        group_id: payment.group_id,
        related_to: NotificationRelatedTo.PAYMENT,
        related_id: paymentId,
        direct_link: NotificationLinkBuilder.payment(payment.group_id, paymentId),
        title,
        message,
        priority: NotificationPriority.URGENT,
        status: NotificationStatus.PENDING,
        scheduled_for: new Date(),
      }

      const notification = await NotificationRepository.create(notificationData)
      await this.addGroupAdminRecipients(notification.id)
    } catch (error) {
      logger.error({ err: error }, 'Error generando notificación de pago vencido:')
      throw error
    }
  }

  /**
   * Generar notificación de rooming list pendiente
   */
  static async generateRoomingListReminder(
    groupId: number,
    daysBeforeDeadline: number = 10
  ): Promise<void> {
    try {
      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return
      }

      const title = `Recordatorio: Rooming list de "${group.name}" pendiente`
      const message = `La rooming list del grupo "${group.name}" debe recibirse en ${daysBeforeDeadline} días.`

      const notificationData: CreateNotificationDTO = {
        module: NotificationModule.GROUPS,
        group_id: groupId,
        related_to: NotificationRelatedTo.ROOMING,
        direct_link: NotificationLinkBuilder.rooming(groupId),
        title,
        message,
        priority: daysBeforeDeadline <= 5 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
        status: NotificationStatus.PENDING,
        scheduled_for: new Date(),
      }

      const notification = await NotificationRepository.create(notificationData)
      await this.addGroupAdminRecipients(notification.id)
    } catch (error) {
      logger.error({ err: error }, 'Error generando notificación de rooming list:')
      throw error
    }
  }

  /**
   * Generar notificación de llegada próxima
   */
  static async generateArrivalReminder(
    groupId: number,
    daysBeforeArrival: number = 3
  ): Promise<void> {
    try {
      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return
      }

      const title = `Llegada próxima: Grupo "${group.name}"`
      const message = `El grupo "${group.name}" llegará en ${daysBeforeArrival} días (${new Date(
        group.arrival_date
      ).toLocaleDateString('es-ES')}).`

      const notificationData: CreateNotificationDTO = {
        module: NotificationModule.GROUPS,
        group_id: groupId,
        related_to: NotificationRelatedTo.ARRIVAL,
        direct_link: NotificationLinkBuilder.arrival(groupId),
        title,
        message,
        priority: NotificationPriority.MEDIUM,
        status: NotificationStatus.PENDING,
        scheduled_for: new Date(),
      }

      const notification = await NotificationRepository.create(notificationData)
      await this.addGroupAdminRecipients(notification.id)
    } catch (error) {
      logger.error({ err: error }, 'Error generando notificación de llegada:')
      throw error
    }
  }

  /**
   * Generar notificación manual
   * Si scheduled_for es proporcionado, la notificación no será visible hasta esa fecha
   */
  static async generateManualNotification(
    groupId: number,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    userIds?: string[],
    scheduledFor?: Date
  ): Promise<void> {
    try {
      // Si es programada para el futuro, usar status 'pending', si no 'sent'
      const isScheduledForFuture = scheduledFor && scheduledFor > new Date()
      
      const notificationData: CreateNotificationDTO = {
        module: NotificationModule.GROUPS,
        group_id: groupId,
        related_to: NotificationRelatedTo.GENERAL,
        direct_link: NotificationLinkBuilder.group(groupId),
        title,
        message,
        priority,
        status: isScheduledForFuture ? NotificationStatus.PENDING : NotificationStatus.SENT,
        scheduled_for: scheduledFor || new Date(),
      }

      const notification = await NotificationRepository.create(notificationData)

      if (userIds && userIds.length > 0) {
        await NotificationRepository.addRecipients(notification.id, userIds)
      } else {
        await this.addGroupAdminRecipients(notification.id)
      }
    } catch (error) {
      logger.error({ err: error }, 'Error generando notificación manual:')
      throw error
    }
  }

  /**
   * Generar notificación general (sin grupo específico)
   * Permite enviar notificaciones a cualquier sección de la app
   */
  static async generateGeneralNotification(params: {
    title: string
    message: string
    priority?: NotificationPriority
    module?: string
    directLink?: string
    scheduledFor?: Date
    userIds?: string[]
  }): Promise<void> {
    try {
      const {
        title,
        message,
        priority = NotificationPriority.MEDIUM,
        module = 'system',
        directLink,
        scheduledFor,
        userIds,
      } = params

      // Si es programada para el futuro, usar status 'pending', si no 'sent'
      const isScheduledForFuture = scheduledFor && scheduledFor > new Date()

      const notificationData: CreateNotificationDTO = {
        module: module as NotificationModule,
        group_id: undefined, // Sin grupo específico
        related_to: NotificationRelatedTo.GENERAL,
        direct_link: directLink || '/dashboard',
        title,
        message,
        priority,
        status: isScheduledForFuture ? NotificationStatus.PENDING : NotificationStatus.SENT,
        scheduled_for: scheduledFor || new Date(),
      }

      const notification = await NotificationRepository.create(notificationData)

      if (userIds && userIds.length > 0) {
        await NotificationRepository.addRecipients(notification.id, userIds)
      } else {
        // Por defecto, enviar a todos los admins y group-admins
        await this.addGroupAdminRecipients(notification.id)
      }

      logger.info(`✅ Notificación general creada: "${title}" -> ${directLink || '/dashboard'}`)
    } catch (error) {
      logger.error({ err: error }, 'Error generando notificación general:')
      throw error
    }
  }

  /**
   * Añadir todos los usuarios con rol group-admin como destinatarios
   */
  private static async addGroupAdminRecipients(notificationId: number): Promise<void> {
    try {
      const groupAdminsResult = await UserRepository.getByRole('group-admin')
      const adminsResult = await UserRepository.getByRole('admin')

      const groupAdmins = Array.isArray(groupAdminsResult) ? groupAdminsResult : []
      const admins = Array.isArray(adminsResult) ? adminsResult : []

      const allUsers = [...groupAdmins, ...admins]

      const userIds = allUsers.filter((user: any) => user && user.id).map((user: any) => user.id)

      if (userIds.length > 0) {
        await NotificationRepository.addRecipients(notificationId, userIds)
      }
    } catch (error) {
      logger.error({ err: error }, 'Error añadiendo destinatarios:')
      throw error
    }
  }

  /**
   * Procesar notificaciones programadas pendientes (para cron job)
   */
  static async processPendingNotifications(): Promise<void> {
    try {
      // 1. Procesar notificaciones programadas que ya llegó su hora
      const pendingNotifications = await NotificationRepository.getPendingScheduled()

      for (const notification of pendingNotifications) {
        await NotificationRepository.updateStatus(notification.id, NotificationStatus.SENT)
      }

      logger.info(`✅ Procesadas ${pendingNotifications.length} notificaciones programadas`)

      // 2. Verificar y generar nuevas notificaciones automáticas
      const results = await this.checkAndGenerateNotifications()

      logger.info({ results }, '📊 Resumen de notificaciones generadas:')
    } catch (error) {
      logger.error({ err: error }, 'Error procesando notificaciones pendientes:')
      throw error
    }
  }

  /**
   * 🆕 Obtener configuración de días
   */
  static getConfig() {
    return NOTIFICATION_CONFIG
  }

  /**
   * 🆕 VERIFICAR Y GENERAR NOTIFICACIONES AUTOMÁTICAS
   * Método principal que verifica todos los eventos pendientes
   */
  static async checkAndGenerateNotifications(): Promise<{
    paymentsUpcoming: number
    paymentsOverdue: number
    roomingLists: number
    arrivals: number
  }> {
    try {
      logger.info('🔍 Iniciando verificación de eventos pendientes...')

      let paymentsUpcoming = 0
      let paymentsOverdue = 0
      let roomingLists = 0
      let arrivals = 0

      // ═══════════════════════════════════════════════════════
      // 1. VERIFICAR PAGOS PRÓXIMOS A VENCER
      // ═══════════════════════════════════════════════════════

      for (const days of NOTIFICATION_CONFIG.payment_upcoming) {
        const upcomingPayments = await GroupPaymentRepository.getUpcoming(days)

        for (const payment of upcomingPayments) {
          // Verificar si ya existe notificación para este pago y días
          const existingNotification = await this.checkIfNotificationExists(
            payment.group_id,
            NotificationRelatedTo.PAYMENT,
            payment.id,
            days
          )

          if (!existingNotification) {
            await this.generatePaymentReminder(payment.id, days)
            paymentsUpcoming++
            logger.info(`✅ Notificación de pago creada: ${payment.payment_name} (${days} días)`)
          }
        }
      }

      // ═══════════════════════════════════════════════════════
      // 2. VERIFICAR PAGOS VENCIDOS
      // ═══════════════════════════════════════════════════════

      const overduePayments = await GroupPaymentRepository.getOverdue()

      for (const payment of overduePayments) {
        // Verificar si ya existe notificación de vencido para este pago
        const existingNotification = await this.checkIfNotificationExists(
          payment.group_id,
          NotificationRelatedTo.PAYMENT,
          payment.id,
          0 // 0 días = vencido
        )

        if (!existingNotification) {
          await this.generateOverduePaymentNotification(payment.id)
          paymentsOverdue++
          logger.warn(`⚠️ Notificación de pago vencido: ${payment.payment_name}`)
        }
      }

      // ═══════════════════════════════════════════════════════
      // 3. VERIFICAR ROOMING LISTS PENDIENTES
      // ═══════════════════════════════════════════════════════

      for (const days of NOTIFICATION_CONFIG.rooming_list) {
        const pendingRoomingLists = await GroupRepository.getPendingRoomingLists(days)

        for (const group of pendingRoomingLists) {
          // Verificar si ya existe notificación para este grupo y días
          const existingNotification = await this.checkIfRoomingNotificationExists(group.id, days)

          if (!existingNotification) {
            await this.generateRoomingListReminder(group.id, days)
            roomingLists++
            logger.info(`📋 Notificación de rooming list creada: ${group.name} (${days} días)`)
          }
        }
      }

      // ═══════════════════════════════════════════════════════
      // 4. VERIFICAR LLEGADAS PRÓXIMAS
      // ═══════════════════════════════════════════════════════

      for (const days of NOTIFICATION_CONFIG.arrival) {
        const upcomingArrivals = await GroupRepository.getUpcomingArrivals(days)

        for (const group of upcomingArrivals) {
          // Verificar si ya existe notificación para este grupo y días
          const existingNotification = await this.checkIfArrivalNotificationExists(group.id, days)

          if (!existingNotification) {
            await this.generateArrivalReminder(group.id, days)
            arrivals++
            logger.info(`🛬 Notificación de llegada creada: ${group.name} (${days} días)`)
          }
        }
      }

      logger.info({ paymentsUpcoming, paymentsOverdue, roomingLists, arrivals }, '✅ Verificación completada:')

      return {
        paymentsUpcoming,
        paymentsOverdue,
        roomingLists,
        arrivals,
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error en verificación automática:')
      throw error
    }
  }

  /**
   * 🆕 VERIFICAR SI YA EXISTE UNA NOTIFICACIÓN
   * Evita duplicados
   */
  private static async checkIfNotificationExists(
    groupId: number,
    relatedTo: NotificationRelatedTo,
    relatedId: number,
    daysOffset: number
  ): Promise<boolean> {
    try {
      const notifications = await NotificationRepository.getByGroupId(groupId)

      // Últimas 48 horas (más margen)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

      const exists = notifications.some((n) => {
        const isSameType = n.related_to === relatedTo && n.related_id === relatedId
        const isRecent = new Date(n.created_at) > twoDaysAgo

        // Para vencidos (0 días), buscar por título que contenga "vencido"
        if (daysOffset === 0) {
          return isSameType && isRecent && n.title?.toLowerCase().includes('vencido')
        }

        // Para upcoming, buscar exactamente los días en el título
        return isSameType && isRecent && n.title?.includes(`${daysOffset} días`)
      })

      if (exists) {
        logger.info(
          `⏭️  Notificación duplicada evitada: ${relatedTo} ${relatedId} (${daysOffset} días)`
        )
      }

      return exists
    } catch (error) {
      logger.error({ err: error }, 'Error verificando duplicado:')
      return false
    }
  }

  /**
   * Verificar si ya existe notificación de rooming list para un grupo
   */
  private static async checkIfRoomingNotificationExists(
    groupId: number,
    _daysOffset: number
  ): Promise<boolean> {
    try {
      const notifications = await NotificationRepository.getByGroupId(groupId)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

      const exists = notifications.some((n) => {
        const isRooming = n.related_to === NotificationRelatedTo.ROOMING
        const isRecent = new Date(n.created_at) > twoDaysAgo
        return isRooming && isRecent && n.title?.toLowerCase().includes('rooming')
      })

      if (exists) {
        logger.info(`⏭️  Notificación de rooming duplicada evitada: grupo ${groupId}`)
      }

      return exists
    } catch (error) {
      logger.error({ err: error }, 'Error verificando duplicado de rooming:')
      return false
    }
  }

  /**
   * Verificar si ya existe notificación de llegada para un grupo
   */
  private static async checkIfArrivalNotificationExists(
    groupId: number,
    daysOffset: number
  ): Promise<boolean> {
    try {
      const notifications = await NotificationRepository.getByGroupId(groupId)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

      const exists = notifications.some((n) => {
        const isArrival = n.related_to === NotificationRelatedTo.ARRIVAL
        const isRecent = new Date(n.created_at) > twoDaysAgo
        return isArrival && isRecent && n.title?.includes(`${daysOffset} días`)
      })

      if (exists) {
        logger.info(`⏭️  Notificación de llegada duplicada evitada: grupo ${groupId}`)
      }

      return exists
    } catch (error) {
      logger.error({ err: error }, 'Error verificando duplicado de llegada:')
      return false
    }
  }
}
