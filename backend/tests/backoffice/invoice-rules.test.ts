// tests/backoffice/invoice-rules.test.ts
// Regression tests for the invoice data rules decided on 2026-10-11: a
// negative amount, a second invoice with the same supplier and number, and a
// payment date before the invoice, in the future or that does not exist were
// all saved. Pure rules plus the controller and migration sources; no database.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  hasValidAmounts,
  isDuplicateEntry,
  isValidAmount,
  isValidPaidDate,
} from '../../validations/backoffice/invoice.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const controller = read('controllers', 'backoffice', 'backoffice-controller.ts')

// Body of `static async name(` up to the next static method
function method(name: string): string {
  const start = controller.indexOf(`static async ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = controller.indexOf('static async ', start + 1)
  return controller.slice(start, next === -1 ? undefined : next)
}

describe('isValidAmount', () => {
  it('accepts zero and positive numbers, and the DECIMAL strings the API returns', () => {
    for (const v of [0, 12.5, 2680, '2680.00', '0', ' 15 ']) {
      expect(isValidAmount(v), String(v)).toBe(true)
    }
  })

  it('refuses negatives, non-numbers and empty values', () => {
    for (const v of [-0.01, -100, '-5', '1e3', 'abc', '', NaN, Infinity, null, {}, [1]]) {
      expect(isValidAmount(v), String(v)).toBe(false)
    }
  })
})

describe('hasValidAmounts', () => {
  it('checks only the amounts present, as a partial edit sends', () => {
    expect(hasValidAmounts({ notes: 'x' })).toBe(true)
    expect(hasValidAmounts({ amount_with_vat: '121.00' })).toBe(true)
    expect(hasValidAmounts({ amount_without_vat: 100, amount_with_vat: -121 })).toBe(false)
  })
})

describe('isValidPaidDate', () => {
  const invoice = '2026-09-30'
  const today = '2026-10-12'

  it('accepts the invoice day, today and any day between', () => {
    for (const d of [invoice, '2026-10-01', today]) {
      expect(isValidPaidDate(d, invoice, today)).toBe(true)
    }
  })

  it('refuses a day before the invoice, a future day and days that do not exist', () => {
    for (const d of ['2026-09-29', '2026-10-13', '2026-02-31', '30/09/2026', '', 20261001]) {
      expect(isValidPaidDate(d, invoice, today), String(d)).toBe(false)
    }
  })
})

describe('isDuplicateEntry', () => {
  it('recognises only MySQL duplicate-key errors', () => {
    expect(isDuplicateEntry({ code: 'ER_DUP_ENTRY' })).toBe(true)
    expect(isDuplicateEntry(new Error('x'))).toBe(false)
    expect(isDuplicateEntry(null)).toBe(false)
  })
})

describe('controller', () => {
  it.each(['createInvoice', 'updateInvoice'])(
    '%s refuses negative amounts (400) and duplicates (409)',
    (name) => {
      const body = method(name)
      expect(body).toMatch(/if \(!hasValidAmounts\(req\.body\)\) \{\s*respondInvalidAmount\(res\)/)
      expect(body).toMatch(/if \(isDuplicateEntry\(error\)\) \{\s*respondDuplicateInvoice\(res\)/)
    }
  )

  it('answers 400 BACKOFFICE_INVALID_AMOUNT and 409 BACKOFFICE_INVOICE_DUPLICATE', () => {
    expect(controller).toMatch(
      /function respondInvalidAmount[\s\S]*?res\.status\(400\)[\s\S]*?ERROR_CODES\.BACKOFFICE_INVALID_AMOUNT/
    )
    expect(controller).toMatch(
      /function respondDuplicateInvoice[\s\S]*?res\.status\(409\)[\s\S]*?ERROR_CODES\.BACKOFFICE_INVOICE_DUPLICATE/
    )
  })

  it('markAsPaid checks the date against the invoice and today', () => {
    const body = method('markAsPaid')
    expect(body).toContain('isValidPaidDate(')
    expect(body).toContain('getTodayMadrid()')
    expect(body).toContain('ERROR_CODES.BACKOFFICE_INVALID_PAYMENT_DATE')
  })
})

describe('migration', () => {
  it('adds the unique key on supplier and number', () => {
    const sql = read('db-mysql', 'scripts', '20261012_unique_invoice_supplier_number.sql')
    expect(sql).toContain('ADD UNIQUE KEY uk_invoice_supplier_number (supplier_id, invoice_number)')
  })
})
