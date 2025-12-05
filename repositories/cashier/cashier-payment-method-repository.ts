// repositories/cashier/cashier-payment-method-repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import { PaymentMethod } from '../../models/cashier/index.js'

export class CashierPaymentMethodRepository {
  /**
   * Obtener todos los métodos de pago
   */
  static async getAll(): Promise<PaymentMethod[]> {
    const query = `
      SELECT * 
      FROM payment_methods 
      ORDER BY id ASC
    `

    const [rows] = await db.query<PaymentMethod[]>(query)
    return rows
  }

  /**
   * Obtener método de pago por ID
   */
  static async getById(id: number): Promise<PaymentMethod | null> {
    const query = 'SELECT * FROM payment_methods WHERE id = ?'
    const [rows] = await db.query<PaymentMethod[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener método de pago por nombre
   */
  static async getByName(name: string): Promise<PaymentMethod | null> {
    const query = 'SELECT * FROM payment_methods WHERE name = ?'
    const [rows] = await db.query<PaymentMethod[]>(query, [name])
    return rows[0] || null
  }

  /**
   * Crear método de pago
   */
  static async create(name: string): Promise<PaymentMethod> {
    const query = 'INSERT INTO payment_methods (name) VALUES (?)'
    const [result] = await db.query<ResultSetHeader>(query, [name])

    const created = await this.getById(result.insertId)
    if (!created) throw new Error('Error al recuperar método de pago creado')

    return created
  }

  /**
   * Actualizar método de pago
   */
  static async update(id: number, name: string): Promise<PaymentMethod> {
    const query = 'UPDATE payment_methods SET name = ? WHERE id = ?'
    await db.query(query, [name, id])

    const updated = await this.getById(id)
    if (!updated) throw new Error('Método de pago no encontrado')

    return updated
  }

  /**
   * Eliminar método de pago
   */
  static async delete(id: number): Promise<void> {
    await db.query('DELETE FROM payment_methods WHERE id = ?', [id])
  }

  /**
   * Verificar si existe un método de pago
   */
  static async exists(id: number): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM payment_methods WHERE id = ?'
    const [rows] = await db.query<any[]>(query, [id])
    return (rows[0]?.count || 0) > 0
  }
}
