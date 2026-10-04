// tests/parking/target-spot.test.ts
// Editing a booking's spot filled what the request left out with the wrong
// values: the floor fell back to -2 (a -3 booking changing only its number
// moved floor) and the number fell back to the spot's internal id (changing
// only the floor picked an unrelated spot). The update now starts from the
// booking's current spot.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { targetSpot } from '../../services/parking/target-spot.js'

const current = { spot_number: 7, level_code: '-3' }

describe('targetSpot', () => {
  it('keeps the floor when only the number changes', () => {
    expect(targetSpot({ spot_number: 12 }, current)).toEqual({ spot_number: 12, level_code: '-3' })
  })

  it('keeps the number when only the floor changes', () => {
    expect(targetSpot({ level_code: '-2' }, current)).toEqual({ spot_number: 7, level_code: '-2' })
  })

  it('takes both when both change', () => {
    expect(targetSpot({ spot_number: 3, level_code: '-2' }, current)).toEqual({
      spot_number: 3,
      level_code: '-2',
    })
  })

  it('is what the booking update uses, read from the current spot', () => {
    const repo = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../repositories/parking/bookings.repository.ts'
      ),
      'utf8'
    )
    expect(repo).toContain("'SELECT spot_number, level_code FROM parking_spots WHERE id = ?'")
    expect(repo).toContain('targetSpot(updateData, currentSpot[0])')
    expect(repo).not.toContain("updateData.level_code ?? '-2'")
    expect(repo).not.toContain('updateData.spot_number ?? booking[0].spot_id')
  })
})
