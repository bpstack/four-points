// services/checklist/checklist-comments.service.ts

import * as commentsRepo from '../../repositories/checklist/checklist-comments.repository.js'
import * as checklistRepo from '../../repositories/checklist/checklist-repository.js'
import { CloudinaryService } from '../blacklist/cloudinary-service.js'
import type { Comment, Attachment } from '../../repositories/checklist/checklist-comments.repository.js'

async function resolveRun(checklistId: string): Promise<{ id: number }> {
  const run = await checklistRepo.getOrCreateRun(checklistId)
  return run
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
  checklistId: string,
  commentId: number,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const run = await resolveRun(checklistId)
  const deleted = await commentsRepo.deleteComment(commentId, userId, isAdmin)
  if (deleted) await checklistRepo.logEvent(run.id, null, userId, 'comment', { deleted_comment_id: commentId })
  return deleted
}

// ── Attachments ───────────────────────────────────────────

export async function getAttachments(checklistId: string, stepId: string): Promise<Attachment[]> {
  const run = await resolveRun(checklistId)
  return commentsRepo.getAttachments(run.id, stepId)
}

export async function addAttachment(
  checklistId: string,
  stepId: string,
  userId: string,
  fileBuffer: Buffer,
  originalName: string,
  mime: string,
  size: number
): Promise<Attachment> {
  const run = await resolveRun(checklistId)
  const result = await CloudinaryService.uploadImage(fileBuffer, originalName, 'checklist')
  const attachment = await commentsRepo.createAttachment(
    run.id, stepId, userId,
    result.secure_url, result.public_id, mime, size
  )
  await checklistRepo.logEvent(run.id, stepId, userId, 'attach', { attachment_id: attachment.id })
  return attachment
}

export async function removeAttachment(
  checklistId: string,
  attachmentId: number,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const attachment = await commentsRepo.findAttachment(attachmentId)
  if (!attachment) return false
  if (!isAdmin && attachment.user_id !== userId) return false
  await CloudinaryService.deleteImage(attachment.public_id)
  await commentsRepo.deleteAttachment(attachmentId)
  const run = await resolveRun(checklistId)
  await checklistRepo.logEvent(run.id, null, userId, 'attach', { deleted_attachment_id: attachmentId })
  return true
}
