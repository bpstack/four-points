// app/components/parking/bookings/CheckInModal.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ParkingBooking } from '@/app/lib/parking/types'
import { formatDateTimeLocal } from '../helpers'
import { FiLogIn, FiX } from 'react-icons/fi'

interface CheckInModalProps {
  booking: ParkingBooking
  onClose: () => void
  onConfirm: (data: { actual_checkin?: string; notes?: string }) => Promise<void>
}

export function CheckInModal({ booking, onClose, onConfirm }: CheckInModalProps) {
  const t = useTranslations('parking')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    actual_checkin: formatDateTimeLocal(new Date(booking.schedule.expected_checkin)),
    notes: '',
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onConfirm({
        actual_checkin: data.actual_checkin || undefined,
        notes: data.notes || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
              <FiLogIn className="w-5 h-5 text-green-600" />
              {t('checkInModal.title')}
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
          {/* Info de plaza */}
          <div className="bg-surface-sunken rounded-lg p-3">
            <p className="text-sm text-fg-muted">{t('checkInModal.spot')}</p>
            <p className="text-lg font-semibold text-fg">
              {booking.spot.level} - {booking.spot.number}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              {t('checkInModal.dateTime')}
            </label>
            <input
              type="datetime-local"
              value={data.actual_checkin}
              onChange={(e) => setData({ ...data, actual_checkin: e.target.value })}
              className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-1">
              {t('checkInModal.notes')}
            </label>
            <textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder={t('checkInModal.notesPlaceholder')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-surface-sunken/30 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-fg bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            {t('checkInModal.cancel')}
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
                <FiLogIn className="w-4 h-4" />
                {t('checkInModal.confirm')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckInModal
