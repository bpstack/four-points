// tests/parking/checkout-payment.test.ts
// Regression tests for the payment of PUT /api/parking/bookings/:code/checkout:
// what was typed at check-out replaced what was already paid, and the modal
// proposes the pending amount, so a booking paid during the stay was checked
// out with 0, which became NULL: the payment was lost and the method became
// cash. Decided on 2026-11-26: what is charged at check-out adds to what was
// paid, charging nothing keeps the previous payment, and a booking without a
// price takes what is charged as its price.

import { describe, it, expect, vi, beforeEach } from 'vitest'

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

const { default: repository } = await import('../../repositories/parking/bookings.repository.js')
const { checkoutPaymentSchema } = await import('../../validations/parking/booking-validation.js')

const paidOn = new Date('2026-11-25T10:00:00Z')
const checkout = new Date('2026-11-26T12:00:00Z')

function booking(over: object) {
  return {
    id: 7,
    status: 'checked_in',
    actual_checkin: new Date('2026-11-24T12:00:00Z'),
    total_amount: '75.00',
    payment_amount: null,
    payment_method: null,
    payment_reference: null,
    payment_date: null,
    ...over,
  }
}

// The UPDATE of the check-out, as [total, paid, method, reference, date]
async function checkOut(row: object, payment: object) {
  connection.query.mockResolvedValueOnce([[row]]).mockResolvedValueOnce([{ affectedRows: 1 }])
  await repository.checkOut(7, { actual_checkout: checkout, ...payment })
  const params = connection.query.mock.calls[1][1] as unknown[]
  return params.slice(2, 7)
}

describe('checkOut payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connection.query.mockReset()
    vi.spyOn(repository, 'findById').mockResolvedValue(null)
  })

  it('charging nothing keeps a payment made during the stay', async () => {
    const paid = booking({
      payment_amount: '75.00',
      payment_method: 'card',
      payment_reference: 'TPV-1',
      payment_date: paidOn,
    })
    for (const payment of [{ payment_amount: 0 }, { payment_amount: null }, {}]) {
      connection.query.mockReset()
      expect(await checkOut(paid, { ...payment, payment_method: 'cash' })).toEqual([
        '75.00',
        '75.00',
        'card',
        'TPV-1',
        paidOn,
      ])
    }
  })

  it('what is charged at check-out adds to what was already paid', async () => {
    const [total, paid, method, reference, date] = await checkOut(
      booking({ payment_amount: '30.00', payment_method: 'card', payment_date: paidOn }),
      { payment_amount: 45, payment_method: 'cash' }
    )
    expect([total, paid, method, reference]).toEqual(['75.00', 75, 'cash', null])
    expect(date).not.toBe(paidOn)
  })

  it('a booking without a price takes what is charged as its price', async () => {
    const [total, paid] = await checkOut(booking({ total_amount: null }), {
      payment_amount: 40,
      payment_method: 'cash',
    })
    expect([total, paid]).toEqual([40, 40])

    connection.query.mockReset()
    const [totalNoCharge, paidNoCharge] = await checkOut(booking({ total_amount: null }), {})
    expect([totalNoCharge, paidNoCharge]).toEqual([null, null])
  })

  it('takes only the payment methods of the ENUM', () => {
    for (const payment_method of ['cash', 'card', 'transfer', 'agency', null]) {
      expect(checkoutPaymentSchema.safeParse({ payment_method }).success).toBe(true)
    }
    for (const body of [
      { payment_method: 'other' },
      { payment_amount: -5 },
      { payment_reference: 'x'.repeat(101) },
    ]) {
      expect(checkoutPaymentSchema.safeParse(body).success, JSON.stringify(body)).toBe(false)
    }
  })
})
