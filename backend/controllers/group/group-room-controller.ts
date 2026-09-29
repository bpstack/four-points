// controllers/group/group-room-controller.ts

import { Request, Response } from 'express'
import { GroupRoomRepository } from '../../repositories/group/group-room-repository'
import { GroupRepository } from '../../repositories/group/group-repository'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { CreateGroupRoomDTO, UpdateGroupRoomDTO } from '../../models/group/index'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'
import { createRoomSchema, updateRoomSchema, validationError } from '../../validations/group/group-schemas.js'

export class GroupRoomController {
  /**
   * GET /api/groups/:id/rooms
   * Obtener todas las habitaciones de un grupo
   */
  static async getRoomsByGroup(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_INVALID_ID,
          code: ERROR_CODES.GROUP_INVALID_ID,
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const rooms = await GroupRoomRepository.getByGroupId(groupId)
      const summary = await GroupRoomRepository.getTotalRoomsByGroup(groupId)

      return res.status(200).json({
        success: true,
        data: {
          rooms,
          summary,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getRoomsByGroup')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_ROOM_FETCH_ERROR,
        code: ERROR_CODES.GROUP_ROOM_FETCH_ERROR,
      })
    }
  }

  /**
   * POST /api/groups/:id/rooms
   * Crear o actualizar habitación (UPSERT)
   */
  static async createOrUpdateRoom(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_INVALID_ID,
          code: ERROR_CODES.GROUP_INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const parsed = createRoomSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }

      const roomData = {
        ...parsed.data,
        group_id: groupId,
        guests_per_room: parsed.data.guests_per_room ?? 1,
      } as CreateGroupRoomDTO

      const result = await GroupRoomRepository.createOrUpdate(roomData)

      await GroupHistoryService.logChange(
        groupId,
        userId,
        'created' as any,
        'group_rooms',
        result.insertId,
        null,
        null,
        JSON.stringify(roomData),
        'Habitación creada/actualizada'
      )

      return res.status(201).json({
        success: true,
        message: SUCCESS_CODES.GROUP_ROOM_SAVED,
        code: SUCCESS_CODES.GROUP_ROOM_SAVED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en createOrUpdateRoom')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_ROOM_SAVE_ERROR,
        code: ERROR_CODES.GROUP_ROOM_SAVE_ERROR,
      })
    }
  }

  /**
   * PUT /api/groups/:id/rooms/:roomId
   * Actualizar habitación específica
   */
  static async updateRoom(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const roomId = parseInt(req.params.roomId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(roomId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const oldRoom = await GroupRoomRepository.getById(roomId)

      if (!oldRoom) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_ROOM_NOT_FOUND,
          code: ERROR_CODES.GROUP_ROOM_NOT_FOUND,
        })
      }

      if (oldRoom.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_ROOM_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_ROOM_NOT_IN_GROUP,
        })
      }

      const parsed = updateRoomSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const updateData = parsed.data as UpdateGroupRoomDTO

      const updated = await GroupRoomRepository.update(roomId, updateData)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_ROOM_UPDATE_ERROR,
          code: ERROR_CODES.GROUP_ROOM_UPDATE_ERROR,
        })
      }

      await GroupHistoryService.logChange(
        groupId,
        userId,
        'updated' as any,
        'group_rooms',
        roomId,
        null,
        JSON.stringify(oldRoom),
        JSON.stringify(updateData),
        'Habitación actualizada'
      )

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_ROOM_UPDATED,
        code: SUCCESS_CODES.GROUP_ROOM_UPDATED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en updateRoom')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_ROOM_UPDATE_ERROR,
        code: ERROR_CODES.GROUP_ROOM_UPDATE_ERROR,
      })
    }
  }

  /**
   * DELETE /api/groups/:id/rooms/:roomId
   * Eliminar habitación
   */
  static async deleteRoom(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const roomId = parseInt(req.params.roomId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(roomId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const room = await GroupRoomRepository.getById(roomId)

      if (!room) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_ROOM_NOT_FOUND,
          code: ERROR_CODES.GROUP_ROOM_NOT_FOUND,
        })
      }

      if (room.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_ROOM_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_ROOM_NOT_IN_GROUP,
        })
      }

      const deleted = await GroupRoomRepository.delete(roomId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_ROOM_DELETE_ERROR,
          code: ERROR_CODES.GROUP_ROOM_DELETE_ERROR,
        })
      }

      await GroupHistoryService.logDeleted(groupId, userId, 'group_rooms', roomId, room)

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_ROOM_DELETED,
        code: SUCCESS_CODES.GROUP_ROOM_DELETED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en deleteRoom')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_ROOM_DELETE_ERROR,
        code: ERROR_CODES.GROUP_ROOM_DELETE_ERROR,
      })
    }
  }
}
