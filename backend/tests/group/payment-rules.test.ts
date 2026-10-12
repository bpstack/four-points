// tests/group/payment-rules.test.ts
// Regression tests for the group payments logic: more paid than owed was
// accepted, a payment could be marked paid with nothing paid, recalculating
// the group total left the status behind, and percentages could add up to
// more than 100. Rules decided on 2026-10-11 (services/group/payment-rules.ts).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PaymentStatus } from '../../models/group/index.js'
import {
  checkPercentages,
  reconcilePayment,
  statusFor,
} from '../../services/group/payment-rules.js'
import { ERROR_CODES } from '../../config/error-codes.js'

vi.mock('../../repositories/group/group-payment-repository', () => ({
  GroupPaymentRepository: {
    getById: vi.fn(),
    getByGroupId: vi.fn(async () => []),
    update: vi.fn(async () => true),
    updateStatus: vi.fn(async () => true),
    create: vi.fn(async () => ({ id: 9 })),
  },
}))
vi.mock('../../repositories/group/group-repository', () => ({
  GroupRepository: { getById: vi.fn(async () => ({ id: 1, total_amount: 1000 })) },
}))
vi.mock('../../services/group/group-history-service', () => ({
  GroupHistoryService: { logChange: vi.fn(), logPaymentUpdated: vi.fn() },
}))

const { GroupPaymentController } =
  await import('../../controllers/group/group-payment-controller.js')
const { GroupPaymentRepository } = await import('../../repositories/group/group-payment-repository')

const OVERPAID = ERROR_CODES.GROUP_PAYMENT_OVERPAID
const OVER_100 = ERROR_CODES.GROUP_PAYMENT_PERCENTAGE_OVER_100

describe('payment rules', () => {
  it('the status follows the amounts and keeps "requested" until money arrives', () => {
    expect(statusFor(100, 0)).toBe(PaymentStatus.PENDING)
    expect(statusFor(100, 0, PaymentStatus.REQUESTED)).toBe(PaymentStatus.REQUESTED)
    expect(statusFor(100, 40, PaymentStatus.REQUESTED)).toBe(PaymentStatus.PARTIAL)
    expect(statusFor(100, 100)).toBe(PaymentStatus.PAID)
  })

  it('refuses more paid than owed, also when DECIMALs arrive as strings', () => {
    expect(() => reconcilePayment({ amount: 100, amountPaid: 100.01 })).toThrow(OVERPAID)
    expect(() => reconcilePayment({ amount: '100.00', amountPaid: '250.00' })).toThrow(OVERPAID)
    expect(reconcilePayment({ amount: '100.00', amountPaid: '100.00' })).toEqual({
      amount_paid: 100,
      status: PaymentStatus.PAID,
    })
  })

  it('marking it paid fills in what was paid', () => {
    expect(reconcilePayment({ amount: 300, amountPaid: 0, status: PaymentStatus.PAID })).toEqual({
      amount_paid: 300,
      status: PaymentStatus.PAID,
    })
  })

  it('percentages add up to 100 at most', () => {
    expect(() => checkPercentages([{ percentage: '60.00' }], 40)).not.toThrow()
    expect(() =>
      checkPercentages([{ percentage: 33.33 }, { percentage: 33.33 }], 33.34)
    ).not.toThrow()
    expect(() => checkPercentages([{ percentage: '60.00' }, { percentage: null }], 41)).toThrow(
      OVER_100
    )
  })

  it('the total recalculation sets the status from the new amount', () => {
    const repo = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        'repositories',
        'group',
        'group-payment-repository.ts'
      ),
      'utf8'
    )
    const recalc = repo.slice(repo.indexOf('static async recalculateAmounts'))
    expect(recalc.slice(0, 900)).toMatch(
      /SET amount = \(\? \* percentage \/ 100\),\s+[\s\S]*status = CASE/
    )
  })
})

function call(
  handler: (req: Request, res: Response) => Promise<Response>,
  params: object,
  body: object
) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  const req = { user: { id: 'u1' }, params, body } as unknown as Request
  return handler(req, res as unknown as Response).then(() => res)
}

const payment = { id: 5, group_id: 1, amount: '300.00', amount_paid: '0.00', status: 'pending' }
const params = { id: '1', paymentId: '5' }

describe('payment endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(GroupPaymentRepository.getById).mockResolvedValue(payment as never)
  })

  it('PATCH status paid stores amount_paid = amount', async () => {
    const res = await call(GroupPaymentController.updatePaymentStatus, params, { status: 'paid' })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(GroupPaymentRepository.update).toHaveBeenCalledWith(5, {
      status: 'paid',
      amount_paid: 300,
    })
  })

  it('PATCH amount-paid over the amount answers 400 and writes nothing', async () => {
    const res = await call(GroupPaymentController.updateAmountPaid, params, { amount_paid: 301 })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: OVERPAID }))
    expect(GroupPaymentRepository.update).not.toHaveBeenCalled()
  })

  it('PUT with a percentage over the group total answers 400', async () => {
    vi.mocked(GroupPaymentRepository.getByGroupId).mockResolvedValue([
      { id: 6, percentage: '70.00' },
    ] as never)
    const res = await call(GroupPaymentController.updatePayment, params, { percentage: 40 })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: OVER_100 }))
  })

  it('POST paid by hand is created with amount_paid filled in', async () => {
    const res = await call(
      GroupPaymentController.createPayment,
      { id: '1' },
      { payment_name: 'Anticipo', amount: 200, due_date: '2026-11-01', status: 'paid' }
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(GroupPaymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount_paid: 200, status: 'paid' })
    )
  })
})
