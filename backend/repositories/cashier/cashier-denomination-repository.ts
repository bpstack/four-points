// repositories/cashier/cashier-denomination-repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import { CashierDenomination, CreateDenominationDTO } from '../../models/cashier/index.js'

export class CashierDenominationRepository {
  /**
   * Crear una denominación
   */
  static async create(shiftId: number, data: CreateDenominationDTO): Promise<CashierDenomination> {
    // `total` is a generated column (denomination * quantity)
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO cashier_denominations (shift_id, denomination, quantity) VALUES (?, ?, ?)',
      [shiftId, data.denomination, data.quantity]
    )

    const created = await this.getById(result.insertId)
    if (!created) throw new Error('Error al recuperar denominación creada')

    return created
  }

  /**
   * Obtener denominación por ID
   */
  static async getById(id: number): Promise<CashierDenomination | null> {
    const query = 'SELECT * FROM cashier_denominations WHERE id = ?'
    const [rows] = await db.query<CashierDenomination[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener denominaciones de un turno
   */
  static async getByShift(shiftId: number): Promise<CashierDenomination[]> {
    const query = `
      SELECT * 
      FROM cashier_denominations 
      WHERE shift_id = ?
      ORDER BY denomination DESC
    `

    const [rows] = await db.query<CashierDenomination[]>(query, [shiftId])
    return rows
  }

  /**
   * Actualizar cantidad de una denominación
   */
  static async update(id: number, quantity: number): Promise<CashierDenomination> {
    const denomination = await this.getById(id)
    if (!denomination) throw new Error('Denominación no encontrada')

    // `total` is a generated column (denomination * quantity)
    await db.query('UPDATE cashier_denominations SET quantity = ? WHERE id = ?', [quantity, id])

    const updated = await this.getById(id)
    if (!updated) throw new Error('Error al recuperar denominación actualizada')

    return updated
  }

  /**
   * Eliminar denominación
   */
  static async delete(id: number): Promise<void> {
    await db.query('DELETE FROM cashier_denominations WHERE id = ?', [id])
  }

  /**
   * Eliminar todas las denominaciones de un turno
   */
  static async deleteByShift(shiftId: number): Promise<void> {
    await db.query('DELETE FROM cashier_denominations WHERE shift_id = ?', [shiftId])
  }

  /**
   * Obtener total en efectivo de un turno
   */
  static async getTotalCash(shiftId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(total), 0) as total_cash
      FROM cashier_denominations
      WHERE shift_id = ?
    `

    const [rows] = await db.query<any[]>(query, [shiftId])
    return rows[0]?.total_cash || 0
  }

  /**
   * Reemplazar todas las denominaciones de un turno
   */
  static async replaceAllForShift(
    shiftId: number,
    denominations: CreateDenominationDTO[]
  ): Promise<void> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      await connection.query('DELETE FROM cashier_denominations WHERE shift_id = ?', [shiftId])

      const validDenominations = denominations.filter((d) => d.quantity > 0)

      if (validDenominations.length > 0) {
        // ✅ CORREGIDO: Solo 3 valores (sin total)
        const values = validDenominations.map((d) => [
          shiftId,
          d.denomination,
          d.quantity,
          // ❌ ELIMINAR: d.denomination * d.quantity,
        ])

        // ✅ CORREGIDO: Solo 3 columnas (sin total)
        await connection.query(
          'INSERT INTO cashier_denominations (shift_id, denomination, quantity) VALUES ?',
          [values]
        )
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
}
