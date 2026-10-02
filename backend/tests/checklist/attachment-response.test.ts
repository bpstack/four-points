// tests/checklist/attachment-response.test.ts
// Regression test: checklist attachment responses carried the Cloudinary
// public_id, which only the server needs (to delete the file).

import { describe, it, expect } from 'vitest'
import { withoutPublicId } from '../../services/checklist/attachment-response.js'
import type { Attachment } from '../../repositories/checklist/checklist-comments.repository.js'

describe('withoutPublicId', () => {
  it('drops public_id and keeps everything the frontend reads', () => {
    const row = {
      id: 7,
      run_id: 3,
      step_id: 's1-1',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      username: 'recepcion',
      file_url: 'https://res.cloudinary.com/x/image/upload/v1/checklist/a.jpg',
      public_id: 'checklist/checklist_1_a',
      mime: 'image/jpeg',
      size: 1024,
      uploaded_at: '2026-10-02T08:00:00Z',
    } as unknown as Attachment
    const out = withoutPublicId(row)
    expect(out).not.toHaveProperty('public_id')
    expect(out).toMatchObject({ id: 7, user_id: row.user_id, file_url: row.file_url })
  })
})
