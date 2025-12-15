// controllers/cashier/cashier-payment-controller.ts

import { Request, Response } from 'express'
import { CashierPaymentRepository } from '../../repositories/cashier/cashier-payment-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'

export class CashierPaymentController {
  /**
   * GET /api/cashier/shifts/:shiftId/payments
   * Obtener pagos de un turno
   */
  static async getByShift(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params

      const payments = await CashierPaymentRepository.getByShift(parseInt(shiftId))

      res.json(payments)
    } catch (error) {
      console.error('Error al obtener pagos:', error)
      res.status(500).json({ error: 'Error al obtener pagos' })
    }
  }

  /**
   * GET /api/cashier/shifts/:shiftId/payments/summary
   * Obtener resumen de pagos por método
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params

      const summary = await CashierPaymentRepository.getSummaryByShift(parseInt(shiftId))

      res.json(summary)
    } catch (error) {
      console.error('Error al obtener resumen:', error)
      res.status(500).json({ error: 'Error al obtener resumen' })
    }
  }

  /**
   * PUT /api/cashier/shifts/:shiftId/payments
   * Reemplazar todos los pagos de un turno
   */
  static async replaceAll(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params
      const { payments } = req.body
      console.log('🔍 [Controller] replaceAll payments - shiftId:', shiftId) // ✅ LOG
      console.log('🔍 [Controller] replaceAll payments - data:', payments) // ✅ LOG

      await CashierPaymentRepository.replaceAllForShift(parseInt(shiftId), payments)

      const userId = req.user?.id
      if (userId) {
        await CashierHistoryRepository.create({
          shift_id: parseInt(shiftId),
          action: 'updated',
          table_affected: 'cashier_payments',
          changed_by: userId,
          notes: `Pagos actualizados: ${payments.length} métodos`,
        })
      }

      const updated = await CashierPaymentRepository.getByShift(parseInt(shiftId))
      console.log('✅ [Controller] Pagos actualizados:', updated) // ✅ LOG
      res.json(updated)
    } catch (error) {
      console.error('Error al actualizar pagos:', error)
      res.status(500).json({ error: 'Error al actualizar pagos' })
    }
  }

  /**
   * POST /api/cashier/shifts/:shiftId/payments
   * Crear pago individual
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params
      const paymentData = req.body

      const payment = await CashierPaymentRepository.create({
        shift_id: parseInt(shiftId),
        ...paymentData,
      })

      res.status(201).json(payment)
    } catch (error) {
      console.error('Error al crear pago:', error)
      res.status(500).json({ error: 'Error al crear pago' })
    }
  }

  /**
   * PATCH /api/cashier/payments/:id
   * Actualizar pago
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { amount } = req.body

      const updated = await CashierPaymentRepository.update(parseInt(id), amount)

      res.json(updated)
    } catch (error: any) {
      console.error('Error al actualizar pago:', error)
      res.status(500).json({ error: error.message || 'Error al actualizar pago' })
    }
  }

  /**
   * DELETE /api/cashier/payments/:id
   * Eliminar pago
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      await CashierPaymentRepository.delete(parseInt(id))

      res.json({ message: 'Pago eliminado correctamente' })
    } catch (error) {
      console.error('Error al eliminar pago:', error)
      res.status(500).json({ error: 'Error al eliminar pago' })
    }
  }
}
