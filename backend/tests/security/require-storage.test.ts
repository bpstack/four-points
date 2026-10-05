// tests/security/require-storage.test.ts
// An upload to a route that stores on Cloudinary, on an install without the
// Cloudinary variables: it must get a 503 with a code, before the upload runs.
// A real Express server and a real multipart request.

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { requireStorage } from '../../middlewares/requireStorage.js'

const VARS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const
const saved = Object.fromEntries(VARS.map((k) => [k, process.env[k]]))

let server: Server
let base: string
let ran = 0

beforeAll(async () => {
  const app = express()
  app.post('/upload', requireStorage, (_req, res) => {
    ran++
    res.json({ ok: true })
  })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise((resolve) => server.close(resolve)))

afterEach(() => {
  for (const k of VARS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

async function upload() {
  const before = ran
  const form = new FormData()
  form.append(
    'image',
    new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }),
    'a.jpg'
  )
  const res = await fetch(`${base}/upload`, { method: 'POST', body: form })
  return { status: res.status, body: await res.json(), ran: ran > before }
}

describe('an upload that stores on Cloudinary', () => {
  it('without the variables answers 503 STORAGE_NOT_CONFIGURED and never runs the upload', async () => {
    for (const k of VARS) delete process.env[k]
    const r = await upload()
    expect(r.status).toBe(503)
    expect(r.body.code).toBe('STORAGE_NOT_CONFIGURED')
    expect(r.ran).toBe(false)
  })

  it('with only some of the variables is still refused', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud'
    process.env.CLOUDINARY_API_KEY = 'key'
    delete process.env.CLOUDINARY_API_SECRET
    expect((await upload()).status).toBe(503)
  })

  it('with all three reaches the upload', async () => {
    for (const k of VARS) process.env[k] = 'x'
    const r = await upload()
    expect(r.status).toBe(200)
    expect(r.ran).toBe(true)
  })
})
