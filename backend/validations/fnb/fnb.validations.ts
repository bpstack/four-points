import { z } from 'zod'
import { calendarDateSchema } from '../common/calendar-date.js'

export const fnbMonthQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

export const fnbDateQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

// fnb_daily_revenue.amount is DECIMAL(10,2) and the manual entry form never
// sends negatives (CurrencySpinner clamps at 0)
export const FNB_MAX_AMOUNT = 99_999_999.99

export const fnbManualEntrySchema = z.object({
  date: calendarDateSchema,
  values: z.record(z.string(), z.number().finite().min(0).max(FNB_MAX_AMOUNT)),
})
