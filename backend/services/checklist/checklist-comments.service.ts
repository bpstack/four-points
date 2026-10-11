// services/checklist/checklist-comments.service.ts

import * as commentsRepo from '../../repositories/checklist/checklist-comments.repository.js'
import * as checklistRepo from '../../repositories/checklist/checklist-repository.js'
import { CloudinaryService } from '../blacklist/cloudinary-service.js'
import { withoutPublicId, type PublicAttachment } from './attachment-response.js'
import type { Comment } from '../../repositories/checklist/checklist-comments.repository.js'

async function resolveRun(checklistId: string): Promise<{ id: number }> {
  const run = await checklistRepo.getOrCreateRun(checklistId)
  return run
}

// Result of deleting a comment or an attachment. A closed day (its run has
// reset_at) is history: since 2026-10-11 only admin may delete there
export type RemoveResult = 'deleted' | 'not_found' | 'forbidden' | 'closed'

function canRemove(
  item: { user_id: string; run_closed: boolean | number },
  userId: string,
  isAdmin: boolean
): RemoveResult | null {
  if (isAdmin) return null
  if (item.user_id !== userId) return 'forbidden'
  if (item.run_closed) return 'closed'
  return null
}

// ── Comments ──────────────────────────────────────────────

export async function getComments(checklistId: string, stepId: string): Promise<Comment[]> {
  const run = await resolveRun(checklistId)
  return commentsRepo.getComments(run.id, stepId)
}

export async function addComment(
  checklistId: string,
  stepId: string,
  userId: string,
  body: string
): Promise<Comment> {
  const run = await resolveRun(checklistId)
  const comment = await commentsRepo.createComment(run.id, stepId, userId, body)
  await checklistRepo.logEvent(run.id, stepId, userId, 'comment', { comment_id: comment.id })
  return comment
}

export async function removeComment(
  commentId: number,
  userId: string,
  isAdmin: boolean
): Promise<RemoveResult> {
  const comment = await commentsRepo.findComment(commentId)
  if (!comment) return 'not_found'
  const refused = canRemove(comment, userId, isAdmin)
  if (refused) return refused
  await commentsRepo.deleteComment(commentId)
  // Logged in the comment's own run, not in today's
  await checklistRepo.logEvent(comment.run_id, null, userId, 'comment', {
    deleted_comment_id: commentId,
  })
  return 'deleted'
}

// ── Attachments ───────────────────────────────────────────

export async function getAttachments(
  checklistId: string,
  stepId: string
): Promise<PublicAttachment[]> {
  const run = await resolveRun(checklistId)
  return (await commentsRepo.getAttachments(run.id, stepId)).map(withoutPublicId)
}

export async function addAttachment(
  checklistId: string,
  stepId: string,
  userId: string,
  fileBuffer: Buffer,
  originalName: string,
  mime: string,
  size: number
): Promise<PublicAttachment> {
  const run = await resolveRun(checklistId)
  const result = await CloudinaryService.uploadImage(fileBuffer, originalName, 'checklist')
  const attachment = await commentsRepo.createAttachment(
    run.id,
    stepId,
    userId,
    result.secure_url,
    result.public_id,
    mime,
    size
  )
  await checklistRepo.logEvent(run.id, stepId, userId, 'attach', { attachment_id: attachment.id })
  return withoutPublicId(attachment)
}

export async function removeAttachment(
  attachmentId: number,
  userId: string,
  isAdmin: boolean
): Promise<RemoveResult> {
  const attachment = await commentsRepo.findAttachment(attachmentId)
  if (!attachment) return 'not_found'
  const refused = canRemove(attachment, userId, isAdmin)
  if (refused) return refused
  await CloudinaryService.deleteImage(attachment.public_id)
  await commentsRepo.deleteAttachment(attachmentId)
  // Logged in the attachment's own run, not in today's
  await checklistRepo.logEvent(attachment.run_id, null, userId, 'attach', {
    deleted_attachment_id: attachmentId,
  })
  return 'deleted'
}

// Stored Cloudinary URL of an attachment, for the server to serve it
export async function getAttachmentStoredUrl(attachmentId: number): Promise<string | null> {
  const attachment = await commentsRepo.findAttachment(attachmentId)
  return attachment ? attachment.file_url : null
}
