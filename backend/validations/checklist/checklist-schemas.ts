// validations/checklist/checklist-schemas.ts

import { z } from 'zod'
import { calendarDateSchema } from '../common/calendar-date.js'

export const toggleStepSchema = z.object({
  done: z.boolean(),
})

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(500),
})

// A repeated param arrives as an array and an impossible date reached MySQL;
// both ended in a 500
export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  date_from: calendarDateSchema.optional(),
  date_to: calendarDateSchema.optional(),
})
