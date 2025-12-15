// services/conciliation/logic.ts

import { ReceptionReason, HousekeepingReason, Direction } from '../../models/conciliation.model.js'

/**
 * Mapeo de reasons a direcciones predefinidas para RECEPCIÓN
 * El backend decide automáticamente si suma o resta
 */
export const RECEPTION_LOGIC: Record<ReceptionReason, Direction> = {
  base_rooms: 'add', // Habitaciones base facturadas → suma
  no_show: 'subtract', // No se presentó, no se limpia → resta
  room_change: 'add', // Cambio genera limpieza extra → suma
  gratuity: 'add', // Gratuity → suma
  other: 'add', // Por defecto suma (se especifica en notas)
}

/**
 * Mapeo de reasons a direcciones predefinidas para HOUSEKEEPING
 */
export const HOUSEKEEPING_LOGIC: Record<HousekeepingReason, Direction> = {
  cleaned: 'add', // Habitación limpiada → suma
  do_not_disturb: 'add', // DND cuenta como gestionada → suma
  ooo_cleaned: 'add', // Out of order cleaned → suma
  pending_cleaned: 'add', // Pending cleaned → suma
  pending_to_clean: 'add', // Pending to clean → suma
  room_clean: 'add', // Room clean → suma
  other: 'add', // Por defecto suma
}

/**
 * Obtiene la dirección automática según el reason y el tipo
 */
export function getDirection(
  reason: ReceptionReason | HousekeepingReason,
  type: 'reception' | 'housekeeping'
): Direction {
  if (type === 'reception') {
    return RECEPTION_LOGIC[reason as ReceptionReason] || 'add'
  }
  return HOUSEKEEPING_LOGIC[reason as HousekeepingReason] || 'add'
}

/**
 * Calcula el delta a aplicar al total según value y direction
 */
export function calculateDelta(value: number, direction: Direction): number {
  return direction === 'add' ? value : -value
}
