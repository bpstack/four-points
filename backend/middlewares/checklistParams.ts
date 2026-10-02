// middlewares/checklistParams.ts

import type { Router } from 'express'
import { getValidStepIds, isKnownChecklist } from '../services/checklist/checklist-content.js'

const positiveInt = /^[1-9]\d*$/

/**
 * Checks the params of every checklist route before its handler runs:
 * :id must be a checklist with a JSON definition (404 otherwise), :stepId a
 * step of that checklist, and :commentId / :attachmentId positive integers.
 */
export function validateChecklistParams(router: Router): void {
  router.param('id', (_req, res, next, id: string) => {
    if (!isKnownChecklist(id)) {
      res.status(404).json({ error: 'Checklist no encontrado' })
      return
    }
    next()
  })

  router.param('stepId', (req, res, next, stepId: string) => {
    if (!getValidStepIds(req.params.id)?.has(stepId)) {
      res.status(400).json({ error: 'Paso no válido' })
      return
    }
    next()
  })

  for (const name of ['commentId', 'attachmentId']) {
    router.param(name, (_req, res, next, value: string) => {
      if (!positiveInt.test(value)) {
        res.status(400).json({ error: 'ID inválido' })
        return
      }
      next()
    })
  }
}
