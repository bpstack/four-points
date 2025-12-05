// models/conciliation.config.ts

// CONFIG - CONFIGURACIÓN CENTRALIZADA DE CONCILIACIÓN
// =========================================================
// Este archivo centraliza TODAS las configuraciones de reasons.
// Para añadir un nuevo reason: agregarlo aquí + actualizar types + BD

import type {
  ReceptionReason,
  HousekeepingReason,
  Direction,
} from './conciliation.model.js'

// =========================================================
// CONFIGURACIÓN DE RECEPTION
// =========================================================

/**
 * Configuración completa de cada reason de RECEPCIÓN
 */
export interface ReceptionReasonConfig {
  label: string
  direction: Direction
  order: number // Para mantener el orden de visualización
  description?: string
}

/**
 * Mapa centralizado de configuración de RECEPTION
 * ⚠️ IMPORTANTE: Para añadir nuevo reason, agregarlo aquí
 */
export const RECEPTION_CONFIG: Record<ReceptionReason, ReceptionReasonConfig> =
  {
    base_rooms: {
      label: 'Número de hab. Facturadas',
      direction: 'add',
      order: 1,
      description: 'Habitaciones facturadas del día anterior',
    },
    gratuity: {
      label: 'Gratuitas',
      direction: 'add',
      order: 2,
      description: 'Habitaciones gratuitas',
    },
    no_show: {
      label: 'NO SHOW',
      direction: 'subtract',
      order: 3,
      description: 'Clientes que no se presentaron',
    },
    room_change: {
      label: 'Hab sucia por cambio hab',
      direction: 'add',
      order: 4,
      description: 'Habitación sucia adicional por cambio',
    },
    other: {
      label: 'Otros',
      direction: 'add',
      order: 5,
      description: 'Otros conceptos',
    },
  }

// =========================================================
// CONFIGURACIÓN DE HOUSEKEEPING
// =========================================================

/**
 * Configuración completa de cada reason de PISOS
 */
export interface HousekeepingReasonConfig {
  label: string
  direction: Direction
  order: number
  description?: string
}

/**
 * Mapa centralizado de configuración de HOUSEKEEPING
 * ⚠️ IMPORTANTE: Para añadir nuevo reason, agregarlo aquí
 */
export const HOUSEKEEPING_CONFIG: Record<
  HousekeepingReason,
  HousekeepingReasonConfig
> = {
  cleaned: {
    label: 'Total hab realmente limpiadas',
    direction: 'add',
    order: 1,
    description: 'Habitaciones limpiadas por pisos',
  },
  do_not_disturb: {
    label: 'No limpiadas por NO MOLESTEN',
    direction: 'add',
    order: 2,
    description: 'Habitaciones con cartel DND',
  },
  ooo_cleaned: {
    label: 'Limpiadas que estaban OOO',
    direction: 'subtract',
    order: 3,
    description: 'Habitaciones fuera de servicio que se limpiaron',
  },
  pending_cleaned: {
    label: 'Limpiadas que estaban LS día anterior',
    direction: 'subtract',
    order: 4,
    description: 'Limpieza sucia del día anterior',
  },
  pending_to_clean: {
    label: 'Hab. LS que se dejan pendientes',
    direction: 'add',
    order: 5,
    description: 'Habitaciones que se dejan pendientes de limpiar',
  },
  room_clean: {
    label: 'Habitación encontrada limpia',
    direction: 'add',
    order: 6,
    description: 'Habitación programada pero encontrada limpia',
  },
  other: {
    label: 'Otros',
    direction: 'add',
    order: 7,
    description: 'Otros conceptos',
  },
}

// =========================================================
// MAPAS DE DIRECCIÓN (para uso rápido)
// =========================================================

/**
 * Mapa de direction por reason de RECEPTION
 */
export const RECEPTION_DIRECTION_MAP: Record<ReceptionReason, Direction> =
  Object.fromEntries(
    Object.entries(RECEPTION_CONFIG).map(([key, config]) => [
      key,
      config.direction,
    ])
  ) as Record<ReceptionReason, Direction>

/**
 * Mapa de direction por reason de HOUSEKEEPING
 */
export const HOUSEKEEPING_DIRECTION_MAP: Record<HousekeepingReason, Direction> =
  Object.fromEntries(
    Object.entries(HOUSEKEEPING_CONFIG).map(([key, config]) => [
      key,
      config.direction,
    ])
  ) as Record<HousekeepingReason, Direction>

// =========================================================
// MAPAS DE LABELS (para uso rápido)
// =========================================================

/**
 * Mapa de labels por reason de RECEPTION
 */
export const RECEPTION_LABELS: Record<ReceptionReason, string> =
  Object.fromEntries(
    Object.entries(RECEPTION_CONFIG).map(([key, config]) => [key, config.label])
  ) as Record<ReceptionReason, string>

/**
 * Mapa de labels por reason de HOUSEKEEPING
 */
export const HOUSEKEEPING_LABELS: Record<HousekeepingReason, string> =
  Object.fromEntries(
    Object.entries(HOUSEKEEPING_CONFIG).map(([key, config]) => [
      key,
      config.label,
    ])
  ) as Record<HousekeepingReason, string>

// =========================================================
// ARRAYS ORDENADOS (para iteraciones en frontend)
// =========================================================

/**
 * Array de reasons de RECEPTION ordenados
 */
export const RECEPTION_REASONS_ORDERED: ReceptionReason[] = (
  Object.entries(RECEPTION_CONFIG) as [ReceptionReason, ReceptionReasonConfig][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key)

/**
 * Array de reasons de HOUSEKEEPING ordenados
 */
export const HOUSEKEEPING_REASONS_ORDERED: HousekeepingReason[] = (
  Object.entries(HOUSEKEEPING_CONFIG) as [
    HousekeepingReason,
    HousekeepingReasonConfig
  ][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key)

// =========================================================
// CONSTANTES DE ESTADO
// =========================================================

/**
 * Labels de estados
 */
export const STATUS_LABELS = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  closed: 'Cerrado',
} as const

/**
 * Colores por estado (para UI)
 */
export const STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  closed: 'bg-green-100 text-green-800 border-green-300',
} as const

// =========================================================
// FUNCIONES HELPER
// =========================================================

/**
 * Obtener la direction de un reason de RECEPTION
 */
export function getReceptionDirection(reason: ReceptionReason): Direction {
  return RECEPTION_DIRECTION_MAP[reason]
}

/**
 * Obtener la direction de un reason de HOUSEKEEPING
 */
export function getHousekeepingDirection(
  reason: HousekeepingReason
): Direction {
  return HOUSEKEEPING_DIRECTION_MAP[reason]
}

/**
 * Calcular el delta (valor con signo) según direction
 */
export function calculateDelta(value: number, direction: Direction): number {
  return direction === 'add' ? value : -value
}

/**
 * Obtener el label de un reason de RECEPTION
 */
export function getReceptionLabel(reason: ReceptionReason): string {
  return RECEPTION_LABELS[reason]
}

/**
 * Obtener el label de un reason de HOUSEKEEPING
 */
export function getHousekeepingLabel(reason: HousekeepingReason): string {
  return HOUSEKEEPING_LABELS[reason]
}

/**
 * Obtener la configuración completa de un reason de RECEPTION
 */
export function getReceptionConfig(
  reason: ReceptionReason
): ReceptionReasonConfig {
  return RECEPTION_CONFIG[reason]
}

/**
 * Obtener la configuración completa de un reason de HOUSEKEEPING
 */
export function getHousekeepingConfig(
  reason: HousekeepingReason
): HousekeepingReasonConfig {
  return HOUSEKEEPING_CONFIG[reason]
}
