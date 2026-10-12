// tests/frontend/home-logbooks.test.ts
// The home panel asked for the important logbook entries one day at a time:
// up to 31 requests to /api/logbooks/day/ for the month. It now asks /all for
// the whole range, page by page. Reads the frontend sources; no browser.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'frontend')
const read = (...p: string[]) => readFileSync(join(frontend, ...p), 'utf8')
const page = read('app', 'dashboard', 'page.tsx')
const queries = read('app', 'lib', 'logbooks', 'queries.ts')

describe('home panel logbook entries', () => {
  it('asks for the whole period at once, not one request per day', () => {
    expect(page).not.toContain('getLogbooksByDay')
    expect(page).not.toMatch(/dates\.map\(/)
    expect(page).toMatch(
      /logbooksApi\s*\.getLogbooksInRange\(range\[0\], range\[range\.length - 1\]\)/
    )
  })

  it('sorts the dates first: the week comes newest first', () => {
    expect(page).toContain('const range = [...dates].sort()')
  })

  it('reads every page of /all for that range', () => {
    const start = queries.indexOf('getLogbooksInRange: async (')
    expect(start).toBeGreaterThan(-1)
    const body = queries.slice(start, queries.indexOf('\n  },', start))
    expect(body).toContain('/api/logbooks/all?date_from=${dateFrom}&date_to=${dateTo}')
    expect(body).toContain('&limit=${RANGE_PAGE}&offset=${offset}')
    expect(body).toMatch(/if \(page\.length < RANGE_PAGE\) return entries/)
    // The backend accepts up to 500 per page
    expect(queries).toContain('const RANGE_PAGE = 500')
  })
})
