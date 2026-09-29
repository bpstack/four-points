// controllers/cashier/cashier-shift-controller.ts

import { Request, Response } from 'express'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { CashierShiftUserRepository } from '../../repositories/cashier/cashier-shift-user-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { CashierPaymentRepository } from '../../repositories/cashier/cashier-payment-repository.js'
import { CashierDenominationRepository } from '../../repositories/cashier/cashier-denomination-repository.js'
import { CashierVoucherRepository } from '../../repositories/cashier/cashier-voucher-repository.js'
import { logger } from '../../config/logger.js'
import { ShiftStatus, ShiftType } from '../../models/cashier/index.js'
import {
  shiftListQuerySchema,
  updateShiftSchema,
  reopenSchema,
  shiftUsersSchema,
  validationError,
} from '../../validations/cashier/cashier-validation.js'

export class CashierShiftController {
  /**
   * GET /api/cashier/shifts/:id
   * Obtener turno por ID con todos sus detalles
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const shift = await CashierShiftRepository.getByIdWithUsers(parseInt(id))

      if (!shift) {
        res.status(404).json({ error: 'Turno no encontrado' })
        return
      }

      // Cargar datos relacionados
      const [denominations, payments, vouchers] = await Promise.all([
        CashierDenominationRepository.getByShift(shift.id),
        CashierPaymentRepository.getByShift(shift.id),
        CashierVoucherRepository.getByShift(shift.id),
      ])

      const shiftWithDetails = {
        ...shift,
        denominations,
        payments,
        vouchers,
      }

      res.json(shiftWithDetails)
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener turno')
      res.status(500).json({ error: 'Error al obtener turno' })
    }
  }

  /**
   * GET /api/cashier/shifts
   * Obtener turnos con filtros
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const parsed = shiftListQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }

      const filters = {
        ...parsed.data,
        shift_type: parsed.data.shift_type as ShiftType | undefined,
        status: parsed.data.status as ShiftStatus | undefined,
        sort: parsed.data.sort ?? 'shift_date',
        order: parsed.data.order ?? 'DESC',
        limit: parsed.data.limit ?? 50,
        offset: parsed.data.offset ?? 0,
      }

      const [data, total] = await Promise.all([
        CashierShiftRepository.getAll(filters),
        CashierShiftRepository.count(filters),
      ])

      res.json({
        data,
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener turnos')
      res.status(500).json({ error: 'Error al obtener turnos' })
    }
  }

  /**
   * PATCH /api/cashier/shifts/:id
   * Actualizar turno
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const parsed = updateShiftSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }

      const updated = await CashierShiftRepository.update(parseInt(id), parsed.data)

      // Registrar en historial
      const userId = req.user?.id
      if (userId) {
        await CashierHistoryRepository.create({
          shift_id: updated.id,
          action: 'updated',
          changed_by: userId,
          notes: 'Turno actualizado',
        })
      }

      res.json(updated)
    } catch (error: any) {
      logger.error({ err: error }, 'Error al actualizar turno')
      res.status(500).json({ error: error.message || 'Error al actualizar turno' })
    }
  }

  /**
   * PATCH /api/cashier/shifts/:id/close
   * Cerrar turno
   */
  static async close(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      const closed = await CashierShiftRepository.close(parseInt(id), userId)

      // Registrar en historial
      await CashierHistoryRepository.create({
        shift_id: closed.id,
        action: 'status_changed',
        field_changed: 'status',
        old_value: 'open',
        new_value: 'closed',
        changed_by: userId,
        notes: 'Turno cerrado',
      })

      res.json(closed)
    } catch (error: any) {
      logger.error({ err: error }, 'Error al cerrar turno')
      res.status(500).json({ error: error.message || 'Error al cerrar turno' })
    }
  }

  /**
   * PATCH /api/cashier/shifts/:id/reopen
   * Reabrir turno
   */
  static async reopen(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      const parsed = reopenSchema.safeParse(req.body ?? {})
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }

      const reopened = await CashierShiftRepository.reopen(parseInt(id))

      // Registrar en historial
      await CashierHistoryRepository.create({
        shift_id: reopened.id,
        action: 'status_changed',
        field_changed: 'status',
        old_value: 'closed',
        new_value: 'open',
        changed_by: userId,
        notes: parsed.data.reason || 'Turno reabierto',
      })

      res.json(reopened)
    } catch (error: any) {
      logger.error({ err: error }, 'Error al reabrir turno')
      res.status(500).json({ error: error.message || 'Error al reabrir turno' })
    }
  }

  /**
   * PUT /api/cashier/shifts/:id/users
   * Actualizar responsables del turno
   */
  static async updateUsers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const parsed = shiftUsersSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { primary_user_id, secondary_user_ids } = parsed.data

      await CashierShiftUserRepository.setUsers(
        parseInt(id),
        primary_user_id,
        secondary_user_ids || []
      )

      const userId = req.user?.id
      if (userId) {
        await CashierHistoryRepository.create({
          shift_id: parseInt(id),
          action: 'updated',
          changed_by: userId,
          notes: `Responsables actualizados: ${primary_user_id} + ${
            secondary_user_ids?.length || 0
          } secundarios`,
        })
      }

      const updated = await CashierShiftRepository.getByIdWithUsers(parseInt(id))

      res.json(updated)
    } catch (error) {
      logger.error({ err: error }, 'Error al actualizar usuarios')
      res.status(500).json({ error: 'Error al actualizar usuarios' })
    }
  }

  /**
   * DELETE /api/cashier/shifts/:id
   * Eliminar turno (solo si está abierto)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      await CashierShiftRepository.delete(parseInt(id))

      res.json({ message: 'Turno eliminado correctamente' })
    } catch (error: any) {
      logger.error({ err: error }, 'Error al eliminar turno')
      res.status(500).json({ error: error.message || 'Error al eliminar turno' })
    }
  }

  /**
   * GET /api/cashier/shifts/:id/history
   * Obtener historial de un turno
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const history = await CashierHistoryRepository.getByShift(parseInt(id))

      res.json(history)
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener historial')
      res.status(500).json({ error: 'Error al obtener historial' })
    }
  }
}
