// validations/parking/booking-validation.ts

import { z } from 'zod'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const dateTimeSchema = z
  .string()
  .min(1, 'La fecha es requerida')
  .refine((val) => dayjs(val).isValid(), 'Fecha inválida')
  .transform((val) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'))

export const createBookingSchema = z
  .object({
    spot_number: z.number().int().positive('Plaza requerida'),
    level_code: z.enum(['-2', '-3'], { message: 'Nivel inválido' }),
    vehicle_id: z.number().int().positive('Vehículo requerido'),
    expected_checkin: dateTimeSchema,
    expected_checkout: dateTimeSchema,
    total_amount: z.number().positive().optional(),
    booking_source: z.string().optional().default('direct'),
    external_booking_id: z.string().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      const checkin = dayjs(data.expected_checkin)
      const today = dayjs().startOf('day')
      return checkin.isAfter(today) || checkin.isSame(today, 'day')
    },
    {
      message: 'La fecha de entrada no puede ser en el pasado',
      path: ['expected_checkin'],
    }
  )
  .refine(
    (data) => {
      const checkin = dayjs(data.expected_checkin)
      const checkout = dayjs(data.expected_checkout)
      return checkout.isAfter(checkin) || checkout.isSame(checkin)
    },
    {
      message: 'La fecha de salida debe ser igual o posterior a la entrada',
      path: ['expected_checkout'],
    }
  )

export const updateBookingSchema = createBookingSchema.partial()

// Type exports
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>

// PUT /bookings/:code body. Mirrors the parking_bookings columns: amounts are
// DECIMAL(10,2) and never negative, payment_method is an ENUM, references and
// external ids are VARCHAR(100)/(64). Before, any value reached MySQL (a
// negative payment was stored, a bad ENUM or text ended in a 500).
// booking_source is left as it is: its allowed values are still to be decided
// (docs/TODO.md)
const amount = z.union([z.null(), z.coerce.number().finite().min(0).max(99_999_999.99)])

export const updateBookingBodySchema = z.object({
  expected_checkin: z.string().optional(),
  expected_checkout: z.string().optional(),
  spot_number: z.coerce.number().int().positive().optional(),
  level_code: z.enum(['-2', '-3']).optional(),
  vehicle_id: z.union([z.null(), z.coerce.number().int().positive()]).optional(),
  total_amount: amount.optional(),
  booking_source: z.string().optional(),
  external_booking_id: z.string().max(64).nullable().optional(),
  notes: z.string().max(16000).nullable().optional(),
  payment_amount: amount.optional(),
  payment_method: z.enum(['cash', 'card', 'transfer', 'agency']).nullable().optional(),
  payment_reference: z.string().max(100).nullable().optional(),
})
