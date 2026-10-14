// config/date-utils.ts

import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export const TIMEZONE = 'Europe/Madrid' as const

type DateInput = string | Date | Dayjs | null | undefined

/**
 * Obtiene la fecha actual en Madrid en formato YYYY-MM-DD
 */
export const getTodayMadrid = (): string => {
  return dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
}

/**
 * Obtiene la fecha y hora actual en Madrid
 */
export const getNowMadrid = (): Dayjs => {
  return dayjs().tz(TIMEZONE)
}

/**
 * Convierte cualquier fecha a zona horaria de Madrid
 */
export const toMadridTime = (date: DateInput): Dayjs => {
  return dayjs(date).tz(TIMEZONE)
}

/**
 * Formatea una fecha a YYYY-MM-DD en zona horaria de Madrid
 */
export const formatDateMadrid = (date: DateInput): string => {
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD')
}

/**
 * Formatea una fecha a YYYY-MM-DD HH:mm:ss en zona horaria de Madrid
 */
export const formatDateTimeMadrid = (date: DateInput): string => {
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * Obtiene el inicio del día en Madrid (00:00:00)
 */
export const getStartOfDayMadrid = (date: DateInput): Dayjs => {
  return dayjs(date).tz(TIMEZONE).startOf('day')
}

/**
 * Obtiene el fin del día en Madrid (23:59:59)
 */
export const getEndOfDayMadrid = (date: DateInput): Dayjs => {
  return dayjs(date).tz(TIMEZONE).endOf('day')
}

/**
 * Devuelve el último día del mes en formato YYYY-MM-DD.
 * @param year — año (4 dígitos)
 * @param month — mes 1-indexed (1 = enero, 12 = diciembre)
 *
 * Sustituye al patrón `new Date(year, month, 0).toISOString().slice(0, 10)`
 * que es frágil porque depende del timezone del runtime.
 */
export const getLastDayOfMonth = (year: number, month: number): string => {
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
    .endOf('month')
    .format('YYYY-MM-DD')
}

// ── Hotel wall-clock times (ADR-047) ─────────────────────────────────────────
// Parking check-in and check-out times are the hotel's clock: "12:00" is noon in
// Madrid, stored as 12:00:00. mysql2 reads such a DATETIME as a Date whose UTC
// fields are the stored value, so these helpers never go through the local zone.

/** The hotel's current wall-clock time, as a Date to store in such a column */
export const getHotelNowDate = (): Date =>
  new Date(`${getNowMadrid().format('YYYY-MM-DDTHH:mm:ss')}Z`)

/** A wall-clock time typed by the user ('YYYY-MM-DD HH:mm' or 'YYYY-MM-DDTHH:mm'), as stored */
export const parseHotelTime = (value: string): Date => dayjs.utc(value).toDate()

/** A stored wall-clock time for the API: no Z, so the browser reads it as local time */
export function toHotelTime(value: Date | string): string
export function toHotelTime(value: Date | string | null | undefined): string | null
export function toHotelTime(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : parseHotelTime(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19)
}

export default {
  getTodayMadrid,
  getNowMadrid,
  toMadridTime,
  formatDateMadrid,
  formatDateTimeMadrid,
  getStartOfDayMadrid,
  getEndOfDayMadrid,
  getLastDayOfMonth,
  TIMEZONE,
}
