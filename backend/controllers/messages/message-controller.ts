// controllers/messages/message-controller.ts

import { Request, Response } from 'express'
import { ConversationRepository } from '../../repositories/messages/conversation-repository.js'
import { MessageRepository } from '../../repositories/messages/message-repository.js'
import { NotificationRepository } from '../../repositories/notifications/notification-repository.js'
import { MESSAGE_CONSTANTS } from '../../models/messages/index.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'

export class MessageController {
  /**
   * GET /api/messages/conversations/:id/messages
   * Listar mensajes de una conversacion (paginado)
   */
  static async getMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const conversationId = parseInt(req.params.id)

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_INVALID_CONVERSATION_ID,
          code: ERROR_CODES.MESSAGES_INVALID_CONVERSATION_ID,
        })
      }

      // Verificar acceso
      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      const isSystemAdmin = req.user?.role === 'admin'

      if (!isParticipant && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_NO_ACCESS,
          code: ERROR_CODES.MESSAGES_NO_ACCESS,
        })
      }

      // Parametros de paginacion
      const beforeId = req.query.before ? parseInt(req.query.before as string) : undefined
      const limit = req.query.limit
        ? Math.min(parseInt(req.query.limit as string), 100)
        : MESSAGE_CONSTANTS.DEFAULT_MESSAGES_LIMIT

      const messages = await MessageRepository.getByConversationId(conversationId, {
        before_id: beforeId,
        limit,
      })

      // Verificar si hay mas mensajes
      let hasMore = false
      if (messages.length > 0) {
        const oldestId = messages[0].id
        hasMore = await MessageRepository.hasMoreMessages(conversationId, oldestId)
      }

      return res.status(200).json({
        success: true,
        data: messages,
        has_more: hasMore,
        oldest_id: messages.length > 0 ? messages[0].id : null,
      })
    } catch (error: any) {
      console.error('Error en getMessages:', error)
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_FETCH_MESSAGES_ERROR,
        code: ERROR_CODES.MESSAGES_FETCH_MESSAGES_ERROR,
      })
    }
  }

  /**
   * POST /api/messages/conversations/:id/messages
   * Enviar mensaje
   */
  static async sendMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const username = req.user?.username
      const conversationId = parseInt(req.params.id)
      const { content, notify } = req.body

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_INVALID_CONVERSATION_ID,
          code: ERROR_CODES.MESSAGES_INVALID_CONVERSATION_ID,
        })
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_EMPTY_MESSAGE,
          code: ERROR_CODES.MESSAGES_EMPTY_MESSAGE,
        })
      }

      if (content.length > MESSAGE_CONSTANTS.MAX_CONTENT_LENGTH) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_MESSAGE_TOO_LONG,
          code: ERROR_CODES.MESSAGES_MESSAGE_TOO_LONG,
        })
      }

      // Verificar que es participante
      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_NOT_PARTICIPANT,
          code: ERROR_CODES.MESSAGES_NOT_PARTICIPANT,
        })
      }

      // Crear mensaje
      const message = await MessageRepository.create(
        conversationId,
        userId,
        content.trim(),
        notify === true
      )

      // Si notify=true, crear notificacion para los otros participantes
      if (notify === true) {
        await MessageController.createMessageNotification(
          conversationId,
          message.id,
          userId,
          username || 'Usuario',
          content.trim()
        )
      }

      // Obtener mensaje con datos del sender
      const messageWithSender = await MessageRepository.getByIdWithSender(message.id)

      return res.status(201).json({
        success: true,
        data: messageWithSender,
        message: SUCCESS_CODES.MESSAGES_SENT,
        code: SUCCESS_CODES.MESSAGES_SENT,
      })
    } catch (error: any) {
      console.error('Error en sendMessage:', error)
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_SEND_MESSAGE_ERROR,
        code: ERROR_CODES.MESSAGES_SEND_MESSAGE_ERROR,
      })
    }
  }

  /**
   * PATCH /api/messages/:messageId
   * Editar mensaje
   */
  static async editMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const messageId = parseInt(req.params.messageId)
      const { content } = req.body

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      if (isNaN(messageId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_INVALID_MESSAGE_ID,
          code: ERROR_CODES.MESSAGES_INVALID_MESSAGE_ID,
        })
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_EMPTY_MESSAGE,
          code: ERROR_CODES.MESSAGES_EMPTY_MESSAGE,
        })
      }

      if (content.length > MESSAGE_CONSTANTS.MAX_CONTENT_LENGTH) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_MESSAGE_TOO_LONG,
          code: ERROR_CODES.MESSAGES_MESSAGE_TOO_LONG,
        })
      }

      // Verificar que es el sender
      const isSender = await MessageRepository.isSender(messageId, userId)
      if (!isSender) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_ONLY_OWN_EDIT,
          code: ERROR_CODES.MESSAGES_ONLY_OWN_EDIT,
        })
      }

      const updated = await MessageRepository.update(messageId, content.trim())
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_MESSAGE_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_MESSAGE_NOT_FOUND,
        })
      }

      const message = await MessageRepository.getByIdWithSender(messageId)

      return res.status(200).json({
        success: true,
        data: message,
        message: SUCCESS_CODES.MESSAGES_EDITED,
        code: SUCCESS_CODES.MESSAGES_EDITED,
      })
    } catch (error: any) {
      console.error('Error en editMessage:', error)
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_EDIT_MESSAGE_ERROR,
        code: ERROR_CODES.MESSAGES_EDIT_MESSAGE_ERROR,
      })
    }
  }

  /**
   * DELETE /api/messages/:messageId
   * Eliminar mensaje (soft delete)
   */
  static async deleteMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const userRole = req.user?.role
      const messageId = parseInt(req.params.messageId)

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      if (isNaN(messageId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_INVALID_MESSAGE_ID,
          code: ERROR_CODES.MESSAGES_INVALID_MESSAGE_ID,
        })
      }

      // Verificar que es el sender o admin del sistema
      const isSender = await MessageRepository.isSender(messageId, userId)
      const isSystemAdmin = userRole === 'admin'

      if (!isSender && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_ONLY_OWN_DELETE,
          code: ERROR_CODES.MESSAGES_ONLY_OWN_DELETE,
        })
      }

      const deleted = await MessageRepository.delete(messageId)
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_MESSAGE_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_MESSAGE_NOT_FOUND,
        })
      }

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.MESSAGES_DELETED,
        code: SUCCESS_CODES.MESSAGES_DELETED,
      })
    } catch (error: any) {
      console.error('Error en deleteMessage:', error)
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_DELETE_MESSAGE_ERROR,
        code: ERROR_CODES.MESSAGES_DELETE_MESSAGE_ERROR,
      })
    }
  }

  /**
   * GET /api/messages/unread-count
   * Obtener contador de mensajes no leidos
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

      const totalUnread = await MessageRepository.getTotalUnreadCount(userId)
      const byConversation = await MessageRepository.getUnreadCountByConversation(userId)

      return res.status(200).json({
        success: true,
        data: {
          total_unread: totalUnread,
          by_conversation: byConversation,
        },
      })
    } catch (error: any) {
      console.error('Error en getUnreadCount:', error)
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_FETCH_UNREAD_ERROR,
        code: ERROR_CODES.MESSAGES_FETCH_UNREAD_ERROR,
      })
    }
  }

  /**
   * GET /api/messages/search
   * Buscar en mensajes
   */
  static async searchMessages(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const searchTerm = req.query.q as string

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_SEARCH_MIN_LENGTH,
          code: ERROR_CODES.MESSAGES_SEARCH_MIN_LENGTH,
        })
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50

      // Intentar fulltext primero, fallback a LIKE
      let messages
      try {
        messages = await MessageRepository.search(userId, searchTerm.trim(), limit)
      } catch {
        // Fallback a LIKE si fulltext falla
        messages = await MessageRepository.searchLike(userId, searchTerm.trim(), limit)
      }

      return res.status(200).json({
        success: true,
        data: messages,
        count: messages.length,
      })
    } catch (error: any) {
      console.error('Error en searchMessages:', error)
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_SEARCH_MESSAGES_ERROR,
        code: ERROR_CODES.MESSAGES_SEARCH_MESSAGES_ERROR,
      })
    }
  }

  /**
   * Helper: Crear notificacion para mensaje urgente
   */
  private static async createMessageNotification(
    conversationId: number,
    messageId: number,
    senderId: string,
    senderName: string,
    content: string
  ): Promise<void> {
    try {
      // Obtener participantes (excepto el sender)
      const participants = await ConversationRepository.getParticipants(conversationId)
      const recipientIds = participants
        .filter((p) => p.user_id !== senderId)
        .map((p) => p.user_id)

      if (recipientIds.length === 0) return

      // Preview del contenido (max 100 chars)
      const contentPreview = content.length > 100 ? content.substring(0, 97) + '...' : content

      // Crear notificacion
      const notification = await NotificationRepository.create({
        module: 'system' as any, // Usamos system ya que 'messages' no esta en el enum aun
        related_to: 'message' as any,
        related_id: messageId,
        direct_link: `/dashboard/profile?panel=messages&chat=${conversationId}`,
        title: `Mensaje de ${senderName}`,
        message: contentPreview,
        priority: 'high' as any,
        status: 'sent' as any,
      })

      // Añadir recipients
      await NotificationRepository.addRecipients(notification.id, recipientIds)
    } catch (error) {
      console.error('Error al crear notificacion de mensaje:', error)
      // No lanzamos error para no afectar el envio del mensaje
    }
  }
}
