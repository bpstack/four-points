// tests/uploads/image-signature.test.ts
// Regression tests for image uploads checked by their bytes, not by the
// mimetype the client declares (blacklist and checklist).

import { describe, it, expect } from 'vitest'
import { detectImageType, isImageFile } from '../../services/uploads/image-signature.js'

const bytes = (...values: (number | string)[]) =>
  Buffer.concat(values.map((v) => (typeof v === 'string' ? Buffer.from(v, 'latin1') : Buffer.from([v]))))

describe('detectImageType', () => {
  it('recognises JPG, PNG, GIF and WebP by their first bytes', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe1))).toBe('image/jpeg')
    expect(detectImageType(bytes(0x89, 'PNG\r\n', 0x1a, '\n', 0, 0))).toBe('image/png')
    expect(detectImageType(bytes('GIF89a', 1, 0))).toBe('image/gif')
    expect(detectImageType(bytes('GIF87a'))).toBe('image/gif')
    expect(detectImageType(bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 '))).toBe('image/webp')
  })

  it('returns null for anything else', () => {
    expect(detectImageType(bytes('%PDF-1.7'))).toBeNull()
    expect(detectImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull()
    expect(detectImageType(bytes('MZ', 0x90, 0))).toBeNull()
    expect(detectImageType(bytes('RIFF', 0, 0, 0, 0, 'WAVE'))).toBeNull()
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
  })
})

describe('isImageFile', () => {
  it('accepts a real image whatever extension it was saved with', () => {
    expect(isImageFile(bytes(0x89, 'PNG\r\n', 0x1a, '\n'))).toBe(true)
  })

  it('rejects an HTML page sent as image/jpeg', () => {
    expect(isImageFile(bytes('<html><script>alert(1)</script>'))).toBe(false)
  })
})
