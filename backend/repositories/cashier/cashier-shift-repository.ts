// repositories/cashier/cashier-shift-repository.ts

import db from '../../config/db.js'
import { SORT_FIELDS, safeSort, safeOrder } from '../../validations/cashier/cashier-validation.js'
import { ResultSetHeader, type RowDataPacket } from 'mysql2'
import {
  CashierShift,
  CashierShiftWithUsers,
  CreateShiftDTO,
  UpdateShiftDTO,
  ShiftType,
  ShiftFilters,
} from '../../models/cashier/index.js'

interface TotalRow extends RowDataPacket {
  total: string | number
}

export class CashierShiftRepository {
  /**
   * Crear un turno
   */
  static async create(data: CreateShiftDTO): Promise<CashierShift> {
    const query = `
      INSERT INTO cashier_shifts (
        shift_date,
        shift_type,
        opened_by,
        income,
        income_breakdown,
        status
      ) VALUES (?, ?, ?, ?, ?, 'open')
    `

    const incomeBreakdown = data.income_breakdown || null

    const [result] = await db.query<ResultSetHeader>(query, [
      data.shift_date,
      data.shift_type,
      data.opened_by,
      data.income || 0,
      incomeBreakdown ? JSON.stringify(incomeBreakdown) : null,
    ])

    const createdShift = await this.getById(result.insertId)
    if (!createdShift) throw new Error('Error al recuperar turno creado')

    // Añadir usuarios al turno
    const { CashierShiftUserRepository } = await import('./cashier-shift-user-repository.js')
    await CashierShiftUserRepository.setUsers(
      result.insertId,
      data.primary_user_id,
      data.secondary_user_ids || []
    )

    return createdShift
  }

  /**
   * Obtener turno por ID
   * ✅ CORREGIDO: Usar DATE_FORMAT para shift_date
   */
  static async getById(id: number): Promise<CashierShift | null> {
    const query = `
      SELECT 
        id,
        DATE_FORMAT(shift_date, '%Y-%m-%d') as shift_date,
        shift_type,
        status,
        initial_fund,
        income,
        income_breakdown,
        cash_counted,
        cash_expected,
        difference,
        payments_total,
        grand_total,
        opened_by,
        closed_by_id,
        closed_at,
        notes,
        created_at,
        updated_at
      FROM cashier_shifts 
      WHERE id = ?
    `
    const [rows] = await db.query<CashierShift[]>(query, [id])

    if (rows.length === 0) return null

    // Parsear income_breakdown si existe
    const shift = rows[0]
    if (shift.income_breakdown && typeof shift.income_breakdown === 'string') {
      shift.income_breakdown = JSON.parse(shift.income_breakdown)
    }

    return shift
  }

  static async getByIdWithUsers(id: number): Promise<CashierShiftWithUsers | null> {
    const shift = await this.getById(id)
    if (!shift) return null

    const { CashierShiftUserRepository } = await import('./cashier-shift-user-repository.js')
    const users = await CashierShiftUserRepository.getByShiftId(id)

    // ✅ AÑADIR: Cargar pagos
    const { CashierPaymentRepository } = await import('./cashier-payment-repository.js')
    const payments = await CashierPaymentRepository.getByShift(id)

    // ✅ AÑADIR: Cargar denominaciones
    const { CashierDenominationRepository } = await import('./cashier-denomination-repository.js')
    const denominations = await CashierDenominationRepository.getByShift(id)

    // ✅ AÑADIR: Cargar vales
    const { CashierVoucherRepository } = await import('./cashier-voucher-repository.js')
    const vouchers = await CashierVoucherRepository.getByShift(id)
    const outstanding_vouchers_total = await this.getOutstandingVouchersTotal(id)

    return {
      ...shift,
      users,
      payments, // ✅ CRÍTICO
      denominations, // ✅ CRÍTICO
      vouchers, // ✅ CRÍTICO
      outstanding_vouchers_total,
    }
  }

  /**
   * Obtener turnos por fecha
   * ✅ CORREGIDO: Usar DATE_FORMAT y DATE() en WHERE
   */
  static async getByDate(date: string): Promise<CashierShift[]> {
    const query = `
      SELECT 
        id,
        DATE_FORMAT(shift_date, '%Y-%m-%d') as shift_date,
        shift_type,
        status,
        initial_fund,
        income,
        income_breakdown,
        cash_counted,
        cash_expected,
        difference,
        payments_total,
        grand_total,
        opened_by,
        closed_by_id,
        closed_at,
        notes,
        created_at,
        updated_at
      FROM cashier_shifts 
      WHERE DATE(shift_date) = ?
      ORDER BY 
        CASE shift_type
          WHEN 'night' THEN 1
          WHEN 'morning' THEN 2
          WHEN 'afternoon' THEN 3
          WHEN 'closing' THEN 4
        END
    `

    const [rows] = await db.query<CashierShift[]>(query, [date])

    // Parsear income_breakdown
    return rows.map((shift) => {
      if (shift.income_breakdown && typeof shift.income_breakdown === 'string') {
        shift.income_breakdown = JSON.parse(shift.income_breakdown)
      }
      return shift
    })
  }

  /**
   * Obtener todos los turnos con filtros
   * ✅ CORREGIDO: Usar DATE_FORMAT y DATE() en WHERE
   */
  static async getAll(filters: ShiftFilters = {}): Promise<CashierShift[]> {
    let query = `
      SELECT 
        id,
        DATE_FORMAT(shift_date, '%Y-%m-%d') as shift_date,
        shift_type,
        status,
        initial_fund,
        income,
        income_breakdown,
        cash_counted,
        cash_expected,
        difference,
        payments_total,
        grand_total,
        opened_by,
        closed_by_id,
        closed_at,
        notes,
        created_at,
        updated_at
      FROM cashier_shifts 
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.shift_date) {
      query += ' AND DATE(shift_date) = ?'
      params.push(filters.shift_date)
    }

    if (filters.from_date) {
      query += ' AND DATE(shift_date) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(shift_date) <= ?'
      params.push(filters.to_date)
    }

    if (filters.shift_type) {
      query += ' AND shift_type = ?'
      params.push(filters.shift_type)
    }

    if (filters.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    if (filters.opened_by) {
      query += ' AND opened_by = ?'
      params.push(filters.opened_by)
    }

    if (filters.closed_by) {
      query += ' AND closed_by_id = ?'
      params.push(filters.closed_by)
    }

    const sortField = safeSort(filters.sort, SORT_FIELDS.shifts, 'shift_date')
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

    const [rows] = await db.query<CashierShift[]>(query, params)

    // Parsear income_breakdown
    return rows.map((shift) => {
      if (shift.income_breakdown && typeof shift.income_breakdown === 'string') {
        shift.income_breakdown = JSON.parse(shift.income_breakdown)
      }
      return shift
    })
  }

  /**
   * Contar turnos (para paginación)
   * ✅ CORREGIDO: Usar DATE() en WHERE
   */
  static async count(filters: ShiftFilters = {}): Promise<number> {
    let query = 'SELECT COUNT(*) as total FROM cashier_shifts WHERE 1=1'
    const params: any[] = []

    if (filters.shift_date) {
      query += ' AND DATE(shift_date) = ?'
      params.push(filters.shift_date)
    }

    if (filters.from_date) {
      query += ' AND DATE(shift_date) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(shift_date) <= ?'
      params.push(filters.to_date)
    }

    if (filters.shift_type) {
      query += ' AND shift_type = ?'
      params.push(filters.shift_type)
    }

    if (filters.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    if (filters.opened_by) {
      query += ' AND opened_by = ?'
      params.push(filters.opened_by)
    }

    if (filters.closed_by) {
      query += ' AND closed_by_id = ?'
      params.push(filters.closed_by)
    }

    const [rows] = await db.query<any[]>(query, params)
    return rows[0]?.total || 0
  }

  /**
   * Actualizar turno
   */
  static async update(id: number, data: UpdateShiftDTO): Promise<CashierShift> {
    const updates: string[] = []
    const params: any[] = []

    if (data.income !== undefined) {
      updates.push('income = ?')
      params.push(data.income)
    }

    if (data.income_breakdown !== undefined) {
      updates.push('income_breakdown = ?')
      params.push(data.income_breakdown ? JSON.stringify(data.income_breakdown) : null)
    }

    if (data.comments !== undefined) {
      updates.push('notes = ?')
      params.push(data.comments)
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    const query = `
      UPDATE cashier_shifts 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `
    params.push(id)

    await db.query(query, params)

    const updated = await this.getById(id)
    if (!updated) throw new Error('Error al recuperar turno actualizado')

    return updated
  }

  /**
   * Cerrar turno
   */
  static async close(id: number, userId: string): Promise<CashierShift> {
    const shift = await this.getById(id)
    if (!shift) throw new Error('Turno no encontrado')
    if (shift.status === 'closed') throw new Error('El turno ya está cerrado')

    // Totals as of closing: vouchers or income may have changed after the count
    await this.recalculateTotals(id)

    const query = `
      UPDATE cashier_shifts
      SET 
        status = 'closed',
        closed_by_id = ?,
        closed_at = NOW()
      WHERE id = ?
    `

    await db.query(query, [userId, id])

    const closed = await this.getById(id)
    if (!closed) throw new Error('Error al recuperar turno cerrado')

    return closed
  }

  /**
   * Reabrir turno
   */
  static async reopen(id: number): Promise<CashierShift> {
    const shift = await this.getById(id)
    if (!shift) throw new Error('Turno no encontrado')
    if (shift.status !== 'closed') throw new Error('Solo se pueden reabrir turnos cerrados')

    const query = `
      UPDATE cashier_shifts
      SET 
        status = 'open',
        closed_by_id = NULL,
        closed_at = NULL
      WHERE id = ?
    `

    await db.query(query, [id])

    const reopened = await this.getById(id)
    if (!reopened) throw new Error('Error al recuperar turno reabierto')

    return reopened
  }

  /**
   * Eliminar turno (solo si está abierto)
   */
  static async delete(id: number): Promise<void> {
    const shift = await this.getById(id)
    if (!shift) throw new Error('Turno no encontrado')
    if (shift.status === 'closed') throw new Error('No se puede eliminar un turno cerrado')

    await db.query('DELETE FROM cashier_shifts WHERE id = ?', [id])
  }

  /**
   * Verificar si existe un turno para una fecha y tipo específicos
   * ✅ CORREGIDO: Usar DATE() en WHERE
   */
  static async exists(date: string, shiftType: ShiftType): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM cashier_shifts 
      WHERE DATE(shift_date) = ? AND shift_type = ?
    `

    const [rows] = await db.query<any[]>(query, [date, shiftType])
    return (rows[0]?.count || 0) > 0
  }

  /**
   * Obtener último turno de un usuario
   * ✅ CORREGIDO: Usar DATE_FORMAT
   */
  static async getLastShiftByUser(userId: string): Promise<CashierShift | null> {
    const query = `
      SELECT 
        cs.id,
        DATE_FORMAT(cs.shift_date, '%Y-%m-%d') as shift_date,
        cs.shift_type,
        cs.status,
        cs.initial_fund,
        cs.income,
        cs.income_breakdown,
        cs.cash_counted,
        cs.cash_expected,
        cs.difference,
        cs.payments_total,
        cs.grand_total,
        cs.opened_by,
        cs.closed_by_id,
        cs.closed_at,
        cs.notes,
        cs.created_at,
        cs.updated_at
      FROM cashier_shifts cs
      INNER JOIN cashier_shift_users csu ON cs.id = csu.shift_id
      WHERE csu.user_id = ?
      ORDER BY cs.shift_date DESC, cs.id DESC
      LIMIT 1
    `

    const [rows] = await db.query<CashierShift[]>(query, [userId])

    if (rows.length === 0) return null

    const shift = rows[0]
    if (shift.income_breakdown && typeof shift.income_breakdown === 'string') {
      shift.income_breakdown = JSON.parse(shift.income_breakdown)
    }

    return shift
  }

  /**
   * Obtener estadísticas de turnos por usuario
   * ✅ CORREGIDO: Usar DATE() en WHERE
   */
  static async getStatsByUser(
    userId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<{
    total_shifts: number
    closed_shifts: number
    open_shifts: number
    total_income: number
  }> {
    let query = `
      SELECT 
        COUNT(*) as total_shifts,
        SUM(CASE WHEN cs.status = 'closed' THEN 1 ELSE 0 END) as closed_shifts,
        SUM(CASE WHEN cs.status = 'open' THEN 1 ELSE 0 END) as open_shifts,
        COALESCE(SUM(cs.income), 0) as total_income
      FROM cashier_shifts cs
      INNER JOIN cashier_shift_users csu ON cs.id = csu.shift_id
      WHERE csu.user_id = ?
    `

    const params: any[] = [userId]

    if (fromDate) {
      query += ' AND DATE(cs.shift_date) >= ?'
      params.push(fromDate)
    }

    if (toDate) {
      query += ' AND DATE(cs.shift_date) <= ?'
      params.push(toDate)
    }

    const [rows] = await db.query<any[]>(query, params)
    return (
      rows[0] || {
        total_shifts: 0,
        closed_shifts: 0,
        open_shifts: 0,
        total_income: 0,
      }
    )
  }

  /**
   * Recalcular totales del turno basándose en denominaciones y pagos
   * Se llama después de actualizar denominaciones o pagos
   * También actualiza cashier_daily con los totales del día
   */
  /**
   * Cash out of the drawer during a shift because of vouchers. A voucher is
   * always cash taken from the fund, and it stays out from the shift it was
   * created in until the shift that justifies it (replenished or withdrawn),
   * across shifts and days. It counts in shift S when it is not cancelled, was
   * created in S or before, and is still pending or was justified after S.
   * Shifts of a day go night, morning, afternoon, closing. A voucher is linked
   * to the shift that created it and to the one that justified it, so its
   * first link is the creation and, once justified, its last link the
   * justification.
   */
  static async getOutstandingVouchersTotal(shiftId: number): Promise<number> {
    const position = (alias: string) =>
      `CONCAT(${alias}.shift_date, '#', FIELD(${alias}.shift_type, 'night', 'morning', 'afternoon', 'closing'))`
    const [rows] = await db.query<TotalRow[]>(
      `SELECT COALESCE(SUM(v.amount), 0) AS total
       FROM cashier_vouchers v
       JOIN (
         SELECT csv.voucher_id, MIN(${position('s')}) AS first_pos, MAX(${position('s')}) AS last_pos
         FROM cashier_shift_vouchers csv
         JOIN cashier_shifts s ON s.id = csv.shift_id
         GROUP BY csv.voucher_id
       ) links ON links.voucher_id = v.id
       JOIN cashier_shifts cur ON cur.id = ?
       WHERE v.status != 'cancelled'
         AND links.first_pos <= ${position('cur')}
         AND (v.status = 'pending' OR links.last_pos > ${position('cur')})`,
      [shiftId]
    )
    return Number(rows[0]?.total) || 0
  }

  static async recalculateTotals(shiftId: number): Promise<CashierShift> {
    // Obtener turno actual
    const shift = await this.getById(shiftId)
    if (!shift) throw new Error('Turno no encontrado')

    // Calcular total de denominaciones (efectivo contado)
    const [denomRows] = await db.query<any[]>(
      'SELECT COALESCE(SUM(total), 0) as total FROM cashier_denominations WHERE shift_id = ?',
      [shiftId]
    )
    const cashCounted = Number(denomRows[0]?.total) || 0

    // Calcular total de pagos electrónicos por método
    const [paymentRows] = await db.query<any[]>(
      `SELECT 
        pm.name as method_name,
        COALESCE(SUM(cp.amount), 0) as total
      FROM cashier_payments cp
      JOIN payment_methods pm ON cp.payment_method_id = pm.id
      WHERE cp.shift_id = ?
      GROUP BY cp.payment_method_id, pm.name`,
      [shiftId]
    )

    // Mapear pagos por método
    let totalCard = 0
    let totalBacs = 0
    let totalWebPayment = 0
    let totalTransfer = 0
    let totalOther = 0

    for (const row of paymentRows) {
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

    const paymentsTotal = totalCard + totalBacs + totalWebPayment + totalTransfer + totalOther

    // Vales que siguen fuera del cajón en este turno (se arrastran entre turnos y días)
    const vouchersTotal = await this.getOutstandingVouchersTotal(shiftId)

    // income is the cash taken during the shift, entered by the user: it is not
    // derived from the count (deriving it made the expected cash always equal
    // the counted cash, so the difference was always 0)
    const initialFund = Number(shift.initial_fund) || 0
    const income = Number(shift.income) || 0
    const cashExpected = initialFund + income - vouchersTotal // Fondo + cobros en efectivo - vales
    const difference = cashCounted - cashExpected // Descuadre
    const grandTotal = income + paymentsTotal // Cobros en efectivo + pagos electrónicos

    // Actualizar turno
    const updateQuery = `
      UPDATE cashier_shifts
      SET
        cash_counted = ?,
        cash_expected = ?,
        difference = ?,
        payments_total = ?,
        grand_total = ?,
        updated_at = NOW()
      WHERE id = ?
    `

    await db.query(updateQuery, [
      cashCounted,
      cashExpected,
      difference,
      paymentsTotal,
      grandTotal,
      shiftId,
    ])

    // Actualizar cashier_daily con los totales del día
    await this.updateDailyTotals(shift.shift_date)

    const updated = await this.getById(shiftId)
    if (!updated) throw new Error('Error al recuperar turno actualizado')

    return updated
  }

  /**
   * Actualizar totales de cashier_daily sumando todos los turnos del día
   */
  static async updateDailyTotals(shiftDate: string): Promise<void> {
    // Obtener todos los turnos del día
    const shifts = await this.getByDate(shiftDate)

    // Calcular totales desde denominaciones y pagos de cada turno
    let totalCash = 0
    let totalCard = 0
    let totalBacs = 0
    let totalWebPayment = 0
    let totalTransfer = 0
    let totalOther = 0

    for (const shift of shifts) {
      // Efectivo (income = cash_counted - initial_fund)
      const [denomRows] = await db.query<any[]>(
        'SELECT COALESCE(SUM(total), 0) as total FROM cashier_denominations WHERE shift_id = ?',
        [shift.id]
      )
      const cashCounted = Number(denomRows[0]?.total) || 0
      const initialFund = Number(shift.initial_fund) || 0

      // Solo sumar si hay datos registrados
      if (cashCounted > 0) {
        totalCash += cashCounted - initialFund
      }

      // Pagos por método
      const [paymentRows] = await db.query<any[]>(
        `SELECT 
          pm.name as method_name,
          COALESCE(SUM(cp.amount), 0) as total
        FROM cashier_payments cp
        JOIN payment_methods pm ON cp.payment_method_id = pm.id
        WHERE cp.shift_id = ?
        GROUP BY cp.payment_method_id, pm.name`,
        [shift.id]
      )

      for (const row of paymentRows) {
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
    }

    const grandTotal =
      totalCash + totalCard + totalBacs + totalWebPayment + totalTransfer + totalOther

    // Actualizar cashier_daily
    await db.query(
      `UPDATE cashier_daily 
       SET 
         total_cash = ?,
         total_card = ?,
         total_bacs = ?,
         total_web_payment = ?,
         total_transfer = ?,
         total_other = ?,
         grand_total = ?,
         updated_at = NOW()
       WHERE DATE(date) = ?`,
      [
        totalCash,
        totalCard,
        totalBacs,
        totalWebPayment,
        totalTransfer,
        totalOther,
        grandTotal,
        shiftDate,
      ]
    )
  }
}
