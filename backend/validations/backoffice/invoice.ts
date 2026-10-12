// validations/backoffice/invoice.ts
// Rules decided on 2026-10-11: no negative amounts, one invoice per supplier
// and number (UNIQUE uk_invoice_supplier_number, scripts/20261012_*), and a
// payment date that is a real day, not before the invoice nor in the future.

import { isCalendarDate } from '../common/calendar-date.js'

export const INVOICE_AMOUNT_FIELDS = ['amount_without_vat', 'amount_with_vat'] as const

/**
 * A number, or the numeric string the API itself returns for DECIMAL columns
 * (the edit form sends them back as they came), and not negative.
 */
export function isValidAmount(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0
  return typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())
}

/** True when every amount present in `body` is valid; absent ones are not checked. */
export function hasValidAmounts(body: Record<string, unknown>): boolean {
  return INVOICE_AMOUNT_FIELDS.every((f) => body[f] === undefined || isValidAmount(body[f]))
}

/**
 * `paidDate` (YYYY-MM-DD) is a real day between the invoice date and today,
 * both included.
 */
export function isValidPaidDate(paidDate: unknown, invoiceDate: string, today: string): boolean {
  return (
    typeof paidDate === 'string' &&
    isCalendarDate(paidDate) &&
    paidDate >= invoiceDate &&
    paidDate <= today
  )
}

/** MySQL's duplicate-key error, raised by uk_invoice_supplier_number. */
export function isDuplicateEntry(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'ER_DUP_ENTRY'
}
