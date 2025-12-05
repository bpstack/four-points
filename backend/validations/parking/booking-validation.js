// validations/parking/booking-validation.js

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
