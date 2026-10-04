// tests/frontend/fetch-all-pages.test.ts
// The parking status map and the booking wizard asked for the bookings once,
// got the first 50 and missed the rest. They now read every page through
// fetchAllPages. Tests the dependency-free frontend helper from the backend
// suite, paging an in-memory list the way the bookings repository does.

import { describe, it, expect } from 'vitest'
import { fetchAllPages } from '../../../frontend/app/lib/helpers/pagination.js'

// Same arithmetic as ParkingBookingsRepository.findAll
function pager(rows: number[], limit: number) {
  const requested: number[] = []
  const fetchPage = async (page: number) => {
    requested.push(page)
    const offset = (page - 1) * limit
    return { items: rows.slice(offset, offset + limit), totalPages: Math.ceil(rows.length / limit) }
  }
  return { fetchPage, requested }
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('fetchAllPages', () => {
  it('returns every row past the first page, in order', async () => {
    const rows = range(1234)
    const { fetchPage, requested } = pager(rows, 500)
    expect(await fetchAllPages(fetchPage)).toEqual(rows)
    expect(requested).toEqual([1, 2, 3])
  })

  it('makes one request when everything fits', async () => {
    const { fetchPage, requested } = pager(range(13), 500)
    expect(await fetchAllPages(fetchPage)).toEqual(range(13))
    expect(requested).toEqual([1])
  })

  it('handles an exact multiple of the page size', async () => {
    const { fetchPage, requested } = pager(range(1000), 500)
    expect(await fetchAllPages(fetchPage)).toHaveLength(1000)
    expect(requested).toEqual([1, 2])
  })

  it('stops on an empty result (totalPages 0)', async () => {
    const { fetchPage, requested } = pager([], 500)
    expect(await fetchAllPages(fetchPage)).toEqual([])
    expect(requested).toEqual([1])
  })
})
