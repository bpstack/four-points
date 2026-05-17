// controllers/group/group-history-controller.ts

import { Request, Response } from 'express'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { GroupRepository } from '../../repositories/group/group-repository'
import { ERROR_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

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

      const history = await GroupHistoryService.getGroupHistory(groupId, limit)

      return res.status(200).json({
        success: true,
        data: history,
        count: history.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getGroupHistory')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_HISTORY_FETCH_ERROR,
        code: ERROR_CODES.GROUP_HISTORY_FETCH_ERROR,
      })
    }
  }
}
