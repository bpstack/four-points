// tests/group/group-history-update.test.ts
// Regression tests for logGroupUpdated: editing only the amount logged 7
// unchanged fields (dates as Date vs string, nulls, DECIMAL as string).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroupHistoryService } from '../../services/group/group-history-service.js'

vi.mock('../../repositories/group/group-history-repository', () => ({
  GroupHistoryRepository: {
    create: vi.fn(async (data: unknown) => ({ id: Math.random(), ...data })),
  },
}))

const { GroupHistoryRepository } =
  await import('../../repositories/group/group-history-repository.js')

describe('GroupHistoryService.logGroupUpdated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not log when date is the same as Date object and string', async () => {
    const date = new Date(2026, 9, 14)
    const oldData = { arrival_date: date }
    const newData = { arrival_date: '2026-10-14' }

    const result = await GroupHistoryService.logGroupUpdated(1, 'user1', oldData, newData)

    expect(result).toHaveLength(0)
    expect(GroupHistoryRepository.create).not.toHaveBeenCalled()
  })

  it('does not log when null vs undefined', async () => {
    const oldData = { notes: null }
    const newData = { notes: undefined }

    const result = await GroupHistoryService.logGroupUpdated(1, 'user1', oldData, newData)

    expect(result).toHaveLength(0)
    expect(GroupHistoryRepository.create).not.toHaveBeenCalled()
  })

  it('does not log when number vs numeric string (1500 vs "1500.00")', async () => {
    const oldData = { total_amount: 1500 }
    const newData = { total_amount: '1500.00' }

    const result = await GroupHistoryService.logGroupUpdated(1, 'user1', oldData, newData)

    expect(result).toHaveLength(0)
    expect(GroupHistoryRepository.create).not.toHaveBeenCalled()
  })

  it('logs exactly 1 row when amount actually changes', async () => {
    const oldData = { total_amount: 1500, name: 'Old Name' }
    const newData = { total_amount: 2000, name: 'Old Name' }

    const result = await GroupHistoryService.logGroupUpdated(1, 'user1', oldData, newData)

    expect(result).toHaveLength(1)
    expect(GroupHistoryRepository.create).toHaveBeenCalledTimes(1)
    expect(GroupHistoryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        field_changed: 'total_amount',
        old_value: '1500',
        new_value: '2000',
      })
    )
  })

  it('ignores fields not in changedFields even if they differ', async () => {
    const oldData = { total_amount: 1500, name: 'Old Name', created_at: '2026-01-01' }
    const newData = { total_amount: 2000, name: 'New Name', created_at: '2026-01-01' }

    const result = await GroupHistoryService.logGroupUpdated(1, 'user1', oldData, newData, [
      'total_amount',
    ])

    expect(result).toHaveLength(1)
    expect(GroupHistoryRepository.create).toHaveBeenCalledTimes(1)
    expect(GroupHistoryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        field_changed: 'total_amount',
      })
    )
  })

  it('stores a changed date as plain ISO text, not quoted JSON', async () => {
    const oldData = { arrival_date: new Date('2026-10-24T00:00:00.000Z') }
    const newData = { arrival_date: new Date('2026-10-26T00:00:00.000Z') }

    await GroupHistoryService.logGroupUpdated(1, 'user1', oldData, newData)

    expect(GroupHistoryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        field_changed: 'arrival_date',
        old_value: '2026-10-24T00:00:00.000Z',
        new_value: '2026-10-26T00:00:00.000Z',
      })
    )
  })
})
