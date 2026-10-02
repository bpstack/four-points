// validations/scheduling/scheduling-schemas.ts

import { z } from 'zod'
import { isCalendarDate } from '../common/calendar-date.js'

// ============================================
// BASE SCHEMAS
// ============================================

const monthStatusEnum = z.enum(['draft', 'published'])

const constraintTypeEnum = z.enum([
  'vacation',
  'sick_leave',
  'sick_day',
  'training',
  'holiday',
  'request_off',
  'request_shift',
  'request_no_shift',
])

const constraintStatusEnum = z.enum(['pending', 'approved', 'rejected'])

const employeeRuleTypeEnum = z.enum([
  'shift_priority',
  'max_shift_per_month',
  'min_shift_per_month',
  'fixed_days',
  'fixed_shift',
  'no_weekends',
  'custom',
])

// dayOfWeekEnum - available for future use with specific day-of-week validation
// const dayOfWeekEnum = z.enum(['L', 'M', 'X', 'J', 'V', 'S', 'D'])

const yearSchema = z
  .number()
  .int()
  .min(2020, 'El año debe ser mayor a 2020')
  .max(2100, 'El año debe ser menor a 2100')

const monthSchema = z
  .number()
  .int()
  .min(1, 'El mes debe estar entre 1 y 12')
  .max(12, 'El mes debe estar entre 1 y 12')

// dayNumberSchema and weekNumberSchema - available for future use
// const dayNumberSchema = z.number().int().min(1).max(31)
// const weekNumberSchema = z.number().int().min(1).max(6)

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Usa YYYY-MM-DD')
  .refine(isCalendarDate, 'La fecha no existe')

const employeeIdSchema = z.string().uuid('El employee_id debe ser un UUID válido')

const shiftCodeSchema = z
  .string()
  .min(1, 'El código de turno es requerido')
  .max(5, 'El código de turno no puede exceder 5 caracteres')

const notesSchema = z
  .string()
  .max(46, 'El motivo no puede exceder 46 caracteres')
  .optional()
  .nullable()

const prioritySchema = z.number().int().min(0).max(10).default(0)

// ============================================
// MONTH SCHEMAS
// ============================================

export const createMonthSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  notes: notesSchema,
})

export const updateMonthSchema = z
  .object({
    status: monthStatusEnum.optional(),
    notes: notesSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

// ============================================
// DAY SCHEMAS
// ============================================

export const updateDaySchema = z
  .object({
    is_holiday: z.boolean().optional(),
    holiday_name: z.string().max(100).optional().nullable(),
    occupancy_pct: z.number().min(0).max(100).optional().nullable(),
    arrivals: z.number().int().min(0).optional().nullable(),
    departures: z.number().int().min(0).optional().nullable(),
    notes: notesSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

export const bulkUpdateDaysSchema = z.object({
  days: z.array(
    z.object({
      day_id: z.number().int().positive(),
      is_holiday: z.boolean().optional(),
      holiday_name: z.string().max(100).optional().nullable(),
      occupancy_pct: z.number().min(0).max(100).optional().nullable(),
      arrivals: z.number().int().min(0).optional().nullable(),
      departures: z.number().int().min(0).optional().nullable(),
    })
  ),
})

// ============================================
// ASSIGNMENT SCHEMAS
// ============================================

export const updateAssignmentSchema = z.object({
  shift_code: shiftCodeSchema,
  notes: notesSchema,
})

export const bulkUpdateAssignmentsSchema = z.object({
  assignments: z.array(
    z.object({
      day_id: z.number().int().positive('El day_id debe ser un número positivo'),
      employee_id: employeeIdSchema,
      shift_code: shiftCodeSchema,
    })
  ),
})

// ============================================
// SCHEDULABLE EMPLOYEE DATES
// ============================================

const nullableDateSchema = dateSchema.nullable().optional()

export const updateEmployeeDatesSchema = z
  .object({
    startDate: nullableDateSchema,
    endDate: nullableDateSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) return data.startDate <= data.endDate
      return true
    },
    { message: 'startDate debe ser anterior o igual a endDate' }
  )

// ============================================
// CONSTRAINT SCHEMAS
// ============================================

export const createConstraintSchema = z
  .object({
    month_id: z.number().int().positive('El month_id es requerido'),
    employee_id: employeeIdSchema,
    constraint_type: constraintTypeEnum,
    start_date: dateSchema,
    end_date: dateSchema,
    shift_code: shiftCodeSchema.optional().nullable(),
    priority: z.number().int().min(1).max(7).default(5),
    notes: notesSchema,
  })
  .refine(
    (data) => {
      // shift_code es requerido para request_shift y request_no_shift
      if (['request_shift', 'request_no_shift'].includes(data.constraint_type)) {
        return data.shift_code != null && data.shift_code.length > 0
      }
      return true
    },
    {
      message: 'shift_code es requerido para request_shift y request_no_shift',
      path: ['shift_code'],
    }
  )
  .refine(
    (data) => {
      // end_date >= start_date
      return data.end_date >= data.start_date
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['end_date'],
    }
  )

export const updateConstraintSchema = z
  .object({
    constraint_type: constraintTypeEnum.optional(),
    start_date: dateSchema.optional(),
    end_date: dateSchema.optional(),
    shift_code: shiftCodeSchema.optional().nullable(),
    priority: z.number().int().min(1).max(7).optional(),
    notes: notesSchema,
  })
  // No status: approving or rejecting goes through PUT /constraints/:id/approve
  // (admin only). Accepting it here let anyone approve their own request.
  // Unknown keys are stripped, so a status sent here is ignored
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

export const approveConstraintSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: notesSchema,
})

// ============================================
// EMPLOYEE RULE SCHEMAS
// ============================================

export const createEmployeeRuleSchema = z.object({
  employee_id: employeeIdSchema,
  rule_type: employeeRuleTypeEnum,
  rule_value: z.string().min(1, 'El valor de la regla es requerido').max(255),
  priority: prioritySchema,
  notes: notesSchema,
})

export const updateEmployeeRuleSchema = z
  .object({
    rule_type: employeeRuleTypeEnum.optional(),
    rule_value: z.string().min(1).max(255).optional(),
    priority: prioritySchema.optional(),
    is_active: z.boolean().optional(),
    notes: notesSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

// ============================================
// CONFIG SCHEMAS
// ============================================

export const updateConfigSchema = z.object({
  config_value: z.string().min(1, 'El valor es requerido').max(255),
  description: z.string().max(255).optional(),
})

// ============================================
// QUERY SCHEMAS
// ============================================

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  status: monthStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const constraintQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  constraint_type: constraintTypeEnum.optional(),
  status: constraintStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// ============================================
// INFERRED TYPES
// ============================================

export type CreateMonthInput = z.infer<typeof createMonthSchema>
export type UpdateMonthInput = z.infer<typeof updateMonthSchema>
export type UpdateDayInput = z.infer<typeof updateDaySchema>
export type BulkUpdateDaysInput = z.infer<typeof bulkUpdateDaysSchema>
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>
export type BulkUpdateAssignmentsInput = z.infer<typeof bulkUpdateAssignmentsSchema>
export type CreateConstraintInput = z.infer<typeof createConstraintSchema>
export type UpdateConstraintInput = z.infer<typeof updateConstraintSchema>
export type ApproveConstraintInput = z.infer<typeof approveConstraintSchema>
export type CreateEmployeeRuleInput = z.infer<typeof createEmployeeRuleSchema>
export type UpdateEmployeeRuleInput = z.infer<typeof updateEmployeeRuleSchema>
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>
export type MonthQueryInput = z.infer<typeof monthQuerySchema>
export type ConstraintQueryInput = z.infer<typeof constraintQuerySchema>
