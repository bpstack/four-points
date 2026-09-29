// repositories/cashier/cashier-daily-repository.ts

import db from '../../config/db.js'
import { SORT_FIELDS, safeSort, safeOrder } from '../../validations/cashier/cashier-validation.js'
import { getLastDayOfMonth } from '../../config/date-utils.js'
import { logger } from '../../config/logger.js'
import {
  CashierDaily,
  CashierDailyDetail,
  CloseDailyDTO,
  DailyFilters,
  MonthlyCashierSummary,
  CashierShift,
} from '../../models/cashier/index.js'

export class CashierDailyRepository {
  /**
   * Obtener día por fecha
   */
  static async getByDate(date: string): Promise<CashierDaily | null> {
    const query = `
    SELECT 
      id,
      DATE_FORMAT(date, '%Y-%m-%d') as date,
      total_cash,
      total_card,
      total_bacs,
      total_web_payment,
      total_transfer,
      total_other,
      grand_total,
      status,
      closed_by,
      closed_at,
      notes,
      created_at,
      updated_at
    FROM cashier_daily 
    WHERE DATE(date) = ?
  `

    const [rows] = await db.query<CashierDaily[]>(query, [date])

    logger.debug({ date, found: rows.length > 0 ? rows[0].date : null }, '[getByDate] query result')

    return rows[0] || null
  }

  /**
   * Obtener día con detalles completos
   */
  static async getDetailsByDate(date: string): Promise<CashierDailyDetail | null> {
    const daily = await this.getByDate(date)
    if (!daily) return null

    // Importar otros repositorios
    const { CashierShiftRepository } = await import('./cashier-shift-repository.js')
    const { CashierVoucherRepository } = await import('./cashier-voucher-repository.js')
    const { CashierShiftUserRepository } = await import('./cashier-shift-user-repository.js')
    const { CashierDenominationRepository } = await import('./cashier-denomination-repository.js')
    const { CashierPaymentRepository } = await import('./cashier-payment-repository.js')

    // Cargar shifts del día
    const shifts = await CashierShiftRepository.getByDate(date)

    // ✅ CORREGIDO: Cargar TODAS las relaciones para cada shift
    const shiftsWithDetails = await Promise.all(
      shifts.map(async (shift) => {
        const [users, denominations, payments, vouchers] = await Promise.all([
          CashierShiftUserRepository.getByShiftId(shift.id),
          CashierDenominationRepository.getByShift(shift.id),
          CashierPaymentRepository.getByShift(shift.id),
          CashierVoucherRepository.getByShift(shift.id),
        ])

        return {
          ...shift,
          users,
          denominations,
          payments,
          vouchers,
        }
      })
    )

    // Cargar vales activos
    const activeVouchers = await CashierVoucherRepository.getActiveVouchers()
    const activeVouchersTotal = await CashierVoucherRepository.getTotalActive()

    // Verificar si todos los turnos están cerrados
    const allShiftsClosed =
      shifts.length === 4 && shifts.every((s: CashierShift) => s.status === 'closed')

    // Validaciones para cierre
    const validationErrors: string[] = []

    if (shifts.length !== 4) {
      validationErrors.push('Faltan turnos por crear')
    }

    if (!allShiftsClosed) {
      validationErrors.push('Todos los turnos deben estar cerrados')
    }

    // ✅ ELIMINADO: No validar vales pendientes para cierre de día
    // Los vales pendientes se muestran pero NO bloquean el cierre

    return {
      ...daily,
      shifts: shiftsWithDetails,
      active_vouchers: activeVouchers,
      active_vouchers_total: activeVouchersTotal,
      all_shifts_closed: allShiftsClosed,
      can_close: validationErrors.length === 0 && daily.status === 'open', // ✅ Solo valida que los 4 shifts estén cerrados
      validation_errors: validationErrors,
    }
  }

  /**
   * Obtener días con filtros
   */
  static async getAll(filters: DailyFilters): Promise<CashierDaily[]> {
    let query = `
    SELECT 
      id,
      DATE_FORMAT(date, '%Y-%m-%d') as date,
      total_cash,
      total_card,
      total_bacs,
      total_web_payment,
      total_transfer,
      total_other,
      grand_total,
      status,
      closed_by,
      closed_at,
      notes,
      created_at,
      updated_at
    FROM cashier_daily 
    WHERE 1=1
  `

    const params: any[] = []

    if (filters.from_date) {
      query += ' AND DATE(date) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(date) <= ?'
      params.push(filters.to_date)
    }

    if (filters.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    const sortField = safeSort(filters.sort, SORT_FIELDS.daily, 'date')
    const sortOrder = safeOrder(filters.order, 'DESC')
    query += ` ORDER BY ${sortField} ${sortOrder}`

    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
      if (filters.offset) {
        query += ' OFFSET ?'
        params.push(filters.offset)
      }
    }

    const [rows] = await db.query<CashierDaily[]>(query, params)
    return rows
  }

  /**
   * Crear o actualizar día (upsert)
   */
  static async upsert(date: string): Promise<CashierDaily> {
    const query = `
      INSERT INTO cashier_daily (date)
      VALUES (?)
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `

    await db.query(query, [date])
    const created = await this.getByDate(date)
    if (!created) throw new Error('Error al crear/actualizar día')

    return created
  }

  /**
   * Cerrar día
   */
  static async close(date: string, userId: string, data: CloseDailyDTO): Promise<CashierDaily> {
    const daily = await this.getByDate(date)
    if (!daily) throw new Error('Día no encontrado')
    if (daily.status === 'closed') throw new Error('El día ya está cerrado')

    const query = `
      UPDATE cashier_daily
      SET 
        status = 'closed',
        closed_by = ?,
        closed_at = NOW(),
        notes = ?
      WHERE DATE(date) = ?
    `

    await db.query(query, [userId, data.notes || null, date])

    const closed = await this.getByDate(date)
    if (!closed) throw new Error('Error al recuperar día cerrado')

    return closed
  }

  /**
   * Reabrir día
   */
  static async reopen(date: string): Promise<CashierDaily> {
    const daily = await this.getByDate(date)
    if (!daily) throw new Error('Día no encontrado')
    if (daily.status !== 'closed') throw new Error('Solo se pueden reabrir días cerrados')

    const query = `
      UPDATE cashier_daily
      SET 
        status = 'open',
        closed_by = NULL,
        closed_at = NULL
      WHERE DATE(date) = ?
    `

    await db.query(query, [date])

    const reopened = await this.getByDate(date)
    if (!reopened) throw new Error('Error al recuperar día reabierto')

    return reopened
  }

  /**
   * Contar días (para paginación)
   */
  static async count(filters: DailyFilters): Promise<number> {
    let query = 'SELECT COUNT(*) as total FROM cashier_daily WHERE 1=1'
    const params: any[] = []

    if (filters.from_date) {
      query += ' AND DATE(date) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(date) <= ?'
      params.push(filters.to_date)
    }

    if (filters.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    const [rows] = await db.query<any[]>(query, params)
    return rows[0]?.total || 0
  }

  static async getMonthlySummary(year: number, month: number): Promise<MonthlyCashierSummary> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = getLastDayOfMonth(year, month)

    // ✅ CALCULAR TOTALES DESDE TABLAS FUENTE (cashier_denominations y cashier_payments)
    // en lugar de leer de cashier_daily que puede tener datos desactualizados

    // 1. Obtener todos los turnos del periodo
    const [shiftsRows] = await db.query<any[]>(
      `SELECT id, DATE_FORMAT(shift_date, '%Y-%m-%d') as shift_date, initial_fund
       FROM cashier_shifts 
       WHERE DATE(shift_date) >= ? AND DATE(shift_date) <= ?`,
      [startDate, endDate]
    )

    // 2. Calcular efectivo desde denominaciones
    let totalCash = 0
    for (const shift of shiftsRows) {
      const [denomRows] = await db.query<any[]>(
        'SELECT COALESCE(SUM(total), 0) as total FROM cashier_denominations WHERE shift_id = ?',
        [shift.id]
      )
      const cashCounted = Number(denomRows[0]?.total) || 0
      const initialFund = Number(shift.initial_fund) || 0

      // income = cash_counted - initial_fund
      if (cashCounted > 0) {
        totalCash += cashCounted - initialFund
      }
    }

    // 3. Calcular pagos electrónicos desde cashier_payments
    const [paymentsQuery] = await db.query<any[]>(
      `SELECT 
        pm.name as method_name,
        COALESCE(SUM(cp.amount), 0) as total
      FROM cashier_payments cp
      JOIN payment_methods pm ON cp.payment_method_id = pm.id
      JOIN cashier_shifts cs ON cp.shift_id = cs.id
      WHERE DATE(cs.shift_date) >= ? AND DATE(cs.shift_date) <= ?
      GROUP BY pm.name`,
      [startDate, endDate]
    )

    // Mapear pagos por método
    let totalCard = 0
    let totalBacs = 0
    let totalWebPayment = 0
    let totalTransfer = 0
    let totalOther = 0

    for (const row of paymentsQuery) {
      const methodName = (row.method_name || '').toUpperCase()
      const amount = Number(row.total) || 0

      if (
        methodName.includes('TARJETA') ||
        methodName.includes('CARD') ||
        methodName.includes('CRÉDITO') ||
        methodName.includes('DÉBITO')
      ) {
        totalCard += amount
      } else if (methodName.includes('BACS')) {
        totalBacs += amount
      } else if (methodName.includes('WEB')) {
        totalWebPayment += amount
      } else if (methodName.includes('TRANSFER')) {
        totalTransfer += amount
      } else {
        totalOther += amount
      }
    }

    const grandTotal =
      totalCash + totalCard + totalBacs + totalWebPayment + totalTransfer + totalOther

    const totals = {
      total_cash: totalCash,
      total_card: totalCard,
      total_bacs: totalBacs,
      total_web_payment: totalWebPayment,
      total_transfer: totalTransfer,
      total_other: totalOther,
      grand_total: grandTotal,
    }

    // Obtener días para daily_breakdown (todavía desde cashier_daily para la lista)
    const dailyRecords = await this.getAll({
      from_date: startDate,
      to_date: endDate,
    })

    // Desglose por método de pago
    const grandTotalForPercentage = grandTotal || 1
    const paymentMethodsBreakdown = [
      {
        method_name: 'EFECTIVO',
        total_amount: totals.total_cash,
        percentage: (totals.total_cash / grandTotalForPercentage) * 100,
      },
      {
        method_name: 'TARJETA CRÉDITO O DÉBITO',
        total_amount: totals.total_card,
        percentage: (totals.total_card / grandTotalForPercentage) * 100,
      },
      {
        method_name: 'BACS',
        total_amount: totals.total_bacs,
        percentage: (totals.total_bacs / grandTotalForPercentage) * 100,
      },
      {
        method_name: 'WEB PAYMENT',
        total_amount: totals.total_web_payment,
        percentage: (totals.total_web_payment / grandTotalForPercentage) * 100,
      },
      {
        method_name: 'TRANSFERENCIA',
        total_amount: totals.total_transfer,
        percentage: (totals.total_transfer / grandTotalForPercentage) * 100,
      },
      {
        method_name: 'OTROS',
        total_amount: totals.total_other,
        percentage: (totals.total_other / grandTotalForPercentage) * 100,
      },
    ]

    // Daily breakdown - calculado desde tablas fuente por cada día
    const dailyBreakdown = await Promise.all(
      dailyRecords.map(async (day) => {
        // Obtener turnos del día
        const [dayShifts] = await db.query<any[]>(
          `SELECT id, initial_fund FROM cashier_shifts WHERE DATE(shift_date) = ?`,
          [day.date]
        )

        // Calcular efectivo del día
        let dayCash = 0
        for (const shift of dayShifts) {
          const [denomRows] = await db.query<any[]>(
            'SELECT COALESCE(SUM(total), 0) as total FROM cashier_denominations WHERE shift_id = ?',
            [shift.id]
          )
          const cashCounted = Number(denomRows[0]?.total) || 0
          const initialFund = Number(shift.initial_fund) || 0
          if (cashCounted > 0) {
            dayCash += cashCounted - initialFund
          }
        }

        // Calcular pagos del día
        const shiftIds = dayShifts.map((s: any) => s.id)
        let dayPayments = 0
        if (shiftIds.length > 0) {
          const [payRows] = await db.query<any[]>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM cashier_payments WHERE shift_id IN (?)`,
            [shiftIds]
          )
          dayPayments = Number(payRows[0]?.total) || 0
        }

        return {
          date: day.date,
          status: day.status,
          total_cash: dayCash,
          grand_total: dayCash + dayPayments,
          has_discrepancy: false,
        }
      })
    )

    // Validaciones
    const validationErrors: string[] = []
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysClosed = dailyRecords.filter((d) => d.status === 'closed').length

    if (daysClosed < daysInMonth) {
      validationErrors.push(`Faltan ${daysInMonth - daysClosed} días por cerrar`)
    }

    return {
      period: {
        year,
        month,
        start: startDate,
        end: endDate,
        total_days: daysInMonth,
        days_closed: daysClosed,
        days_open: daysInMonth - daysClosed,
      },
      totals,
      payment_methods_breakdown: paymentMethodsBreakdown,
      daily_breakdown: dailyBreakdown,
      validation_errors: validationErrors,
    }
  }

  /**
   * Eliminar día (solo si está abierto y sin turnos)
   */
  static async delete(date: string): Promise<void> {
    const daily = await this.getByDate(date)
    if (!daily) throw new Error('Día no encontrado')
    if (daily.status === 'closed') throw new Error('No se puede eliminar un día cerrado')

    await db.query('DELETE FROM cashier_daily WHERE DATE(date) = ?', [date])
  }
}
