// controllers/cashier/cashier-report-controller.ts

import { Request, Response } from 'express'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { CashierVoucherRepository } from '../../repositories/cashier/cashier-voucher-repository.js'
import { CashierDenominationRepository } from '../../repositories/cashier/cashier-denomination-repository.js'
import { CashierPaymentRepository } from '../../repositories/cashier/cashier-payment-repository.js'
import { ShiftStatus } from '../../models/cashier/index.js'
import { getTodayMadrid } from '../../config/date-utils.js'
import { logger } from '../../config/logger.js'

export class CashierReportController {
  /**
   * GET /api/cashier/reports/dashboard
   * Dashboard overview (solo admin)
   */
  static async getDashboardOverview(_req: Request, res: Response): Promise<Response> {
    try {
      const today = getTodayMadrid()

      // Obtener turnos de hoy
      const todayShifts = await CashierShiftRepository.getByDate(today)

      // Contar turnos por estado
      const openShifts = todayShifts.filter((s) => s.status === ShiftStatus.OPEN).length
      const closedShifts = todayShifts.filter((s) => s.status === ShiftStatus.CLOSED).length

      // Calcular totales de hoy desde las tablas relacionadas
      // Solo contar turnos que tengan datos (denominaciones o pagos registrados)
      let totalCashToday = 0
      let totalPaymentsToday = 0

      for (const shift of todayShifts) {
        // Obtener total de denominaciones (efectivo contado)
        const cashCounted = await CashierDenominationRepository.getTotalCash(shift.id)
        // Obtener total de pagos electrónicos
        const payments = await CashierPaymentRepository.getByShift(shift.id)
        const paymentsTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0)
        
        // Solo calcular si hay denominaciones o pagos registrados
        // (evita valores negativos de turnos vacíos con solo fondo inicial)
        if (cashCounted > 0 || paymentsTotal > 0) {
          const initialFund = Number(shift.initial_fund) || 0
          const income = cashCounted - initialFund
          
          totalCashToday += income
          totalPaymentsToday += paymentsTotal
        }
      }

      const grandTotalToday = totalCashToday + totalPaymentsToday

      // ✅ CORREGIDO: Usar getStats() en lugar de getSummary()
      const vouchersStats = await CashierVoucherRepository.getStats()

      return res.status(200).json({
        success: true,
        data: {
          today: {
            date: today,
            total_shifts: todayShifts.length,
            open_shifts: openShifts,
            closed_shifts: closedShifts,
            total_cash: totalCashToday,
            total_payments: totalPaymentsToday,
            grand_total: grandTotalToday,
          },
          vouchers: {
            active_count: vouchersStats.pending_count,
            active_amount: vouchersStats.pending_amount,
            total_repaid: vouchersStats.justified_amount,
            oldest_active_date: null, // ✅ No disponible en stats, lo dejamos null
          },
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getDashboardOverview')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener resumen del dashboard',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/cashier/reports/daily/:date
   * Reporte diario completo (solo admin)
   */
  static async getDailyReport(req: Request, res: Response): Promise<Response> {
    try {
      const date = req.params.date

      // Validar formato de fecha
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de fecha inválido (debe ser YYYY-MM-DD)',
        })
      }

      const shifts = await CashierShiftRepository.getByDate(date)

      // Cargar detalles completos de cada turno
      const shiftsWithDetails = await Promise.all(
        shifts.map(async (shift) => {
          // ✅ CORREGIDO: Usar getByShift() en lugar de getByShiftId()
          const [denominations, payments, vouchers] = await Promise.all([
            CashierDenominationRepository.getByShift(shift.id),
            CashierPaymentRepository.getByShift(shift.id),
            CashierVoucherRepository.getByShift(shift.id), // ✅ CORREGIDO
          ])

          return {
            shift: {
              ...shift,
              denominations,
              payments,
              vouchers,
            },
            expected_in_box: shift.cash_expected,
            total_income: shift.income,
            is_balanced: Math.abs(shift.difference) < 0.01,
          }
        })
      )

      // Calcular totales del día
      const totalCash = shifts.reduce((sum, s) => sum + s.income, 0)
      const totalPayments = shifts.reduce((sum, s) => sum + s.payments_total, 0)
      const grandTotal = shifts.reduce((sum, s) => sum + s.grand_total, 0)
      const totalDifference = shifts.reduce((sum, s) => sum + s.difference, 0)

      // Obtener vales del día
      const vouchers = await CashierVoucherRepository.getAll({
        from_date: date,
        to_date: date,
      })
      const totalVouchers = vouchers.reduce((sum, v) => sum + v.amount, 0)

      return res.status(200).json({
        success: true,
        data: {
          date,
          shifts: shiftsWithDetails,
          summary: {
            total_cash: totalCash,
            total_payments: totalPayments,
            grand_total: grandTotal,
            total_vouchers: totalVouchers,
            total_difference: totalDifference,
            shifts_count: shifts.length,
            shifts_closed: shifts.filter((s) => s.status === ShiftStatus.CLOSED).length,
          },
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getDailyReport')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener reporte diario',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/cashier/reports/period?from_date=...&to_date=...
   * Reporte de período (solo admin)
   */
  static async getPeriodReport(req: Request, res: Response): Promise<Response> {
    try {
      const { from_date, to_date } = req.query

      // Validar parámetros
      if (!from_date || !to_date) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros from_date y to_date son obligatorios',
        })
      }

      // Validar rango máximo de 31 días
      const MAX_DAYS = 31
      const startDate = new Date(from_date as string)
      const endDate = new Date(to_date as string)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > MAX_DAYS) {
        return res.status(400).json({
          success: false,
          error: `Rango máximo permitido: ${MAX_DAYS} días. Solicitado: ${daysDiff} días`,
        })
      }

      if (daysDiff < 0) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de inicio debe ser anterior a la fecha de fin',
        })
      }

      // Obtener todos los turnos del período
      const shifts = await CashierShiftRepository.getAll({
        from_date: from_date as string,
        to_date: to_date as string,
        status: ShiftStatus.CLOSED, // Solo turnos cerrados
      })

      // Calcular totales
      const totalCash = shifts.reduce((sum, s) => sum + s.income, 0)
      const totalPayments = shifts.reduce((sum, s) => sum + s.payments_total, 0)
      const grandTotal = shifts.reduce((sum, s) => sum + s.grand_total, 0)

      // Vales del período
      const vouchers = await CashierVoucherRepository.getAll({
        from_date: from_date as string,
        to_date: to_date as string,
      })
      const totalVouchers = vouchers.reduce((sum, v) => sum + v.amount, 0)

      // Calcular días con descuadre
      const daysWithDiscrepancy = shifts.filter((s) => Math.abs(s.difference) > 0.5).length

      // Calcular promedio diario (solo días con al menos 1 turno)
      const uniqueDates = [...new Set(shifts.map((s) => s.shift_date))]
      const averageDailyCash = uniqueDates.length > 0 ? totalCash / uniqueDates.length : 0

      // ✅ OPTIMIZADO: Batch query para payments (evita N+1)
      const shiftIds = shifts.map(s => s.id)
      const allPayments = await CashierPaymentRepository.getByShifts(shiftIds)
      
      // Agrupar payments por método de pago
      const paymentsMap = new Map<number, { name: string; total: number }>()
      for (const payment of allPayments) {
        const key = payment.payment_method_id
        if (paymentsMap.has(key)) {
          paymentsMap.get(key)!.total += payment.amount
        } else {
          paymentsMap.set(key, {
            name: payment.method_name || 'Desconocido',
            total: payment.amount,
          })
        }
      }

      const paymentsSummary = Array.from(paymentsMap.values())

      // Agrupar por fecha
      const dailyBreakdown = uniqueDates.map((date) => {
        const dayShifts = shifts.filter((s) => s.shift_date === date)
        const dayCash = dayShifts.reduce((sum, s) => sum + s.income, 0)
        const dayPayments = dayShifts.reduce((sum, s) => sum + s.payments_total, 0)
        const dayTotal = dayShifts.reduce((sum, s) => sum + s.grand_total, 0)
        const dayDifference = dayShifts.reduce((sum, s) => sum + s.difference, 0)

        return {
          date,
          shifts_count: dayShifts.length,
          cash: dayCash,
          payments: dayPayments,
          total: dayTotal,
          difference: dayDifference,
          has_discrepancy: Math.abs(dayDifference) > 0.5,
        }
      })

      return res.status(200).json({
        success: true,
        data: {
          period: {
            from_date,
            to_date,
            days: uniqueDates.length,
          },
          summary: {
            total_shifts: shifts.length,
            total_cash: totalCash,
            total_payments: totalPayments,
            grand_total: grandTotal,
            total_vouchers: totalVouchers,
            average_daily_cash: averageDailyCash,
            days_with_discrepancy: daysWithDiscrepancy,
          },
          payments_by_method: paymentsSummary,
          daily_breakdown: dailyBreakdown,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getPeriodReport')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener reporte de período',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/cashier/reports/vouchers-history
   * Historial completo de vales con resumen
   */
  static async getVouchersHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { status, from_date, to_date, limit = '100' } = req.query
      
      // Limitar a máximo 500 registros
      const MAX_LIMIT = 500
      const requestedLimit = Math.min(parseInt(limit as string) || 100, MAX_LIMIT)

      const vouchers = await CashierVoucherRepository.getAll({
        status: status && status !== 'all' ? (status as any) : undefined,
        from_date: from_date as string,
        to_date: to_date as string,
        limit: requestedLimit,
        sort: 'created_at',
        order: 'DESC',
      })

      const stats = await CashierVoucherRepository.getStats(from_date as string, to_date as string)

      return res.json({
        vouchers,
        summary: {
          total_active: (stats?.pending_count ?? 0).toString(),
          total_active_amount: (stats?.pending_amount ?? 0).toString(),
          total_repaid: (stats?.justified_amount ?? 0).toString(),
          total_cancelled: (stats?.cancelled_amount ?? 0).toString(),
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error al obtener historial de vales')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener historial de vales',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/cashier/reports/shifts-summary
   * Resumen de turnos por tipo (solo admin)
   */
  static async getShiftsSummary(req: Request, res: Response): Promise<Response> {
    try {
      const from_date = req.query.from_date as string
      const to_date = req.query.to_date as string

      if (!from_date || !to_date) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros from_date y to_date son obligatorios',
        })
      }

      const allShifts = await CashierShiftRepository.getAll({
        from_date,
        to_date,
        status: ShiftStatus.CLOSED,
      })

      // Agrupar por tipo de turno
      const shiftTypes = ['night', 'morning', 'afternoon', 'closing']
      const summaryByType = shiftTypes.map((type) => {
        const typeShifts = allShifts.filter((s) => s.shift_type === type)
        const totalIncome = typeShifts.reduce((sum, s) => sum + s.income, 0)
        const totalPayments = typeShifts.reduce((sum, s) => sum + s.payments_total, 0)
        const averageIncome = typeShifts.length > 0 ? totalIncome / typeShifts.length : 0

        return {
          shift_type: type,
          count: typeShifts.length,
          total_income: totalIncome,
          total_payments: totalPayments,
          average_income: averageIncome,
        }
      })

      return res.status(200).json({
        success: true,
        data: {
          period: { from_date, to_date },
          summary_by_type: summaryByType,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getShiftsSummary')
      return res.status(500).json({
        success: false,
        error: 'Error al obtener resumen de turnos',
        message: error.message,
      })
    }
  }
}
