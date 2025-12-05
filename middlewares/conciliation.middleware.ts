// middlewares/conciliation.middleware.ts

import { Request, Response, NextFunction } from 'express'
import { conciliationRepo } from '../repositories/conciliation/conciliation.repository.js'

/**
 * Verifica que una conciliación NO esté cerrada antes de permitir modificaciones
 * Se usa en rutas que modifican conciliaciones o sus entries (reception/housekeeping)
 */
export async function checkNotClosed(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // El ID puede venir de diferentes lugares según la ruta
    const conciliationId = req.params.conciliationId || req.params.id

    if (!conciliationId) {
      res.status(400).json({
        error: 'ID de conciliación no proporcionado',
      })
      return
    }

    // Buscar la conciliación
    const conciliation = await conciliationRepo.getById(Number(conciliationId))

    if (!conciliation) {
      res.status(404).json({
        error: 'Conciliación no encontrada',
      })
      return
    }

    // Verificar que no esté cerrada
    if (conciliation.status === 'closed') {
      res.status(403).json({
        error: 'No se puede modificar una conciliación cerrada',
        hint: 'Solo un administrador puede reabrir esta conciliación',
      })
      return
    }

    // Guardar la conciliación en req para evitar consultas duplicadas
    req.conciliation = conciliation
    next()
  } catch (error) {
    console.error('Error en checkNotClosed:', error)
    res.status(500).json({
      error: 'Error al verificar estado de conciliación',
    })
  }
}
