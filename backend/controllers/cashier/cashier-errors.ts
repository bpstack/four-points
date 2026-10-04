// controllers/cashier/cashier-errors.ts

import type { Response } from 'express'
import { logger } from '../../config/logger.js'

// Errors the cashier repositories throw on purpose, with the status they
// deserve; their text is written for the user and safe to send back
export const CASHIER_DOMAIN_ERRORS: Record<string, number> = {
  'No hay campos para actualizar': 400,
  'Turno no encontrado': 404,
  'Pago no encontrado': 404,
  'Denominación no encontrada': 404,
  'Vale no encontrado': 404,
  'El turno ya está cerrado': 409,
  'Solo se pueden reabrir turnos cerrados': 409,
  'No se puede eliminar un turno cerrado': 409,
  'El vale ya está justificado': 409,
  'El vale ya está cancelado': 409,
  'Solo se pueden eliminar vales pendientes': 409,
}

/** Known domain errors keep their message; anything else is a generic 500 (no SQL details). */
export function sendCashierError(res: Response, error: unknown, fallback: string): void {
  const message = error instanceof Error ? error.message : ''
  const status = CASHIER_DOMAIN_ERRORS[message]
  if (status) {
    res.status(status).json({ error: message })
    return
  }
  logger.error({ err: error }, fallback)
  res.status(500).json({ error: fallback })
}
