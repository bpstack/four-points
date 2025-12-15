// controllers/notifications/notification-controller.ts

import { Request, Response } from 'express'
import { NotificationRepository } from '../../repositories/notifications/notification-repository'
import { NotificationGeneratorService } from '../../services/notifications/notification-generator-service'
import { NotificationFilters, NotificationPriority } from '../../models/notifications/index'

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
          error: 'Usuario no autenticado',
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
      console.error('Error en getUserNotifications:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener notificaciones',
        message: error.message,
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
          error: 'Usuario no autenticado',
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
      console.error('Error en getUnreadNotifications:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener notificaciones no leídas',
        message: error.message,
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
          error: 'Usuario no autenticado',
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
      console.error('Error en getUnreadCount:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener contador de notificaciones',
        message: error.message,
      })
    }
  }

  //TODO Futuro (cuando despliegues):
  // Añadir cron job (node-cron, Vercel Cron, etc.) que llame processPendingNotifications() cada 6/12/24 horas.

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
          error: 'Usuario no autenticado',
        })
      }

      // Procesar notificaciones programadas + verificar eventos
      await NotificationGeneratorService.processPendingNotifications()

      return res.status(200).json({
        success: true,
        message: 'Notificaciones verificadas y procesadas correctamente',
      })
    } catch (error: any) {
      console.error('Error en checkPendingNotifications:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al procesar notificaciones pendientes',
        message: error.message,
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
          error: 'ID de grupo inválido',
        })
      }

      const notifications = await NotificationRepository.getByGroupId(groupId)

      return res.status(200).json({
        success: true,
        data: notifications,
        count: notifications.length,
      })
    } catch (error: any) {
      console.error('Error en getGroupNotifications:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener notificaciones del grupo',
        message: error.message,
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
          error: 'ID de notificación inválido',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const notification = await NotificationRepository.getById(notificationId)

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notificación no encontrada',
        })
      }

      const marked = await NotificationRepository.markAsRead(notificationId, userId)

      if (!marked) {
        return res.status(500).json({
          success: false,
          error: 'Error al marcar notificación como leída',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Notificación marcada como leída',
      })
    } catch (error: any) {
      console.error('Error en markAsRead:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al marcar notificación',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      const count = await NotificationRepository.markAllAsRead(userId)

      return res.status(200).json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
        count,
      })
    } catch (error: any) {
      console.error('Error en markAllAsRead:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al marcar todas las notificaciones',
        message: error.message,
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
          error: 'ID de grupo inválido',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const { title, message, priority, userIds } = req.body

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: title, message',
        })
      }

      await NotificationGeneratorService.generateManualNotification(
        groupId,
        title,
        message,
        priority as NotificationPriority,
        userIds
      )

      return res.status(201).json({
        success: true,
        message: 'Notificación creada correctamente',
      })
    } catch (error: any) {
      console.error('Error en createManualNotification:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al crear notificación',
        message: error.message,
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
          error: 'ID de notificación inválido',
        })
      }

      const notification = await NotificationRepository.getById(notificationId)

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notificación no encontrada',
        })
      }

      const deleted = await NotificationRepository.delete(notificationId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Error al eliminar notificación',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Notificación eliminada correctamente',
      })
    } catch (error: any) {
      console.error('Error en deleteNotification:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar notificación',
        message: error.message,
      })
    }
  }
}
