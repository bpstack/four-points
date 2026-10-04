// tests/checklist/checklist-history-query.test.ts
// Regression tests for GET /api/checklists/:id/history query params: a
// repeated param or an impossible date used to end in a 500.

import { describe, it, expect } from 'vitest'
import { historyQuerySchema } from '../../validations/checklist/checklist-schemas.js'

describe('historyQuerySchema', () => {
  it('accepts what the reports screen sends', () => {
    expect(
      historyQuerySchema.parse({ limit: '50', date_from: '2026-09-01', date_to: '2026-09-30' })
    ).toEqual({ limit: 50, date_from: '2026-09-01', date_to: '2026-09-30' })
  })

  it('defaults the limit to 30', () => {
    expect(historyQuerySchema.parse({})).toEqual({ limit: 30 })
  })

  it('rejects repeated params, impossible dates and bad limits', () => {
    for (const query of [
      { date_from: ['2026-09-01', '2026-09-02'] },
      { date_to: '2026-02-30' },
      { date_from: '01/09/2026' },
      { limit: '0' },
      { limit: '101' },
      { limit: 'abc' },
      { limit: ['10', '20'] },
    ]) {
      expect(historyQuerySchema.safeParse(query).success).toBe(false)
    }
  })
})
