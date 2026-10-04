// services/uploads/private-files.ts
// Files on Cloudinary are private (`authenticated`, see cloudinary-service.ts):
// the stored secure_url carries a signature that works for anyone, forever,
// so it never leaves the server. The API answers with its own path for each
// file, and the endpoint behind that path checks the session and the module
// role, downloads the stored URL and returns the bytes.

import axios from 'axios'
import type { Response } from 'express'
import { isOwnCloudinaryUrl } from './cloudinary-url.js'

export interface FetchedFile {
  buffer: Buffer
  contentType: string
}

/**
 * Downloads a stored Cloudinary URL. Throws if the URL is not in our cloud
 * (SSRF) or Cloudinary does not answer 2xx. No redirects are followed.
 */
export async function fetchStoredFile(storedUrl: string): Promise<FetchedFile> {
  if (!isOwnCloudinaryUrl(storedUrl)) {
    throw new Error('Stored file URL outside our Cloudinary cloud')
  }
  const response = await axios.get<ArrayBuffer>(storedUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxRedirects: 0,
  })
  const contentType = String(response.headers['content-type'] || 'application/octet-stream')
  return { buffer: Buffer.from(response.data), contentType }
}

/**
 * Sends a private file: never cached by shared caches, never sniffed, and
 * shown inline (or downloaded with `filename` when given).
 */
export function sendPrivateFile(
  res: Response,
  file: FetchedFile,
  options: { contentType?: string; filename?: string } = {}
): void {
  res.setHeader('Content-Type', options.contentType || file.contentType)
  res.setHeader('Content-Length', file.buffer.length)
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (options.filename) {
    const safe = options.filename.replace(/[^\w.-]/g, '_')
    res.setHeader('Content-Disposition', `inline; filename="${safe}"`)
  }
  res.send(file.buffer)
}
