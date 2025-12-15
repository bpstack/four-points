// repositories/notifications/notification-repository.ts

import db from '../../config/db'
import {
  Notification,
  NotificationWithRecipient,
  NotificationWithUser,
  CreateNotificationDTO,
  NotificationFilters,
  NotificationStatus,
} from '../../models/notifications/index'
import { ResultSetHeader } from 'mysql2'

export class NotificationRepository {
  /**
   * Obtener notificaciones de un usuario
   */
  static async getByUserId(
    userId: string,
    filters: NotificationFilters = {}
  ): Promise<NotificationWithRecipient[]> {
    let query = `
      SELECT 
        n.*,
        nr.is_read,
        nr.read_at,
        g.name as group_name
      FROM notifications n
      INNER JOIN notification_recipients nr ON n.id = nr.notification_id
      LEFT JOIN hotel_groups g ON n.group_id = g.id
      WHERE nr.user_id = ?
    `

    const params: any[] = [userId]

    // Filtros opcionales
    if (filters.status) {
      query += ` AND nr.is_read = ?`
      params.push(filters.status === 'read' ? 1 : 0)
    }

    if (filters.priority) {
      query += ` AND n.priority = ?`
      params.push(filters.priority)
    }

    if (filters.module) {
      query += ` AND n.module = ?`
      params.push(filters.module)
    }

    query += ` ORDER BY n.created_at DESC`

    if (filters.limit) {
      query += ` LIMIT ?`
      params.push(parseInt(filters.limit.toString()))
    }

    const [rows] = await db.query<NotificationWithRecipient[]>(query, params)
    return rows
  }

  /**
   * Obtener notificación por ID
   */
  static async getById(id: number): Promise<Notification | null> {
    const query = `
      SELECT 
        n.*,
        g.name as group_name
      FROM notifications n
      LEFT JOIN hotel_groups g ON n.group_id = g.id
      WHERE n.id = ?
    `

    const [rows] = await db.query<Notification[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener notificaciones de un grupo
   */
  static async getByGroupId(groupId: number): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications
      WHERE group_id = ?
      ORDER BY created_at DESC
    `

    const [rows] = await db.query<Notification[]>(query, [groupId])
    return rows
  }

  /**
   * Crear notificación
   */
  static async create(notificationData: CreateNotificationDTO): Promise<Notification> {
    const {
      module = 'groups',
      group_id,
      related_to,
      related_id,
      direct_link,
      title,
      message,
      priority = 'medium',
      status = 'pending',
      scheduled_for,
    } = notificationData

    const query = `
      INSERT INTO notifications 
      (module, group_id, related_to, related_id, direct_link, title, message, priority, status, scheduled_for)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      module,
      group_id,
      related_to,
      related_id,
      direct_link,
      title,
      message,
      priority,
      status,
      scheduled_for,
    ])

    const createdNotification = await this.getById(result.insertId)

    if (!createdNotification) {
      throw new Error('Error al recuperar la notificación creada')
    }

    return createdNotification
  }

  /**
   * Actualizar estado de notificación
   */
  static async updateStatus(id: number, status: NotificationStatus): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE sent_at END
      WHERE id = ?
    `

    const [result] = await db.query<ResultSetHeader>(query, [status, status, id])
    return result.affectedRows > 0
  }

  /**
   * Marcar email como enviado
   */
  static async markEmailSent(id: number): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET email_sent = 1, email_sent_at = NOW()
      WHERE id = ?
    `

    const [result] = await db.query<ResultSetHeader>(query, [id])
    return result.affectedRows > 0
  }

  /**
   * Eliminar notificación
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM notifications WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  /**
   * Obtener notificaciones pendientes de enviar (para cron)
   */
  static async getPendingScheduled(): Promise<Notification[]> {
    const query = `
      SELECT * FROM notifications
      WHERE status = 'pending'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
    `

    const [rows] = await db.query<Notification[]>(query)
    return rows
  }

  // ═══════════════════════════════════════════════════════
  // NOTIFICATION RECIPIENTS
  // ═══════════════════════════════════════════════════════

  /**
   * Añadir destinatario a notificación
   */
  static async addRecipient(notificationId: number, userId: string): Promise<ResultSetHeader> {
    const query = `
      INSERT INTO notification_recipients (notification_id, user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE notification_id = notification_id
    `

    const [result] = await db.query<ResultSetHeader>(query, [notificationId, userId])
    return result
  }

  /**
   * Añadir múltiples destinatarios
   */
  static async addRecipients(notificationId: number, userIds: string[]): Promise<void> {
    if (!userIds || userIds.length === 0) return

    const values = userIds.map((userId) => [notificationId, userId])
    const query = `
      INSERT INTO notification_recipients (notification_id, user_id)
      VALUES ?
      ON DUPLICATE KEY UPDATE notification_id = notification_id
    `

    await db.query(query, [values])
  }

  /**
   * Marcar notificación como leída para un usuario
   */
  static async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    const query = `
      UPDATE notification_recipients 
      SET is_read = 1, read_at = NOW()
      WHERE notification_id = ? AND user_id = ?
    `

    const [result] = await db.query<ResultSetHeader>(query, [notificationId, userId])
    return result.affectedRows > 0
  }

  /**
   * Marcar todas las notificaciones como leídas para un usuario
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notification_recipients 
      SET is_read = 1, read_at = NOW()
      WHERE user_id = ? AND is_read = 0
    `

    const [result] = await db.query<ResultSetHeader>(query, [userId])
    return result.affectedRows
  }

  /**
   * Obtener destinatarios de una notificación
   */
  static async getRecipients(notificationId: number): Promise<NotificationWithUser[]> {
    const query = `
      SELECT 
        nr.*,
        u.username,
        u.email
      FROM notification_recipients nr
      INNER JOIN users u ON nr.user_id = u.id
      WHERE nr.notification_id = ?
    `

    const [rows] = await db.query<NotificationWithUser[]>(query, [notificationId])
    return rows
  }
}
