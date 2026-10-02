// tests/checklist/image-upload.test.ts
// Regression tests for checklist image uploads: the 5 MB limit is enforced by
// multer while reading, not after the whole file is in memory.
// No database: real multipart requests to a real Express app with multer.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { singleImage, MAX_IMAGE_BYTES } from '../../middlewares/imageUpload.js'

let server: Server
let url: string
let lastSize: number | undefined

beforeAll(async () => {
  const app = express()
  // Same field and handler position as routes/checklist/checklist-routes.ts
  app.post('/attachments', singleImage('file'), (req, res) => {
    lastSize = req.file?.size
    res.status(201).json({ size: req.file?.size, type: req.file?.mimetype })
  })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/attachments`
})

afterAll(() => {
  server.close()
})

async function upload(bytes: number, type: string, field = 'file') {
  const form = new FormData()
  form.append(field, new Blob([new Uint8Array(bytes)], { type }), 'foto.jpg')
  const res = await fetch(url, { method: 'POST', body: form })
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

  it('answers 400 for a file in an unexpected field', async () => {
    expect((await upload(100, 'image/jpeg', 'other')).status).toBe(400)
  })
})
