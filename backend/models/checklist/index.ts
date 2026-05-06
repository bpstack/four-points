// models/checklist/index.ts

import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface ChecklistRun extends RowDataPacket {
  id: number
  checklist_id: string
  hotel_id: number
  hotel_date: string
  shift: 'morning' | 'afternoon' | 'night' | null
  started_at: string
  reset_at: string | null
  reset_by_user_id: string | null
  reset_reason: 'cron' | 'manual' | null
}

export interface StepState extends RowDataPacket {
  run_id: number
  step_id: string
  done: boolean
  done_by_user_id: string | null
  done_at: string | null
  done_by_username?: string | null
}

export interface ChecklistRunWithSteps {
  run: Omit<ChecklistRun, keyof RowDataPacket>
  steps: Omit<StepState, keyof RowDataPacket>[]
}

export type { ResultSetHeader }
