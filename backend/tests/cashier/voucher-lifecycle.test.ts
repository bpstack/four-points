// tests/cashier/voucher-lifecycle.test.ts
// Regression tests for the cashier vouchers and reports:
// - a cancelled voucher could be justified, a justified one cancelled and the
//   amount of either changed. Decided on 2026-10-11: justified and cancelled
//   are final, only a pending voucher changes.
// - the 5-voucher limit was checked before writing, without a lock, and the
//   voucher was created before linking it, so going over the limit left it
//   without a shift.
// - GET /daily, /shifts/:id/history and /vouchers/stats only needed a session.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(),
}

vi.mock('../../config/db.js', () => ({
  default: { getConnection: vi.fn(async () => connection), query: vi.fn() },
}))

const { CashierVoucherRepository: repo } =
  await import('../../repositories/cashier/cashier-voucher-repository.js')
const { default: db } = await import('../../config/db.js')

const voucher = (status: string) => ({ id: 4, status, amount: 20, shift_id: 1 }) as never

describe('voucher lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    connection.query.mockReset()
  })

  it.each(['justified', 'cancelled'])('a %s voucher cannot change its amount', async (status) => {
    vi.spyOn(repo, 'getById').mockResolvedValue(voucher(status))
    vi.mocked(db.query).mockResolvedValue([{ affectedRows: 0 }] as never)
    await expect(repo.update(4, { amount: 99 })).rejects.toThrow(
      'Solo se pueden modificar vales pendientes'
    )
    expect(String(vi.mocked(db.query).mock.calls[0][0])).toMatch(/status = 'pending'/)
  })

  it('a cancelled voucher cannot be justified', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue(voucher('cancelled'))
    await expect(repo.justify(4, 1)).rejects.toThrow('Solo se pueden justificar vales pendientes')
    expect(connection.query).not.toHaveBeenCalled()
  })

  it('a justified voucher cannot be cancelled', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue(voucher('justified'))
    await expect(repo.cancel(4)).rejects.toThrow('Solo se pueden cancelar vales pendientes')
    expect(db.query).not.toHaveBeenCalled()
  })

  it('a pending voucher is justified only if it is still pending when written', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue(voucher('pending'))
    connection.query.mockResolvedValueOnce([{ affectedRows: 0 }]) // changed meanwhile
    await expect(repo.justify(4, 1)).rejects.toThrow('Solo se pueden justificar vales pendientes')
    expect(connection.rollback).toHaveBeenCalledOnce()
  })
})

describe('creating a voucher in a shift', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    connection.query.mockReset()
  })

  it('locks the shift, counts inside the transaction and links the voucher', async () => {
    vi.spyOn(repo, 'getById').mockResolvedValue(voucher('pending'))
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ total: 4 }]])
      .mockResolvedValueOnce([{ insertId: 4 }])
      .mockResolvedValueOnce([{}])

    await repo.createForShift({ amount: 20, reason: 'Taxi', created_by: 'u1' } as never, 1)

    const sql = connection.query.mock.calls.map((c) => String(c[0]))
    expect(sql[0]).toMatch(/FROM cashier_shifts WHERE id = \? FOR UPDATE/)
    expect(sql[2]).toMatch(/INSERT INTO cashier_vouchers/)
    expect(sql[3]).toMatch(/INSERT INTO cashier_shift_vouchers/)
    expect(connection.commit).toHaveBeenCalledOnce()
  })

  it('refuses the sixth voucher and creates nothing', async () => {
    connection.query.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([[{ total: 5 }]])

    await expect(
      repo.createForShift({ amount: 20, reason: 'Taxi', created_by: 'u1' } as never, 1)
    ).rejects.toThrow('El turno ya tiene el máximo de 5 vales')
    expect(connection.query).toHaveBeenCalledTimes(2)
    expect(connection.rollback).toHaveBeenCalledOnce()
  })
})

describe('cashier history and totals', () => {
  it('need canViewReports', () => {
    const routes = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        'routes',
        'cashier',
        'cashier-routes.ts'
      ),
      'utf8'
    ).replace(/\s+/g, ' ')
    for (const path of ["'/daily',", "'/shifts/:id/history',", "'/vouchers/stats',"]) {
      expect(routes, path).toMatch(
        new RegExp(`router\\.get\\( ?${path} authenticateToken, canViewReports,`)
      )
    }
  })
})
