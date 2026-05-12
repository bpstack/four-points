import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'

const API_URL = API_BASE_URL

// ── DTOs ──────────────────────────────────────────────────

export interface StepStateDto {
  run_id: number
  step_id: string
  done: boolean
  done_by_user_id: string | null
  done_at: string | null
  done_by_username: string | null
  comment_count: number
  attachment_count: number
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

export interface CommentDto {
  id: number
  run_id: number
  step_id: string
  user_id: string
  username: string
  body: string
  created_at: string
}

export interface AttachmentDto {
  id: number
  run_id: number
  step_id: string
  user_id: string
  username: string
  file_url: string
  public_id: string
  mime: string
  size: number
  uploaded_at: string
}

// ── API ───────────────────────────────────────────────────

export const checklistApi = {
  getRun: (id: string): Promise<RunStateDto> =>
    apiClient.get(`${API_URL}/api/checklists/${id}/run`),

  toggleStep: (id: string, stepId: string, done: boolean): Promise<RunStateDto> =>
    apiClient.patch(`${API_URL}/api/checklists/${id}/steps/${stepId}`, { done }),

  // Comments
  getComments: (id: string, stepId: string): Promise<CommentDto[]> =>
    apiClient.get(`${API_URL}/api/checklists/${id}/steps/${stepId}/comments`),

  addComment: (id: string, stepId: string, body: string): Promise<CommentDto> =>
    apiClient.post(`${API_URL}/api/checklists/${id}/steps/${stepId}/comments`, { body }),

  deleteComment: (id: string, stepId: string, commentId: number): Promise<void> =>
    apiClient.delete(`${API_URL}/api/checklists/${id}/steps/${stepId}/comments/${commentId}`),

  // Attachments
  getAttachments: (id: string, stepId: string): Promise<AttachmentDto[]> =>
    apiClient.get(`${API_URL}/api/checklists/${id}/steps/${stepId}/attachments`),

  addAttachment: (id: string, stepId: string, file: File): Promise<AttachmentDto> => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.postFormData(
      `${API_URL}/api/checklists/${id}/steps/${stepId}/attachments`,
      form
    )
  },

  deleteAttachment: (id: string, stepId: string, attachmentId: number): Promise<void> =>
    apiClient.delete(`${API_URL}/api/checklists/${id}/steps/${stepId}/attachments/${attachmentId}`),
}

export const checklistKeys = {
  run: (id: string) => ['checklist', 'run', id] as const,
  comments: (id: string, stepId: string) => ['checklist', 'comments', id, stepId] as const,
  attachments: (id: string, stepId: string) => ['checklist', 'attachments', id, stepId] as const,
}
