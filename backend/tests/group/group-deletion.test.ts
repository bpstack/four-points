// tests/group/group-deletion.test.ts
// Regression tests: deleting a group deleted its whole history too
// (group_history had ON DELETE CASCADE) and logged nothing. Decided on
// 2026-10-11: the group is still deleted, its history stays, and the delete
// writes a "deleted" row with a snapshot of the group, in the same
// transaction.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(),
}

vi.mock('../../config/db.js', () => ({
  default: { getConnection: vi.fn(async () => connection), query: vi.fn() },
}))

const { GroupRepository } = await import('../../repositories/group/group-repository.js')

const group = { id: 4, name: 'Congreso', total_amount: '12500.00' }

describe('deleting a group', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connection.query.mockReset()
  })

  it('deletes the group and writes a deleted row with its snapshot', async () => {
    connection.query.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{}])

    expect(await GroupRepository.delete(4, 'u1', group)).toBe(true)

    const [del, history] = connection.query.mock.calls
    expect(del[0]).toMatch(/DELETE FROM hotel_groups/)
    expect(history[0]).toMatch(/INSERT INTO group_history[\s\S]*'deleted', 'hotel_groups'/)
    expect(history[1]).toEqual([4, 4, JSON.stringify(group), 'u1'])
    expect(connection.commit).toHaveBeenCalledOnce()
  })

  it('rolls the delete back when the history row fails', async () => {
    connection.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockRejectedValueOnce(new Error('history insert failed'))

    await expect(GroupRepository.delete(4, 'u1', group)).rejects.toThrow('history insert failed')
    expect(connection.rollback).toHaveBeenCalledOnce()
    expect(connection.commit).not.toHaveBeenCalled()
  })

  it('writes no history when there was no group to delete', async () => {
    connection.query.mockResolvedValueOnce([{ affectedRows: 0 }])

    expect(await GroupRepository.delete(4, 'u1', group)).toBe(false)
    expect(connection.query).toHaveBeenCalledOnce()
  })

  it('a migration drops the cascade from group_history', () => {
    const script = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        'db-mysql',
        'scripts',
        '20261011_keep_group_history_on_delete.sql'
      ),
      'utf8'
    )
    expect(script).toContain('ALTER TABLE group_history DROP FOREIGN KEY group_history_ibfk_1')
  })
})
