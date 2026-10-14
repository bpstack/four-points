// tests/backoffice/batch-payment-transaction.test.ts
// Regression tests: the batch payment marked invoices paid and then wrote their
// history one by one outside any transaction, so a failure halfway left paid
// invoices without history. Both now commit or roll back together, and the
// UPDATE pays exactly the invoices the locked SELECT found.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
}

vi.mock('../../config/db.js', () => ({
  default: {
    getConnection: vi.fn(async () => connection),
    query: vi.fn(),
    execute: vi.fn(),
  },
}))

const { BackofficeRepository } =
  await import('../../repositories/backoffice/backoffice-repository.js')
const { default: db } = await import('../../config/db.js')

describe('markValidatedInvoicesAsPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM bo_invoices')) return [[{ id: 7 }, { id: 9 }]]
      if (sql.includes('UPDATE bo_invoices')) return [{ affectedRows: 2 }]
      return [{ insertId: 1 }]
    })
  })

  it('pays the locked invoices and writes their history in one transaction', async () => {
    const result = await BackofficeRepository.markValidatedInvoicesAsPaid(2026, 9, 'system-cron')

    expect(result).toEqual({ count: 2, invoiceIds: [7, 9] })
    expect(connection.beginTransaction).toHaveBeenCalledOnce()
    expect(connection.commit).toHaveBeenCalledOnce()
    expect(db.query).not.toHaveBeenCalled()

    const [select, update, ...history] = connection.query.mock.calls
    expect(select[0]).toMatch(/FOR UPDATE/)
    expect(select[1]).toEqual([2026, 9])
    expect(update[0]).toMatch(/WHERE id IN \(\?\)/)
    expect(update[1]).toEqual(['system-cron', [7, 9]])
    expect(history).toHaveLength(2)
    expect(history.map((call) => call[1][0])).toEqual([7, 9])
  })

  it('rolls everything back when a history row fails', async () => {
    connection.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM bo_invoices')) return [[{ id: 7 }, { id: 9 }]]
      if (sql.includes('UPDATE bo_invoices')) return [{ affectedRows: 2 }]
      throw new Error('foreign key')
    })

    await expect(
      BackofficeRepository.markValidatedInvoicesAsPaid(2026, 9, 'system-cron')
    ).rejects.toThrow('foreign key')
    expect(connection.rollback).toHaveBeenCalledOnce()
    expect(connection.commit).not.toHaveBeenCalled()
  })

  it('opens no write when there is nothing to pay', async () => {
    connection.query.mockResolvedValueOnce([[]])
    const result = await BackofficeRepository.markValidatedInvoicesAsPaid(2026, 9, 'system-cron')
    expect(result).toEqual({ count: 0, invoiceIds: [] })
    expect(connection.query).toHaveBeenCalledOnce()
    expect(connection.commit).toHaveBeenCalledOnce()
  })
})
