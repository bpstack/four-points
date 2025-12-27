// controllers/cashier/cashier-denomination-controller.ts

import { Request, Response } from 'express'
import { CashierDenominationRepository } from '../../repositories/cashier/cashier-denomination-repository.js'
import { CashierHistoryRepository } from '../../repositories/cashier/cashier-history-repository.js'
import { CashierShiftRepository } from '../../repositories/cashier/cashier-shift-repository.js'

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
      console.error('Error al obtener denominaciones:', error)
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
      const { denominations } = req.body

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
      console.error('Error al actualizar denominaciones:', error)
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
      const denominationData = req.body

      const denomination = await CashierDenominationRepository.create(
        parseInt(shiftId),
        denominationData
      )

      res.status(201).json(denomination)
    } catch (error) {
      console.error('Error al crear denominación:', error)
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
      const { quantity } = req.body

      const updated = await CashierDenominationRepository.update(parseInt(id), quantity)

      res.json(updated)
    } catch (error: any) {
      console.error('Error al actualizar denominación:', error)
      res.status(500).json({ error: error.message || 'Error al actualizar denominación' })
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
      console.error('Error al eliminar denominación:', error)
      res.status(500).json({ error: 'Error al eliminar denominación' })
    }
  }
}
