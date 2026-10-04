// controllers/cashier/cashier-daily-controller.ts

import { Request, Response } from 'express'
import { CashierDailyRepository } from '../../repositories/cashier/cashier-daily-repository.js'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { DailyStatus, ShiftType } from '../../models/cashier/index.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'
import {
  initializeDaySchema,
  closeDaySchema,
  dailyListQuerySchema,
  validationError,
} from '../../validations/cashier/cashier-validation.js'

export class CashierDailyController {
  /**
   * GET /api/cashier/daily/:date
   * Obtener día completo con sus 4 turnos
   */
  static async getByDate(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params

      const dailyDetail = await CashierDailyRepository.getDetailsByDate(date)

      if (!dailyDetail) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.CASHIER_DAY_NOT_FOUND,
          code: ERROR_CODES.CASHIER_DAY_NOT_FOUND,
        })
        return
      }

      res.json(dailyDetail)
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener día')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.CASHIER_FETCH_DAY_ERROR,
        code: ERROR_CODES.CASHIER_FETCH_DAY_ERROR,
      })
    }
  }

  /**
   * POST /api/cashier/daily/:date/initialize
   * Inicializar día (crear 4 turnos: noche, mañana, tarde, cierre)
   */
  static async initializeDay(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params
      const opened_by = req.user?.id
      if (!opened_by) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
        return
      }

      const parsed = initializeDaySchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { primary_user_id, secondary_user_ids } = parsed.data

      // Verificar si el día ya existe
      const existingDaily = await CashierDailyRepository.getByDate(date)
      if (existingDaily) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.CASHIER_DAY_ALREADY_INITIALIZED,
          code: ERROR_CODES.CASHIER_DAY_ALREADY_INITIALIZED,
        })
        return
      }

      // Verificar si ya existen turnos para esta fecha
      const existingShifts = await CashierShiftRepository.getByDate(date)
      if (existingShifts.length > 0) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.CASHIER_SHIFTS_ALREADY_EXIST,
          code: ERROR_CODES.CASHIER_SHIFTS_ALREADY_EXIST,
        })
        return
      }

      // Crear registro del día
      await CashierDailyRepository.upsert(date)

      // Crear los 4 turnos
      const shiftTypes: ShiftType[] = [
        ShiftType.NIGHT,
        ShiftType.MORNING,
        ShiftType.AFTERNOON,
        ShiftType.CLOSING,
      ]

      const createdShifts = []
      for (const shiftType of shiftTypes) {
        const shift = await CashierShiftRepository.create({
          shift_date: date,
          shift_type: shiftType,
          opened_by,
          primary_user_id,
          secondary_user_ids: secondary_user_ids || [],
        })
        createdShifts.push(shift)

        // Registrar en historial
        await CashierHistoryRepository.create({
          shift_id: shift.id,
          action: 'created',
          changed_by: opened_by,
          notes: `Turno ${shiftType} inicializado`,
        })
      }

      // Obtener el día completo con todos los detalles
      const dailyDetail = await CashierDailyRepository.getDetailsByDate(date)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.CASHIER_DAY_INITIALIZED,
        code: SUCCESS_CODES.CASHIER_DAY_INITIALIZED,
        data: dailyDetail,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al inicializar día')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.CASHIER_INIT_DAY_ERROR,
        code: ERROR_CODES.CASHIER_INIT_DAY_ERROR,
      })
    }
  }

  /**
   * PATCH /api/cashier/daily/:date/close
   * Cerrar día completo (requiere que los 4 turnos estén cerrados)
   */
  static async closeDay(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params
      const parsed = closeDaySchema.safeParse(req.body ?? {})
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { notes } = parsed.data
      const userId = req.user?.id // Asumiendo que viene del middleware de auth

      if (!userId) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
        return
      }

      // Obtener detalles del día
      const dailyDetail = await CashierDailyRepository.getDetailsByDate(date)

      if (!dailyDetail) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.CASHIER_DAY_NOT_FOUND,
          code: ERROR_CODES.CASHIER_DAY_NOT_FOUND,
        })
        return
      }

      // Validar que se pueda cerrar
      if (!dailyDetail.can_close) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.CASHIER_DAY_CANNOT_CLOSE,
          code: ERROR_CODES.CASHIER_DAY_CANNOT_CLOSE,
          validation_errors: dailyDetail.validation_errors,
        })
        return
      }

      // Cerrar el día
      const closedDaily = await CashierDailyRepository.close(date, userId, {
        notes,
      })

      // Registrar en historial del turno de cierre
      const closingShift = dailyDetail.shifts.find((s) => s.shift_type === ShiftType.CLOSING)
      if (closingShift) {
        await CashierHistoryRepository.create({
          shift_id: closingShift.id,
          action: 'daily_closed',
          changed_by: userId,
          notes: `Día cerrado. ${notes || ''}`.trim(),
        })
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.CASHIER_DAY_CLOSED,
        code: SUCCESS_CODES.CASHIER_DAY_CLOSED,
        data: closedDaily,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al cerrar día')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.CASHIER_CLOSE_DAY_ERROR,
        code: ERROR_CODES.CASHIER_CLOSE_DAY_ERROR,
      })
    }
  }

  /**
   * PATCH /api/cashier/daily/:date/reopen
   * Reabrir día cerrado
   */
  static async reopenDay(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
          code: ERROR_CODES.AUTH_USER_NOT_AUTHENTICATED,
        })
        return
      }

      const reopened = await CashierDailyRepository.reopen(date)

      // Registrar en historial
      const shifts = await CashierShiftRepository.getByDate(date)
      const closingShift = shifts.find((s) => s.shift_type === ShiftType.CLOSING)

      if (closingShift) {
        await CashierHistoryRepository.create({
          shift_id: closingShift.id,
          action: 'daily_reopened',
          changed_by: userId,
          notes: 'Día reabierto para correcciones',
        })
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.CASHIER_DAY_REOPENED,
        code: SUCCESS_CODES.CASHIER_DAY_REOPENED,
        data: reopened,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al reabrir día')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.CASHIER_REOPEN_DAY_ERROR,
        code: ERROR_CODES.CASHIER_REOPEN_DAY_ERROR,
      })
    }
  }

  /**
   * GET /api/cashier/daily/:date/summary
   * Obtener resumen del día (sin detalles completos)
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params

      const daily = await CashierDailyRepository.getByDate(date)

      if (!daily) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.CASHIER_DAY_NOT_FOUND,
          code: ERROR_CODES.CASHIER_DAY_NOT_FOUND,
        })
        return
      }

      const shifts = await CashierShiftRepository.getByDate(date)

      const summary = {
        date: daily.date,
        status: daily.status,
        grand_total: daily.grand_total,
        shifts_count: shifts.length,
        shifts_closed: shifts.filter((s) => s.status === 'closed').length,
        closed_at: daily.closed_at,
        closed_by: daily.closed_by,
      }

      res.json({ success: true, data: summary })
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener resumen')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.CASHIER_FETCH_SUMMARY_ERROR,
        code: ERROR_CODES.CASHIER_FETCH_SUMMARY_ERROR,
      })
    }
  }

  /**
   * GET /api/cashier/daily
   * Obtener lista de días con filtros
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const parsed = dailyListQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }

      const filters = {
        ...parsed.data,
        status: parsed.data.status as DailyStatus | undefined,
        sort: parsed.data.sort ?? 'date',
        order: parsed.data.order ?? 'DESC',
        limit: parsed.data.limit ?? 50,
        offset: parsed.data.offset ?? 0,
      }

      const [data, total] = await Promise.all([
        CashierDailyRepository.getAll(filters),
        CashierDailyRepository.count(filters),
      ])

      res.json({
        success: true,
        data,
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener días')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.CASHIER_FETCH_DAYS_ERROR,
        code: ERROR_CODES.CASHIER_FETCH_DAYS_ERROR,
      })
    }
  }

  /**
   * GET /api/cashier/reports/monthly/:year/:month
   * Obtener resumen mensual
   */
  static async getMonthlySummary(req: Request, res: Response): Promise<void> {
    try {
      const { year, month } = req.params

      const yearNum = parseInt(year)
      const monthNum = parseInt(month)

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.CASHIER_INVALID_YEAR_MONTH,
          code: ERROR_CODES.CASHIER_INVALID_YEAR_MONTH,
        })
        return
      }

      const summary = await CashierDailyRepository.getMonthlySummary(yearNum, monthNum)

      res.json({ success: true, data: summary })
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener resumen mensual')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.CASHIER_FETCH_MONTHLY_SUMMARY_ERROR,
        code: ERROR_CODES.CASHIER_FETCH_MONTHLY_SUMMARY_ERROR,
      })
    }
  }
}
