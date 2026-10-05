// tests/activity/activity-access.test.ts
// Regression tests for /api/activity: mantenimiento must not read cashier or
// logbook activity, and per-source lists merge newest first.

import { describe, it, expect } from 'vitest'
import { readableSources, mergeByTimestamp } from '../../services/activity/activity-access.js'
import { searchableModules } from '../../services/search/search-access.js'

describe('readableSources', () => {
  it('keeps mantenimiento to groups and maintenance', () => {
    expect([...readableSources('mantenimiento')].sort()).toEqual(['groups', 'maintenance'])
  })

  it('gives the other roles every source', () => {
    for (const role of ['admin', 'recepcionista', 'group-admin']) {
      expect(readableSources(role).size).toBe(4)
    }
  })

  it('gives nothing without a role', () => {
    expect(readableSources(undefined).size).toBe(0)
  })

  it('agrees with the global search on shared modules', () => {
    const search = searchableModules('mantenimiento')
    const activity = readableSources('mantenimiento')
    expect(search.has('groups')).toBe(activity.has('groups'))
    expect(search.has('maintenance')).toBe(activity.has('maintenance'))
  })
})

describe('mergeByTimestamp', () => {
  it('interleaves sources newest first and cuts to the limit', () => {
    const groups = [
      { id: 'g2', timestamp: '2026-09-28T10:00:00Z' },
      { id: 'g1', timestamp: '2026-09-27T09:00:00Z' },
    ]
    const maintenance = [
      { id: 'm2', timestamp: '2026-09-28T12:00:00Z' },
      { id: 'm1', timestamp: '2026-09-26T08:00:00Z' },
    ]
    expect(mergeByTimestamp([groups, maintenance], 3).map((a) => a.id)).toEqual(['m2', 'g2', 'g1'])
  })

  it('accepts the Date objects mysql2 returns', () => {
    const merged = mergeByTimestamp(
      [[{ timestamp: new Date('2026-01-01') }], [{ timestamp: new Date('2026-02-01') }]],
      5
    )
    expect(merged[0].timestamp).toEqual(new Date('2026-02-01'))
  })
})
