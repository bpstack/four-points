// utils/date-utils.js

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'Europe/Madrid'

/**
 * Obtiene la fecha actual en Madrid en formato YYYY-MM-DD
 */
export const getTodayMadrid = () => {
  return dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
}

/**
 * Obtiene la fecha y hora actual en Madrid
 */
export const getNowMadrid = () => {
  return dayjs().tz(TIMEZONE)
}

/**
 * Convierte cualquier fecha a zona horaria de Madrid
 */
export const toMadridTime = (date) => {
  return dayjs(date).tz(TIMEZONE)
}

/**
 * Formatea una fecha a YYYY-MM-DD en zona horaria de Madrid
 */
export const formatDateMadrid = (date) => {
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD')
}

/**
 * Formatea una fecha a YYYY-MM-DD HH:mm:ss en zona horaria de Madrid
 */
export const formatDateTimeMadrid = (date) => {
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * Obtiene el inicio del día en Madrid (00:00:00)
 */
export const getStartOfDayMadrid = (date) => {
  return dayjs(date).tz(TIMEZONE).startOf('day')
}

/**
 * Obtiene el fin del día en Madrid (23:59:59)
 */
export const getEndOfDayMadrid = (date) => {
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
