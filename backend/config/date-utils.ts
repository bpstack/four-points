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

export default {
  getTodayMadrid,
  getNowMadrid,
  toMadridTime,
  formatDateMadrid,
  formatDateTimeMadrid,
  getStartOfDayMadrid,
  getEndOfDayMadrid,
  TIMEZONE,
}
