// repositories/cashier/cashier-daily-repository.ts

import db from '../../config/db.js'
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

    console.log('🔍 [getByDate] Input date:', date)
    console.log(
      '🔍 [getByDate] Result:',
      rows.length > 0 ? rows[0].date : 'NOT FOUND'
    )

    return rows[0] || null
  }

  /**
   * Obtener día con detalles completos
   */
  static async getDetailsByDate(
    date: string
  ): Promise<CashierDailyDetail | null> {
    const daily = await this.getByDate(date)
    if (!daily) return null

    // Importar otros repositorios
    const { CashierShiftRepository } = await import(
      './cashier-shift-repository.js'
    )
    const { CashierVoucherRepository } = await import(
      './cashier-voucher-repository.js'
    )
    const { CashierShiftUserRepository } = await import(
      './cashier-shift-user-repository.js'
    )
    const { CashierDenominationRepository } = await import(
      './cashier-denomination-repository.js'
    )
    const { CashierPaymentRepository } = await import(
      './cashier-payment-repository.js'
    )

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
      shifts.length === 4 &&
      shifts.every((s: CashierShift) => s.status === 'closed')

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

    const sortField = filters.sort || 'date'
    const sortOrder = filters.order || 'DESC'
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
  static async close(
    date: string,
    userId: string,
    data: CloseDailyDTO
  ): Promise<CashierDaily> {
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
    if (daily.status !== 'closed')
      throw new Error('Solo se pueden reabrir días cerrados')

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

  static async getMonthlySummary(
    year: number,
    month: number
  ): Promise<MonthlyCashierSummary> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    // ✅ USAR QUERY DIRECTA con SUM en MySQL en lugar de sumar en JS
    const query = `
    SELECT 
      COALESCE(SUM(total_cash), 0) as total_cash,
      COALESCE(SUM(total_card), 0) as total_card,
      COALESCE(SUM(total_bacs), 0) as total_bacs,
      COALESCE(SUM(total_web_payment), 0) as total_web_payment,
      COALESCE(SUM(total_transfer), 0) as total_transfer,
      COALESCE(SUM(total_other), 0) as total_other,
      COALESCE(SUM(grand_total), 0) as grand_total
    FROM cashier_daily
    WHERE date >= ? AND date <= ?
  `

    const [totalsRows] = await db.query<any[]>(query, [startDate, endDate])
    const totals = {
      total_cash: parseFloat(totalsRows[0].total_cash) || 0,
      total_card: parseFloat(totalsRows[0].total_card) || 0,
      total_bacs: parseFloat(totalsRows[0].total_bacs) || 0,
      total_web_payment: parseFloat(totalsRows[0].total_web_payment) || 0,
      total_transfer: parseFloat(totalsRows[0].total_transfer) || 0,
      total_other: parseFloat(totalsRows[0].total_other) || 0,
      grand_total: parseFloat(totalsRows[0].grand_total) || 0,
    }

    // Obtener días para daily_breakdown
    const dailyRecords = await this.getAll({
      from_date: startDate,
      to_date: endDate,
    })

    // Desglose por método de pago
    const grandTotal = totals.grand_total || 1
    const paymentMethodsBreakdown = [
      {
        method_name: 'EFECTIVO',
        total_amount: totals.total_cash,
        percentage: (totals.total_cash / grandTotal) * 100,
      },
      {
        method_name: 'TARJETA CRÉDITO O DÉBITO',
        total_amount: totals.total_card,
        percentage: (totals.total_card / grandTotal) * 100,
      },
      {
        method_name: 'BACS',
        total_amount: totals.total_bacs,
        percentage: (totals.total_bacs / grandTotal) * 100,
      },
      {
        method_name: 'WEB PAYMENT',
        total_amount: totals.total_web_payment,
        percentage: (totals.total_web_payment / grandTotal) * 100,
      },
      {
        method_name: 'TRANSFERENCIA',
        total_amount: totals.total_transfer,
        percentage: (totals.total_transfer / grandTotal) * 100,
      },
      {
        method_name: 'OTROS',
        total_amount: totals.total_other,
        percentage: (totals.total_other / grandTotal) * 100,
      },
    ]

    // Daily breakdown
    const dailyBreakdown = dailyRecords.map((day) => ({
      date: day.date,
      status: day.status,
      total_cash: parseFloat(day.total_cash as any) || 0,
      grand_total: parseFloat(day.grand_total as any) || 0,
      has_discrepancy: false,
    }))

    // Validaciones
    const validationErrors: string[] = []
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysClosed = dailyRecords.filter((d) => d.status === 'closed').length

    if (daysClosed < daysInMonth) {
      validationErrors.push(
        `Faltan ${daysInMonth - daysClosed} días por cerrar`
      )
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
    if (daily.status === 'closed')
      throw new Error('No se puede eliminar un día cerrado')

    await db.query('DELETE FROM cashier_daily WHERE DATE(date) = ?', [date])
  }
}
