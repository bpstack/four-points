// middlewares/imageUpload.ts

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import multer from 'multer'
import { isImageFile } from '../services/uploads/image-signature.js'

const MB = 1024 * 1024
export const MAX_IMAGE_BYTES = 5 * MB
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

class NotAnImageError extends Error {}

/**
 * Accepts one image in `field`, at most `maxBytes` (5 MB by default): an
 * oversized file answers 413 and anything else that is not one JPG, PNG,
 * WebP or GIF (by its bytes, not only its declared type) answers 400.
 */
export function singleImage(field: string, maxBytes: number = MAX_IMAGE_BYTES): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    // Multer stops reading at the limit, so an oversized upload never sits
    // whole in memory (the plan on Render has little of it). It rejects a
    // file whose size reaches fileSize, hence the +1: exactly maxBytes stays
    // valid, as the controller checks always allowed
    limits: { fileSize: maxBytes + 1, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_MIME_TYPES.includes(file.mimetype)) cb(null, true)
      else cb(new NotAnImageError())
    },
  })
  const handler = upload.single(field)
  const tooLarge = `Máximo ${Math.round((maxBytes / MB) * 10) / 10}MB por archivo`

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err?: unknown) => {
      if (err instanceof NotAnImageError) {
        res.status(400).json({ error: 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)' })
        return
      }
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: tooLarge })
        } else {
          res.status(400).json({ error: 'Solo se admite un archivo de imagen' })
        }
        return
      }
      if (!err && req.file && !isImageFile(req.file.buffer)) {
        res.status(400).json({ error: 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)' })
        return
      }
      next(err)
    })
  }
}
