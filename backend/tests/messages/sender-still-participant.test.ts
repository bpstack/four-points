// tests/messages/sender-still-participant.test.ts
// Someone removed from a conversation could still edit and delete their old
// messages there: isSender only compared sender_id. Reads the repository SQL;
// no database needed.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'repositories',
    'messages',
    'message-repository.ts'
  ),
  'utf8'
)

describe('MessageRepository.isSender', () => {
  it('requires the sender to be an active participant of the conversation', () => {
    const body = repo.match(/static async isSender\([\s\S]*?\n {2}\}/)?.[0] ?? ''
    const sql = body.replace(/\s+/g, ' ')
    expect(sql).toContain('JOIN conversation_participants cp')
    expect(sql).toContain('cp.conversation_id = m.conversation_id')
    expect(sql).toContain('cp.user_id = m.sender_id')
    expect(sql).toContain('cp.is_active = 1')
    expect(sql).toContain('WHERE m.id = ? AND m.sender_id = ?')
  })
})
