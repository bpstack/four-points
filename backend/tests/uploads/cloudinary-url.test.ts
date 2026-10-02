// tests/uploads/cloudinary-url.test.ts
// Regression tests for the backoffice PDF SSRF: stored PDF URLs came from
// the client and the server downloaded them and returned the bytes. Only
// URLs inside our own Cloudinary cloud may be fetched.

import { describe, it, expect } from 'vitest'
import { isOwnCloudinaryUrl } from '../../services/uploads/cloudinary-url.js'

const cloud = 'fourpoints'
const ok = (url: string) => isOwnCloudinaryUrl(url, cloud)

describe('isOwnCloudinaryUrl', () => {
  it('accepts PDFs and images stored in our cloud', () => {
    expect(ok(`https://res.cloudinary.com/${cloud}/raw/upload/v1727/backoffice/invoices/f.pdf`)).toBe(
      true
    )
    expect(ok(`https://res.cloudinary.com/${cloud}/image/upload/v1/backoffice/invoices/f.pdf`)).toBe(
      true
    )
  })

  it('rejects other hosts, schemes and clouds', () => {
    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'http://localhost:3000/api/users',
      `http://res.cloudinary.com/${cloud}/raw/upload/f.pdf`,
      'https://res.cloudinary.com/othercloud/raw/upload/f.pdf',
      `https://res.cloudinary.com/${cloud}evil/raw/upload/f.pdf`,
      `https://res.cloudinary.com.evil.example/${cloud}/raw/upload/f.pdf`,
      `https://evil.example/res.cloudinary.com/${cloud}/f.pdf`,
      `https://user:pass@res.cloudinary.com/${cloud}/raw/upload/f.pdf`,
      `https://res.cloudinary.com:8443/${cloud}/raw/upload/f.pdf`,
      `file:///etc/passwd`,
      'not a url',
      '',
    ]) {
      expect(ok(url), url).toBe(false)
    }
  })

  it('rejects everything when the cloud name is not configured', () => {
    expect(isOwnCloudinaryUrl(`https://res.cloudinary.com/${cloud}/raw/upload/f.pdf`, '')).toBe(
      false
    )
    expect(isOwnCloudinaryUrl(42, cloud)).toBe(false)
  })
})
