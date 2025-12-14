// app/dashboard/parking/status/components/modals/CheckOutModal.tsx

'use client'

import React from 'react'
import { FiAlertCircle } from 'react-icons/fi'
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
      title={isEarlyCheckout ? 'Salida Anticipada' : 'Confirmar Salida'}
      icon={<FiAlertCircle className="w-5 h-5" />}
      colorScheme="amber"
      loading={loading}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar Salida'}
          </button>
        </>
      }
    >
      {isEarlyCheckout && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-lg">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            ⚠️ La fecha de salida programada es el{' '}
            <span className="font-mono font-bold">{checkoutDate?.toLocaleDateString('es-ES')}</span>
          </p>
        </div>
      )}

      <div className="space-y-3 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-slate-800/60 dark:to-slate-900/60 p-5 rounded-xl border border-gray-100 dark:border-slate-700/50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Cliente:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {booking.vehicle?.owner || 'Sin cliente'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Vehículo:</span>
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {booking.vehicle?.plate}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Plaza:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {booking.spot?.level} · {booking.spot?.number}
          </span>
        </div>
      </div>
    </BaseModal>
  )
}
