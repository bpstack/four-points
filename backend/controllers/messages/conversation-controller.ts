// controllers/messages/conversation-controller.ts

import { Request, Response } from 'express'
import { ConversationRepository } from '../../repositories/messages/conversation-repository.js'
import {
  ConversationType,
  MESSAGE_CONSTANTS,
  CreateConversationDTO,
} from '../../models/messages/index.js'

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
          error: 'Usuario no autenticado',
        })
      }

      const conversations = await ConversationRepository.getByUserId(userId)

      return res.status(200).json({
        success: true,
        data: conversations,
        count: conversations.length,
      })
    } catch (error: any) {
      console.error('Error en getMyConversations:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener conversaciones',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de conversacion invalido',
        })
      }

      // Verificar que es participante (o admin del sistema)
      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      const isSystemAdmin = req.user?.role === 'admin'

      if (!isParticipant && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          error: 'No tienes acceso a esta conversacion',
        })
      }

      const conversation = await ConversationRepository.getByIdWithDetails(conversationId, userId)

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversacion no encontrada',
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
      console.error('Error en getConversation:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener conversacion',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      const { type, name, participant_ids } = req.body as CreateConversationDTO

      // Validaciones
      if (!type || !participant_ids || participant_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: type, participant_ids',
        })
      }

      if (type === ConversationType.DM) {
        // DM: solo puede haber 1 participante adicional
        if (participant_ids.length !== 1) {
          return res.status(400).json({
            success: false,
            error: 'Un DM debe tener exactamente 1 participante',
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
            message: 'DM existente encontrado',
            existing: true,
          })
        }
      }

      if (type === ConversationType.GROUP) {
        // Grupo: validar nombre y limite de participantes
        if (!name || name.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Los grupos requieren un nombre',
          })
        }

        if (name.length > MESSAGE_CONSTANTS.MAX_GROUP_NAME_LENGTH) {
          return res.status(400).json({
            success: false,
            error: `El nombre del grupo no puede superar ${MESSAGE_CONSTANTS.MAX_GROUP_NAME_LENGTH} caracteres`,
          })
        }

        // +1 porque el creador tambien cuenta
        if (participant_ids.length + 1 > MESSAGE_CONSTANTS.MAX_GROUP_PARTICIPANTS) {
          return res.status(400).json({
            success: false,
            error: `Un grupo no puede tener mas de ${MESSAGE_CONSTANTS.MAX_GROUP_PARTICIPANTS} participantes`,
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
        message: type === ConversationType.DM ? 'DM creado' : 'Grupo creado',
      })
    } catch (error: any) {
      console.error('Error en createConversation:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al crear conversacion',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de conversacion invalido',
        })
      }

      // Verificar que es admin de la conversacion
      const isAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Solo el admin puede editar el grupo',
        })
      }

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversacion no encontrada',
        })
      }

      if (conversation.type !== ConversationType.GROUP) {
        return res.status(400).json({
          success: false,
          error: 'Solo los grupos pueden ser editados',
        })
      }

      if (name) {
        if (name.length > MESSAGE_CONSTANTS.MAX_GROUP_NAME_LENGTH) {
          return res.status(400).json({
            success: false,
            error: `El nombre no puede superar ${MESSAGE_CONSTANTS.MAX_GROUP_NAME_LENGTH} caracteres`,
          })
        }
        await ConversationRepository.updateName(conversationId, name)
      }

      const updated = await ConversationRepository.getByIdWithDetails(conversationId, userId)

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Grupo actualizado',
      })
    } catch (error: any) {
      console.error('Error en updateConversation:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar conversacion',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de conversacion invalido',
        })
      }

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversacion no encontrada',
        })
      }

      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          error: 'No eres participante de esta conversacion',
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
        message: 'Has salido de la conversacion',
      })
    } catch (error: any) {
      console.error('Error en leaveConversation:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al salir de la conversacion',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de conversacion invalido',
        })
      }

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversacion no encontrada',
        })
      }

      // Verificar permisos: admin del sistema o admin de la conversacion
      const isConversationAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      const isSystemAdmin = userRole === 'admin'

      if (!isConversationAdmin && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Solo el admin de la conversacion o administrador del sistema puede eliminarla',
        })
      }

      // Eliminar conversacion completa (mensajes se eliminan por CASCADE)
      await ConversationRepository.deleteComplete(conversationId)

      return res.status(200).json({
        success: true,
        message: 'Conversacion eliminada correctamente',
      })
    } catch (error: any) {
      console.error('Error en deleteConversation:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar conversacion',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de conversacion invalido',
        })
      }

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debes especificar al menos un usuario',
        })
      }

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversacion no encontrada',
        })
      }

      if (conversation.type !== ConversationType.GROUP) {
        return res.status(400).json({
          success: false,
          error: 'Solo se pueden añadir participantes a grupos',
        })
      }

      // Verificar que es admin
      const isAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Solo el admin puede añadir participantes',
        })
      }

      // Verificar limite
      const currentCount = await ConversationRepository.countParticipants(conversationId)
      if (currentCount + user_ids.length > MESSAGE_CONSTANTS.MAX_GROUP_PARTICIPANTS) {
        return res.status(400).json({
          success: false,
          error: `El grupo no puede superar ${MESSAGE_CONSTANTS.MAX_GROUP_PARTICIPANTS} participantes`,
        })
      }

      await ConversationRepository.addParticipants(conversationId, user_ids)

      const participants = await ConversationRepository.getParticipants(conversationId)

      return res.status(200).json({
        success: true,
        data: participants,
        message: 'Participantes añadidos',
      })
    } catch (error: any) {
      console.error('Error en addParticipants:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al añadir participantes',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de conversacion invalido',
        })
      }

      const conversation = await ConversationRepository.getById(conversationId)
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversacion no encontrada',
        })
      }

      if (conversation.type !== ConversationType.GROUP) {
        return res.status(400).json({
          success: false,
          error: 'Solo se pueden remover participantes de grupos',
        })
      }

      // Verificar que es admin
      const isAdmin = await ConversationRepository.isAdmin(conversationId, userId)
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Solo el admin puede remover participantes',
        })
      }

      // No puede removerse a si mismo (usar leave)
      if (targetUserId === userId) {
        return res.status(400).json({
          success: false,
          error: 'Usa la opcion de salir para abandonar el grupo',
        })
      }

      await ConversationRepository.removeParticipant(conversationId, targetUserId)

      const participants = await ConversationRepository.getParticipants(conversationId)

      return res.status(200).json({
        success: true,
        data: participants,
        message: 'Participante removido',
      })
    } catch (error: any) {
      console.error('Error en removeParticipant:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al remover participante',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de conversacion invalido',
        })
      }

      const isParticipant = await ConversationRepository.isParticipant(conversationId, userId)
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          error: 'No eres participante de esta conversacion',
        })
      }

      await ConversationRepository.updateLastRead(conversationId, userId)

      return res.status(200).json({
        success: true,
        message: 'Conversacion marcada como leida',
      })
    } catch (error: any) {
      console.error('Error en markAsRead:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al marcar como leida',
        message: error.message,
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
          error: 'Usuario no autenticado',
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
      console.error('Error en searchUsers:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al buscar usuarios',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden ver todas las conversaciones',
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
      console.error('Error en getAllConversations:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener conversaciones',
        message: error.message,
      })
    }
  }
}
