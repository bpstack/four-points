// controllers/group/group-history-controller.ts

import { Request, Response } from 'express'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { GroupRepository } from '../../repositories/group/group-repository'

export class GroupHistoryController {
  /**
   * GET /api/groups/:id/history
   * Obtener historial completo de un grupo
   */
  static async getGroupHistory(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100

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

      const history = await GroupHistoryService.getGroupHistory(groupId, limit)

      return res.status(200).json({
        success: true,
        data: history,
        count: history.length,
      })
    } catch (error: any) {
      console.error('Error en getGroupHistory:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener historial',
        message: error.message,
      })
    }
  }
}
