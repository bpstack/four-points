// middlewares/noStore.ts

import type { Request, Response, NextFunction } from 'express'

/**
 * Marks every API response as not cacheable. Responses carry personal and
 * financial data (blacklist, cashier, invoice PDFs), which browsers and
 * proxies must not keep on disk. A handler can still override the header.
 */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store')
  next()
}
