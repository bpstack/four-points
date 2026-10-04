// tests/backoffice/update-columns.test.ts
// Regression tests for the backoffice SQL injection through field names:
// updateSupplier and updateInvoice interpolated every key of the request
// body into the UPDATE, so a key could inject SQL or set status, payment
// or validation columns.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSetClause } from '../../repositories/shared/update-columns.js'
import {
  SUPPLIER_UPDATE_COLUMNS,
  INVOICE_UPDATE_COLUMNS,
} from '../../repositories/backoffice/backoffice-columns.js'

const schema = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../db-mysql/aiven/16_backoffice.sql'),
  'utf8'
)

// Column names of a CREATE TABLE block in the versioned schema
function columnsOf(table: string): Set<string> {
  const start = schema.search(new RegExp(`CREATE TABLE[^(]*\\b${table}\\b\\s*\\(`))
  expect(start, table).toBeGreaterThan(-1)
  const body = schema.slice(start, schema.indexOf(';', start))
  return new Set([...body.matchAll(/^\s*`?([a-z_]+)`?\s+[A-Z]/gm)].map((m) => m[1]))
}

describe('backoffice update columns', () => {
  it('drop keys that would inject SQL', () => {
    const body = {
      notes: 'ok',
      'notes = (SELECT password FROM users LIMIT 1), notes': 'x',
      'id = 1 OR 1': 2,
    }
    expect(buildSetClause(body, INVOICE_UPDATE_COLUMNS)).toEqual({
      fields: ['notes = ?'],
      values: ['ok'],
    })
  })

  it('drop status, payment, validation and authorship columns', () => {
    const body = {
      amount_with_vat: 121,
      status: 'paid',
      paid_date: '2026-09-01',
      validated_by: 'someone',
      validated_pdf_url: 'https://evil.example/fake.pdf',
      created_by: 'someone',
    }
    expect(buildSetClause(body, INVOICE_UPDATE_COLUMNS).fields).toEqual(['amount_with_vat = ?'])
    expect(buildSetClause({ name: 'Acme', id: 99 }, SUPPLIER_UPDATE_COLUMNS).fields).toEqual([
      'name = ?',
    ])
  })

  it('only allow columns that exist in the versioned schema', () => {
    const suppliers = columnsOf('bo_suppliers')
    const invoices = columnsOf('bo_invoices')
    for (const c of SUPPLIER_UPDATE_COLUMNS) expect(suppliers.has(c), c).toBe(true)
    for (const c of INVOICE_UPDATE_COLUMNS) expect(invoices.has(c), c).toBe(true)
  })
})
