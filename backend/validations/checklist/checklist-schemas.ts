// validations/checklist/checklist-schemas.ts

import { z } from 'zod'

export const toggleStepSchema = z.object({
  done: z.boolean(),
})
