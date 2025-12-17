// controllers/activity/activity-controller.ts
/**
 * Controlador para actividad reciente unificada
 */

import { Request, Response } from 'express'
import { ActivityRepository, ActivitySource } from '../../repositories/activity/activity-repository.js'

export class ActivityController {
  /**
   * GET /api/activity/recent
   * Obtener actividad reciente de todas las fuentes
   * Query params:
   *  - limit: número de resultados (default: 5, max: 50)
   *  - source: filtrar por fuente específica (cashier|groups|logbook|maintenance)
   *  - user_id: filtrar por usuario específico
   */
  static async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      // Validar y parsear limit
      let limit = parseInt(req.query.limit as string) || 5
      limit = Math.min(Math.max(limit, 1), 50) // Entre 1 y 50

      const source = req.query.source as ActivitySource | undefined
      const userId = req.query.user_id as string | undefined

      let activities

      // Aplicar filtros según parámetros
      if (userId) {
        activities = await ActivityRepository.getActivityByUser(userId, limit)
      } else if (source) {
        // Validar source
        const validSources: ActivitySource[] = ['cashier', 'groups', 'logbook', 'maintenance']
        if (!validSources.includes(source)) {
          res.status(400).json({
            success: false,
            error: `Fuente inválida. Valores permitidos: ${validSources.join(', ')}`,
          })
          return
        }
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
          },
        },
      })
    } catch (error) {
      console.error('[ActivityController] Error en getRecentActivity:', error)
      res.status(500).json({
        success: false,
        error: 'Error al obtener actividad reciente',
      })
    }
  }
}
