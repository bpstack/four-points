// middlewares/backofficeUpload.ts

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import multer from 'multer'
import { ERROR_CODES } from '../config/error-codes.js'
import { isPdfBuffer } from '../services/uploads/pdf-signature.js'
import { detectImageType } from '../services/uploads/image-signature.js'

export const MAX_BACKOFFICE_FILE_BYTES = 10 * 1024 * 1024

// Stamps and signatures are laid over the invoice PDF: only formats with
// transparency
const ASSET_IMAGE_TYPES = ['image/png', 'image/webp']

/**
 * One file in `field`, at most 10 MB: an oversized file answers 413 and one
 * whose declared type or bytes `accepts` refuses answers 400 with `wrongType`.
 * A request without a file goes on to the controller, which answers it.
 */
function singleFile(
  field: string,
  accepts: (file: Express.Multer.File) => boolean,
  wrongType: string
): RequestHandler {
  // Multer stops reading at the limit and rejects a file whose size reaches
  // fileSize, hence the +1: exactly 10 MB stays valid
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BACKOFFICE_FILE_BYTES + 1, files: 1 },
  }).single(field)

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err?: unknown) => {
      const fail = (status: number, code: string) => {
        res.status(status).json({ success: false, error: code, code })
      }
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') fail(413, ERROR_CODES.BACKOFFICE_FILE_TOO_LARGE)
        else fail(400, wrongType)
        return
      }
      if (!err && req.file && !accepts(req.file)) {
        fail(400, wrongType)
        return
      }
      next(err)
    })
  }
}

/** The invoice PDF: declared as PDF and starting like one. */
export function singleInvoicePdf(field: string): RequestHandler {
  return singleFile(
    field,
    (file) => file.mimetype === 'application/pdf' && isPdfBuffer(file.buffer),
    ERROR_CODES.BACKOFFICE_PDF_ONLY
  )
}

/** A stamp or signature: a PNG or WebP by its declared type and its bytes. */
export function singleAssetImage(field: string): RequestHandler {
  return singleFile(
    field,
    (file) =>
      ASSET_IMAGE_TYPES.includes(file.mimetype) &&
      ASSET_IMAGE_TYPES.includes(detectImageType(file.buffer) ?? ''),
    ERROR_CODES.BACKOFFICE_INVALID_IMAGE_TYPE
  )
}
