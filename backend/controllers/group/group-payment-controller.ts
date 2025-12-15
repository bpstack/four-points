// modules/groups/controllers/group-payment-controller.ts

import { Request, Response } from 'express'
import { GroupPaymentRepository } from '../../repositories/group/group-payment-repository'
import { GroupRepository } from '../../repositories/group/group-repository'
import { PaymentCalculatorService } from '../../services/group/payment-calculator-service'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { CreateGroupPaymentDTO, UpdateGroupPaymentDTO } from '../../models/group/index'

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
          error: 'ID de grupo inválido',
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo no encontrado',
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
      console.error('Error en getPaymentsByGroup:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener pagos',
        message: error.message,
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
          error: 'ID de grupo inválido',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo no encontrado',
        })
      }

      const paymentData: CreateGroupPaymentDTO = {
        group_id: groupId,
        payment_name: req.body.payment_name,
        payment_order: req.body.payment_order,
        percentage: req.body.percentage,
        amount: req.body.amount,
        amount_paid: req.body.amount_paid || 0,
        due_date: req.body.due_date,
        status: req.body.status,
        notes: req.body.notes,
      }

      if (!paymentData.payment_name || !paymentData.due_date) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: payment_name, due_date',
        })
      }

      if (paymentData.percentage && group.total_amount) {
        paymentData.amount = PaymentCalculatorService.calculateAmount(
          group.total_amount,
          paymentData.percentage
        )
      }

      if (!paymentData.amount || paymentData.amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'El pago debe tener un monto (amount) mayor a 0',
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
        message: 'Pago creado correctamente',
        data: newPayment,
      })
    } catch (error: any) {
      console.error('Error en createPayment:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al crear pago',
        message: error.message,
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
          error: 'IDs inválidos',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const oldPayment = await GroupPaymentRepository.getById(paymentId)

      if (!oldPayment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        })
      }

      if (oldPayment.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: 'El pago no pertenece a este grupo',
        })
      }

      const updateData: UpdateGroupPaymentDTO = req.body

      const updated = await GroupPaymentRepository.update(paymentId, updateData)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar pago',
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
        message: 'Pago actualizado correctamente',
        data: updatedPayment,
      })
    } catch (error: any) {
      console.error('Error en updatePayment:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar pago',
        message: error.message,
      })
    }
  }

  /**
   * PATCH /api/groups/:id/payments/:paymentId/status
   * Actualizar solo el estado del pago
   */
  static async updatePaymentStatus(req: Request, res: Response): Promise<Response> {
    try {
      const paymentId = parseInt(req.params.paymentId)
      const userId = req.user?.id
      const { status } = req.body

      if (isNaN(paymentId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de pago inválido',
        })
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Estado no proporcionado',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const oldPayment = await GroupPaymentRepository.getById(paymentId)

      if (!oldPayment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        })
      }

      const updated = await GroupPaymentRepository.updateStatus(paymentId, status)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar estado del pago',
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
        message: 'Estado actualizado correctamente',
      })
    } catch (error: any) {
      console.error('Error en updatePaymentStatus:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar estado',
        message: error.message,
      })
    }
  }

  /**
   * PATCH /api/groups/:id/payments/:paymentId/amount-paid
   * Registrar pago parcial o total
   */
  static async updateAmountPaid(req: Request, res: Response): Promise<Response> {
    try {
      const paymentId = parseInt(req.params.paymentId)
      const userId = req.user?.id
      const { amount_paid } = req.body

      if (isNaN(paymentId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de pago inválido',
        })
      }

      if (amount_paid === undefined || amount_paid < 0) {
        return res.status(400).json({
          success: false,
          error: 'Cantidad pagada inválida',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const oldPayment = await GroupPaymentRepository.getById(paymentId)

      if (!oldPayment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        })
      }

      const updated = await GroupPaymentRepository.updateAmountPaid(paymentId, amount_paid)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar cantidad pagada',
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
        message: 'Cantidad pagada actualizada correctamente',
      })
    } catch (error: any) {
      console.error('Error en updateAmountPaid:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar cantidad pagada',
        message: error.message,
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
          error: 'IDs inválidos',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const payment = await GroupPaymentRepository.getById(paymentId)

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        })
      }

      if (payment.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: 'El pago no pertenece a este grupo',
        })
      }

      const deleted = await GroupPaymentRepository.delete(paymentId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Error al eliminar pago',
        })
      }

      await GroupHistoryService.logDeleted(groupId, userId, 'group_payments', paymentId, payment)

      return res.status(200).json({
        success: true,
        message: 'Pago eliminado correctamente',
      })
    } catch (error: any) {
      console.error('Error en deletePayment:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar pago',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/payments/upcoming
   * Obtener pagos próximos a vencer
   */
  static async getUpcomingPayments(req: Request, res: Response): Promise<Response> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7

      const payments = await GroupPaymentRepository.getUpcoming(days)

      return res.status(200).json({
        success: true,
        data: payments,
        count: payments.length,
        days,
      })
    } catch (error: any) {
      console.error('Error en getUpcomingPayments:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener pagos próximos',
        message: error.message,
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
      console.error('Error en getOverduePayments:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener pagos vencidos',
        message: error.message,
      })
    }
  }
}
