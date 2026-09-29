// controllers/activity/activity-controller.ts
/**
 * Controlador para actividad reciente unificada
 */

import { Request, Response } from 'express'
import {
  ActivityRepository,
  ActivitySource,
} from '../../repositories/activity/activity-repository.js'
import { ERROR_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

export class ActivityController {
  /**
   * GET /api/activity/recent
   * Obtener actividad reciente de todas las fuentes
   * Query params:
   *  - limit: número de resultados (default: 5, max: 50)
   *  - source: filtrar por fuente específica (cashier|groups|logbook|maintenance)
   *  - user_id: filtrar por usuario específico
   *  - date: filtrar por fecha de actividad (formato: YYYY-MM-DD)
   */
  static async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      // Validar y parsear limit
      let limit = parseInt(req.query.limit as string) || 5
      limit = Math.min(Math.max(limit, 1), 50) // Entre 1 y 50

      const source = req.query.source as ActivitySource | undefined
      const userId = req.query.user_id as string | undefined
      const date = req.query.date as string | undefined
      const dateFrom = req.query.date_from as string | undefined
      const dateTo = req.query.date_to as string | undefined

      // Validar source si está presente
      const validSources: ActivitySource[] = ['cashier', 'groups', 'logbook', 'maintenance']
      if (source && !validSources.includes(source)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.ACTIVITY_INVALID_SOURCE,
          code: ERROR_CODES.ACTIVITY_INVALID_SOURCE,
        })
        return
      }

      const datePattern = /^\d{4}-\d{2}-\d{2}$/
      if (date && !datePattern.test(date)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.ACTIVITY_INVALID_DATE_FORMAT,
          code: ERROR_CODES.ACTIVITY_INVALID_DATE_FORMAT,
        })
        return
      }
      if ((dateFrom && !datePattern.test(dateFrom)) || (dateTo && !datePattern.test(dateTo))) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.ACTIVITY_INVALID_DATE_FORMAT,
          code: ERROR_CODES.ACTIVITY_INVALID_DATE_FORMAT,
        })
        return
      }

      let activities

      if (dateFrom || dateTo) {
        const to = dateTo || new Date().toISOString().slice(0, 10)
        let from = dateFrom
        if (!from) {
          const d = new Date(to)
          d.setDate(d.getDate() - 30)
          from = d.toISOString().slice(0, 10)
        }
        activities = await ActivityRepository.getActivityByDateRange(from, to, limit, source)
      } else if (date) {
        activities = await ActivityRepository.getActivityByDate(date, limit, source)
      } else if (userId) {
        activities = await ActivityRepository.getActivityByUser(userId, limit)
      } else if (source) {
        activities = await ActivityRepository.getActivityBySource(source, limit)
      } else {
        activities = await ActivityRepository.getRecentActivity(limit)
      }

      res.json({
        success: true,
        data: activities,
        meta: {
          count: activities.length,
          limit,
          filters: {
            source: source || null,
            user_id: userId || null,
            date: date || null,
            date_from: dateFrom || null,
            date_to: dateTo || null,
          },
        },
      })
    } catch (error) {
      logger.error({ err: error }, '[ActivityController] Error en getRecentActivity')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.ACTIVITY_FETCH_ERROR,
        code: ERROR_CODES.ACTIVITY_FETCH_ERROR,
      })
    }
  }
}
