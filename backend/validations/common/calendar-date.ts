// validations/common/calendar-date.ts

import { z } from 'zod'

// The format alone lets 2026-02-31 through, and MySQL then fails with a 500
export function isCalendarDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Usa YYYY-MM-DD')
  .refine(isCalendarDate, 'La fecha no existe')
