import { Request, Response } from 'express'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import db from '../../config/db.js'
import type { HistoryWithDetails, HistoryAction } from '../../models/cashier/index.js'
import { logger } from '../../config/logger.js'
import {
  historyListQuerySchema,
  dateRangeQuerySchema,
  recentHistoryQuerySchema,
  validationError,
} from '../../validations/cashier/cashier-validation.js'

export class CashierHistoryController {
  /**
   * GET /api/cashier/history
   * Obtener historial con filtros
   */
  static async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = historyListQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }

      const filters = {
        ...parsed.data,
        action: parsed.data.action as HistoryAction | undefined,
        limit: parsed.data.limit ?? 50,
        offset: parsed.data.offset ?? 0,
        order: parsed.data.order ?? 'DESC',
      }

      const history = await CashierHistoryRepository.getAll(filters)

      // ✅ Enriquecer con datos de shift y usuario
      const enrichedHistory: HistoryWithDetails[] = await Promise.all(
        history.map(async (entry) => {
          // Obtener datos del shift
          const shift = await CashierShiftRepository.getById(entry.shift_id)

          // Obtener username si hay changed_by
          let username = null
          if (entry.changed_by) {
            const user = await UserRepository.getById(entry.changed_by)
            username = user?.username || null
          }

          return {
            ...entry,
            shift_date: shift?.shift_date,
            shift_type: shift?.shift_type,
            shift_status: shift?.status,
            username,
          }
        })
      )

      return res.status(200).json({
        success: true,
        data: enrichedHistory,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getAll (history)')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener historial',
      })
    }
  }

  /**
   * GET /api/cashier/history/stats
   * Obtener estadísticas del historial
   */
  static async getStats(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = dateRangeQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const { from_date, to_date } = parsed.data
      const filters = { from_date, to_date }

      // Total de entradas
      const totalEntries = await CashierHistoryRepository.count(filters)

      // Desglose por acción
      const query = `
        SELECT 
          action,
          COUNT(*) as count
        FROM cashier_history
        WHERE 1=1
          ${from_date ? 'AND DATE(changed_at) >= ?' : ''}
          ${to_date ? 'AND DATE(changed_at) <= ?' : ''}
        GROUP BY action
        ORDER BY count DESC
      `

      const params: string[] = []
      if (from_date) params.push(from_date as string)
      if (to_date) params.push(to_date as string)

      const [actionsBreakdown] = await db.query<any[]>(query, params)

      // Usuarios más activos
      const usersQuery = `
        SELECT 
          changed_by as user_id,
          COUNT(*) as actions_count
        FROM cashier_history
        WHERE changed_by IS NOT NULL
          ${from_date ? 'AND DATE(changed_at) >= ?' : ''}
          ${to_date ? 'AND DATE(changed_at) <= ?' : ''}
        GROUP BY changed_by
        ORDER BY actions_count DESC
        LIMIT 10
      `

      const [usersStats] = await db.query<any[]>(usersQuery, params)

      // Enriquecer con usernames
      const mostActiveUsers = await Promise.all(
        usersStats.map(async (stat) => {
          const user = await UserRepository.getById(stat.user_id)
          return {
            user_id: stat.user_id,
            username: user?.username || 'Desconocido',
            actions_count: stat.actions_count,
          }
        })
      )

      // Actividad reciente (últimas 10 entradas)
      const recentHistory = await CashierHistoryRepository.getAll({
        ...filters,
        limit: 10,
        sort: 'changed_at',
        order: 'DESC',
      })

      // Enriquecer actividad reciente
      const enrichedRecent: HistoryWithDetails[] = await Promise.all(
        recentHistory.map(async (entry) => {
          const shift = await CashierShiftRepository.getById(entry.shift_id)
          let username = null
          if (entry.changed_by) {
            const user = await UserRepository.getById(entry.changed_by)
            username = user?.username || null
          }

          return {
            ...entry,
            shift_date: shift?.shift_date,
            shift_type: shift?.shift_type,
            shift_status: shift?.status,
            username,
          }
        })
      )

      return res.status(200).json({
        success: true,
        data: {
          total_entries: totalEntries,
          actions_breakdown: actionsBreakdown,
          most_active_users: mostActiveUsers,
          recent_activity: enrichedRecent,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getStats (history)')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas de historial',
      })
    }
  }

  /**
   * GET /api/cashier/history/shift/:shiftId
   * Obtener historial de un turno específico
   */
  static async getByShift(req: Request, res: Response): Promise<Response> {
    try {
      const shiftId = parseInt(req.params.shiftId)

      if (isNaN(shiftId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de turno inválido',
        })
      }

      // Verificar que el turno existe
      const shift = await CashierShiftRepository.getById(shiftId)
      if (!shift) {
        return res.status(404).json({
          success: false,
          error: 'Turno no encontrado',
        })
      }

      const history = await CashierHistoryRepository.getByShift(shiftId)

      // Enriquecer con usernames
      const enrichedHistory = await Promise.all(
        history.map(async (entry) => {
          let username = null
          if (entry.changed_by) {
            const user = await UserRepository.getById(entry.changed_by)
            username = user?.username || null
          }

          return {
            ...entry,
            shift_date: shift.shift_date,
            shift_type: shift.shift_type,
            shift_status: shift.status,
            username,
          }
        })
      )

      return res.status(200).json({
        success: true,
        data: {
          shift: {
            id: shift.id,
            shift_date: shift.shift_date,
            shift_type: shift.shift_type,
            status: shift.status,
          },
          history: enrichedHistory,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getByShift (history)')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener historial del turno',
      })
    }
  }

  /**
   * GET /api/cashier/history/recent
   * Obtener actividad reciente
   */
  static async getRecent(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = recentHistoryQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const limit = parsed.data.limit ?? 50

      const history = await CashierHistoryRepository.getRecentActivity(limit)

      // Enriquecer con datos adicionales
      const enrichedHistory: HistoryWithDetails[] = await Promise.all(
        history.map(async (entry) => {
          const shift = await CashierShiftRepository.getById(entry.shift_id)
          let username = null
          if (entry.changed_by) {
            const user = await UserRepository.getById(entry.changed_by)
            username = user?.username || null
          }

          return {
            ...entry,
            shift_date: shift?.shift_date,
            shift_type: shift?.shift_type,
            shift_status: shift?.status,
            username,
          }
        })
      )

      return res.status(200).json({
        success: true,
        data: enrichedHistory,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getRecent (history)')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener actividad reciente',
      })
    }
  }
}
