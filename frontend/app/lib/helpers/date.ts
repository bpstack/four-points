// lib/helpers/date.ts

/**
 * Date utilities for frontend (visualization only)
 *
 * ⚠️ IMPORTANT: These functions are ONLY for displaying dates to users.
 * All date calculations should be done in the backend.
 *
 * Timezone: Europe/Madrid (CET/CEST)
 * Display format: DD/MM/YYYY (Spanish format)
 */

/**
 * Get current date in Madrid timezone
 * Format: YYYY-MM-DD (for API communication)
 *
 * @example
 * getMadridDate() // "2025-10-28"
 */
export const getMadridDate = (): string => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

/**
 * Format a date for display in Madrid timezone
 * Format: DD/MM/YYYY (Spanish format)
 *
 * @example
 * const date = new Date('2025-10-28')
 * formatMadridDate(date) // "28/10/2025"
 * formatMadridDate(date, { weekday: 'long' }) // "Tuesday, 28/10/2025"
 */
export const formatMadridDate = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' ? parseInputDate(date) : date

  return dateObj.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  })
}

/**
 * Format a date for display with full month name in Madrid timezone
 *
 * @example
 * formatMadridDateLong(new Date('2025-10-28'))
 * // "martes, 28 de octubre de 2025"
 */
export const formatMadridDateLong = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseInputDate(date) : date

  return dateObj.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Calculate date offset from today (in Madrid timezone)
 * Returns in YYYY-MM-DD format for API calls
 */
export const getDateWithOffset = (days: number): string => {
  const today = new Date(getMadridDate() + 'T12:00:00')
  today.setDate(today.getDate() + days)
  return today.toISOString().split('T')[0]
}

/**
 * Get start and end of current week (Monday-Sunday) in Madrid timezone.
 * Returns YYYY-MM-DD strings for API calls.
 */
export const getCurrentWeekRange = () => {
  const today = new Date(getMadridDate() + 'T12:00:00')
  const dayOfWeek = today.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const startDate = new Date(today)
  startDate.setDate(today.getDate() - daysFromMonday)

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  }
}

/**
 * Get start and end of current month in Madrid timezone.
 * Returns YYYY-MM-DD strings for API calls.
 */
export const getCurrentMonthRange = () => {
  const madridNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))

  const year = madridNow.getFullYear()
  const month = madridNow.getMonth()

  const lastDay = new Date(year, month + 1, 0)

  return {
    start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    end: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`,
  }
}

/**
 * Format date range for display in Madrid timezone.
 * Format: `DD/MM - DD/MM/YYYY`.
 *
 * @example
 * formatDateRange('2025-10-01', '2025-10-07') // "01/10 - 07/10/2025"
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = parseInputDate(startDate)
  const end = parseInputDate(endDate)

  const startFormatted = start.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
  })

  const endFormatted = end.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return `${startFormatted} - ${endFormatted}`
}

/**
 * Convert YYYY-MM-DD to DD/MM/YYYY for display.
 */
export const formatApiDate = (apiDate: string): string => {
  const [year, month, day] = apiDate.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for API calls.
 */
export const parseDisplayDate = (displayDate: string): string => {
  const [day, month, year] = displayDate.split('/')
  return `${year}-${month}-${day}`
}

// ============================================
// TIMESTAMPS (date + time)
// ============================================

/**
 * Format a timestamp with date and time in Madrid timezone.
 * Format: DD/MM/YYYY HH:mm
 */
export const formatMadridDateTime = (
  dateTime: Date | string,
  options?: { includeSeconds?: boolean }
): string => {
  const dateObj = typeof dateTime === 'string' ? parseInputDate(dateTime) : dateTime

  return dateObj.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds && { second: '2-digit' }),
  })
}

/**
 * Format a timestamp for edit indicators in logbooks (alias of formatMadridDateTime).
 */
export const formatEditTimestamp = (dateTime: Date | string): string =>
  formatMadridDateTime(dateTime)

/**
 * Format time only in Madrid timezone.
 * Format: HH:mm
 */
export const formatMadridTime = (
  dateTime: Date | string,
  options?: { includeSeconds?: boolean }
): string => {
  const dateObj = typeof dateTime === 'string' ? parseInputDate(dateTime) : dateTime

  return dateObj.toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    ...(options?.includeSeconds && { second: '2-digit' }),
  })
}

/**
 * Smart timestamp: returns `HH:mm` if the date is today in Madrid, otherwise
 * `DD/MM/YYYY HH:mm`. Use for streams whose items are mostly recent (comments,
 * activity logs, message feeds) so the day is implicit when it matches today.
 */
export const formatTimestampSmart = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseInputDate(date) : date
  if (isNaN(dateObj.getTime())) return ''
  return isSameDay(dateObj, new Date()) ? formatMadridTime(dateObj) : formatMadridDateTime(dateObj)
}

/**
 * Check if two dates are the same day in Madrid timezone.
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? parseInputDate(date1) : date1
  const d2 = typeof date2 === 'string' ? parseInputDate(date2) : date2

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(d1) === formatter.format(d2)
}

/**
 * Get relative time string (e.g., "hace 5 minutos", "hace 2 horas").
 */
export const getRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseInputDate(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'ahora mismo'
  if (diffMins === 1) return 'hace 1 minuto'
  if (diffMins < 60) return `hace ${diffMins} minutos`
  if (diffHours === 1) return 'hace 1 hora'
  if (diffHours < 24) return `hace ${diffHours} horas`
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`

  return formatMadridDate(dateObj)
}

// ============================================
// COMPATIBILIDAD CON SIMPLECALENDAR
// ============================================

/**
 * Formatea Date a DD/MM/YYYY en zona horaria Madrid.
 * Independiente de la TZ del browser del usuario.
 */
export function formatDateLocal(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Formatea Date a YYYY-MM-DD (para inputs type="date" y URLs) en zona horaria Madrid.
 */
export function formatDateForInput(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Convierte string a Date.
 * - `YYYY-MM-DD` → mediodía local (evita drift cuando solo importa el día).
 * - ISO datetime (`...T...`) o datetime naive (`YYYY-MM-DD HH:mm:ss`) → parse directo.
 */
export function parseInputDate(dateString: string): Date {
  if (dateString.includes('T') || dateString.includes(' ')) return new Date(dateString)
  return new Date(dateString + 'T12:00:00')
}

// ============================================
// FUNCIONES PARA PANELES (SlidePanel, CenterModal)
// ============================================

/**
 * Format date for display in panels with short month in Madrid timezone.
 * Format: DD MMM YYYY (e.g., "28 oct 2025").
 *
 * Accepts both Date objects and YYYY-MM-DD or ISO datetime strings.
 * Returns empty string for undefined/null/empty/invalid values.
 */
export function formatDateDisplayShort(date: Date | string | null | undefined): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseInputDate(date) : date
  if (isNaN(dateObj.getTime())) return ''

  return dateObj.toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
