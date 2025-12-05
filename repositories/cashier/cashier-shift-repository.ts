// repositories/cashier/cashier-shift-repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import {
  CashierShift,
  CashierShiftWithUsers,
  CreateShiftDTO,
  UpdateShiftDTO,
  ShiftType,
  ShiftFilters,
} from '../../models/cashier/index.js'

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
    const { CashierShiftUserRepository } = await import(
      './cashier-shift-user-repository.js'
    )
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

  static async getByIdWithUsers(
    id: number
  ): Promise<CashierShiftWithUsers | null> {
    const shift = await this.getById(id)
    if (!shift) return null

    const { CashierShiftUserRepository } = await import(
      './cashier-shift-user-repository.js'
    )
    const users = await CashierShiftUserRepository.getByShiftId(id)

    // ✅ AÑADIR: Cargar pagos
    const { CashierPaymentRepository } = await import(
      './cashier-payment-repository.js'
    )
    const payments = await CashierPaymentRepository.getByShift(id)

    // ✅ AÑADIR: Cargar denominaciones
    const { CashierDenominationRepository } = await import(
      './cashier-denomination-repository.js'
    )
    const denominations = await CashierDenominationRepository.getByShift(id)

    // ✅ AÑADIR: Cargar vales
    const { CashierVoucherRepository } = await import(
      './cashier-voucher-repository.js'
    )
    const vouchers = await CashierVoucherRepository.getByShift(id)

    return {
      ...shift,
      users,
      payments, // ✅ CRÍTICO
      denominations, // ✅ CRÍTICO
      vouchers, // ✅ CRÍTICO
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
      if (
        shift.income_breakdown &&
        typeof shift.income_breakdown === 'string'
      ) {
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

    const sortField = filters.sort || 'shift_date'
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

    const [rows] = await db.query<CashierShift[]>(query, params)

    // Parsear income_breakdown
    return rows.map((shift) => {
      if (
        shift.income_breakdown &&
        typeof shift.income_breakdown === 'string'
      ) {
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
      params.push(
        data.income_breakdown ? JSON.stringify(data.income_breakdown) : null
      )
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
    if (shift.status !== 'closed')
      throw new Error('Solo se pueden reabrir turnos cerrados')

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
    if (shift.status === 'closed')
      throw new Error('No se puede eliminar un turno cerrado')

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
  static async getLastShiftByUser(
    userId: string
  ): Promise<CashierShift | null> {
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
}
