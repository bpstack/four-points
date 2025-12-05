// controllers/cashier/cashier-daily-controller.ts

import { Request, Response } from 'express'
import { CashierDailyRepository } from '../../repositories/cashier/cashier-daily-repository.js'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { ShiftType } from '../../models/cashier/index.js'

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
        res.status(404).json({ error: 'Día no encontrado' })
        return
      }

      res.json(dailyDetail)
    } catch (error) {
      console.error('Error al obtener día:', error)
      res.status(500).json({ error: 'Error al obtener día' })
    }
  }

  /**
   * POST /api/cashier/daily/:date/initialize
   * Inicializar día (crear 4 turnos: noche, mañana, tarde, cierre)
   */
  static async initializeDay(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params
      const { opened_by, primary_user_id, secondary_user_ids } = req.body

      // Verificar si el día ya existe
      const existingDaily = await CashierDailyRepository.getByDate(date)
      if (existingDaily) {
        res.status(400).json({ error: 'El día ya está inicializado' })
        return
      }

      // Verificar si ya existen turnos para esta fecha
      const existingShifts = await CashierShiftRepository.getByDate(date)
      if (existingShifts.length > 0) {
        res.status(400).json({ error: 'Ya existen turnos para esta fecha' })
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
        message: 'Día inicializado correctamente',
        data: dailyDetail,
      })
    } catch (error) {
      console.error('Error al inicializar día:', error)
      res.status(500).json({ error: 'Error al inicializar día' })
    }
  }

  /**
   * PATCH /api/cashier/daily/:date/close
   * Cerrar día completo (requiere que los 4 turnos estén cerrados)
   */
  static async closeDay(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params
      const { notes } = req.body
      const userId = req.user?.id // Asumiendo que viene del middleware de auth

      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      // Obtener detalles del día
      const dailyDetail = await CashierDailyRepository.getDetailsByDate(date)

      if (!dailyDetail) {
        res.status(404).json({ error: 'Día no encontrado' })
        return
      }

      // Validar que se pueda cerrar
      if (!dailyDetail.can_close) {
        res.status(400).json({
          error: 'No se puede cerrar el día',
          validation_errors: dailyDetail.validation_errors,
        })
        return
      }

      // Cerrar el día
      const closedDaily = await CashierDailyRepository.close(date, userId, {
        notes,
      })

      // Registrar en historial del turno de cierre
      const closingShift = dailyDetail.shifts.find(
        (s) => s.shift_type === ShiftType.CLOSING
      )
      if (closingShift) {
        await CashierHistoryRepository.create({
          shift_id: closingShift.id,
          action: 'daily_closed',
          changed_by: userId,
          notes: `Día cerrado. ${notes || ''}`.trim(),
        })
      }

      res.json({
        message: 'Día cerrado correctamente',
        data: closedDaily,
      })
    } catch (error: any) {
      console.error('Error al cerrar día:', error)
      res.status(500).json({ error: error.message || 'Error al cerrar día' })
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
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      const reopened = await CashierDailyRepository.reopen(date)

      // Registrar en historial
      const shifts = await CashierShiftRepository.getByDate(date)
      const closingShift = shifts.find(
        (s) => s.shift_type === ShiftType.CLOSING
      )

      if (closingShift) {
        await CashierHistoryRepository.create({
          shift_id: closingShift.id,
          action: 'daily_reopened',
          changed_by: userId,
          notes: 'Día reabierto para correcciones',
        })
      }

      res.json({
        message: 'Día reabierto correctamente',
        data: reopened,
      })
    } catch (error: any) {
      console.error('Error al reabrir día:', error)
      res.status(500).json({ error: error.message || 'Error al reabrir día' })
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
        res.status(404).json({ error: 'Día no encontrado' })
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

      res.json(summary)
    } catch (error) {
      console.error('Error al obtener resumen:', error)
      res.status(500).json({ error: 'Error al obtener resumen' })
    }
  }

  /**
   * GET /api/cashier/daily
   * Obtener lista de días con filtros
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        from_date,
        to_date,
        status,
        sort = 'date',
        order = 'DESC',
        limit = '50',
        offset = '0',
      } = req.query

      const filters = {
        from_date: from_date as string,
        to_date: to_date as string,
        status: status as any,
        sort: sort as string,
        order: order as 'ASC' | 'DESC',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }

      const [data, total] = await Promise.all([
        CashierDailyRepository.getAll(filters),
        CashierDailyRepository.count(filters),
      ])

      res.json({
        data,
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      })
    } catch (error) {
      console.error('Error al obtener días:', error)
      res.status(500).json({ error: 'Error al obtener días' })
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
        res.status(400).json({ error: 'Año o mes inválido' })
        return
      }

      const summary = await CashierDailyRepository.getMonthlySummary(
        yearNum,
        monthNum
      )

      res.json(summary)
    } catch (error) {
      console.error('Error al obtener resumen mensual:', error)
      res.status(500).json({ error: 'Error al obtener resumen mensual' })
    }
  }
}
