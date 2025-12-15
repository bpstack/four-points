// controllers/cashier/cashier-voucher-controller.ts

import { Request, Response } from 'express'
import { CashierVoucherRepository } from '../../repositories/cashier/cashier-voucher-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'

export class CashierVoucherController {
  /**
   * GET /api/cashier/vouchers
   * Obtener vales con filtros
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        created_by,
        from_date,
        to_date,
        min_amount,
        max_amount,
        shift_id,
        sort = 'created_at',
        order = 'DESC',
        limit = '50',
        offset = '0',
      } = req.query

      const filters = {
        status: status as any,
        created_by: created_by as string,
        from_date: from_date as string,
        to_date: to_date as string,
        min_amount: min_amount ? parseFloat(min_amount as string) : undefined,
        max_amount: max_amount ? parseFloat(max_amount as string) : undefined,
        shift_id: shift_id ? parseInt(shift_id as string) : undefined,
        sort: sort as any,
        order: order as 'ASC' | 'DESC',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }

      const [data, total] = await Promise.all([
        CashierVoucherRepository.getAll(filters),
        CashierVoucherRepository.count(filters),
      ])

      res.json({
        data,
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      })
    } catch (error) {
      console.error('Error al obtener vales:', error)
      res.status(500).json({ error: 'Error al obtener vales' })
    }
  }

  /**
   * GET /api/cashier/vouchers/active
   * Obtener vales activos
   */
  static async getActive(_req: Request, res: Response): Promise<void> {
    try {
      const [vouchers, total] = await Promise.all([
        CashierVoucherRepository.getActiveVouchers(),
        CashierVoucherRepository.getTotalActive(),
      ])

      res.json({
        vouchers,
        total_amount: total,
        count: vouchers.length,
      })
    } catch (error) {
      console.error('Error al obtener vales activos:', error)
      res.status(500).json({ error: 'Error al obtener vales activos' })
    }
  }

  /**
   * GET /api/cashier/vouchers/:id
   * Obtener vale por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const voucher = await CashierVoucherRepository.getById(parseInt(id))

      if (!voucher) {
        res.status(404).json({ error: 'Vale no encontrado' })
        return
      }

      res.json(voucher)
    } catch (error) {
      console.error('Error al obtener vale:', error)
      res.status(500).json({ error: 'Error al obtener vale' })
    }
  }

  /**
   * POST /api/cashier/shifts/:shiftId/vouchers
   * Crear vale en un turno
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params
      const voucherData = req.body

      // Verificar límite de 5 vales por turno
      const canAdd = await CashierVoucherRepository.canAddVoucherToShift(parseInt(shiftId))
      if (!canAdd) {
        res.status(400).json({ error: 'El turno ya tiene el máximo de 5 vales' })
        return
      }

      // Crear vale
      const voucher = await CashierVoucherRepository.create(voucherData)

      // Asociar con turno
      await CashierVoucherRepository.associateWithShift(voucher.id, parseInt(shiftId))

      // Registrar en historial
      await CashierHistoryRepository.create({
        shift_id: parseInt(shiftId),
        action: 'voucher_created',
        table_affected: 'cashier_vouchers',
        record_id: voucher.id,
        changed_by: voucherData.created_by,
        notes: `Vale creado: ${voucher.amount}€ - ${voucher.reason}`,
      })

      res.status(201).json(voucher)
    } catch (error) {
      console.error('Error al crear vale:', error)
      res.status(500).json({ error: 'Error al crear vale' })
    }
  }

  /**
   * PATCH /api/cashier/vouchers/:id
   * Actualizar vale
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const updateData = req.body

      const updated = await CashierVoucherRepository.update(parseInt(id), updateData)

      const userId = req.user?.id
      if (userId) {
        await CashierHistoryRepository.create({
          shift_id: updated.shift_id || 0,
          action: 'updated',
          table_affected: 'cashier_vouchers',
          record_id: updated.id,
          changed_by: userId,
          notes: 'Vale actualizado',
        })
      }

      res.json(updated)
    } catch (error: any) {
      console.error('Error al actualizar vale:', error)
      res.status(500).json({ error: error.message || 'Error al actualizar vale' })
    }
  }

  /**
   * PATCH /api/cashier/vouchers/:id/justify
   * Justificar vale (asociar con turno)
   */
  static async justify(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { shift_id } = req.body

      const justified = await CashierVoucherRepository.justify(parseInt(id), shift_id)

      const userId = req.user?.id
      if (userId) {
        await CashierHistoryRepository.create({
          shift_id,
          action: 'updated',
          table_affected: 'cashier_vouchers',
          record_id: justified.id,
          field_changed: 'status',
          old_value: 'pending',
          new_value: 'justified',
          changed_by: userId,
          notes: 'Vale justificado',
        })
      }

      res.json(justified)
    } catch (error: any) {
      console.error('Error al justificar vale:', error)
      res.status(500).json({ error: error.message || 'Error al justificar vale' })
    }
  }

  /**
   * PATCH /api/cashier/vouchers/:id/cancel
   * Cancelar vale
   */
  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const cancelled = await CashierVoucherRepository.cancel(parseInt(id))

      const userId = req.user?.id
      if (userId) {
        await CashierHistoryRepository.create({
          shift_id: cancelled.shift_id || 0,
          action: 'updated',
          table_affected: 'cashier_vouchers',
          record_id: cancelled.id,
          field_changed: 'status',
          old_value: 'pending',
          new_value: 'cancelled',
          changed_by: userId,
          notes: 'Vale cancelado',
        })
      }

      res.json(cancelled)
    } catch (error: any) {
      console.error('Error al cancelar vale:', error)
      res.status(500).json({ error: error.message || 'Error al cancelar vale' })
    }
  }

  /**
   * DELETE /api/cashier/vouchers/:id
   * Eliminar vale (solo si está pendiente)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      await CashierVoucherRepository.delete(parseInt(id))

      res.json({ message: 'Vale eliminado correctamente' })
    } catch (error: any) {
      console.error('Error al eliminar vale:', error)
      res.status(500).json({ error: error.message || 'Error al eliminar vale' })
    }
  }

  /**
   * GET /api/cashier/vouchers/stats
   * Obtener estadísticas de vales
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { from_date, to_date } = req.query

      const stats = await CashierVoucherRepository.getStats(from_date as string, to_date as string)

      res.json(stats)
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      res.status(500).json({ error: 'Error al obtener estadísticas' })
    }
  }
}
