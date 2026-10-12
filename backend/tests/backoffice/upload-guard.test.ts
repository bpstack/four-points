// tests/backoffice/upload-guard.test.ts
// Regression tests for the backoffice uploads: the invoice PDF and the stamp or
// signature image were accepted by their declared type alone (any file sent
// as application/pdf went to Cloudinary), and a PDF over 10 MB answered 500
// because the multer error reached the global handler.
// No database: real multipart requests to a real Express app with multer.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  MAX_BACKOFFICE_FILE_BYTES,
  singleAssetImage,
  singleInvoicePdf,
} from '../../middlewares/backofficeUpload.js'

let server: Server
let base: string

beforeAll(async () => {
  const app = express()
  // Same fields as routes/backoffice/backoffice-routes.ts
  app.post('/pdf', singleInvoicePdf('pdf'), (req, res) => {
    res.status(201).json({ size: req.file?.size })
  })
  app.post('/assets', singleAssetImage('image'), (req, res) => {
    res.status(201).json({ size: req.file?.size })
  })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

const PDF_START = Buffer.from('%PDF-1.7\n')
const PNG_START = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP_START = Buffer.from('RIFF\0\0\0\0WEBP')
const JPEG_START = Buffer.from([0xff, 0xd8, 0xff, 0xe0])

// A file of `bytes` bytes that starts with `start`
function file(bytes: number, start: Buffer = Buffer.alloc(0)): Uint8Array {
  const data = new Uint8Array(bytes)
  data.set(start)
  return data
}

async function upload(path: string, field: string, data: Uint8Array, type: string) {
  const form = new FormData()
  form.append(field, new Blob([data], { type }), 'fichero')
  const res = await fetch(`${base}${path}`, { method: 'POST', body: form })
  return { status: res.status, body: await res.json() }
}

describe('singleInvoicePdf', () => {
  it('accepts a PDF up to 10 MB', async () => {
    const res = await upload(
      '/pdf',
      'pdf',
      file(MAX_BACKOFFICE_FILE_BYTES, PDF_START),
      'application/pdf'
    )
    expect(res).toEqual({ status: 201, body: { size: MAX_BACKOFFICE_FILE_BYTES } })
  })

  it('refuses a file declared as PDF whose bytes are not a PDF', async () => {
    const res = await upload('/pdf', 'pdf', file(1024, Buffer.from('MZ')), 'application/pdf')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BACKOFFICE_PDF_ONLY')
  })

  it('refuses a real PDF declared with another type', async () => {
    const res = await upload('/pdf', 'pdf', file(1024, PDF_START), 'text/html')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BACKOFFICE_PDF_ONLY')
  })

  it('answers 413, not 500, over 10 MB', async () => {
    const res = await upload(
      '/pdf',
      'pdf',
      file(MAX_BACKOFFICE_FILE_BYTES + 1, PDF_START),
      'application/pdf'
    )
    expect(res.status).toBe(413)
    expect(res.body.code).toBe('BACKOFFICE_FILE_TOO_LARGE')
  })

  it('leaves a request without a file to the controller', async () => {
    const res = await fetch(`${base}/pdf`, { method: 'POST', body: new FormData() })
    expect(res.status).toBe(201)
  })
})

describe('singleAssetImage', () => {
  it.each([
    ['PNG', PNG_START, 'image/png'],
    ['WebP', WEBP_START, 'image/webp'],
  ])('accepts a %s', async (_name, start, type) => {
    expect((await upload('/assets', 'image', file(2048, start), type)).status).toBe(201)
  })

  it('refuses a JPEG renamed as PNG: the stamp needs transparency', async () => {
    const res = await upload('/assets', 'image', file(2048, JPEG_START), 'image/png')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BACKOFFICE_INVALID_IMAGE_TYPE')
  })

  it('refuses anything else declared as PNG', async () => {
    const res = await upload('/assets', 'image', file(2048, PDF_START), 'image/png')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BACKOFFICE_INVALID_IMAGE_TYPE')
  })

  it('answers 413 over 10 MB', async () => {
    const res = await upload(
      '/assets',
      'image',
      file(MAX_BACKOFFICE_FILE_BYTES + 1, PNG_START),
      'image/png'
    )
    expect(res.status).toBe(413)
    expect(res.body.code).toBe('BACKOFFICE_FILE_TOO_LARGE')
  })
})

describe('routes', () => {
  const routes = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'routes',
      'backoffice',
      'backoffice-routes.ts'
    ),
    'utf8'
  )

  it('use the guarded uploads, not a bare multer', () => {
    expect(routes).toContain("singleInvoicePdf('pdf')")
    expect(routes).toContain("singleAssetImage('image')")
    expect(routes).not.toContain('multer')
  })
})
