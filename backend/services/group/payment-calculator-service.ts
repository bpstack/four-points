// services/group/payment-calculator-service.ts

import { GroupPaymentRepository } from '../../repositories/group/group-payment-repository'
import { GroupRepository } from '../../repositories/group/group-repository'

export class PaymentCalculatorService {
  /**
   * Recalcular amounts de todos los pagos de un grupo
   * Solo actualiza pagos que tienen porcentaje definido
   */
  static async recalculatePayments(groupId: number, newTotalAmount: number): Promise<number> {
    try {
      // Verificar que el grupo existe
      const group = await GroupRepository.getById(groupId)

      if (!group) {
        throw new Error(`Grupo con ID ${groupId} no encontrado`)
      }

      // Recalcular todos los pagos con porcentaje
      const affectedRows = await GroupPaymentRepository.recalculateAmounts(groupId, newTotalAmount)

      return affectedRows
    } catch (error) {
      console.error('Error recalculando pagos:', error)
      throw error
    }
  }

  /**
   * Calcular amount de un pago basado en porcentaje y total del grupo
   */
  static calculateAmount(totalAmount: number, percentage: number): number {
    if (percentage < 0 || percentage > 100) {
      throw new Error('El porcentaje debe estar entre 0 y 100')
    }

    return Math.round(((totalAmount * percentage) / 100) * 100) / 100 // Redondear a 2 decimales
  }

  /**
   * Calcular porcentaje de un pago basado en amount y total del grupo
   */
  static calculatePercentage(amount: number, totalAmount: number): number {
    if (totalAmount === 0) {
      throw new Error('El total del grupo no puede ser 0')
    }

    return Math.round((amount / totalAmount) * 100 * 100) / 100 // Redondear a 2 decimales
  }

  /**
   * Calcular el balance restante de un grupo
   */
  static async calculateBalance(groupId: number): Promise<{
    totalExpected: number
    totalPaid: number
    totalPending: number
    percentagePaid: number
  }> {
    const payments = await GroupPaymentRepository.getByGroupId(groupId)

    const totalExpected = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0)
    const totalPending = totalExpected - totalPaid
    const percentagePaid = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0

    return {
      totalExpected: Math.round(totalExpected * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      percentagePaid: Math.round(percentagePaid * 100) / 100,
    }
  }

  /**
   * Verificar si un pago está completamente pagado
   */
  static isPaymentComplete(amount: number, amountPaid: number): boolean {
    return amountPaid >= amount
  }

  /**
   * Verificar si un pago está parcialmente pagado
   */
  static isPaymentPartial(amount: number, amountPaid: number): boolean {
    return amountPaid > 0 && amountPaid < amount
  }
}
