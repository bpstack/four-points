// backend/controllers/demo/demo-activity-controller.ts
/**
 * Controller para consultar y gestionar logs de actividad demo
 * Solo accesible para administradores
 */

import type { Request, Response } from 'express'
import { DemoActivityRepository } from '../../repositories/demo/demo-activity-repository.js'
import { logger } from '../../config/logger.js'

// ========================================
// CONTROLLER
// ========================================

export class DemoActivityController {
  /**
   * GET /api/demo-activity/logs
   * Obtener logs de actividad demo con paginación y filtros
   * Query params: limit, offset, username, method, route, startDate, endDate, blocked
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 500) : 50
      const offset = req.query.offset ? Number(req.query.offset) : 0

      const filters = {
        username: req.query.username as string | undefined,
        method: req.query.method as string | undefined,
        route: req.query.route as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        blocked: req.query.blocked !== undefined ? req.query.blocked === 'true' : undefined,
      }

      const { logs, total } = await DemoActivityRepository.getLogs(limit, offset, filters)

      res.json({
        success: true,
        logs,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + logs.length < total,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, '[DemoActivityController.getLogs] Error')
      res.status(500).json({
        success: false,
        error: 'Error al obtener logs de actividad demo',
      })
    }
  }

  /**
   * GET /api/demo-activity/stats
   * Obtener estadísticas de actividad demo
   * Query params: days (default 30)
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? Math.min(Number(req.query.days), 365) : 30

      const stats = await DemoActivityRepository.getStats(days)

      res.json({
        success: true,
        days,
        stats,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[DemoActivityController.getStats] Error')
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas de actividad demo',
      })
    }
  }

  /**
   * GET /api/demo-activity/export
   * Exportar logs a formato markdown
   * Query params: limit (default 100, max 500)
   */
  static async exportToMarkdown(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 500) : 100

      const markdown = await DemoActivityRepository.exportToMarkdown(limit)

      // Enviar como archivo markdown
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="registrosDemo.md"')
      res.send(markdown)
    } catch (error: any) {
      logger.error({ err: error }, '[DemoActivityController.exportToMarkdown] Error')
      res.status(500).json({
        success: false,
        error: 'Error al exportar logs de actividad demo',
      })
    }
  }

  /**
   * DELETE /api/demo-activity/cleanup
   * Limpiar logs antiguos
   * Query params: daysToKeep (default 90, min 30)
   */
  static async cleanupOldLogs(req: Request, res: Response): Promise<void> {
    try {
      const daysToKeep = req.query.daysToKeep 
        ? Math.max(Number(req.query.daysToKeep), 30) 
        : 90

      const deletedCount = await DemoActivityRepository.cleanOldLogs(daysToKeep)

      res.json({
        success: true,
        message: `Se eliminaron ${deletedCount} registros antiguos (más de ${daysToKeep} días)`,
        deletedCount,
        daysToKeep,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[DemoActivityController.cleanupOldLogs] Error')
      res.status(500).json({
        success: false,
        error: 'Error al limpiar logs antiguos',
      })
    }
  }
}
