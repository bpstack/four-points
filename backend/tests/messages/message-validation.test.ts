// tests/messages/message-validation.test.ts
// Regression tests for messaging input: participant lists with malformed or
// repeated ids (which left half-created conversations), and unchecked
// limit, before and q query params.

import { describe, it, expect } from 'vitest'
import {
  createConversationSchema,
  addParticipantsSchema,
  messagePageQuerySchema,
  searchQuerySchema,
  allConversationsQuerySchema,
} from '../../validations/messages/message-schemas.js'

const a = '550e8400-e29b-41d4-a716-446655440001'
const b = '550e8400-e29b-41d4-a716-446655440002'

describe('createConversationSchema', () => {
  it('accepts a DM and a group as the frontend sends them', () => {
    expect(createConversationSchema.safeParse({ type: 'dm', participant_ids: [a] }).success).toBe(
      true
    )
    expect(
      createConversationSchema.safeParse({
        type: 'group',
        name: 'Recepción',
        participant_ids: [a, b],
      }).success
    ).toBe(true)
  })

  it('rejects unknown types and bad participant lists', () => {
    for (const body of [
      { type: 'channel', participant_ids: [a] },
      { type: 'group', participant_ids: [] },
      { type: 'group', participant_ids: [a, a] },
      { type: 'group', participant_ids: ['42'] },
      { type: 'group', participant_ids: a },
      {
        type: 'group',
        participant_ids: Array.from(
          { length: 11 },
          (_, i) => a.slice(0, -2) + String(i).padStart(2, '0')
        ),
      },
    ]) {
      expect(createConversationSchema.safeParse(body).success).toBe(false)
    }
  })
})

describe('addParticipantsSchema', () => {
  it('accepts unique user ids and rejects anything else', () => {
    expect(addParticipantsSchema.safeParse({ user_ids: [a, b] }).success).toBe(true)
    expect(addParticipantsSchema.safeParse({ user_ids: [b, b] }).success).toBe(false)
    expect(addParticipantsSchema.safeParse({ user_ids: [null] }).success).toBe(false)
  })
})

describe('query params', () => {
  it('defaults and bounds the message page', () => {
    expect(messagePageQuerySchema.parse({})).toEqual({ limit: 50 })
    expect(messagePageQuerySchema.parse({ before: '120', limit: '20' })).toEqual({
      before: 120,
      limit: 20,
    })
    for (const q of [{ limit: '0' }, { limit: '101' }, { limit: 'abc' }, { before: '-1' }]) {
      expect(messagePageQuerySchema.safeParse(q).success).toBe(false)
    }
  })

  it('takes q as a single string', () => {
    expect(searchQuerySchema.parse({ q: 'hola' })).toEqual({ q: 'hola', limit: 50 })
    expect(searchQuerySchema.safeParse({ q: ['a', 'b'] }).success).toBe(false)
    expect(searchQuerySchema.safeParse({ limit: '1000' }).success).toBe(false)
  })

  it('bounds the admin list', () => {
    expect(allConversationsQuerySchema.parse({})).toEqual({ limit: 100 })
    expect(allConversationsQuerySchema.safeParse({ limit: '100000' }).success).toBe(false)
  })
})
