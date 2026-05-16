// validations/checklist/checklist-schemas.ts

import { z } from 'zod'

export const toggleStepSchema = z.object({
  done: z.boolean(),
})

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
})
