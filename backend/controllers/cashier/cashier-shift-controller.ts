// controllers/cashier/cashier-shift-controller.ts

import { Request, Response } from 'express'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { CashierShiftUserRepository } from '../../repositories/cashier/cashier-shift-user-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { CashierPaymentRepository } from '../../repositories/cashier/cashier-payment-repository.js'
import { CashierDenominationRepository } from '../../repositories/cashier/cashier-denomination-repository.js'
import { CashierVoucherRepository } from '../../repositories/cashier/cashier-voucher-repository.js'

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
      console.error('Error al obtener turno:', error)
      res.status(500).json({ error: 'Error al obtener turno' })
    }
  }

  /**
   * GET /api/cashier/shifts
   * Obtener turnos con filtros
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        shift_date,
        from_date,
        to_date,
        shift_type,
        status,
        opened_by,
        closed_by,
        sort = 'shift_date',
        order = 'DESC',
        limit = '50',
        offset = '0',
      } = req.query

      const filters = {
        shift_date: shift_date as string,
        from_date: from_date as string,
        to_date: to_date as string,
        shift_type: shift_type as any,
        status: status as any,
        opened_by: opened_by as string,
        closed_by: closed_by as string,
        sort: sort as any,
        order: order as 'ASC' | 'DESC',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
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
      console.error('Error al obtener turnos:', error)
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
      const updateData = req.body

      const updated = await CashierShiftRepository.update(parseInt(id), updateData)

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
      console.error('Error al actualizar turno:', error)
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
      console.error('Error al cerrar turno:', error)
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

      const reopened = await CashierShiftRepository.reopen(parseInt(id))

      // Registrar en historial
      await CashierHistoryRepository.create({
        shift_id: reopened.id,
        action: 'status_changed',
        field_changed: 'status',
        old_value: 'closed',
        new_value: 'open',
        changed_by: userId,
        notes: req.body.reason || 'Turno reabierto',
      })

      res.json(reopened)
    } catch (error: any) {
      console.error('Error al reabrir turno:', error)
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
      const { primary_user_id, secondary_user_ids } = req.body

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
      console.error('Error al actualizar usuarios:', error)
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
      console.error('Error al eliminar turno:', error)
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
      console.error('Error al obtener historial:', error)
      res.status(500).json({ error: 'Error al obtener historial' })
    }
  }
}
