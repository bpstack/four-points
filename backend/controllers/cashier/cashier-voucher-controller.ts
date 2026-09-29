// controllers/cashier/cashier-voucher-controller.ts

import { Request, Response } from 'express'
import { CashierVoucherRepository } from '../../repositories/cashier/cashier-voucher-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { logger } from '../../config/logger.js'
import {
  voucherListQuerySchema,
  createVoucherSchema,
  updateVoucherSchema,
  justifyVoucherSchema,
  dateRangeQuerySchema,
  validationError,
} from '../../validations/cashier/cashier-validation.js'

export class CashierVoucherController {
  /**
   * GET /api/cashier/vouchers
   * Obtener vales con filtros
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const parsed = voucherListQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }

      const filters = {
        ...parsed.data,
        sort: parsed.data.sort ?? 'created_at',
        order: parsed.data.order ?? 'DESC',
        limit: parsed.data.limit ?? 50,
        offset: parsed.data.offset ?? 0,
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
      logger.error({ err: error }, 'Error al obtener vales')
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
      logger.error({ err: error }, 'Error al obtener vales activos')
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
      logger.error({ err: error }, 'Error al obtener vale')
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
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      const parsed = createVoucherSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const voucherData = { ...parsed.data, created_by: userId }

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
      logger.error({ err: error }, 'Error al crear vale')
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
      const parsed = updateVoucherSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }

      const updated = await CashierVoucherRepository.update(parseInt(id), parsed.data)

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
      logger.error({ err: error }, 'Error al actualizar vale')
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
      const parsed = justifyVoucherSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { shift_id } = parsed.data

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
      logger.error({ err: error }, 'Error al justificar vale')
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
      logger.error({ err: error }, 'Error al cancelar vale')
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
      logger.error({ err: error }, 'Error al eliminar vale')
      res.status(500).json({ error: error.message || 'Error al eliminar vale' })
    }
  }

  /**
   * GET /api/cashier/vouchers/stats
   * Obtener estadísticas de vales
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const parsed = dateRangeQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { from_date, to_date } = parsed.data

      const stats = await CashierVoucherRepository.getStats(from_date, to_date)

      res.json(stats)
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener estadísticas')
      res.status(500).json({ error: 'Error al obtener estadísticas' })
    }
  }
}
