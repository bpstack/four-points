// app/components/parking/helpers/constants.ts
/**
 * Constantes compartidas para el módulo de parking
 */

export type BookingStatus = 'reserved' | 'checked_in' | 'completed' | 'canceled' | 'no_show'

export type BadgeTone = 'info' | 'accent' | 'success' | 'neutral' | 'warning' | 'danger'

export const STATUS_CONFIG: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  reserved: { label: 'Reservado', tone: 'info' },
  checked_in: { label: 'Ocupado', tone: 'accent' },
  completed: { label: 'Completado', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
  no_show: { label: 'No presentado', tone: 'warning' },
}

export const BOOKING_SOURCES: Record<string, string> = {
  direct: 'Directo',
  booking_com: 'Booking.com',
  expedia: 'Expedia',
  airbnb: 'Airbnb',
  agency_other: 'Otra Agencia',
}

export const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  agency: 'Agencia',
}

export const SPOT_TYPES: Record<string, string> = {
  normal: 'Normal',
  ancha: 'Ancha',
  mas_ancha: 'Muy Ancha',
  esquina: 'Esquina',
  accesible: 'Accesible',
  estrecha_bicis: 'Bicis/Motos',
}
