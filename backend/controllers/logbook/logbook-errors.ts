// controllers/logbook/logbook-errors.ts

import type { Response } from 'express'
import { ERROR_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

// Errors services/logbook/logbookHistory-service.ts throws on purpose, with
// the status and code they deserve
export const LOGBOOK_DOMAIN_ERRORS: Record<string, { status: number; code: string }> = {
  'Logbook no encontrado': { status: 404, code: ERROR_CODES.LOGBOOK_NOT_FOUND },
  'Solo el autor puede actualizar este logbook': {
    status: 403,
    code: ERROR_CODES.LOGBOOK_ONLY_AUTHOR_UPDATE,
  },
}

/** Known domain errors answer 403/404; anything else is a generic 500 with `fallbackCode`. */
export function sendLogbookError(res: Response, error: unknown, fallbackCode: string): void {
  const known = LOGBOOK_DOMAIN_ERRORS[error instanceof Error ? error.message : '']
  if (known) {
    res.status(known.status).json({ success: false, error: known.code, code: known.code })
    return
  }
  logger.error({ err: error }, fallbackCode)
  res.status(500).json({ success: false, error: fallbackCode, code: fallbackCode })
}
