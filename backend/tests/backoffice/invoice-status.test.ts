// tests/backoffice/invoice-status.test.ts
// Regression tests for the invoice status rules: validate, reject and pay
// updated the row whatever its status (a paid invoice could be rejected, a
// pending one paid) and the history always recorded a fixed previous status.
// Each action now updates only from the status it starts from, so the
// history is true, and a refused action answers 409 instead of 404.
// Reads the sources; no database.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const repository = read('repositories', 'backoffice', 'backoffice-repository.ts')
const controller = read('controllers', 'backoffice', 'backoffice-controller.ts')
const routes = read('routes', 'backoffice', 'backoffice-routes.ts')

// Body of `static async name(` up to the next static method
function method(source: string, name: string): string {
  const start = source.indexOf(`static async ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = source.indexOf('static async ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('each invoice action starts from one status', () => {
  it.each([
    ['updateInvoice', 'pending'],
    ['validateInvoice', 'pending'],
    ['rejectInvoice', 'pending'],
    ['unvalidateInvoice', 'validated'],
    ['markAsPaid', 'validated'],
    ['revertPayment', 'paid'],
    ['updateInvoicePdf', 'pending'],
  ])('%s updates only a %s invoice', (name, status) => {
    expect(method(repository, name)).toContain(`WHERE id = ? AND status = '${status}'`)
  })

  it('revertPayment clears the payment date and records paid -> validated', () => {
    const body = method(repository, 'revertPayment')
    expect(body).toContain("status = 'validated'")
    expect(body).toContain('paid_date = NULL')
    expect(body).toMatch(/'status',\s*'paid',\s*'validated'/)
  })
})

describe('controller', () => {
  it.each(['updateInvoice', 'validateInvoice', 'rejectInvoice', 'markAsPaid', 'revertPayment'])(
    '%s tells a missing invoice (404) from a wrong status (409)',
    (name) => {
      expect(method(controller, name)).toContain('await respondActionNotApplied(res, Number(id))')
    }
  )

  it('respondActionNotApplied answers 409 with BACKOFFICE_INVALID_STATUS', () => {
    expect(controller).toMatch(
      /res\.status\(409\)\.json\(\{\s*success: false,\s*error: ERROR_CODES\.BACKOFFICE_INVALID_STATUS/
    )
  })

  it('uploadInvoicePdf refuses a non-pending invoice before uploading to Cloudinary', () => {
    const body = method(controller, 'uploadInvoicePdf')
    const check = body.indexOf("invoice.status !== 'pending'")
    expect(check).toBeGreaterThan(-1)
    expect(check).toBeLessThan(body.indexOf('CloudinaryService.uploadPdf'))
  })

  it('unpay is admin only', () => {
    expect(routes).toContain(
      "router.post('/invoices/:id/unpay', isAdmin, BackofficeController.revertPayment)"
    )
  })
})
