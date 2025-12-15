// repositories/cashier/cashier-history-repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import { CashierHistory, CreateHistoryDTO, HistoryFilters } from '../../models/cashier/index.js'

export class CashierHistoryRepository {
  /**
   * Crear entrada en historial
   */
  static async create(data: CreateHistoryDTO): Promise<CashierHistory> {
    const query = `
      INSERT INTO cashier_history (
        shift_id,
        action,
        table_affected,
        record_id,
        field_changed,
        old_value,
        new_value,
        changed_by,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      data.shift_id,
      data.action,
      data.table_affected || null,
      data.record_id || null,
      data.field_changed || null,
      data.old_value || null,
      data.new_value || null,
      data.changed_by,
      data.notes || null,
    ])

    const created = await this.getById(result.insertId)
    if (!created) throw new Error('Error al recuperar entrada de historial')

    return created
  }

  /**
   * Obtener entrada por ID
   */
  static async getById(id: number): Promise<CashierHistory | null> {
    const query = 'SELECT * FROM cashier_history WHERE id = ?'
    const [rows] = await db.query<CashierHistory[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener historial de un turno
   */
  static async getByShift(shiftId: number): Promise<CashierHistory[]> {
    const query = `
      SELECT * 
      FROM cashier_history 
      WHERE shift_id = ?
      ORDER BY changed_at DESC
    `

    const [rows] = await db.query<CashierHistory[]>(query, [shiftId])
    return rows
  }

  /**
   * Obtener historial con filtros
   */
  static async getAll(filters: HistoryFilters = {}): Promise<CashierHistory[]> {
    let query = 'SELECT * FROM cashier_history WHERE 1=1'
    const params: any[] = []

    if (filters.shift_id) {
      query += ' AND shift_id = ?'
      params.push(filters.shift_id)
    }

    if (filters.action) {
      query += ' AND action = ?'
      params.push(filters.action)
    }

    if (filters.table_affected) {
      query += ' AND table_affected = ?'
      params.push(filters.table_affected)
    }

    if (filters.changed_by) {
      query += ' AND changed_by = ?'
      params.push(filters.changed_by)
    }

    if (filters.from_date) {
      query += ' AND DATE(changed_at) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(changed_at) <= ?'
      params.push(filters.to_date)
    }

    const sortField = filters.sort || 'changed_at'
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

    const [rows] = await db.query<CashierHistory[]>(query, params)
    return rows
  }

  /**
   * Contar entradas de historial
   */
  static async count(filters: HistoryFilters = {}): Promise<number> {
    let query = 'SELECT COUNT(*) as total FROM cashier_history WHERE 1=1'
    const params: any[] = []

    if (filters.shift_id) {
      query += ' AND shift_id = ?'
      params.push(filters.shift_id)
    }

    if (filters.action) {
      query += ' AND action = ?'
      params.push(filters.action)
    }

    if (filters.table_affected) {
      query += ' AND table_affected = ?'
      params.push(filters.table_affected)
    }

    if (filters.changed_by) {
      query += ' AND changed_by = ?'
      params.push(filters.changed_by)
    }

    if (filters.from_date) {
      query += ' AND DATE(changed_at) >= ?'
      params.push(filters.from_date)
    }

    if (filters.to_date) {
      query += ' AND DATE(changed_at) <= ?'
      params.push(filters.to_date)
    }

    const [rows] = await db.query<any[]>(query, params)
    return rows[0]?.total || 0
  }

  /**
   * Obtener cambios de un campo específico
   */
  static async getFieldHistory(shiftId: number, fieldName: string): Promise<CashierHistory[]> {
    const query = `
      SELECT * 
      FROM cashier_history 
      WHERE shift_id = ? AND field_changed = ?
      ORDER BY changed_at DESC
    `

    const [rows] = await db.query<CashierHistory[]>(query, [shiftId, fieldName])
    return rows
  }

  /**
   * Obtener última acción de un tipo específico en un turno
   */
  static async getLastAction(shiftId: number, action: string): Promise<CashierHistory | null> {
    const query = `
      SELECT * 
      FROM cashier_history 
      WHERE shift_id = ? AND action = ?
      ORDER BY changed_at DESC
      LIMIT 1
    `

    const [rows] = await db.query<CashierHistory[]>(query, [shiftId, action])
    return rows[0] || null
  }

  /**
   * Eliminar historial de un turno
   */
  static async deleteByShift(shiftId: number): Promise<void> {
    await db.query('DELETE FROM cashier_history WHERE shift_id = ?', [shiftId])
  }

  /**
   * Obtener actividad reciente (últimas N entradas)
   */
  static async getRecentActivity(limit: number = 50): Promise<CashierHistory[]> {
    const query = `
      SELECT * 
      FROM cashier_history 
      ORDER BY changed_at DESC
      LIMIT ?
    `

    const [rows] = await db.query<CashierHistory[]>(query, [limit])
    return rows
  }
}
