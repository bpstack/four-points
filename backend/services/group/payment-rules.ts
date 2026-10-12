// services/group/payment-rules.ts
// Coherence rules for a group payment, decided on 2026-10-11: what was paid
// never exceeds what is owed, marking a payment paid by hand fills in what was
// paid, the status follows the amounts, and the percentages of a group's
// payments add up to 100 at most. DECIMAL columns arrive as strings, hence
// the Number() calls.

import { PaymentStatus } from '../../models/group/index.js'
import { ERROR_CODES } from '../../config/error-codes.js'

/** A rule the payment breaks; `code` is the ERROR_CODES entry to answer with */
export class PaymentRuleError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

/** Status that follows from what is owed and what was paid; "requested" stays until money arrives */
export function statusFor(
  amount: number,
  amountPaid: number,
  current?: PaymentStatus
): PaymentStatus {
  if (amount > 0 && amountPaid >= amount) return PaymentStatus.PAID
  if (amountPaid > 0) return PaymentStatus.PARTIAL
  return current === PaymentStatus.REQUESTED ? PaymentStatus.REQUESTED : PaymentStatus.PENDING
}

/**
 * amount_paid and status to store after a change. An explicit status is kept,
 * except that "paid" fills amount_paid with the amount; without one, the
 * status follows the amounts.
 */
export function reconcilePayment(input: {
  amount: number | string
  amountPaid: number | string
  status?: PaymentStatus
  current?: PaymentStatus
}): { amount_paid: number; status: PaymentStatus } {
  const amount = Number(input.amount)
  const given = Number(input.amountPaid)
  if (given > amount) throw new PaymentRuleError(ERROR_CODES.GROUP_PAYMENT_OVERPAID)

  const amountPaid = input.status === PaymentStatus.PAID ? amount : given
  return {
    amount_paid: amountPaid,
    status: input.status ?? statusFor(amount, amountPaid, input.current),
  }
}

/** Throws when the group's percentages would add up to more than 100 */
export function checkPercentages(
  others: ReadonlyArray<{ percentage: number | string | null }>,
  next: number | null | undefined
): void {
  const total = others.reduce((sum, p) => sum + Number(p.percentage ?? 0), Number(next ?? 0))
  // Two decimals in the column: allow the rounding of thirds and the like
  if (total > 100.001) throw new PaymentRuleError(ERROR_CODES.GROUP_PAYMENT_PERCENTAGE_OVER_100)
}
