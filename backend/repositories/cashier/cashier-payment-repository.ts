// repositories/cashier/cashier-payment-repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import { CashierPayment, CreatePaymentDTO } from '../../models/cashier/index.js'

export class CashierPaymentRepository {
  /**
   * Crear un pago
   */
  static async create(data: CreatePaymentDTO): Promise<CashierPayment> {
    const query = `
      INSERT INTO cashier_payments (
        shift_id,
        payment_method_id,
        amount
      ) VALUES (?, ?, ?)
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      data.shift_id,
      data.payment_method_id,
      data.amount,
    ])

    const created = await this.getById(result.insertId)
    if (!created) throw new Error('Error al recuperar pago creado')

    return created
  }

  /**
   * Obtener pago por ID
   */
  static async getById(id: number): Promise<CashierPayment | null> {
    const query = `
      SELECT 
        cp.*,
        pm.name as payment_method_name
      FROM cashier_payments cp
      INNER JOIN payment_methods pm ON cp.payment_method_id = pm.id
      WHERE cp.id = ?
    `

    const [rows] = await db.query<any[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener pagos de un turno
   */
  static async getByShift(shiftId: number): Promise<CashierPayment[]> {
    const query = `
      SELECT 
        cp.*,
        pm.name as payment_method_name
      FROM cashier_payments cp
      INNER JOIN payment_methods pm ON cp.payment_method_id = pm.id
      WHERE cp.shift_id = ?
      ORDER BY pm.id ASC
    `

    const [rows] = await db.query<CashierPayment[]>(query, [shiftId])
    return rows
  }

  /**
   * Actualizar monto de un pago
   */
  static async update(id: number, amount: number): Promise<CashierPayment> {
    const query = `
      UPDATE cashier_payments 
      SET amount = ?, updated_at = NOW()
      WHERE id = ?
    `

    await db.query(query, [amount, id])

    const updated = await this.getById(id)
    if (!updated) throw new Error('Pago no encontrado')

    return updated
  }

  /**
   * Eliminar pago
   */
  static async delete(id: number): Promise<void> {
    await db.query('DELETE FROM cashier_payments WHERE id = ?', [id])
  }

  /**
   * Eliminar todos los pagos de un turno
   */
  static async deleteByShift(shiftId: number): Promise<void> {
    await db.query('DELETE FROM cashier_payments WHERE shift_id = ?', [shiftId])
  }

  /**
   * Obtener total por método de pago en un turno
   */
  static async getTotalByMethod(shiftId: number, paymentMethodId: number): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM cashier_payments
      WHERE shift_id = ? AND payment_method_id = ?
    `

    const [rows] = await db.query<any[]>(query, [shiftId, paymentMethodId])
    return rows[0]?.total || 0
  }

  /**
   * Obtener resumen de pagos de un turno
   */
  static async getSummaryByShift(shiftId: number): Promise<
    Array<{
      payment_method_id: number
      payment_method_name: string
      total_amount: number
    }>
  > {
    const query = `
      SELECT 
        pm.id as payment_method_id,
        pm.name as payment_method_name,
        COALESCE(SUM(cp.amount), 0) as total_amount
      FROM payment_methods pm
      LEFT JOIN cashier_payments cp ON pm.id = cp.payment_method_id AND cp.shift_id = ?
      GROUP BY pm.id, pm.name
      ORDER BY pm.id ASC
    `

    const [rows] = await db.query<any[]>(query, [shiftId])
    return rows
  }

  /**
   * Reemplazar todos los pagos de un turno (bulk update)
   */
  static async replaceAllForShift(
    shiftId: number,
    payments: Array<{ payment_method_id: number; amount: number }>
  ): Promise<void> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Eliminar pagos existentes
      await connection.query('DELETE FROM cashier_payments WHERE shift_id = ?', [shiftId])

      // Insertar nuevos pagos (solo los que tienen amount > 0)
      const validPayments = payments.filter((p) => p.amount > 0)

      if (validPayments.length > 0) {
        const values = validPayments.map((p) => [shiftId, p.payment_method_id, p.amount])
        await connection.query(
          'INSERT INTO cashier_payments (shift_id, payment_method_id, amount) VALUES ?',
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

  /**
   * Verificar si un turno tiene pagos registrados
   */
  static async hasPayments(shiftId: number): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM cashier_payments 
      WHERE shift_id = ?
    `

    const [rows] = await db.query<any[]>(query, [shiftId])
    return (rows[0]?.count || 0) > 0
  }
}
