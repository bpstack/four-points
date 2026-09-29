// repositories/cashier/cashier-voucher-repository.ts

import db from '../../config/db.js'
import { SORT_FIELDS, safeSort, safeOrder } from '../../validations/cashier/cashier-validation.js'
import { ResultSetHeader } from 'mysql2'
import {
  CashierVoucher,
  CreateVoucherDTO,
  UpdateVoucherDTO,
  VoucherFilters,
} from '../../models/cashier/index.js'

export class CashierVoucherRepository {
  /**
   * Crear un vale
   */
  static async create(data: CreateVoucherDTO): Promise<CashierVoucher> {
    const query = `
      INSERT INTO cashier_vouchers (
        amount,
        reason,
        created_by,
        notes
      ) VALUES (?, ?, ?, ?)
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      data.amount,
      data.reason,
      data.created_by,
      data.notes || null,
    ])

    const created = await this.getById(result.insertId)
    if (!created) throw new Error('Error al recuperar vale creado')

    return created
  }

  /**
   * Obtener vale por ID
   */
  static async getById(id: number): Promise<CashierVoucher | null> {
    const query = `
      SELECT v.*, u.username as created_by_username
      FROM cashier_vouchers v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.id = ?
    `

    const [rows] = await db.query<any[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener todos los vales con filtros
   */
  static async getAll(filters: VoucherFilters = {}): Promise<CashierVoucher[]> {
    let query = `
      SELECT v.*, u.username as created_by_username
      FROM cashier_vouchers v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.status) {
      query += ' AND v.status = ?'
      params.push(filters.status)
    }

    if (filters.created_by) {
      query += ' AND v.created_by = ?'
      params.push(filters.created_by)
    }

    if (filters.from_date) {
      query += ' AND DATE(v.created_at) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(v.created_at) <= ?'
      params.push(filters.to_date)
    }

    if (filters.min_amount !== undefined) {
      query += ' AND v.amount >= ?'
      params.push(filters.min_amount)
    }

    if (filters.max_amount !== undefined) {
      query += ' AND v.amount <= ?'
      params.push(filters.max_amount)
    }

    // Filtro: vales de un turno específico
    if (filters.shift_id !== undefined) {
      query += ` AND v.id IN (
        SELECT voucher_id 
        FROM cashier_shift_vouchers 
        WHERE shift_id = ?
      )`
      params.push(filters.shift_id)
    }

    const sortField = safeSort(filters.sort, SORT_FIELDS.vouchers, 'created_at')
    const sortOrder = safeOrder(filters.order, 'DESC')
    query += ` ORDER BY v.${sortField} ${sortOrder}`

    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
      if (filters.offset) {
        query += ' OFFSET ?'
        params.push(filters.offset)
      }
    }

    const [rows] = await db.query<CashierVoucher[]>(query, params)
    return rows
  }

  /**
   * Contar vales (para paginación)
   */
  static async count(filters: VoucherFilters = {}): Promise<number> {
    let query = 'SELECT COUNT(*) as total FROM cashier_vouchers v WHERE 1=1'
    const params: any[] = []

    if (filters.status) {
      query += ' AND v.status = ?'
      params.push(filters.status)
    }

    if (filters.created_by) {
      query += ' AND v.created_by = ?'
      params.push(filters.created_by)
    }

    if (filters.from_date) {
      query += ' AND DATE(v.created_at) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(v.created_at) <= ?'
      params.push(filters.to_date)
    }

    if (filters.min_amount !== undefined) {
      query += ' AND v.amount >= ?'
      params.push(filters.min_amount)
    }

    if (filters.max_amount !== undefined) {
      query += ' AND v.amount <= ?'
      params.push(filters.max_amount)
    }

    if (filters.shift_id !== undefined) {
      query += ` AND v.id IN (
        SELECT voucher_id 
        FROM cashier_shift_vouchers 
        WHERE shift_id = ?
      )`
      params.push(filters.shift_id)
    }

    const [rows] = await db.query<any[]>(query, params)
    return rows[0]?.total || 0
  }

  /**
   * Actualizar vale
   */
  static async update(id: number, data: UpdateVoucherDTO): Promise<CashierVoucher> {
    const updates: string[] = []
    const params: any[] = []

    if (data.amount !== undefined) {
      updates.push('amount = ?')
      params.push(data.amount)
    }

    if (data.reason !== undefined) {
      updates.push('reason = ?')
      params.push(data.reason)
    }

    if (data.notes !== undefined) {
      updates.push('notes = ?')
      params.push(data.notes)
    }

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    const query = `
      UPDATE cashier_vouchers 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `
    params.push(id)

    await db.query(query, params)

    const updated = await this.getById(id)
    if (!updated) throw new Error('Error al recuperar vale actualizado')

    return updated
  }

  /**
   * Justificar un vale (cambiar estado a justified)
   */
  static async justify(id: number, shiftId: number): Promise<CashierVoucher> {
    const voucher = await this.getById(id)
    if (!voucher) throw new Error('Vale no encontrado')
    if (voucher.status === 'justified') throw new Error('El vale ya está justificado')

    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Actualizar estado del vale
      await connection.query(
        `UPDATE cashier_vouchers 
         SET status = 'justified', justified_at = NOW() 
         WHERE id = ?`,
        [id]
      )

      // Asociar vale con turno
      await connection.query(
        `INSERT INTO cashier_shift_vouchers (shift_id, voucher_id, created_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE created_at = NOW()`,
        [shiftId, id]
      )

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    const justified = await this.getById(id)
    if (!justified) throw new Error('Error al recuperar vale justificado')

    return justified
  }

  /**
   * Cancelar un vale
   */
  static async cancel(id: number): Promise<CashierVoucher> {
    const voucher = await this.getById(id)
    if (!voucher) throw new Error('Vale no encontrado')
    if (voucher.status === 'cancelled') throw new Error('El vale ya está cancelado')

    const query = `
      UPDATE cashier_vouchers
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE id = ?
    `

    await db.query(query, [id])

    // Eliminar asociación con turnos si existe
    await db.query('DELETE FROM cashier_shift_vouchers WHERE voucher_id = ?', [id])

    const cancelled = await this.getById(id)
    if (!cancelled) throw new Error('Error al recuperar vale cancelado')

    return cancelled
  }

  /**
   * Eliminar vale (solo si está pendiente)
   */
  static async delete(id: number): Promise<void> {
    const voucher = await this.getById(id)
    if (!voucher) throw new Error('Vale no encontrado')
    if (voucher.status !== 'pending') {
      throw new Error('Solo se pueden eliminar vales pendientes')
    }

    await db.query('DELETE FROM cashier_vouchers WHERE id = ?', [id])
  }

  /**
   * Obtener vales activos (pending + justified sin cancelar)
   */
  static async getActiveVouchers(): Promise<CashierVoucher[]> {
    const query = `
      SELECT v.*, u.username as created_by_username
      FROM cashier_vouchers v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.status IN ('pending', 'justified')
      ORDER BY v.created_at DESC
    `

    const [rows] = await db.query<CashierVoucher[]>(query)
    return rows
  }

  /**
   * Obtener total de vales activos
   */
  static async getTotalActive(): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cashier_vouchers
      WHERE status IN ('pending', 'justified')
    `

    const [rows] = await db.query<any[]>(query)
    return rows[0]?.total || 0
  }

  /**
   * Obtener vales de un turno específico
   */
  static async getByShift(shiftId: number): Promise<CashierVoucher[]> {
    const query = `
      SELECT v.*, u.username as created_by_username
      FROM cashier_vouchers v
      INNER JOIN cashier_shift_vouchers csv ON v.id = csv.voucher_id
      LEFT JOIN users u ON v.created_by = u.id
      WHERE csv.shift_id = ?
      ORDER BY v.created_at DESC
    `

    const [rows] = await db.query<CashierVoucher[]>(query, [shiftId])
    return rows
  }

  /**
   * Contar vales de un turno
   */
  static async countByShift(shiftId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as total
      FROM cashier_shift_vouchers
      WHERE shift_id = ?
    `

    const [rows] = await db.query<any[]>(query, [shiftId])
    return rows[0]?.total || 0
  }

  /**
   * Verificar si se puede añadir más vales a un turno (límite: 5)
   */
  static async canAddVoucherToShift(shiftId: number): Promise<boolean> {
    const count = await this.countByShift(shiftId)
    return count < 5
  }

  /**
   * Asociar vale existente con un turno
   */
  static async associateWithShift(voucherId: number, shiftId: number): Promise<void> {
    // Verificar límite de 5 vales por turno
    const canAdd = await this.canAddVoucherToShift(shiftId)
    if (!canAdd) {
      throw new Error('El turno ya tiene el máximo de 5 vales')
    }

    const query = `
      INSERT INTO cashier_shift_vouchers (shift_id, voucher_id)
      VALUES (?, ?)
      `

    await db.query(query, [shiftId, voucherId])
  }

  /**
   * Desasociar vale de un turno
   */
  static async dissociateFromShift(voucherId: number, shiftId: number): Promise<void> {
    await db.query('DELETE FROM cashier_shift_vouchers WHERE voucher_id = ? AND shift_id = ?', [
      voucherId,
      shiftId,
    ])
  }

  /**
   * Obtener estadísticas de vales
   */
  static async getStats(
    fromDate?: string,
    toDate?: string
  ): Promise<{
    total_vouchers: number
    total_amount: number
    pending_count: number
    pending_amount: number
    justified_count: number
    justified_amount: number
    cancelled_count: number
    cancelled_amount: number
  }> {
    let query = `
      SELECT 
        COUNT(*) as total_vouchers,
        COALESCE(SUM(amount), 0) as total_amount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        SUM(CASE WHEN status = 'justified' THEN 1 ELSE 0 END) as justified_count,
        COALESCE(SUM(CASE WHEN status = 'justified' THEN amount ELSE 0 END), 0) as justified_amount,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) as cancelled_amount
      FROM cashier_vouchers
      WHERE 1=1
    `

    const params: any[] = []

    if (fromDate) {
      query += ' AND DATE(created_at) >= ?'
      params.push(fromDate)
    }

    if (toDate) {
      query += ' AND DATE(created_at) <= ?'
      params.push(toDate)
    }

    const [rows] = await db.query<any[]>(query, params)
    return (
      rows[0] || {
        total_vouchers: 0,
        total_amount: 0,
        pending_count: 0,
        pending_amount: 0,
        justified_count: 0,
        justified_amount: 0,
        cancelled_count: 0,
        cancelled_amount: 0,
      }
    )
  }
}
