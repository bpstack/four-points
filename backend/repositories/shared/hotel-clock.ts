// repositories/shared/hotel-clock.ts
// The hotel's "today" and "now" as SQL literals, in place of CURDATE() and NOW():
// the MySQL session runs in UTC, and the business day is Madrid's (ADR-047).
// The values come from the server clock, never from a request.

import mysql from 'mysql2'
import { getNowMadrid, getTodayMadrid } from '../../config/date-utils.js'

/** Madrid's date as a quoted 'YYYY-MM-DD', for DATE columns and DATE(...) of wall-clock times */
export const sqlHotelToday = (): string => mysql.escape(getTodayMadrid())

/** Madrid's wall-clock time as a quoted 'YYYY-MM-DD HH:mm:ss', for parking check-in/out times */
export const sqlHotelNow = (): string => mysql.escape(getNowMadrid().format('YYYY-MM-DD HH:mm:ss'))
