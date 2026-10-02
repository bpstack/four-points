// controllers/cashier/cashier-denomination-controller.ts

import { Request, Response } from 'express'
import { CashierDenominationRepository } from '../../repositories/cashier/cashier-denomination-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'
import { logger } from '../../config/logger.js'
import { sendCashierError } from './cashier-errors.js'
import {
  replaceDenominationsSchema,
  denominationSchema,
  denominationQuantitySchema,
  validationError,
} from '../../validations/cashier/cashier-validation.js'

export class CashierDenominationController {
  /**
   * GET /api/cashier/shifts/:shiftId/denominations
   * Obtener denominaciones de un turno
   */
  static async getByShift(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params

      const denominations = await CashierDenominationRepository.getByShift(parseInt(shiftId))

      const totalCash = await CashierDenominationRepository.getTotalCash(parseInt(shiftId))

      res.json({
        denominations,
        total_cash: totalCash,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener denominaciones')
      res.status(500).json({ error: 'Error al obtener denominaciones' })
    }
  }

  /**
   * PUT /api/cashier/shifts/:shiftId/denominations
   * Reemplazar todas las denominaciones de un turno
   */
  static async replaceAll(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params
      const parsed = replaceDenominationsSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { denominations } = parsed.data

      await CashierDenominationRepository.replaceAllForShift(parseInt(shiftId), denominations)

      // Recalcular totales del turno
      await CashierShiftRepository.recalculateTotals(parseInt(shiftId))

      const userId = req.user?.id
      if (userId) {
        const totalCash = await CashierDenominationRepository.getTotalCash(parseInt(shiftId))

        await CashierHistoryRepository.create({
          shift_id: parseInt(shiftId),
          action: 'updated',
          table_affected: 'cashier_denominations',
          changed_by: userId,
          notes: `Denominaciones actualizadas: ${totalCash}€ en efectivo`,
        })
      }

      const updated = await CashierDenominationRepository.getByShift(parseInt(shiftId))

      res.json(updated)
    } catch (error) {
      logger.error({ err: error }, 'Error al actualizar denominaciones')
      res.status(500).json({ error: 'Error al actualizar denominaciones' })
    }
  }

  /**
   * POST /api/cashier/shifts/:shiftId/denominations
   * Crear denominación individual
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params
      const parsed = denominationSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const denominationData = parsed.data

      const denomination = await CashierDenominationRepository.create(
        parseInt(shiftId),
        denominationData
      )

      res.status(201).json(denomination)
    } catch (error) {
      logger.error({ err: error }, 'Error al crear denominación')
      res.status(500).json({ error: 'Error al crear denominación' })
    }
  }

  /**
   * PATCH /api/cashier/denominations/:id
   * Actualizar cantidad de una denominación
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const parsed = denominationQuantitySchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error))
        return
      }
      const { quantity } = parsed.data

      const updated = await CashierDenominationRepository.update(parseInt(id), quantity)

      res.json(updated)
    } catch (error) {
      sendCashierError(res, error, 'Error al actualizar denominación')
    }
  }

  /**
   * DELETE /api/cashier/denominations/:id
   * Eliminar denominación
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      await CashierDenominationRepository.delete(parseInt(id))

      res.json({ message: 'Denominación eliminada correctamente' })
    } catch (error) {
      logger.error({ err: error }, 'Error al eliminar denominación')
      res.status(500).json({ error: 'Error al eliminar denominación' })
    }
  }
}
