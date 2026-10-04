// repositories/conciliation/conciliation.repository.ts

// =========================================================
// REPOSITORY - SISTEMA DE CONCILIACIÓN (Form-based)
// =========================================================

import pool from '../../config/db.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type { PoolConnection } from 'mysql2/promise'
import {
  IConciliationSummary,
  IConciliationDetail,
  IReceptionEntry,
  IHousekeepingEntry,
  IUpdateFormRequest,
} from '../../models/conciliation.model.js'
import {
  RECEPTION_REASONS_ORDERED,
  HOUSEKEEPING_REASONS_ORDERED,
  getReceptionDirection,
  getHousekeepingDirection,
} from '../../models/conciliation.config.js'

export class ConciliationRepository {
  // =========================================================
  // CREATE - Crear conciliación + inicializar TODAS las entries
  // =========================================================

  /**
   * Crea una conciliación nueva con TODAS las entries inicializadas en 0
   * Esto garantiza que siempre haya 5 entries reception + 7 entries housekeeping
   */
  async createWithAllEntries(
    data: Pick<IConciliationSummary, 'date' | 'notes' | 'department_id' | 'created_by'>
  ): Promise<IConciliationDetail> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 1. Crear el summary
      const [summaryResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO conciliation_summary 
        (date, notes, department_id, created_by, status) 
        VALUES (?, ?, ?, ?, 'draft')`,
        [data.date, data.notes || null, data.department_id || null, data.created_by || null]
      )

      const conciliationId = summaryResult.insertId

      // 2. Crear TODAS las entries de reception (valor 0)
      for (const reason of RECEPTION_REASONS_ORDERED) {
        const direction = getReceptionDirection(reason)
        await connection.query(
          `INSERT INTO conciliation_reception 
          (conciliation_id, reason, direction, value, room_number, notes, created_by) 
          VALUES (?, ?, ?, 0, '', '', ?)`,
          [conciliationId, reason, direction, data.created_by || null]
        )
      }

      // 3. Crear TODAS las entries de housekeeping (valor 0)
      for (const reason of HOUSEKEEPING_REASONS_ORDERED) {
        const direction = getHousekeepingDirection(reason)
        await connection.query(
          `INSERT INTO conciliation_housekeeping 
          (conciliation_id, reason, direction, value, room_number, notes, created_by) 
          VALUES (?, ?, ?, 0, '', '', ?)`,
          [conciliationId, reason, direction, data.created_by || null]
        )
      }

      await connection.commit()

      // 4. Retornar la conciliación completa
      return await this.getById(conciliationId)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // =========================================================
  // READ - Obtener conciliaciones
  // =========================================================

  /**
   * Obtener todas las conciliaciones (sin entries)
   */
  async getAll(): Promise<IConciliationSummary[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM conciliation_summary 
      WHERE deleted_at IS NULL 
      ORDER BY date DESC`
    )
    return rows as IConciliationSummary[]
  }

  /**
   * Obtener una conciliación por ID con TODAS sus entries
   */
  async getById(id: number): Promise<IConciliationDetail> {
    // 1. Obtener el summary
    const [summaryRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM conciliation_summary WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (summaryRows.length === 0) {
      throw new Error('Conciliación no encontrada')
    }

    const summary = summaryRows[0] as IConciliationSummary

    // 2. Obtener entries de reception
    const [receptionRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM conciliation_reception 
      WHERE conciliation_id = ? AND deleted_at IS NULL 
      ORDER BY id ASC`,
      [id]
    )

    // 3. Obtener entries de housekeeping
    const [housekeepingRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM conciliation_housekeeping 
      WHERE conciliation_id = ? AND deleted_at IS NULL 
      ORDER BY id ASC`,
      [id]
    )

    return {
      ...summary,
      reception_entries: receptionRows as IReceptionEntry[],
      housekeeping_entries: housekeepingRows as IHousekeepingEntry[],
    }
  }

  /**
   * Obtener conciliación por fecha
   */
  async getByDate(date: string): Promise<IConciliationSummary | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM conciliation_summary WHERE DATE(date) = ? AND deleted_at IS NULL',
      [date]
    )
    return rows.length > 0 ? (rows[0] as IConciliationSummary) : null
  }

  // =========================================================
  // UPDATE - Actualizar formulario completo
  // =========================================================

  /**
   * Actualizar el formulario completo
   * Actualiza TODAS las entries de reception y housekeeping
   */
  async updateForm(
    conciliationId: number,
    formData: IUpdateFormRequest,
    userId?: string
  ): Promise<void> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 1. Actualizar entries de reception
      for (const entry of formData.reception) {
        const direction = getReceptionDirection(entry.reason)

        await connection.query(
          `UPDATE conciliation_reception 
          SET value = ?, 
              room_number = ?, 
              notes = ?,
              direction = ?,
              updated_by = ?
          WHERE conciliation_id = ? 
            AND reason = ? 
            AND deleted_at IS NULL`,
          [
            entry.value,
            entry.room_number || '',
            entry.notes || '',
            direction,
            userId || null,
            conciliationId,
            entry.reason,
          ]
        )
      }

      // 2. Actualizar entries de housekeeping
      for (const entry of formData.housekeeping) {
        const direction = getHousekeepingDirection(entry.reason)

        await connection.query(
          `UPDATE conciliation_housekeeping 
          SET value = ?, 
              room_number = ?, 
              notes = ?,
              direction = ?,
              updated_by = ?
          WHERE conciliation_id = ? 
            AND reason = ? 
            AND deleted_at IS NULL`,
          [
            entry.value,
            entry.room_number || '',
            entry.notes || '',
            direction,
            userId || null,
            conciliationId,
            entry.reason,
          ]
        )
      }

      // 3. Actualizar notas generales si vienen
      if (formData.notes !== undefined) {
        await connection.query(
          `UPDATE conciliation_summary 
          SET notes = ?, updated_by = ? 
          WHERE id = ?`,
          [formData.notes, userId || null, conciliationId]
        )
      }

      // 4. Recalcular totales
      await this._recalculateTotalsInTransaction(connection, conciliationId)

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Actualizar solo las notas generales
   */
  async updateNotes(id: number, notes: string, userId?: string): Promise<void> {
    await pool.query(
      `UPDATE conciliation_summary 
      SET notes = ?, updated_by = ? 
      WHERE id = ? AND deleted_at IS NULL`,
      [notes, userId || null, id]
    )
  }

  /**
   * Actualizar el estado de una conciliación
   */
  async updateStatus(
    id: number,
    status: 'draft' | 'confirmed' | 'closed',
    userId?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE conciliation_summary 
      SET status = ?, updated_by = ? 
      WHERE id = ? AND deleted_at IS NULL`,
      [status, userId || null, id]
    )
  }

  // =========================================================
  // DELETE
  // =========================================================

  /**
   * Soft delete de una conciliación
   */
  async delete(id: number): Promise<void> {
    await pool.query('UPDATE conciliation_summary SET deleted_at = NOW() WHERE id = ?', [id])
  }

  // =========================================================
  // HELPERS - Recalcular totales
  // =========================================================

  /**
   * Recalcular totales públicamente
   */
  async recalculateTotals(id: number): Promise<void> {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await this._recalculateTotalsInTransaction(connection, id)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Recalcular totales dentro de una transacción
   * Se usa internamente al actualizar el formulario
   */
  private async _recalculateTotalsInTransaction(
    connection: PoolConnection,
    conciliationId: number
  ): Promise<void> {
    const [receptionRows] = await connection.query(
      `SELECT SUM(CASE WHEN direction = 'add' THEN value ELSE -value END) as total
      FROM conciliation_reception 
      WHERE conciliation_id = ? AND deleted_at IS NULL`,
      [conciliationId]
    )
    const totalReception = (receptionRows as RowDataPacket[])[0]?.total || 0

    const [housekeepingRows] = await connection.query(
      `SELECT SUM(CASE WHEN direction = 'add' THEN value ELSE -value END) as total
      FROM conciliation_housekeeping 
      WHERE conciliation_id = ? AND deleted_at IS NULL`,
      [conciliationId]
    )
    const totalHousekeeping = (housekeepingRows as RowDataPacket[])[0]?.total || 0

    // 3. Actualizar el summary
    await connection.query(
      `UPDATE conciliation_summary 
      SET total_reception = ?, total_housekeeping = ?
      WHERE id = ?`,
      [totalReception, totalHousekeeping, conciliationId]
    )
  }
}

// =========================================================
// EXPORTAR INSTANCIA ÚNICA
// =========================================================
export const conciliationRepo = new ConciliationRepository()
