// middlewares/requireStorage.ts
// Goes before the upload middleware of every route that stores the file on
// Cloudinary (not F&B, which only reads its PDF). Without the three variables
// (a local install without an account) the upload would fail deep in the
// controller with a 500; this answers first, with a code the frontend
// translates.

import type { Request, Response, NextFunction } from 'express'

export const STORAGE_NOT_CONFIGURED = 'STORAGE_NOT_CONFIGURED'

export function isStorageConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
}

export function requireStorage(_req: Request, res: Response, next: NextFunction): void {
  if (!isStorageConfigured()) {
    res.status(503).json({
      error: 'El almacenamiento de archivos no está configurado (Cloudinary).',
      code: STORAGE_NOT_CONFIGURED,
    })
    return
  }
  next()
}
