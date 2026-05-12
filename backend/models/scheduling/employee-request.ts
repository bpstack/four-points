// models/scheduling/employee-request.ts
// Tipos para la tabla scheduling_employee_requests.
// Creado: 2026-04-25 — Fase 1 del solver.

export type SchedulingRequestType =
  | 'shift_preference'
  | 'shift_exclusion'
  | 'bonificable'
  | 'baja_temporal'
  | 'vacation'

export type SchedulingRequestStatus = 'pending' | 'approved' | 'rejected'

export interface SchedulingEmployeeRequestRow {
  id: number
  employee_id: string
  date_from: string // 'YYYY-MM-DD'
  date_to: string // 'YYYY-MM-DD'
  request_type: SchedulingRequestType
  requested_value: string | null
  status: SchedulingRequestStatus
  notes: string | null
  created_by: string | null
  approved_by: string | null
  created_at: Date
  updated_at: Date
  approved_at: Date | null
}
