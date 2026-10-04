// tests/uploads/private-files.test.ts
// Uploaded files are private (`authenticated` on Cloudinary). Their stored
// secure_url is signed and works for anyone forever, so no API response may
// carry it: responses carry the API path that serves the file.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Response } from 'express'
import { fetchStoredFile, sendPrivateFile } from '../../services/uploads/private-files.js'
import {
  presentAsset,
  presentInvoice,
} from '../../controllers/backoffice/backoffice-files.js'
import type { Asset, InvoiceWithDetails } from '../../models/backoffice/index.js'

const SIGNED = 'https://res.cloudinary.com/fourpoints/raw/authenticated/s--abc--/v1/backoffice/x'

describe('backoffice responses', () => {
  it('invoices carry the pdf-download path, not the stored URL or public id', () => {
    const invoice = {
      id: 12,
      original_pdf_url: SIGNED,
      original_pdf_public_id: 'backoffice/invoices/pdf_1',
      validated_pdf_url: null,
      validated_pdf_public_id: null,
    } as unknown as InvoiceWithDetails
    const out = presentInvoice(invoice) as Record<string, unknown>
    expect(out.original_pdf_url).toBe('/api/backoffice/invoices/12/pdf-download?type=original')
    expect(out.validated_pdf_url).toBeNull()
    expect(out).not.toHaveProperty('original_pdf_public_id')
    expect(JSON.stringify(out)).not.toContain('cloudinary')
  })

  it('assets carry their file path', () => {
    const asset = {
      id: 5,
      cloudinary_url: SIGNED,
      cloudinary_public_id: 'backoffice/assets/stamps/s',
    } as unknown as Asset
    const out = presentAsset(asset) as Record<string, unknown>
    expect(out.cloudinary_url).toBe('/api/backoffice/assets/5/file')
    expect(out).not.toHaveProperty('cloudinary_public_id')
  })
})

describe('maintenance responses', () => {
  it('images carry the API path, and the public id stays on the server', () => {
    const repo = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        'repositories',
        'maintenance',
        'maintenance-repository.ts'
      ),
      'utf8'
    )
    const parse = repo.slice(repo.indexOf('function parseImageRow'))
    expect(parse).toContain('file_path: `/api/maintenance/${row.report_id}/images/${row.id}/file`')
    expect(parse).toContain('public_id: null')
  })
})

describe('sendPrivateFile', () => {
  it('lets the frontend, another origin of the same site, show the file in <img>', () => {
    const headers: Record<string, unknown> = {}
    const res = {
      setHeader: (key: string, value: unknown) => {
        headers[key] = value
      },
      send: () => undefined,
    } as unknown as Response
    sendPrivateFile(res, { buffer: Buffer.from('x'), contentType: 'image/png' })
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-site')
    expect(headers['Cache-Control']).toBe('private, max-age=300')
  })
})

describe('fetchStoredFile', () => {
  it('refuses a URL outside our Cloudinary cloud before any request', async () => {
    await expect(fetchStoredFile('https://evil.example/x.pdf')).rejects.toThrow(
      'outside our Cloudinary cloud'
    )
  })
})
