// tests/blacklist/blacklist-validation.test.ts
// Regression tests for blacklist input validation: blank texts stored empty
// and impossible dates (Date.parse accepts 2026-02-31) that reached MySQL.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { toBlacklistImagePath } from '../../services/uploads/blacklist-images.js'
import {
  createBlacklistSchema,
  updateBlacklistSchema,
  blacklistFiltersSchema,
} from '../../validations/blacklist/schemas.js'

const entry = {
  guest_name: 'Juan Pérez',
  document_type: 'DNI',
  document_number: '12345678z',
  check_in_date: '2026-09-20',
  check_out_date: '2026-09-22',
  reason: 'Daños en la habitación',
  severity: 'HIGH',
  comments: 'Rompió el espejo del baño',
}

describe('createBlacklistSchema', () => {
  it('accepts a normal entry, trimmed and with the document uppercased', () => {
    const parsed = createBlacklistSchema.parse({ ...entry, guest_name: '  Juan Pérez  ' })
    expect(parsed.guest_name).toBe('Juan Pérez')
    expect(parsed.document_number).toBe('12345678Z')
  })

  it('rejects a name, reason or comments made only of spaces', () => {
    expect(createBlacklistSchema.safeParse({ ...entry, guest_name: '     ' }).success).toBe(false)
    expect(createBlacklistSchema.safeParse({ ...entry, reason: ' '.repeat(12) }).success).toBe(
      false
    )
    expect(createBlacklistSchema.safeParse({ ...entry, comments: ' '.repeat(12) }).success).toBe(
      false
    )
  })

  it('rejects days that do not exist', () => {
    for (const date of ['2026-02-31', '2026-02-29', '2026-04-31']) {
      expect(
        createBlacklistSchema.safeParse({
          ...entry,
          check_in_date: date,
          check_out_date: '2026-05-10',
        }).success
      ).toBe(false)
    }
  })
})

describe('updateBlacklistSchema', () => {
  it('rejects blank texts and impossible dates', () => {
    expect(updateBlacklistSchema.safeParse({ reason: ' '.repeat(15) }).success).toBe(false)
    expect(updateBlacklistSchema.safeParse({ check_out_date: '2026-02-30' }).success).toBe(false)
  })

  it('accepts a partial update', () => {
    expect(updateBlacklistSchema.safeParse({ severity: 'LOW' }).success).toBe(true)
  })
})

describe('images', () => {
  beforeAll(() => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'fourpoints')
  })
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  // Photos are private files: the upload returns this API path, never a URL
  const own = '/api/blacklist/images/blacklist_1727_foto.jpg'

  it('accepts photos uploaded through the blacklist upload', () => {
    expect(createBlacklistSchema.safeParse({ ...entry, images: [own] }).success).toBe(true)
    expect(updateBlacklistSchema.safeParse({ images: [own] }).success).toBe(true)
  })

  it('maps a stored Cloudinary URL from before 2026-10-04 to the same API path', () => {
    expect(
      toBlacklistImagePath(
        'https://res.cloudinary.com/fourpoints/image/upload/v1727/blacklist/blacklist_1727_foto.jpg'
      )
    ).toBe(own)
    expect(toBlacklistImagePath('https://evil.example/blacklist/blacklist_1_x.jpg')).toBeNull()
  })

  it('rejects any other value, including a Cloudinary URL', () => {
    for (const url of [
      'https://res.cloudinary.com/fourpoints/image/upload/v1727/blacklist/blacklist_1727_foto.jpg',
      '/api/blacklist/images/../../auth/me',
      '/api/blacklist/images/blacklist_1_x.svg',
      'https://evil.example/foto.jpg',
      'https://res.cloudinary.com/othercloud/image/upload/v1/blacklist/x.jpg',
      'https://res.cloudinary.com/fourpoints/image/upload/v1/avatars/avatar_1_me.jpg',
      'https://res.cloudinary.com/fourpoints/raw/upload/v1/backoffice/invoices/pdf_1.pdf',
    ]) {
      expect(createBlacklistSchema.safeParse({ ...entry, images: [url] }).success, url).toBe(false)
      expect(updateBlacklistSchema.safeParse({ images: [url] }).success, url).toBe(false)
    }
  })
})

describe('blacklist list filters', () => {
  it('ignore created_by: the list is not filtered by who added an entry', () => {
    const parsed = blacklistFiltersSchema.parse({
      created_by: '0b6f6b1e-6c3f-4c8e-9f1a-2d3c4b5a6e7f',
      severity: 'HIGH',
    })
    expect(parsed).not.toHaveProperty('created_by')
    expect(parsed.severity).toBe('HIGH')
  })
})
