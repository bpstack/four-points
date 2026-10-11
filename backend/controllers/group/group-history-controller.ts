// controllers/group/group-history-controller.ts

import { Request, Response } from 'express'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { GroupRepository } from '../../repositories/group/group-repository'
import { ERROR_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'
import { canSeeGroupContacts } from '../../middlewares/roleCheck.js'
import { groupHistoryQuerySchema, validationError } from '../../validations/group/group-schemas.js'

export class GroupHistoryController {
  /**
   * GET /api/groups/:id/history
   * Obtener historial completo de un grupo
   */
  static async getGroupHistory(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const parsed = groupHistoryQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const limit = parsed.data.limit ?? 100

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

      // Contact entries keep the email and phone as JSON: only for the roles
      // that may see the contacts themselves
      const all = await GroupHistoryService.getGroupHistory(groupId, limit)
      const history = canSeeGroupContacts(req.user?.role)
        ? all
        : all.filter((h) => h.table_affected !== 'group_contacts')

      return res.status(200).json({
        success: true,
        data: history,
        count: history.length,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en getGroupHistory')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_HISTORY_FETCH_ERROR,
        code: ERROR_CODES.GROUP_HISTORY_FETCH_ERROR,
      })
    }
  }
}
