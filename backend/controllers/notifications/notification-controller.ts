// controllers/notifications/notification-controller.ts

import { Request, Response } from 'express'
import { NotificationRepository } from '../../repositories/notifications/notification-repository'
import { NotificationGeneratorService } from '../../services/notifications/notification-generator-service'
import { NotificationFilters, NotificationPriority } from '../../models/notifications/index'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

export class NotificationController {
  /**
   * GET /api/notifications
   * Obtener notificaciones del usuario autenticado
   */
  static async getUserNotifications(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const filters: NotificationFilters = {
        status: req.query.status as 'read' | 'unread',
        priority: req.query.priority as NotificationPriority,
        module: req.query.module as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      }

      const notifications = await NotificationRepository.getByUserId(userId, filters)

      return res.status(200).json({
        success: true,
        data: notifications,
        count: notifications.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getUserNotifications')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_FETCH_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_FETCH_ERROR,
      })
    }
  }

  /**
   * GET /api/notifications/unread
   * Obtener solo notificaciones no leídas del usuario
   */
  static async getUnreadNotifications(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const filters: NotificationFilters = {
        status: 'unread',
        priority: req.query.priority as NotificationPriority,
        module: req.query.module as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      }

      const notifications = await NotificationRepository.getByUserId(userId, filters)

      return res.status(200).json({
        success: true,
        data: notifications,
        count: notifications.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getUnreadNotifications')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_FETCH_UNREAD_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_FETCH_UNREAD_ERROR,
      })
    }
  }

  /**
   * GET /api/notifications/unread/count
   * Obtener contador de notificaciones no leídas (para badge)
   */
  static async getUnreadCount(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const notifications = await NotificationRepository.getByUserId(userId, {
        status: 'unread',
      })

      return res.status(200).json({
        success: true,
        count: notifications.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getUnreadCount')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_FETCH_COUNT_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_FETCH_COUNT_ERROR,
      })
    }
  }

  //  Cron job implementado en services/cron/cron-service.ts
  // Se ejecuta automáticamente todos los días a las 7:00 AM

  /**
   * POST /api/notifications/check-pending
   * Verificar y procesar notificaciones pendientes (trigger manual)
   */
  static async checkPendingNotifications(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const startTime = Date.now()

      // Procesar notificaciones programadas + verificar eventos
      const results = await NotificationGeneratorService.checkAndGenerateNotifications()

      const duration = Date.now() - startTime

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.NOTIFICATIONS_PROCESSED,
        code: SUCCESS_CODES.NOTIFICATIONS_PROCESSED,
        data: {
          ...results,
          duration: `${duration}ms`,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en checkPendingNotifications')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_PROCESS_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_PROCESS_ERROR,
      })
    }
  }

  /**
   * GET /api/groups/:id/notifications
   * Obtener notificaciones de un grupo específico
   */
  static async getGroupNotifications(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_INVALID_GROUP_ID,
          code: ERROR_CODES.NOTIFICATIONS_INVALID_GROUP_ID,
        })
      }

      const notifications = await NotificationRepository.getByGroupId(groupId)

      return res.status(200).json({
        success: true,
        data: notifications,
        count: notifications.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getGroupNotifications')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_FETCH_GROUP_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_FETCH_GROUP_ERROR,
      })
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Marcar notificación como leída
   */
  static async markAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const notificationId = parseInt(req.params.id)
      const userId = req.user?.id

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_INVALID_ID,
          code: ERROR_CODES.NOTIFICATIONS_INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const notification = await NotificationRepository.getById(notificationId)

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_NOT_FOUND,
          code: ERROR_CODES.NOTIFICATIONS_NOT_FOUND,
        })
      }

      const marked = await NotificationRepository.markAsRead(notificationId, userId)

      if (!marked) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_MARK_ERROR,
          code: ERROR_CODES.NOTIFICATIONS_MARK_ERROR,
        })
      }

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.NOTIFICATIONS_MARKED_READ,
        code: SUCCESS_CODES.NOTIFICATIONS_MARKED_READ,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en markAsRead')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_MARK_READ_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_MARK_READ_ERROR,
      })
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Marcar todas las notificaciones del usuario como leídas
   */
  static async markAllAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const count = await NotificationRepository.markAllAsRead(userId)

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.NOTIFICATIONS_ALL_MARKED_READ,
        code: SUCCESS_CODES.NOTIFICATIONS_ALL_MARKED_READ,
        count,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en markAllAsRead')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_MARK_ALL_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_MARK_ALL_ERROR,
      })
    }
  }

  /**
   * POST /api/groups/:id/notifications
   * Crear notificación manual para un grupo
   */
  static async createManualNotification(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_INVALID_GROUP_ID,
          code: ERROR_CODES.NOTIFICATIONS_INVALID_GROUP_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const { title, message, priority, userIds, scheduled_for } = req.body

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_MISSING_REQUIRED_FIELDS,
          code: ERROR_CODES.NOTIFICATIONS_MISSING_REQUIRED_FIELDS,
        })
      }

      // Parsear scheduled_for si existe
      let scheduledDate: Date | undefined
      if (scheduled_for) {
        scheduledDate = new Date(scheduled_for)
        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: ERROR_CODES.NOTIFICATIONS_INVALID_SCHEDULED_DATE,
            code: ERROR_CODES.NOTIFICATIONS_INVALID_SCHEDULED_DATE,
          })
        }
      }

      await NotificationGeneratorService.generateManualNotification(
        groupId,
        title,
        message,
        priority as NotificationPriority,
        userIds,
        scheduledDate
      )

      return res.status(201).json({
        success: true,
        message: SUCCESS_CODES.NOTIFICATIONS_CREATED,
        code: SUCCESS_CODES.NOTIFICATIONS_CREATED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en createManualNotification')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_CREATE_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_CREATE_ERROR,
      })
    }
  }

  /**
   * POST /api/notifications
   * Crear notificación general (sin grupo específico)
   * Permite enviar a cualquier sección de la app
   */
  static async createGeneralNotification(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const { title, message, priority, module, direct_link, scheduled_for, userIds } = req.body

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_MISSING_REQUIRED_FIELDS,
          code: ERROR_CODES.NOTIFICATIONS_MISSING_REQUIRED_FIELDS,
        })
      }

      // Validar module si se proporciona
      const validModules = ['groups', 'parking', 'logbooks', 'system']
      if (module && !validModules.includes(module)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_INVALID_MODULE,
          code: ERROR_CODES.NOTIFICATIONS_INVALID_MODULE,
        })
      }

      // Parsear scheduled_for si existe
      let scheduledDate: Date | undefined
      if (scheduled_for) {
        scheduledDate = new Date(scheduled_for)
        if (isNaN(scheduledDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: ERROR_CODES.NOTIFICATIONS_INVALID_SCHEDULED_DATE,
            code: ERROR_CODES.NOTIFICATIONS_INVALID_SCHEDULED_DATE,
          })
        }
      }

      await NotificationGeneratorService.generateGeneralNotification({
        title,
        message,
        priority: priority as NotificationPriority,
        module: module || 'system',
        directLink: direct_link,
        scheduledFor: scheduledDate,
        userIds,
      })

      return res.status(201).json({
        success: true,
        message: SUCCESS_CODES.NOTIFICATIONS_CREATED,
        code: SUCCESS_CODES.NOTIFICATIONS_CREATED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en createGeneralNotification')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_CREATE_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_CREATE_ERROR,
      })
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Eliminar notificación (solo admins)
   */
  static async deleteNotification(req: Request, res: Response): Promise<Response> {
    try {
      const notificationId = parseInt(req.params.id)

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_INVALID_ID,
          code: ERROR_CODES.NOTIFICATIONS_INVALID_ID,
        })
      }

      const notification = await NotificationRepository.getById(notificationId)

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_NOT_FOUND,
          code: ERROR_CODES.NOTIFICATIONS_NOT_FOUND,
        })
      }

      const deleted = await NotificationRepository.delete(notificationId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.NOTIFICATIONS_DELETE_ERROR,
          code: ERROR_CODES.NOTIFICATIONS_DELETE_ERROR,
        })
      }

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.NOTIFICATIONS_DELETED,
        code: SUCCESS_CODES.NOTIFICATIONS_DELETED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en deleteNotification')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.NOTIFICATIONS_DELETE_ERROR,
        code: ERROR_CODES.NOTIFICATIONS_DELETE_ERROR,
      })
    }
  }
}
