// tests/uploads/image-upload.test.ts
// Regression tests for image uploads (checklist, maintenance, avatar): the size limit is enforced by
// multer while reading, not after the whole file is in memory.
// No database: real multipart requests to a real Express app with multer.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { singleImage, MAX_IMAGE_BYTES } from '../../middlewares/imageUpload.js'

let server: Server
let base: string
let lastSize: number | undefined

beforeAll(async () => {
  const app = express()
  // Same field and handler position as routes/checklist/checklist-routes.ts
  app.post('/attachments', singleImage('file'), (req, res) => {
    lastSize = req.file?.size
    res.status(201).json({ size: req.file?.size, type: req.file?.mimetype })
  })
  // Same field and limit as the avatar route in routes/auth/auth-routes.ts
  app.post('/avatar', singleImage('avatar', 2 * 1024 * 1024), (req, res) => {
    res.status(201).json({ size: req.file?.size })
  })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

const JPEG_START = [0xff, 0xd8, 0xff, 0xe0]

// A file of `bytes` bytes that starts like a JPEG unless `raw` is set
function file(bytes: number, raw = false): Uint8Array {
  const data = new Uint8Array(bytes)
  if (!raw) data.set(JPEG_START)
  return data
}

async function upload(
  bytes: number,
  type: string,
  field = 'file',
  raw = false,
  path = '/attachments'
) {
  const form = new FormData()
  form.append(field, new Blob([file(bytes, raw)], { type }), 'foto.jpg')
  const res = await fetch(`${base}${path}`, { method: 'POST', body: form })
  return { status: res.status, body: await res.json() }
}

describe('singleImage', () => {
  it('accepts an image up to 5 MB', async () => {
    expect(await upload(1024, 'image/jpeg')).toEqual({
      status: 201,
      body: { size: 1024, type: 'image/jpeg' },
    })
    expect((await upload(MAX_IMAGE_BYTES, 'image/png')).status).toBe(201)
  })

  it('answers 413 for a file over 5 MB without passing it on', async () => {
    lastSize = undefined
    expect(await upload(MAX_IMAGE_BYTES + 1, 'image/jpeg')).toEqual({
      status: 413,
      body: { error: 'Máximo 5MB por archivo' },
    })
    expect(lastSize).toBeUndefined()
  })

  it('answers 400 for a file that is not an image', async () => {
    expect(await upload(100, 'application/pdf')).toEqual({
      status: 400,
      body: { error: 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)' },
    })
  })

  it('answers 400 for a file that only claims to be an image', async () => {
    expect(await upload(1024, 'image/jpeg', 'file', true)).toEqual({
      status: 400,
      body: { error: 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)' },
    })
  })

  it('answers 400 for a file in an unexpected field', async () => {
    expect((await upload(100, 'image/jpeg', 'other')).status).toBe(400)
  })

  it('applies a smaller limit when given one (avatar, 2 MB)', async () => {
    const MB2 = 2 * 1024 * 1024
    expect((await upload(MB2, 'image/jpeg', 'avatar', false, '/avatar')).status).toBe(201)
    expect(await upload(MB2 + 1, 'image/jpeg', 'avatar', false, '/avatar')).toEqual({
      status: 413,
      body: { error: 'Máximo 2MB por archivo' },
    })
  })
})
