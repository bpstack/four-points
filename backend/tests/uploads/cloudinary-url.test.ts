// tests/uploads/cloudinary-url.test.ts
// Regression tests for the backoffice PDF SSRF: stored PDF URLs came from
// the client and the server downloaded them and returned the bytes. Only
// URLs inside our own Cloudinary cloud may be fetched.

import { describe, it, expect } from 'vitest'
import {
  safePublicName,
  isOwnCloudinaryUrl,
  isPublicIdInFolder,
  CLOUDINARY_FOLDERS,
} from '../../services/uploads/cloudinary-url.js'

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

// Regression tests for arbitrary deletes in Cloudinary: public ids came from
// the client (blacklist DELETE /upload/:publicId, invoice bodies) and were
// destroyed without checking which module they belong to.
describe('isPublicIdInFolder', () => {
  it('accepts ids stored before names were sanitised', () => {
    expect(
      isPublicIdInFolder('blacklist/blacklist_1727_Foto señor 2', CLOUDINARY_FOLDERS.blacklist)
    ).toBe(true)
  })

  it('accepts ids the modules really create', () => {
    expect(
      isPublicIdInFolder('blacklist/blacklist_1727000000000_foto', CLOUDINARY_FOLDERS.blacklist)
    ).toBe(true)
    expect(
      isPublicIdInFolder(
        'backoffice/invoices/pdf_1727000000000_factura_123',
        CLOUDINARY_FOLDERS.invoices
      )
    ).toBe(true)
  })

  it("rejects other modules' files and malformed ids", () => {
    for (const id of [
      'avatars/avatar_1727_me',
      'maintenance/maintenance_1727_grifo',
      'backoffice/invoices/pdf_1',
      'backoffice/assets/sello',
      'blacklistx/foto',
      'blacklist',
      'blacklist/',
      'blacklist//foto',
      'blacklist/../avatars/me',
      '',
    ]) {
      expect(isPublicIdInFolder(id, CLOUDINARY_FOLDERS.blacklist), id).toBe(false)
    }
    expect(isPublicIdInFolder('backoffice/assets/sello', CLOUDINARY_FOLDERS.invoices)).toBe(false)
    expect(isPublicIdInFolder(null, CLOUDINARY_FOLDERS.invoices)).toBe(false)
  })
})

describe('safePublicName', () => {
  it('keeps a plain name and drops the extension', () => {
    expect(safePublicName('grifo-baño_204.jpg')).toBe('grifo-ba_o_204')
  })

  it('removes slashes, spaces and anything else from the id', () => {
    expect(safePublicName('../../avatars/admin.png')).toBe('______avatars_admin')
    expect(safePublicName('IMG 2024 (1).jpeg')).toBe('IMG_2024__1_')
    expect(safePublicName('a'.repeat(80) + '.jpg')).toHaveLength(50)
  })

  it('never returns an empty name', () => {
    expect(safePublicName('.jpg')).toBe('file')
  })
})
