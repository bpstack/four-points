// app/dashboard/parking/status/components/modals/CancelModal.tsx

'use client'

import React from 'react'
import { FiXCircle } from 'react-icons/fi'
import { useTranslations } from 'next-intl'
import BaseModal from './BaseModal'
import type { ParkingBooking } from '@/app/lib/parking/types'

interface CancelModalProps {
  booking: ParkingBooking | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  loading: boolean
}

export default function CancelModal({
  booking,
  isOpen,
  onClose,
  onConfirm,
  loading,
}: CancelModalProps) {
  const t = useTranslations('parking.statusModals')

  if (!booking) return null

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('cancelBooking')}
      icon={<FiXCircle className="w-5 h-5" />}
      colorScheme="rose"
      loading={loading}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-fg hover:bg-surface-hover rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {t('noKeep')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 rounded-lg transition-all duration-200 shadow-lg shadow-rose-500/20 disabled:opacity-50"
          >
            {loading ? t('canceling') : t('yesCancel')}
          </button>
        </>
      }
    >
      <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-lg">
        <p className="text-sm font-medium text-rose-900 dark:text-rose-200">⚠️ {t('cannotUndo')}</p>
      </div>

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
