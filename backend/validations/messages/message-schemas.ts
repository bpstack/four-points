// validations/messages/message-schemas.ts

import { z } from 'zod'
import { MESSAGE_CONSTANTS } from '../../models/messages/index.js'

// Users are CHAR(36) UUIDs. A repeated or malformed id used to reach the
// inserts and leave a half-created conversation behind
const userIdList = z
  .array(z.string().uuid())
  .min(1)
  .max(MESSAGE_CONSTANTS.MAX_GROUP_PARTICIPANTS)
  .refine((ids) => new Set(ids).size === ids.length, 'Hay usuarios repetidos')

export const createConversationSchema = z.object({
  type: z.enum(['dm', 'group']),
  name: z.string().optional().nullable(),
  participant_ids: userIdList,
})

export const addParticipantsSchema = z.object({
  user_ids: userIdList,
})

const limit = (max: number, fallback: number) =>
  z.coerce.number().int().min(1).max(max).default(fallback)

// GET /conversations/:id/messages
export const messagePageQuerySchema = z.object({
  before: z.coerce.number().int().min(1).optional(),
  limit: limit(100, MESSAGE_CONSTANTS.DEFAULT_MESSAGES_LIMIT),
})

// GET /messages/search and /users/search: q must be one string, not an
// array from a repeated param
export const searchQuerySchema = z.object({
  q: z.string().optional(),
  limit: limit(100, 50),
})

// GET /conversations/all (admin)
export const allConversationsQuerySchema = z.object({
  limit: limit(500, 100),
})
