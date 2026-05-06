import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'

const API_URL = API_BASE_URL

export interface StepStateDto {
  run_id: number
  step_id: string
  done: boolean
  done_by_user_id: string | null
  done_at: string | null
  done_by_username: string | null
}

export interface RunDto {
  id: number
  checklist_id: string
  hotel_date: string
  started_at: string
  reset_at: string | null
}

export interface RunStateDto {
  run: RunDto
  steps: StepStateDto[]
}

export const checklistApi = {
  getRun: (id: string): Promise<RunStateDto> =>
    apiClient.get(`${API_URL}/api/checklists/${id}/run`),

  toggleStep: (id: string, stepId: string, done: boolean): Promise<RunStateDto> =>
    apiClient.patch(`${API_URL}/api/checklists/${id}/steps/${stepId}`, { done }),
}

export const checklistKeys = {
  run: (id: string) => ['checklist', 'run', id] as const,
}
