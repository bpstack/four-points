// tests/checklist/closed-day-deletes.test.ts
// Regression tests: the author of a comment or a photo could delete it from a
// closed day (rewriting its history), and the deletion was logged in today's
// run as if it were a new one. Decided on 2026-10-11: on a closed day only
// admin deletes; the event goes to the item's own run.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../repositories/checklist/checklist-comments.repository.js', () => ({
  findComment: vi.fn(),
  deleteComment: vi.fn(),
  findAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
}))
vi.mock('../../repositories/checklist/checklist-repository.js', () => ({
  logEvent: vi.fn(),
  getOrCreateRun: vi.fn(async () => ({ id: 999 })), // today's run: must not be used
}))
vi.mock('../../services/blacklist/cloudinary-service.js', () => ({
  CloudinaryService: { deleteImage: vi.fn() },
}))

const service = await import('../../services/checklist/checklist-comments.service.js')
const repo = await import('../../repositories/checklist/checklist-comments.repository.js')
const checklistRepo = await import('../../repositories/checklist/checklist-repository.js')

const closed = { user_id: 'author', run_id: 7, run_closed: true }
const open = { user_id: 'author', run_id: 8, run_closed: false }

describe('deleting comments and photos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('the author cannot delete from a closed day', async () => {
    vi.mocked(repo.findComment).mockResolvedValue(closed)
    vi.mocked(repo.findAttachment).mockResolvedValue({ ...closed, public_id: 'p' } as never)

    expect(await service.removeComment(1, 'author', false)).toBe('closed')
    expect(await service.removeAttachment(1, 'author', false)).toBe('closed')
    expect(repo.deleteComment).not.toHaveBeenCalled()
    expect(repo.deleteAttachment).not.toHaveBeenCalled()
  })

  it('admin can, and the event goes to the closed run', async () => {
    vi.mocked(repo.findComment).mockResolvedValue(closed)

    expect(await service.removeComment(1, 'admin-id', true)).toBe('deleted')
    expect(checklistRepo.logEvent).toHaveBeenCalledWith(7, null, 'admin-id', 'comment', {
      deleted_comment_id: 1,
    })
    expect(checklistRepo.getOrCreateRun).not.toHaveBeenCalled()
  })

  it('on an open day the author deletes, someone else cannot', async () => {
    vi.mocked(repo.findComment).mockResolvedValue(open)

    expect(await service.removeComment(1, 'someone-else', false)).toBe('forbidden')
    expect(await service.removeComment(1, 'author', false)).toBe('deleted')
    expect(checklistRepo.logEvent).toHaveBeenCalledWith(8, null, 'author', 'comment', {
      deleted_comment_id: 1,
    })
  })

  it('an unknown id is not found', async () => {
    vi.mocked(repo.findComment).mockResolvedValue(null)
    expect(await service.removeComment(1, 'author', false)).toBe('not_found')
  })
})
