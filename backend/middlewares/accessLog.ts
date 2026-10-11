// middlewares/accessLog.ts
// Authorization decisions leave a trace in the log (ASVS 7.2): every 403 the
// API answers, and every time an admin reads or deletes messages of a
// conversation they are not in.

import type { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger.js'

// Goes before the routes: logs the 403 whichever middleware or handler sends it
export function logAccessDenied(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    if (res.statusCode !== 403) return
    logger.warn(
      {
        event: 'access_denied',
        userId: req.user?.id ?? null,
        role: req.user?.role ?? null,
        method: req.method,
        // Without the query string, which may carry search terms
        path: req.originalUrl.split('?')[0],
      },
      '[SECURITY] access denied'
    )
  })
  next()
}

// An admin acting where only participants or owners can
export function logAdminOverride(
  req: Request,
  action: string,
  target: Record<string, unknown>
): void {
  logger.info(
    { event: 'admin_override', userId: req.user?.id ?? null, action, ...target },
    '[SECURITY] admin access to conversations of others'
  )
}
