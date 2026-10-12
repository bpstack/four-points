// tests/maintenance/atomic-history.test.ts
// Regression tests: maintenance wrote the report and its history row with two
// separate queries, so a failure in between left a change without history and
// the user got a 500 for a change that was already saved. Each change and its
// history now commit or roll back together through withTransaction.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReportWithDetails } from '../../models/maintenance/index.js'

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
}

vi.mock('../../config/db.js', () => ({
  default: {
    getConnection: vi.fn(async () => connection),
    query: vi.fn(async () => [[]]),
    execute: vi.fn(),
  },
}))

const { MaintenanceRepository } =
  await import('../../repositories/maintenance/maintenance-repository.js')
const { default: db } = await import('../../config/db.js')

const report = (overrides: Partial<ReportWithDetails> = {}) =>
  ({
    id: '111026-001',
    title: 'Grifo',
    status: 'reported',
    priority: 'medium',
    is_deleted: false,
    ...overrides,
  }) as ReportWithDetails

const ok = [{ affectedRows: 1 }]
const historyFails = () => {
  connection.query.mockResolvedValueOnce(ok) // the change
  connection.query.mockRejectedValueOnce(new Error('history insert failed'))
}

// Each mutation, with the state getById must return for it to reach the write
const mutations: Array<[string, () => Promise<unknown>, Partial<ReportWithDetails>]> = [
  [
    'create',
    () =>
      MaintenanceRepository.create(
        {
          title: 'Grifo',
          description: 'Gotea',
          location_type: 'room',
          location_description: 'Baño',
        } as Parameters<typeof MaintenanceRepository.create>[0],
        'u1',
        'admin'
      ),
    {},
  ],
  [
    'update',
    () => MaintenanceRepository.update('111026-001', { title: 'Otro' }, 'u1', 'admin'),
    {},
  ],
  [
    'updateStatus',
    () => MaintenanceRepository.updateStatus('111026-001', 'in_progress', 'u1', 'admin'),
    {},
  ],
  [
    'updatePriority',
    () => MaintenanceRepository.updatePriority('111026-001', 'high', 'u1', 'admin'),
    {},
  ],
  [
    'addResolutionNotes',
    () => MaintenanceRepository.addResolutionNotes('111026-001', 'Cambiado', 'u1', 'admin'),
    {},
  ],
  ['delete', () => MaintenanceRepository.delete('111026-001', 'u1', 'admin'), {}],
  [
    'restore',
    () => MaintenanceRepository.restore('111026-001', 'u1', 'admin'),
    { is_deleted: true },
  ],
]

describe('maintenance changes and their history are atomic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connection.query.mockReset()
    vi.restoreAllMocks()
  })

  it.each(mutations)('%s rolls back when the history insert fails', async (_name, run, state) => {
    vi.spyOn(MaintenanceRepository, 'getById').mockResolvedValue(report(state))
    historyFails()

    await expect(run()).rejects.toThrow('history insert failed')
    expect(connection.beginTransaction).toHaveBeenCalledOnce()
    expect(connection.rollback).toHaveBeenCalledOnce()
    expect(connection.commit).not.toHaveBeenCalled()
    expect(connection.release).toHaveBeenCalledOnce()
  })

  it.each(mutations)(
    '%s writes the change and its history on one connection',
    async (_name, run, state) => {
      vi.spyOn(MaintenanceRepository, 'getById').mockResolvedValue(report(state))
      connection.query.mockResolvedValue(ok)

      await run()
      expect(connection.commit).toHaveBeenCalledOnce()
      expect(connection.rollback).not.toHaveBeenCalled()
      const sql = connection.query.mock.calls.map(([q]) => String(q))
      expect(sql.some((q) => /maintenance_reports/.test(q))).toBe(true)
      expect(sql.some((q) => /INSERT INTO maintenance_history/.test(q))).toBe(true)
      // No write reaches the pool directly
      const poolWrites = vi
        .mocked(db.query)
        .mock.calls.map(([q]) => String(q))
        .filter((q) => /INSERT|UPDATE/.test(q))
      expect(poolWrites).toEqual([])
    }
  )
})
