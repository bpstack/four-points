// app/dashboard/parking/status/components/modals/CheckOutModal.tsx

'use client'

import React from 'react'
import { FiAlertCircle } from 'react-icons/fi'
import { useTranslations, useLocale } from 'next-intl'
import BaseModal from './BaseModal'
import type { ParkingBooking } from '@/app/lib/parking/types'

interface CheckOutModalProps {
  booking: ParkingBooking | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  loading: boolean
}

export default function CheckOutModal({
  booking,
  isOpen,
  onClose,
  onConfirm,
  loading,
}: CheckOutModalProps) {
  const t = useTranslations('parking.statusModals')
  const locale = useLocale()

  if (!booking) return null

  const checkoutDate = booking.schedule?.expected_checkout
    ? new Date(booking.schedule.expected_checkout)
    : null
  const today = new Date()
  const isEarlyCheckout = checkoutDate && checkoutDate > today

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEarlyCheckout ? t('earlyCheckout') : t('confirmExit')}
      icon={<FiAlertCircle className="w-5 h-5" />}
      colorScheme="amber"
      loading={loading}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-fg hover:bg-surface-hover rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? t('processing') : t('confirmExit')}
          </button>
        </>
      }
    >
      {isEarlyCheckout && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-lg">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            ⚠️{' '}
            {t('scheduledExitDate', {
              date: checkoutDate?.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US'),
            })}
          </p>
        </div>
      )}

      <div className="space-y-3 bg-surface-sunken p-5 rounded-xl border border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-fg-muted font-medium">{t('client')}:</span>
          <span className="font-semibold text-fg">{booking.vehicle?.owner || t('noClient')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-fg-muted font-medium">{t('vehicle')}:</span>
          <span className="font-mono font-semibold text-fg">{booking.vehicle?.plate}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-fg-muted font-medium">{t('spot')}:</span>
          <span className="font-semibold text-fg">
            {booking.spot?.level} · {booking.spot?.number}
          </span>
        </div>
      </div>
    </BaseModal>
  )
}
