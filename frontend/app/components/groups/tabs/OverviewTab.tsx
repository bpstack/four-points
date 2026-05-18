// app/components/groups/tabs/OverviewTab.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useGroupStore } from '@/app/stores/useGroupStore'
import { formatCurrency, formatDate } from '@/app/lib/helpers/utils'
import { FiFileText, FiCheckCircle, FiClock, FiDollarSign, FiBell, FiEdit } from 'react-icons/fi'
import { NotificationModal } from '../modal/NotificationModal'

export function OverviewTab() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentGroup, payments, refreshPayments } = useGroupStore()
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const t = useTranslations('groups')

  const [balanceStatus, setBalanceStatus] = useState({
    isPaid: false,
    totalPaid: 0,
    totalExpected: 0,
    remaining: 0,
  })

  // Cargar pagos al montar
  useEffect(() => {
    if (currentGroup) {
      refreshPayments(currentGroup.id)
    }
  }, [currentGroup, refreshPayments])

  // Calcular balance status
  useEffect(() => {
    const parseAmount = (value: unknown): number => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') return parseFloat(value) || 0
      return 0
    }

    const group_total = parseAmount(currentGroup?.total_amount)
    const payments_total = payments.reduce((sum, p) => sum + parseAmount(p.amount), 0)
    const totalExpected = group_total > 0 ? group_total : payments_total

    const totalPaid = payments.reduce((sum, p) => sum + parseAmount(p.amount_paid), 0)
    const remaining = totalExpected - totalPaid

    setBalanceStatus({
      isPaid: remaining <= 0 && totalExpected > 0,
      totalPaid,
      totalExpected,
      remaining: Math.max(remaining, 0),
    })
  }, [payments, currentGroup])

  const handleEditGroup = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'edit-group')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  if (!currentGroup) return null

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-surface rounded-lg border border-border p-4 sm:p-6">
        {/* Header con botones */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-fg">{t('overview.generalInfo')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-fg bg-surface-hover hover:bg-surface-hover border border-border rounded-md transition-colors"
              title={t('overview.notification')}
            >
              <FiBell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('overview.notification')}</span>
            </button>
            <button
              onClick={handleEditGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-fg bg-surface-hover hover:bg-surface-hover border border-border rounded-md transition-colors"
              title={t('overview.edit')}
            >
              <FiEdit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('overview.edit')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-fg-subtle mb-1">
              {t('overview.groupName')}
            </label>
            <p className="text-sm text-fg">{currentGroup.name}</p>
          </div>

          {/* Agencia */}
          <div>
            <label className="block text-xs font-medium text-fg-subtle mb-1">
              {t('overview.agency')}
            </label>
            <p className="text-sm text-fg">{currentGroup.agency || '-'}</p>
          </div>

          {/* Llegada */}
          <div>
            <label className="block text-xs font-medium text-fg-subtle mb-1">
              {t('overview.arrivalDate')}
            </label>
            <p className="text-sm text-fg">{formatDate(currentGroup.arrival_date, 'long')}</p>
          </div>

          {/* Salida */}
          <div>
            <label className="block text-xs font-medium text-fg-subtle mb-1">
              {t('overview.departureDate')}
            </label>
            <p className="text-sm text-fg">{formatDate(currentGroup.departure_date, 'long')}</p>
          </div>

          {/* Importe */}
          <div>
            <label className="block text-xs font-medium text-fg-subtle mb-1">
              {t('overview.totalAmount')}
            </label>
            <p className="text-sm font-semibold text-fg">
              {formatCurrency(currentGroup.total_amount, currentGroup.currency)}
            </p>
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-xs font-medium text-fg-subtle mb-1">
              {t('overview.currency')}
            </label>
            <p className="text-sm text-fg">{currentGroup.currency}</p>
          </div>
        </div>

        {/* Notas */}
        {currentGroup.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <label className="block text-xs font-medium text-fg-subtle mb-1">
              {t('overview.notes')}
            </label>
            <p className="text-sm text-fg whitespace-pre-wrap">{currentGroup.notes}</p>
          </div>
        )}
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Booking Status */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            {currentGroup.booking_confirmed ? (
              <FiCheckCircle className="w-8 h-8 text-green-500 dark:text-green-400 flex-shrink-0" />
            ) : (
              <FiClock className="w-8 h-8 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-fg-subtle">{t('overview.booking')}</p>
              <p className="text-sm font-medium text-fg">
                {currentGroup.booking_confirmed
                  ? t('overview.bookingConfirmed')
                  : t('overview.bookingPending')}
              </p>
              {currentGroup.booking_confirmed_date && (
                <p className="text-xs text-fg-subtle mt-0.5">
                  {formatDate(currentGroup.booking_confirmed_date)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contract Status */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            {currentGroup.contract_signed ? (
              <FiCheckCircle className="w-8 h-8 text-green-500 dark:text-green-400 flex-shrink-0" />
            ) : (
              <FiClock className="w-8 h-8 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-fg-subtle">{t('overview.contract')}</p>
              <p className="text-sm font-medium text-fg">
                {currentGroup.contract_signed
                  ? t('overview.contractSigned')
                  : t('overview.contractPending')}
              </p>
              {currentGroup.contract_signed_date && (
                <p className="text-xs text-fg-subtle mt-0.5">
                  {formatDate(currentGroup.contract_signed_date)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rooming Status */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            {currentGroup.rooming_status === 'received' ? (
              <FiCheckCircle className="w-8 h-8 text-green-500 dark:text-green-400 flex-shrink-0" />
            ) : currentGroup.rooming_status === 'requested' ? (
              <FiClock className="w-8 h-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            ) : (
              <FiFileText className="w-8 h-8 text-fg-subtle flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-fg-subtle">{t('overview.roomingList')}</p>
              <p className="text-sm font-medium text-fg">
                {currentGroup.rooming_status === 'received'
                  ? t('overview.roomingReceived')
                  : currentGroup.rooming_status === 'requested'
                    ? t('overview.roomingRequested')
                    : t('overview.roomingPending')}
              </p>
              {currentGroup.rooming_received_date && (
                <p className="text-xs text-fg-subtle mt-0.5">
                  {formatDate(currentGroup.rooming_received_date)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Balance Status */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            {balanceStatus.isPaid ? (
              <FiCheckCircle className="w-8 h-8 text-green-500 dark:text-green-400 flex-shrink-0" />
            ) : (
              <FiDollarSign className="w-8 h-8 text-orange-500 dark:text-orange-400 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-fg-subtle">{t('overview.balance')}</p>
              <p className="text-sm font-medium text-fg">
                {balanceStatus.isPaid ? t('overview.balancePaid') : t('overview.balancePending')}
              </p>
              {!balanceStatus.isPaid && balanceStatus.remaining > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 font-medium">
                  {formatCurrency(balanceStatus.remaining, currentGroup.currency)}{' '}
                  {t('overview.remaining')}
                </p>
              )}
              {balanceStatus.isPaid && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 font-medium">
                  {formatCurrency(balanceStatus.totalPaid, currentGroup.currency)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-fg mb-3">{t('overview.systemInfo')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-fg-subtle">{t('overview.createdBy')}</span>{' '}
            <span className="text-fg">
              {currentGroup.created_by_username || currentGroup.created_by || '-'}
            </span>
          </div>
          <div>
            <span className="text-fg-subtle">{t('overview.createdAt')}</span>{' '}
            <span className="text-fg">{formatDate(currentGroup.created_at, 'long')}</span>
          </div>
          {currentGroup.updated_by && (
            <>
              <div>
                <span className="text-fg-subtle">{t('overview.updatedBy')}</span>{' '}
                <span className="text-fg">
                  {currentGroup.updated_by_username || currentGroup.updated_by}
                </span>
              </div>
              <div>
                <span className="text-fg-subtle">{t('overview.updatedAt')}</span>{' '}
                <span className="text-fg">{formatDate(currentGroup.updated_at, 'long')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        groupId={currentGroup.id}
        groupName={currentGroup.name}
      />
    </div>
  )
}
