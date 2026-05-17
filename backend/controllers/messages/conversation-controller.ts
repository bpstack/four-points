// controllers/messages/conversation-controller.ts

import { Request, Response } from 'express'
import { ConversationRepository } from '../../repositories/messages/conversation-repository.js'
import {
  ConversationType,
  MESSAGE_CONSTANTS,
  CreateConversationDTO,
} from '../../models/messages/index.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

export class ConversationController {
  /**
   * GET /api/messages/conversations
   * Listar conversaciones del usuario autenticado
   */
  static async getMyConversations(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const conversations = await ConversationRepository.getByUserId(userId)

      return res.status(200).json({
        success: true,
        data: conversations,
        count: conversations.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getMyConversations')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_FETCH_CONVERSATIONS_ERROR,
        code: ERROR_CODES.MESSAGES_FETCH_CONVERSATIONS_ERROR,
      })
    }
  }

  /**
   * GET /api/messages/conversations/:id
   * Obtener detalle de una conversacion
   */
  static async getConversation(req: Request, res: Response): Promise<Response> {
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

      // Verificar que es participante (o admin del sistema)
      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      const isSystemAdmin = req.user?.role === 'admin'

      if (!isParticipant && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_NO_ACCESS,
          code: ERROR_CODES.MESSAGES_NO_ACCESS,
        })
      }

      const conversation = await ConversationRepository.getByIdWithDetails(conversationId, userId)

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
        })
      }

      // Obtener participantes
      const participants = await ConversationRepository.getParticipants(conversationId)

      return res.status(200).json({
        success: true,
        data: {
          ...conversation,
          participants,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getConversation')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_FETCH_CONVERSATION_ERROR,
        code: ERROR_CODES.MESSAGES_FETCH_CONVERSATION_ERROR,
      })
    }
  }

  /**
   * POST /api/messages/conversations
   * Crear nueva conversacion (DM o grupo)
   */
  static async createConversation(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      const { type, name, participant_ids } = req.body as CreateConversationDTO

      // Validaciones
      if (!type || !participant_ids || participant_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_MISSING_REQUIRED_FIELDS,
          code: ERROR_CODES.MESSAGES_MISSING_REQUIRED_FIELDS,
        })
      }

      if (type === ConversationType.DM) {
        // DM: solo puede haber 1 participante adicional
        if (participant_ids.length !== 1) {
          return res.status(400).json({
            success: false,
            error: ERROR_CODES.MESSAGES_DM_ONE_PARTICIPANT,
            code: ERROR_CODES.MESSAGES_DM_ONE_PARTICIPANT,
          })
        }

        // Verificar si ya existe un DM con este usuario
        const existingDM = await ConversationRepository.findExistingDM(userId, participant_ids[0])
        if (existingDM) {
          // Retornar el DM existente
          const conversation = await ConversationRepository.getByIdWithDetails(existingDM, userId)
          return res.status(200).json({
            success: true,
            data: conversation,
            message: SUCCESS_CODES.MESSAGES_DM_EXISTS,
            code: SUCCESS_CODES.MESSAGES_DM_EXISTS,
            existing: true,
          })
        }
      }

      if (type === ConversationType.GROUP) {
        // Grupo: validar nombre y limite de participantes
        if (!name || name.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: ERROR_CODES.MESSAGES_GROUP_NAME_REQUIRED,
            code: ERROR_CODES.MESSAGES_GROUP_NAME_REQUIRED,
          })
        }

        if (name.length > MESSAGE_CONSTANTS.MAX_GROUP_NAME_LENGTH) {
          return res.status(400).json({
            success: false,
            error: ERROR_CODES.MESSAGES_GROUP_NAME_TOO_LONG,
            code: ERROR_CODES.MESSAGES_GROUP_NAME_TOO_LONG,
          })
        }

        // +1 porque el creador tambien cuenta
        if (participant_ids.length + 1 > MESSAGE_CONSTANTS.MAX_GROUP_PARTICIPANTS) {
          return res.status(400).json({
            success: false,
            error: ERROR_CODES.MESSAGES_GROUP_MAX_PARTICIPANTS,
            code: ERROR_CODES.MESSAGES_GROUP_MAX_PARTICIPANTS,
          })
        }
      }

      // Crear conversacion
      const conversation = await ConversationRepository.create(
        type,
        userId,
        type === ConversationType.GROUP ? name : undefined
      )

      // Añadir al creador como admin
      await ConversationRepository.addParticipant(conversation.id, userId, true)

      // Añadir participantes
      await ConversationRepository.addParticipants(conversation.id, participant_ids)

      // Obtener conversacion con detalles
      const conversationWithDetails = await ConversationRepository.getByIdWithDetails(
        conversation.id,
        userId
      )

      return res.status(201).json({
        success: true,
        data: conversationWithDetails,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en createConversation')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_CREATE_CONVERSATION_ERROR,
        code: ERROR_CODES.MESSAGES_CREATE_CONVERSATION_ERROR,
      })
    }
  }

  /**
   * PATCH /api/messages/conversations/:id
   * Actualizar conversacion (nombre del grupo)
   */
  static async updateConversation(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const conversationId = parseInt(req.params.id)
      const { name } = req.body

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

      // Verificar que es admin de la conversacion
      const isAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_ADMIN_ONLY_EDIT,
          code: ERROR_CODES.MESSAGES_ADMIN_ONLY_EDIT,
        })
      }

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
        })
      }

      if (conversation.type !== ConversationType.GROUP) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_GROUPS_ONLY_EDIT,
          code: ERROR_CODES.MESSAGES_GROUPS_ONLY_EDIT,
        })
      }

      if (name) {
        if (name.length > MESSAGE_CONSTANTS.MAX_GROUP_NAME_LENGTH) {
          return res.status(400).json({
            success: false,
            error: ERROR_CODES.MESSAGES_GROUP_NAME_TOO_LONG,
            code: ERROR_CODES.MESSAGES_GROUP_NAME_TOO_LONG,
          })
        }
        await ConversationRepository.updateName(conversationId, name)
      }

      const updated = await ConversationRepository.getByIdWithDetails(conversationId, userId)

      return res.status(200).json({
        success: true,
        data: updated,
        message: SUCCESS_CODES.MESSAGES_GROUP_UPDATED,
        code: SUCCESS_CODES.MESSAGES_GROUP_UPDATED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en updateConversation')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_UPDATE_CONVERSATION_ERROR,
        code: ERROR_CODES.MESSAGES_UPDATE_CONVERSATION_ERROR,
      })
    }
  }

  /**
   * DELETE /api/messages/conversations/:id
   * Salir de una conversacion
   */
  static async leaveConversation(req: Request, res: Response): Promise<Response> {
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

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
        })
      }

      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_NOT_PARTICIPANT,
          code: ERROR_CODES.MESSAGES_NOT_PARTICIPANT,
        })
      }

      // Si es admin del grupo, transferir admin al siguiente
      const isAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      if (isAdmin && conversation.type === ConversationType.GROUP) {
        const participantCount = await ConversationRepository.countParticipants(conversationId)
        if (participantCount > 1) {
          await ConversationRepository.transferAdmin(conversationId, userId)
        }
      }

      // Remover participante
      await ConversationRepository.removeParticipant(conversationId, userId)

      // Si no quedan participantes, eliminar conversacion
      const remainingCount = await ConversationRepository.countParticipants(conversationId)
      if (remainingCount === 0) {
        await ConversationRepository.delete(conversationId)
      }

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.MESSAGES_LEFT_CONVERSATION,
        code: SUCCESS_CODES.MESSAGES_LEFT_CONVERSATION,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en leaveConversation')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_LEAVE_CONVERSATION_ERROR,
        code: ERROR_CODES.MESSAGES_LEAVE_CONVERSATION_ERROR,
      })
    }
  }

  /**
   * DELETE /api/messages/conversations/:id/delete
   * Eliminar conversacion completa (solo admin de la conversacion o admin del sistema)
   */
  static async deleteConversation(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const userRole = req.user?.role
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

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
        })
      }

      // Verificar permisos: admin del sistema o admin de la conversacion
      const isConversationAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      const isSystemAdmin = userRole === 'admin'

      if (!isConversationAdmin && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_ADMIN_OR_SYSTEM_DELETE,
          code: ERROR_CODES.MESSAGES_ADMIN_OR_SYSTEM_DELETE,
        })
      }

      // Eliminar conversacion completa (mensajes se eliminan por CASCADE)
      await ConversationRepository.deleteComplete(conversationId)

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.MESSAGES_CONVERSATION_DELETED,
        code: SUCCESS_CODES.MESSAGES_CONVERSATION_DELETED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en deleteConversation')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_DELETE_CONVERSATION_ERROR,
        code: ERROR_CODES.MESSAGES_DELETE_CONVERSATION_ERROR,
      })
    }
  }

  /**
   * POST /api/messages/conversations/:id/participants
   * Añadir participantes a un grupo
   */
  static async addParticipants(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const conversationId = parseInt(req.params.id)
      const { user_ids } = req.body

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

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_SPECIFY_USER,
          code: ERROR_CODES.MESSAGES_SPECIFY_USER,
        })
      }

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
        })
      }

      if (conversation.type !== ConversationType.GROUP) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_GROUPS_ONLY_ADD,
          code: ERROR_CODES.MESSAGES_GROUPS_ONLY_ADD,
        })
      }

      // Verificar que es admin
      const isAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_ADMIN_ONLY_ADD,
          code: ERROR_CODES.MESSAGES_ADMIN_ONLY_ADD,
        })
      }

      // Verificar limite
      const currentCount = await ConversationRepository.countParticipants(conversationId)
      if (currentCount + user_ids.length > MESSAGE_CONSTANTS.MAX_GROUP_PARTICIPANTS) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_GROUP_MAX_PARTICIPANTS,
          code: ERROR_CODES.MESSAGES_GROUP_MAX_PARTICIPANTS,
        })
      }

      await ConversationRepository.addParticipants(conversationId, user_ids)

      const participants = await ConversationRepository.getParticipants(conversationId)

      return res.status(200).json({
        success: true,
        data: participants,
        message: SUCCESS_CODES.MESSAGES_PARTICIPANTS_ADDED,
        code: SUCCESS_CODES.MESSAGES_PARTICIPANTS_ADDED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en addParticipants')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_ADD_PARTICIPANTS_ERROR,
        code: ERROR_CODES.MESSAGES_ADD_PARTICIPANTS_ERROR,
      })
    }
  }

  /**
   * DELETE /api/messages/conversations/:id/participants/:userId
   * Remover participante de un grupo
   */
  static async removeParticipant(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const conversationId = parseInt(req.params.id)
      const targetUserId = req.params.userId

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

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
          code: ERROR_CODES.MESSAGES_CONVERSATION_NOT_FOUND,
        })
      }

      if (conversation.type !== ConversationType.GROUP) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_GROUPS_ONLY_REMOVE,
          code: ERROR_CODES.MESSAGES_GROUPS_ONLY_REMOVE,
        })
      }

      // Verificar que es admin
      const isAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_ADMIN_ONLY_REMOVE,
          code: ERROR_CODES.MESSAGES_ADMIN_ONLY_REMOVE,
        })
      }

      // No puede removerse a si mismo (usar leave)
      if (targetUserId === userId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.MESSAGES_USE_LEAVE_OPTION,
          code: ERROR_CODES.MESSAGES_USE_LEAVE_OPTION,
        })
      }

      await ConversationRepository.removeParticipant(conversationId, targetUserId)

      const participants = await ConversationRepository.getParticipants(conversationId)

      return res.status(200).json({
        success: true,
        data: participants,
        message: SUCCESS_CODES.MESSAGES_PARTICIPANT_REMOVED,
        code: SUCCESS_CODES.MESSAGES_PARTICIPANT_REMOVED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en removeParticipant')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_REMOVE_PARTICIPANT_ERROR,
        code: ERROR_CODES.MESSAGES_REMOVE_PARTICIPANT_ERROR,
      })
    }
  }

  /**
   * POST /api/messages/conversations/:id/read
   * Marcar conversacion como leida
   */
  static async markAsRead(req: Request, res: Response): Promise<Response> {
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

      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_NOT_PARTICIPANT,
          code: ERROR_CODES.MESSAGES_NOT_PARTICIPANT,
        })
      }

      await ConversationRepository.updateLastRead(conversationId, userId)

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.MESSAGES_MARKED_READ,
        code: SUCCESS_CODES.MESSAGES_MARKED_READ,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en markAsRead')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_MARK_READ_ERROR,
        code: ERROR_CODES.MESSAGES_MARK_READ_ERROR,
      })
    }
  }

  /**
   * GET /api/messages/users
   * Buscar usuarios para iniciar conversacion
   */
  static async searchUsers(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const search = req.query.q as string

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      let users
      if (search && search.trim().length > 0) {
        users = await ConversationRepository.searchUsers(search, userId)
      } else {
        users = await ConversationRepository.getAllUsers(userId)
      }

      return res.status(200).json({
        success: true,
        data: users,
        count: users.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en searchUsers')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_SEARCH_USERS_ERROR,
        code: ERROR_CODES.MESSAGES_SEARCH_USERS_ERROR,
      })
    }
  }

  /**
   * GET /api/messages/conversations/all (solo admin)
   * Obtener todas las conversaciones (moderacion)
   */
  static async getAllConversations(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id
      const userRole = req.user?.role

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
      }

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: ERROR_CODES.MESSAGES_ADMIN_ONLY_VIEW_ALL,
          code: ERROR_CODES.MESSAGES_ADMIN_ONLY_VIEW_ALL,
        })
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
      const conversations = await ConversationRepository.getAll(limit)

      return res.status(200).json({
        success: true,
        data: conversations,
        count: conversations.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getAllConversations')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.MESSAGES_FETCH_CONVERSATIONS_ERROR,
        code: ERROR_CODES.MESSAGES_FETCH_CONVERSATIONS_ERROR,
      })
    }
  }
}
