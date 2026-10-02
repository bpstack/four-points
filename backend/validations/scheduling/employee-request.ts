// validations/scheduling/employee-request.ts
// Schemas Zod para scheduling_employee_requests.
// Creado: 2026-04-25 — Fase 1 del solver.

import { z } from 'zod'
import { isCalendarDate } from '../common/calendar-date.js'

export const requestTypeSchema = z.enum([
  'shift_preference',
  'shift_exclusion',
  'bonificable',
  'baja_temporal',
  'vacation',
])

export const createEmployeeRequestSchema = z
  .object({
    employee_id: z.string().uuid(),
    date_from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'formato YYYY-MM-DD')
      .refine(isCalendarDate, 'La fecha no existe'),
    date_to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'formato YYYY-MM-DD')
      .refine(isCalendarDate, 'La fecha no existe'),
    request_type: requestTypeSchema,
    requested_value: z.string().max(10).nullable().optional(),
    notes: z.string().max(255).nullable().optional(),
  })
  .refine((d) => d.date_from <= d.date_to, {
    message: 'date_from debe ser <= date_to',
    path: ['date_from'],
  })
