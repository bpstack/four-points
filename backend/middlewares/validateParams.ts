// middlewares/validateParams.ts

import type { Router } from 'express'
import type { ZodType } from 'zod'

export type ParamRule = readonly [name: string, schema: ZodType, code: string]

/**
 * Registers a router.param handler per rule: an invalid value answers 400
 * before any route handler (and the database) sees it.
 */
export function validateParams(router: Router, rules: readonly ParamRule[]): void {
  for (const [name, schema, code] of rules) {
    router.param(name, (_req, res, next, value) => {
      if (!schema.safeParse(value).success) {
        res.status(400).json({ success: false, error: code, code })
        return
      }
      next()
    })
  }
}
