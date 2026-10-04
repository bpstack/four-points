// tests/maintenance/report-statuses-frontend.test.ts
// The maintenance section of the reports screen filtered by 'pending' and
// 'resolved', which the backend rejects. Its STATUSES list must be exactly
// the backend's report statuses, and each needs a label in es and en.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reportStatusEnum } from '../../validations/maintenance/schemas.js'

const repo = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const section = readFileSync(
  join(repo, 'frontend/app/components/profile/reports/sections/MaintenanceSection.tsx'),
  'utf8'
)

describe('reports maintenance filter', () => {
  it('offers exactly the backend statuses', () => {
    const block = section.match(/const STATUSES = \[([\s\S]*?)\] as const/)
    expect(block).not.toBeNull()
    const statuses = [...block![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    expect(statuses.sort()).toEqual([...reportStatusEnum.options].sort())
  })

  it.each(['es', 'en'])('has a %s label for each status', (lang) => {
    const profile = JSON.parse(
      readFileSync(join(repo, `frontend/messages/${lang}/profile.json`), 'utf8')
    )
    const labels = profile.reports.maintenance.status
    for (const status of reportStatusEnum.options) {
      expect(labels[status], status).toBeTruthy()
    }
  })
})
