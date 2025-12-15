// validations/cashier/cashier-validation.ts

import { z } from 'zod'

// ═══════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════

export const ShiftTypeSchema = z.enum(['night', 'morning', 'afternoon', 'closing'])
export const ShiftStatusSchema = z.enum(['open', 'in_progress', 'closed', 'audited'])
export const HistoryActionSchema = z.enum([
  'created',
  'updated',
  'deleted',
  'status_changed',
  'adjustment',
  'voucher_created',
  'voucher_repaid',
])

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const VALID_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]

// ═══════════════════════════════════════════════════════
// CREATE SHIFT
// ═══════════════════════════════════════════════════════

export const CreateShiftSchema = z.object({
  shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  shift_type: ShiftTypeSchema,
  responsible1_id: z.string().uuid('ID de responsable principal inválido'),
  responsible2_id: z.string().uuid('ID de responsable secundario inválido').nullable().optional(),

  initial_fund: z.number().min(0, 'Fondo inicial debe ser >= 0').default(200),
  comments: z.string().max(2000, 'Comentarios muy largos (máx 2000 caracteres)').optional(),
})

// ═══════════════════════════════════════════════════════
// UPDATE SHIFT
// ═══════════════════════════════════════════════════════

export const UpdateShiftSchema = z.object({
  responsible1_id: z.string().uuid('ID de responsable principal inválido').optional(),
  responsible2_id: z.string().uuid('ID de responsable secundario inválido').nullable().optional(),
  initial_fund: z.number().min(0, 'Fondo inicial debe ser >= 0').optional(),
  income: z.number().min(0, 'Ingresos deben ser >= 0').optional(),
  comments: z.string().max(2000, 'Comentarios muy largos (máx 2000 caracteres)').optional(),
})

// ═══════════════════════════════════════════════════════
// CLOSE SHIFT
// ═══════════════════════════════════════════════════════

export const CloseShiftSchema = z
  .object({
    cash_counted: z.number().min(0, 'Efectivo contado debe ser >= 0'),
    cash_expected: z.number().min(0, 'Efectivo esperado debe ser >= 0'),
    difference: z.number(),
    payments_total: z.number().min(0, 'Total pagos debe ser >= 0'),
    grand_total: z.number().min(0, 'Grand total debe ser >= 0'),
    comments: z.string().max(2000, 'Comentarios muy largos (máx 2000 caracteres)').optional(),
  })
  .refine(
    (data) => {
      // Si descuadre > 0.50€, comentario obligatorio
      if (Math.abs(data.difference) > 0.5 && !data.comments) {
        return false
      }
      return true
    },
    {
      message: 'Comentario obligatorio si el descuadre es mayor a 0.50€',
      path: ['comments'],
    }
  )

// ═══════════════════════════════════════════════════════
// DENOMINATIONS
// ═══════════════════════════════════════════════════════

export const DenominationSchema = z.object({
  denomination: z.number().refine((val) => VALID_DENOMINATIONS.includes(val), {
    message: 'Denominación no válida',
  }),
  quantity: z.number().int('Cantidad debe ser un número entero').min(0, 'Cantidad debe ser >= 0'),
})

export const CreateDenominationsSchema = z
  .array(DenominationSchema)
  .max(14, 'Máximo 14 denominaciones')

// ═══════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════

export const PaymentSchema = z.object({
  payment_method_id: z.number().int().min(1, 'ID de método de pago inválido'),
  amount: z.number().min(0, 'Monto debe ser >= 0'),
})

export const CreatePaymentsSchema = z.array(PaymentSchema).max(10, 'Máximo 10 métodos de pago')

// ═══════════════════════════════════════════════════════
// VOUCHERS
// ═══════════════════════════════════════════════════════

export const CreateVoucherSchema = z.object({
  amount: z.number().min(0.01, 'Monto debe ser > 0'),
  reason: z
    .string()
    .min(5, 'Razón debe tener al menos 5 caracteres')
    .max(1000, 'Razón muy larga (máx 1000 caracteres)'),
})

export const RepayVoucherSchema = z.object({
  repaid_by: z.string().uuid('ID de usuario inválido'),
})

// ═══════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════

export const CreateHistorySchema = z.object({
  shift_id: z.number().int().min(1, 'ID de turno inválido'),
  action: HistoryActionSchema,
  table_affected: z.string().max(100).optional(),
  record_id: z.number().int().optional(),
  field_changed: z.string().max(100).optional(),
  old_value: z.string().optional(),
  new_value: z.string().optional(),
  notes: z.string().max(2000, 'Notas muy largas (máx 2000 caracteres)').optional(),
})

// ═══════════════════════════════════════════════════════
// QUERY PARAMS
// ═══════════════════════════════════════════════════════

export const GetShiftsQuerySchema = z.object({
  shift_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  shift_type: ShiftTypeSchema.optional(),
  status: ShiftStatusSchema.optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  responsible_id: z.string().uuid().optional(),
  sort: z.string().optional(),
  order: z.enum(['ASC', 'DESC']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const GetVouchersQuerySchema = z.object({
  is_repaid: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  created_by: z.string().uuid().optional(),
  sort: z.string().optional(),
  order: z.enum(['ASC', 'DESC']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const GetReportQuerySchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
})

// ═══════════════════════════════════════════════════════
// STATUS UPDATES
// ═══════════════════════════════════════════════════════

export const UpdateShiftStatusSchema = z.object({
  new_status: ShiftStatusSchema,
  notes: z.string().max(2000, 'Notas muy largas').optional(),
})

export const ReopenShiftSchema = z.object({
  reason: z
    .string()
    .min(10, 'Razón debe tener al menos 10 caracteres')
    .max(1000, 'Razón muy larga'),
})
