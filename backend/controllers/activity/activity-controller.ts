// controllers/activity/activity-controller.ts
/**
 * Controlador para actividad reciente unificada
 */

import { Request, Response } from 'express'
import { ActivityRepository, ActivitySource } from '../../repositories/activity/activity-repository.js'
import { ERROR_CODES } from '../../config/error-codes.js'

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

      // Validar formato de fecha si está presente
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.ACTIVITY_INVALID_DATE_FORMAT,
          code: ERROR_CODES.ACTIVITY_INVALID_DATE_FORMAT,
        })
        return
      }

      let activities

      // Aplicar filtros según parámetros
      // Prioridad: date > user_id > source > all
      if (date) {
        // Filtro por fecha (puede combinarse con source)
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
          },
        },
      })
    } catch (error) {
      console.error('[ActivityController] Error en getRecentActivity:', error)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.ACTIVITY_FETCH_ERROR,
        code: ERROR_CODES.ACTIVITY_FETCH_ERROR,
      })
    }
  }
}
