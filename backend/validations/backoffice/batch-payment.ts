// validations/backoffice/batch-payment.ts

import { z } from 'zod'

// Plain integers only. mysql2 turns an object into a column comparison
// ({"year": {"x": 1}} becomes `x` = 1), which made the month filter match
// every validated invoice of any month
const year = z.number().int().min(2000).max(2100)
const month = z.number().int().min(1).max(12)

// POST /invoices/batch-pay: both or neither (neither = previous month)
export const executeBatchPaymentSchema = z
  .object({ year: year.optional(), month: month.optional() })
  .refine((d) => (d.year === undefined) === (d.month === undefined), {
    message: 'Indica año y mes, o ninguno',
    path: ['month'],
  })

// POST /invoices/batch-pay/revert
export const revertBatchPaymentSchema = z.object({ year, month })
