// modules/groups/controllers/group-payment-controller.ts

import { Request, Response } from 'express'
import { GroupPaymentRepository } from '../../repositories/group/group-payment-repository'
import { GroupRepository } from '../../repositories/group/group-repository'
import { PaymentCalculatorService } from '../../services/group/payment-calculator-service'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { CreateGroupPaymentDTO, UpdateGroupPaymentDTO } from '../../models/group/index'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'
import {
  createPaymentSchema,
  updatePaymentSchema,
  paymentStatusSchema,
  amountPaidSchema,
  upcomingPaymentsQuerySchema,
  validationError,
} from '../../validations/group/group-schemas.js'

export class GroupPaymentController {
  /**
   * GET /api/groups/:id/payments
   * Obtener todos los pagos de un grupo
   */
  static async getPaymentsByGroup(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_INVALID_ID,
          code: ERROR_CODES.GROUP_INVALID_ID,
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const payments = await GroupPaymentRepository.getByGroupId(groupId)
      const balance = await PaymentCalculatorService.calculateBalance(groupId)

      return res.status(200).json({
        success: true,
        data: {
          payments,
          balance,
        },
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getPaymentsByGroup')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_FETCH_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_FETCH_ERROR,
      })
    }
  }

  /**
   * POST /api/groups/:id/payments
   * Crear nuevo pago
   */
  static async createPayment(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_INVALID_ID,
          code: ERROR_CODES.GROUP_INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const parsed = createPaymentSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }

      const paymentData = {
        ...parsed.data,
        group_id: groupId,
        amount_paid: parsed.data.amount_paid ?? 0,
      } as CreateGroupPaymentDTO

      if (paymentData.percentage && group.total_amount) {
        paymentData.amount = PaymentCalculatorService.calculateAmount(
          group.total_amount,
          paymentData.percentage
        )
      }

      if (!paymentData.amount || paymentData.amount <= 0) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_INVALID_AMOUNT,
          code: ERROR_CODES.GROUP_PAYMENT_INVALID_AMOUNT,
        })
      }

      const newPayment = await GroupPaymentRepository.create(paymentData)

      await GroupHistoryService.logChange(
        groupId,
        userId,
        'created' as any,
        'group_payments',
        newPayment.id,
        null,
        null,
        JSON.stringify(paymentData),
        'Pago creado'
      )

      return res.status(201).json({
        success: true,
        message: SUCCESS_CODES.GROUP_PAYMENT_CREATED,
        code: SUCCESS_CODES.GROUP_PAYMENT_CREATED,
        data: newPayment,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en createPayment')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_CREATE_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_CREATE_ERROR,
      })
    }
  }

  /**
   * PUT /api/groups/:id/payments/:paymentId
   * Actualizar pago completo
   */
  static async updatePayment(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const paymentId = parseInt(req.params.paymentId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(paymentId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const oldPayment = await GroupPaymentRepository.getById(paymentId)

      if (!oldPayment) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
        })
      }

      if (oldPayment.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
        })
      }

      const parsed = updatePaymentSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const updateData = parsed.data as UpdateGroupPaymentDTO

      const updated = await GroupPaymentRepository.update(paymentId, updateData)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
          code: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
        })
      }

      const updatedPayment = await GroupPaymentRepository.getById(paymentId)

      await GroupHistoryService.logPaymentUpdated(
        groupId,
        paymentId,
        userId,
        oldPayment,
        updatedPayment || updateData
      )

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_PAYMENT_UPDATED,
        code: SUCCESS_CODES.GROUP_PAYMENT_UPDATED,
        data: updatedPayment,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en updatePayment')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
      })
    }
  }

  /**
   * PATCH /api/groups/:id/payments/:paymentId/status
   * Actualizar solo el estado del pago
   */
  static async updatePaymentStatus(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const paymentId = parseInt(req.params.paymentId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(paymentId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      const parsed = paymentStatusSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const { status } = parsed.data

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const oldPayment = await GroupPaymentRepository.getById(paymentId)

      if (!oldPayment) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
        })
      }

      if (oldPayment.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
        })
      }

      const updated = await GroupPaymentRepository.updateStatus(paymentId, status)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
          code: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
        })
      }

      await GroupHistoryService.logChange(
        oldPayment.group_id,
        userId,
        'payment_updated' as any,
        'group_payments',
        paymentId,
        'status',
        oldPayment.status,
        status,
        'Estado de pago actualizado'
      )

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_PAYMENT_UPDATED,
        code: SUCCESS_CODES.GROUP_PAYMENT_UPDATED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en updatePaymentStatus')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
      })
    }
  }

  /**
   * PATCH /api/groups/:id/payments/:paymentId/amount-paid
   * Registrar pago parcial o total
   */
  static async updateAmountPaid(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const paymentId = parseInt(req.params.paymentId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(paymentId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      const parsed = amountPaidSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const { amount_paid } = parsed.data

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const oldPayment = await GroupPaymentRepository.getById(paymentId)

      if (!oldPayment) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
        })
      }

      if (oldPayment.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
        })
      }

      const updated = await GroupPaymentRepository.updateAmountPaid(paymentId, amount_paid)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
          code: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
        })
      }

      await GroupHistoryService.logChange(
        oldPayment.group_id,
        userId,
        'payment_updated' as any,
        'group_payments',
        paymentId,
        'amount_paid',
        oldPayment.amount_paid,
        amount_paid,
        'Cantidad pagada actualizada'
      )

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_PAYMENT_UPDATED,
        code: SUCCESS_CODES.GROUP_PAYMENT_UPDATED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en updateAmountPaid')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_UPDATE_ERROR,
      })
    }
  }

  /**
   * DELETE /api/groups/:id/payments/:paymentId
   * Eliminar pago
   */
  static async deletePayment(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const paymentId = parseInt(req.params.paymentId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(paymentId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const payment = await GroupPaymentRepository.getById(paymentId)

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_FOUND,
        })
      }

      if (payment.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_PAYMENT_NOT_IN_GROUP,
        })
      }

      const deleted = await GroupPaymentRepository.delete(paymentId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_PAYMENT_DELETE_ERROR,
          code: ERROR_CODES.GROUP_PAYMENT_DELETE_ERROR,
        })
      }

      await GroupHistoryService.logDeleted(groupId, userId, 'group_payments', paymentId, payment)

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_PAYMENT_DELETED,
        code: SUCCESS_CODES.GROUP_PAYMENT_DELETED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en deletePayment')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_DELETE_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_DELETE_ERROR,
      })
    }
  }

  /**
   * GET /api/payments/upcoming
   * Obtener pagos próximos a vencer
   */
  static async getUpcomingPayments(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = upcomingPaymentsQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const days = parsed.data.days ?? 7

      const payments = await GroupPaymentRepository.getUpcoming(days)

      return res.status(200).json({
        success: true,
        data: payments,
        count: payments.length,
        days,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getUpcomingPayments')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_FETCH_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_FETCH_ERROR,
      })
    }
  }

  /**
   * GET /api/payments/overdue
   * Obtener pagos vencidos
   */
  static async getOverduePayments(_req: Request, res: Response): Promise<Response> {
    try {
      const payments = await GroupPaymentRepository.getOverdue()

      return res.status(200).json({
        success: true,
        data: payments,
        count: payments.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getOverduePayments')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_PAYMENT_FETCH_ERROR,
        code: ERROR_CODES.GROUP_PAYMENT_FETCH_ERROR,
      })
    }
  }
}
