// controllers/group/group-room-controller.ts

import { Request, Response } from 'express'
import { GroupRoomRepository } from '../../repositories/group/group-room-repository'
import { GroupRepository } from '../../repositories/group/group-repository'
import { GroupHistoryService } from '../../services/group/group-history-service'
import {
  CreateGroupRoomDTO,
  UpdateGroupRoomDTO,
} from '../../models/group/index'

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
          error: 'ID de grupo inválido',
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo no encontrado',
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
      console.error('Error en getRoomsByGroup:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener habitaciones',
        message: error.message,
      })
    }
  }

  /**
   * POST /api/groups/:id/rooms
   * Crear o actualizar habitación (UPSERT)
   */
  static async createOrUpdateRoom(
    req: Request,
    res: Response
  ): Promise<Response> {
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

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo no encontrado',
        })
      }

      const roomData: CreateGroupRoomDTO = {
        group_id: groupId,
        room_type: req.body.room_type,
        quantity: req.body.quantity,
        guests_per_room: req.body.guests_per_room || 1,
        notes: req.body.notes,
      }

      if (!roomData.room_type || !roomData.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: room_type, quantity',
        })
      }

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
        message: 'Habitación guardada correctamente',
      })
    } catch (error: any) {
      console.error('Error en createOrUpdateRoom:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al guardar habitación',
        message: error.message,
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
          error: 'IDs inválidos',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const oldRoom = await GroupRoomRepository.getById(roomId)

      if (!oldRoom) {
        return res.status(404).json({
          success: false,
          error: 'Habitación no encontrada',
        })
      }

      if (oldRoom.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: 'La habitación no pertenece a este grupo',
        })
      }

      const updateData: UpdateGroupRoomDTO = req.body

      const updated = await GroupRoomRepository.update(roomId, updateData)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar habitación',
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
        message: 'Habitación actualizada correctamente',
      })
    } catch (error: any) {
      console.error('Error en updateRoom:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar habitación',
        message: error.message,
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
          error: 'IDs inválidos',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const room = await GroupRoomRepository.getById(roomId)

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Habitación no encontrada',
        })
      }

      if (room.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: 'La habitación no pertenece a este grupo',
        })
      }

      const deleted = await GroupRoomRepository.delete(roomId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Error al eliminar habitación',
        })
      }

      await GroupHistoryService.logDeleted(
        groupId,
        userId,
        'group_rooms',
        roomId,
        room
      )

      return res.status(200).json({
        success: true,
        message: 'Habitación eliminada correctamente',
      })
    } catch (error: any) {
      console.error('Error en deleteRoom:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar habitación',
        message: error.message,
      })
    }
  }
}
