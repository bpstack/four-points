// middlewares/checklistParams.ts

import type { Router } from 'express'
import { getValidStepIds, isKnownChecklist } from '../services/checklist/checklist-content.js'
import { ERROR_CODES } from '../config/error-codes.js'

const positiveInt = /^[1-9]\d*$/

/**
 * Checks the params of every checklist route before its handler runs:
 * :id must be a checklist with a JSON definition (404 otherwise), :stepId a
 * step of that checklist, and :commentId / :attachmentId positive integers.
 */
export function validateChecklistParams(router: Router): void {
  router.param('id', (_req, res, next, id: string) => {
    if (!isKnownChecklist(id)) {
      res
        .status(404)
        .json({ error: ERROR_CODES.CHECKLIST_NOT_FOUND, code: ERROR_CODES.CHECKLIST_NOT_FOUND })
      return
    }
    next()
  })

  router.param('stepId', (req, res, next, stepId: string) => {
    if (!getValidStepIds(req.params.id)?.has(stepId)) {
      res.status(400).json({
        error: ERROR_CODES.CHECKLIST_INVALID_STEP,
        code: ERROR_CODES.CHECKLIST_INVALID_STEP,
      })
      return
    }
    next()
  })

  for (const name of ['commentId', 'attachmentId']) {
    router.param(name, (_req, res, next, value: string) => {
      if (!positiveInt.test(value)) {
        res.status(400).json({ error: ERROR_CODES.INVALID_ID, code: ERROR_CODES.INVALID_ID })
        return
      }
      next()
    })
  }
}
