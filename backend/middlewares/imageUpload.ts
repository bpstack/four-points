// middlewares/imageUpload.ts

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import multer from 'multer'
import { isImageFile } from '../services/uploads/image-signature.js'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

class NotAnImageError extends Error {}

const upload = multer({
  storage: multer.memoryStorage(),
  // Multer stops reading at the limit, so an oversized upload never sits
  // whole in memory (the plan on Render has little of it). It rejects a file
  // whose size reaches fileSize, hence the +1: exactly 5 MB stays valid, as
  // the controller check always allowed
  limits: { fileSize: MAX_IMAGE_BYTES + 1, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new NotAnImageError())
  },
})

/**
 * Accepts one image in `field`, at most 5 MB: an oversized file answers 413
 * and anything else that is not one JPG, PNG, WebP or GIF (by its bytes, not
 * only its declared type) answers 400.
 */
export function singleImage(field: string): RequestHandler {
  const handler = upload.single(field)
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err?: unknown) => {
      if (err instanceof NotAnImageError) {
        res.status(400).json({ error: 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)' })
        return
      }
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: 'Máximo 5MB por archivo' })
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
