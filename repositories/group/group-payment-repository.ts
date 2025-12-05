// repositories/group/group-payment-repository.ts

import db from '../../config/db'
import {
  GroupPayment,
  PaymentWithGroupInfo,
  CreateGroupPaymentDTO,
  UpdateGroupPaymentDTO,
  PaymentStatus,
  PaymentsSummary,
} from '../../models/group/index'
import { ResultSetHeader } from 'mysql2'

export class GroupPaymentRepository {
  /**
   * Helper: Parsear decimales de MySQL a números
   */
  private static parsePayment(payment: any): GroupPayment {
    return {
      ...payment,
      percentage: payment.percentage ? parseFloat(payment.percentage) : null,
      amount: parseFloat(payment.amount) || 0,
      amount_paid: parseFloat(payment.amount_paid) || 0,
    }
  }

  /**
   * Helper: Parsear payment con info del grupo
   */
  private static parsePaymentWithGroupInfo(payment: any): PaymentWithGroupInfo {
    return {
      ...payment,
      percentage: payment.percentage ? parseFloat(payment.percentage) : null,
      amount: parseFloat(payment.amount) || 0,
      amount_paid: parseFloat(payment.amount_paid) || 0,
      group_total_amount: payment.group_total_amount
        ? parseFloat(payment.group_total_amount)
        : null,
    }
  }

  /**
   * Obtener todos los pagos de un grupo
   */
  static async getByGroupId(groupId: number): Promise<GroupPayment[]> {
    const query = `
      SELECT * FROM group_payments
      WHERE group_id = ?
      ORDER BY payment_order ASC, due_date ASC
    `

    const [rows] = await db.query<any[]>(query, [groupId])
    return rows.map((row) => this.parsePayment(row))
  }

  /**
   * Obtener pago por ID
   */
  static async getById(id: number): Promise<PaymentWithGroupInfo | null> {
    const query = `
      SELECT 
        gp.*,
        g.name as group_name,
        g.total_amount as group_total_amount,
        g.agency
      FROM group_payments gp
      INNER JOIN hotel_groups g ON gp.group_id = g.id
      WHERE gp.id = ?
    `

    const [rows] = await db.query<any[]>(query, [id])
    return rows[0] ? this.parsePaymentWithGroupInfo(rows[0]) : null
  }

  /**
   * Crear pago
   */
  static async create(
    paymentData: CreateGroupPaymentDTO
  ): Promise<GroupPayment> {
    const {
      group_id,
      payment_name,
      payment_order = 1,
      percentage,
      amount,
      amount_paid = 0,
      due_date,
      status = PaymentStatus.PENDING,
      notes,
    } = paymentData

    const query = `
      INSERT INTO group_payments 
      (group_id, payment_name, payment_order, percentage, amount, amount_paid, due_date, status, notes, status_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      group_id,
      payment_name,
      payment_order,
      percentage,
      amount,
      amount_paid,
      due_date,
      status,
      notes,
    ])

    const createdPayment = await this.getById(result.insertId)

    if (!createdPayment) {
      throw new Error('Error al recuperar el pago creado')
    }

    return createdPayment as GroupPayment
  }

  /**
   * Actualizar pago completo
   */
  static async update(
    id: number,
    paymentData: UpdateGroupPaymentDTO
  ): Promise<boolean> {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(paymentData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    values.push(id)

    const query = `UPDATE group_payments SET ${fields.join(
      ', '
    )}, updated_at = NOW() WHERE id = ?`
    const [result] = await db.query<ResultSetHeader>(query, values)

    return result.affectedRows > 0
  }

  /**
   * Actualizar solo el estado del pago
   */
  static async updateStatus(
    id: number,
    status: PaymentStatus
  ): Promise<boolean> {
    const query = `
      UPDATE group_payments 
      SET status = ?, status_updated_at = NOW()
      WHERE id = ?
    `

    const [result] = await db.query<ResultSetHeader>(query, [status, id])
    return result.affectedRows > 0
  }

  /**
   * Actualizar cantidad pagada (pagos parciales)
   */
  static async updateAmountPaid(
    id: number,
    amountPaid: number
  ): Promise<boolean> {
    const payment = await this.getById(id)

    if (!payment) {
      throw new Error('Pago no encontrado')
    }

    // Calcular nuevo estado automáticamente
    let newStatus = PaymentStatus.PENDING
    if (amountPaid >= payment.amount) {
      newStatus = PaymentStatus.PAID
    } else if (amountPaid > 0) {
      newStatus = PaymentStatus.PARTIAL
    }

    const query = `
      UPDATE group_payments 
      SET amount_paid = ?, status = ?, status_updated_at = NOW()
      WHERE id = ?
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      amountPaid,
      newStatus,
      id,
    ])
    return result.affectedRows > 0
  }

  /**
   * Eliminar pago
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM group_payments WHERE id = ?',
      [id]
    )
    return result.affectedRows > 0
  }

  /**
   * Recalcular amounts de todos los pagos con porcentaje
   */
  static async recalculateAmounts(
    groupId: number,
    totalAmount: number
  ): Promise<number> {
    const query = `
      UPDATE group_payments 
      SET amount = (? * percentage / 100)
      WHERE group_id = ? AND percentage IS NOT NULL
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      totalAmount,
      groupId,
    ])
    return result.affectedRows
  }

  /**
   * Obtener pagos próximos a vencer (X días)
   */
  static async getUpcoming(days: number = 7): Promise<PaymentWithGroupInfo[]> {
    const query = `
      SELECT 
        gp.*,
        g.name as group_name,
        g.agency,
        DATEDIFF(gp.due_date, CURDATE()) as days_until_due
      FROM group_payments gp
      INNER JOIN hotel_groups g ON gp.group_id = g.id
      WHERE gp.status IN ('pending', 'requested', 'partial')
      AND gp.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY gp.due_date ASC
    `

    const [rows] = await db.query<any[]>(query, [days])
    return rows.map((row) => this.parsePaymentWithGroupInfo(row))
  }

  /**
   * Obtener pagos vencidos
   */
  static async getOverdue(): Promise<PaymentWithGroupInfo[]> {
    const query = `
      SELECT 
        gp.*,
        g.name as group_name,
        g.agency,
        DATEDIFF(CURDATE(), gp.due_date) as days_overdue
      FROM group_payments gp
      INNER JOIN hotel_groups g ON gp.group_id = g.id
      WHERE gp.status IN ('pending', 'requested', 'partial')
      AND gp.due_date < CURDATE()
      ORDER BY gp.due_date ASC
    `

    const [rows] = await db.query<any[]>(query)
    return rows.map((row) => this.parsePaymentWithGroupInfo(row))
  }

  /**
   * Obtener resumen de pagos para dashboard
   */
  static async getPaymentsSummary(): Promise<PaymentsSummary> {
    const query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'partial' THEN amount_paid ELSE 0 END) as total_partial,
        SUM(amount) as total_expected
      FROM group_payments
    `

    const [rows] = await db.query<PaymentsSummary[]>(query)
    const raw = rows[0]

    // Parsear decimales manteniendo la estructura de RowDataPacket
    return {
      ...raw,
      total_payments: parseInt(raw.total_payments as any) || 0,
      total_paid: parseFloat(raw.total_paid as any) || 0,
      total_pending: parseFloat(raw.total_pending as any) || 0,
      total_partial: parseFloat(raw.total_partial as any) || 0,
      total_expected: parseFloat(raw.total_expected as any) || 0,
    } as PaymentsSummary
  }
}
