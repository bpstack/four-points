// app/components/parking/bookings/CheckOutModal.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ParkingBooking } from '@/app/lib/parking/types'
import { formatDateTimeLocal } from '../helpers'
import { FiLogOut, FiX, FiDollarSign } from 'react-icons/fi'

interface CheckOutModalProps {
  booking: ParkingBooking
  onClose: () => void
  onConfirm: (data: {
    actual_checkout?: string
    payment_amount?: number
    payment_method?: string
    payment_reference?: string
    notes?: string
  }) => Promise<void>
}

export function CheckOutModal({ booking, onClose, onConfirm }: CheckOutModalProps) {
  const t = useTranslations('parking')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    actual_checkout: formatDateTimeLocal(new Date()),
    payment_amount: booking.payment.pending_amount.toString(),
    payment_method: 'cash',
    payment_reference: '',
    notes: '',
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onConfirm({
        actual_checkout: data.actual_checkout || undefined,
        payment_amount: data.payment_amount ? parseFloat(data.payment_amount) : undefined,
        payment_method: data.payment_method || undefined,
        payment_reference: data.payment_reference || undefined,
        notes: data.notes || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <div>
            <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
              <FiLogOut className="w-5 h-5 text-blue-600" />
              {t('checkOutModal.title')}
            </h3>
            <p className="text-sm text-fg-subtle mt-1">{booking.booking_code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-fg-subtle hover:text-fg rounded-lg hover:bg-surface-hover"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Resumen de pago */}
          <div className="bg-info/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiDollarSign className="w-5 h-5 text-info" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {t('checkOutModal.paymentSummary')}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-info">{t('checkOutModal.totalBooking')}</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {booking.payment.total_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-info">{t('checkOutModal.alreadyPaid')}</span>
                <span className="text-blue-900 dark:text-blue-100">
                  {booking.payment.paid_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                <span className="font-medium text-info">{t('checkOutModal.pending')}</span>
                <span className="font-bold text-blue-900 dark:text-blue-100">
                  {booking.payment.pending_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              {t('checkOutModal.dateTime')}
            </label>
            <input
              type="datetime-local"
              value={data.actual_checkout}
              onChange={(e) => setData({ ...data, actual_checkout: e.target.value })}
              className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              {t('checkOutModal.amountToCharge')}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.payment_amount}
                onChange={(e) => setData({ ...data, payment_amount: e.target.value })}
                className="w-full px-3 py-2 pr-8 bg-surface text-fg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle">€</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              {t('checkOutModal.paymentMethod')}
            </label>
            <select
              value={data.payment_method}
              onChange={(e) => setData({ ...data, payment_method: e.target.value })}
              className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="cash">{t('paymentMethods.cash')}</option>
              <option value="card">{t('paymentMethods.card')}</option>
              <option value="transfer">{t('paymentMethods.transfer')}</option>
              <option value="other">{t('paymentMethods.other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              {t('checkOutModal.reference')}
            </label>
            <input
              type="text"
              value={data.payment_reference}
              onChange={(e) => setData({ ...data, payment_reference: e.target.value })}
              className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder={t('checkOutModal.referencePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              {t('checkOutModal.notes')}
            </label>
            <textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              placeholder={t('checkOutModal.notesPlaceholder')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-surface-sunken/30 rounded-b-lg sticky bottom-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-fg bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            {t('checkOutModal.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiLogOut className="w-4 h-4" />
                {t('checkOutModal.confirm')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckOutModal
