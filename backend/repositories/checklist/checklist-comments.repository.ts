// repositories/checklist/checklist-comments.repository.ts

import db from '../../config/db.js'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface Comment extends RowDataPacket {
  id: number
  run_id: number
  step_id: string
  user_id: string
  username: string
  body: string
  created_at: string
}

export interface Attachment extends RowDataPacket {
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

// ── Comments ──────────────────────────────────────────────

export async function getComments(runId: number, stepId: string): Promise<Comment[]> {
  const [rows] = await db.execute<Comment[]>(
    `SELECT c.*, u.username
     FROM checklist_step_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.run_id = ? AND c.step_id = ?
     ORDER BY c.created_at ASC`,
    [runId, stepId]
  )
  return rows
}

export async function createComment(
  runId: number,
  stepId: string,
  userId: string,
  body: string
): Promise<Comment> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO checklist_step_comments (run_id, step_id, user_id, body) VALUES (?, ?, ?, ?)`,
    [runId, stepId, userId, body]
  )
  const [rows] = await db.execute<Comment[]>(
    `SELECT c.*, u.username
     FROM checklist_step_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?`,
    [(result as unknown as ResultSetHeader).insertId]
  )
  return rows[0]
}

export async function deleteComment(
  commentId: number,
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT user_id FROM checklist_step_comments WHERE id = ?`,
    [commentId]
  )
  if (!rows[0]) return false
  if (!isAdmin && rows[0].user_id !== userId) return false
  await db.execute(`DELETE FROM checklist_step_comments WHERE id = ?`, [commentId])
  return true
}

// ── Attachments ───────────────────────────────────────────

export async function getAttachments(runId: number, stepId: string): Promise<Attachment[]> {
  const [rows] = await db.execute<Attachment[]>(
    `SELECT a.*, u.username
     FROM checklist_step_attachments a
     JOIN users u ON u.id = a.user_id
     WHERE a.run_id = ? AND a.step_id = ?
     ORDER BY a.uploaded_at ASC`,
    [runId, stepId]
  )
  return rows
}

export async function createAttachment(
  runId: number,
  stepId: string,
  userId: string,
  fileUrl: string,
  publicId: string,
  mime: string,
  size: number
): Promise<Attachment> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO checklist_step_attachments (run_id, step_id, user_id, file_url, public_id, mime, size)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [runId, stepId, userId, fileUrl, publicId, mime, size]
  )
  const [rows] = await db.execute<Attachment[]>(
    `SELECT a.*, u.username
     FROM checklist_step_attachments a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = ?`,
    [(result as unknown as ResultSetHeader).insertId]
  )
  return rows[0]
}

export async function findAttachment(attachmentId: number): Promise<Attachment | null> {
  const [rows] = await db.execute<Attachment[]>(
    `SELECT a.*, u.username FROM checklist_step_attachments a
     JOIN users u ON u.id = a.user_id WHERE a.id = ?`,
    [attachmentId]
  )
  return rows[0] ?? null
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  await db.execute(`DELETE FROM checklist_step_attachments WHERE id = ?`, [attachmentId])
}

// ── Counts (usados en run state) ──────────────────────────

export async function getStepCounts(
  runId: number
): Promise<Map<string, { comments: number; attachments: number }>> {
  const [commentRows] = await db.execute<RowDataPacket[]>(
    `SELECT step_id, COUNT(*) AS cnt FROM checklist_step_comments WHERE run_id = ? GROUP BY step_id`,
    [runId]
  )
  const [attachRows] = await db.execute<RowDataPacket[]>(
    `SELECT step_id, COUNT(*) AS cnt FROM checklist_step_attachments WHERE run_id = ? GROUP BY step_id`,
    [runId]
  )
  const map = new Map<string, { comments: number; attachments: number }>()
  for (const r of commentRows) map.set(r.step_id, { comments: r.cnt, attachments: 0 })
  for (const r of attachRows) {
    const entry = map.get(r.step_id) ?? { comments: 0, attachments: 0 }
    map.set(r.step_id, { ...entry, attachments: r.cnt })
  }
  return map
}
