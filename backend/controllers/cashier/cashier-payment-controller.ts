// controllers/cashier/cashier-payment-controller.ts

import { Request, Response } from 'express'
import { CashierPaymentRepository } from '../../repositories/cashier/cashier-payment-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { logger } from '../../config/logger.js'
import {
  replacePaymentsSchema,
  paymentSchema,
  paymentAmountSchema,
  validationError,
} from '../../validations/cashier/cashier-validation.js'

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
      logger.error({ err: error }, 'Error al obtener pagos')
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
      logger.error({ err: error }, 'Error al obtener resumen')
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
      const parsed = replacePaymentsSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { payments } = parsed.data
      logger.debug({ shiftId }, '🔍 [Controller] replaceAll payments - shiftId:') // ✅ LOG
      logger.debug({ data: payments }, '🔍 [Controller] replaceAll payments - data:') // ✅ LOG

      await CashierPaymentRepository.replaceAllForShift(parseInt(shiftId), payments)

      // Recalcular totales del turno
      await CashierShiftRepository.recalculateTotals(parseInt(shiftId))

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
      logger.debug({ updated }, '✅ [Controller] Pagos actualizados:') // ✅ LOG
      res.json(updated)
    } catch (error) {
      logger.error({ err: error }, 'Error al actualizar pagos')
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
      const parsed = paymentSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }

      const payment = await CashierPaymentRepository.create({
        ...parsed.data,
        shift_id: parseInt(shiftId),
      })

      res.status(201).json(payment)
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        res.status(409).json({ error: 'El turno ya tiene un pago con ese método' })
        return
      }
      logger.error({ err: error }, 'Error al crear pago')
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
      const parsed = paymentAmountSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { amount } = parsed.data

      const updated = await CashierPaymentRepository.update(parseInt(id), amount)

      res.json(updated)
    } catch (error: any) {
      logger.error({ err: error }, 'Error al actualizar pago')
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
      logger.error({ err: error }, 'Error al eliminar pago')
      res.status(500).json({ error: 'Error al eliminar pago' })
    }
  }
}
