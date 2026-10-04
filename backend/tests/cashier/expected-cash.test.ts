// tests/cashier/expected-cash.test.ts
// Regression test for the shift's expected cash. recalculateTotals derived
// income from the count (income = counted - fund) and then expected = fund +
// income, so the difference was always 0; it also overwrote the income the
// user had entered. A voucher is always cash taken from the drawer, and it
// stays out across shifts and days until it is justified.
// Reads the sources; no database.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const repository = read('backend', 'repositories', 'cashier', 'cashier-shift-repository.ts')
const controller = read('backend', 'controllers', 'cashier', 'cashier-shift-controller.ts')
const modal = read('frontend', 'app', 'components', 'cashier', 'CloseShiftModal.tsx')

// Body of `static async name(` up to the next static method
function method(source: string, name: string): string {
  const start = source.indexOf(`static async ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = source.indexOf('static async ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('recalculateTotals', () => {
  const body = method(repository, 'recalculateTotals')

  it('keeps the income the user entered instead of deriving it from the count', () => {
    expect(body).toContain('const income = Number(shift.income) || 0')
    expect(body).not.toMatch(/income\s*=\s*cashCounted/)
    expect(body).not.toMatch(/SET[\s\S]*\bincome = \?/)
  })

  it('expects fund + cash income - vouchers still out of the drawer', () => {
    expect(body).toContain('const vouchersTotal = await this.getOutstandingVouchersTotal(shiftId)')
    expect(body).toContain('const cashExpected = initialFund + income - vouchersTotal')
    expect(body).toContain('const difference = cashCounted - cashExpected')
  })
})

describe('getOutstandingVouchersTotal', () => {
  const body = method(repository, 'getOutstandingVouchersTotal')

  it('carries a voucher from its creation shift until the shift that justifies it', () => {
    expect(body).toContain("v.status != 'cancelled'")
    expect(body).toContain('links.first_pos <=')
    expect(body).toContain("(v.status = 'pending' OR links.last_pos >")
  })

  it('orders shifts by date and then night, morning, afternoon, closing', () => {
    expect(body).toContain("'night', 'morning', 'afternoon', 'closing'")
    expect(body).toContain('shift_date')
  })

  it('does not read a voucher type: cashier_vouchers has no such column', () => {
    expect(body).not.toMatch(/\bv\.type\b/)
  })
})

describe('when the expected cash is recomputed', () => {
  it('close recalculates before closing', () => {
    expect(method(repository, 'close')).toContain('await this.recalculateTotals(id)')
  })

  it('editing the income recalculates', () => {
    expect(method(controller, 'update')).toMatch(
      /if \(parsed\.data\.income !== undefined\) \{\s*updated = await CashierShiftRepository\.recalculateTotals/
    )
  })
})

describe('CloseShiftModal', () => {
  it('uses the backend outstanding total and the same formula', () => {
    expect(modal).toContain('const totalVouchers = Number(shift.outstanding_vouchers_total) || 0')
    expect(modal).toContain(
      'const cashExpected = parseFloat(shift.initial_fund) + parseFloat(shift.income) - totalVouchers'
    )
    expect(modal).not.toMatch(/\bv\.type\b/)
  })
})
