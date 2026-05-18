// app/components/groups/layout/GroupDetailSummaryPanel.tsx

'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useGroupStore } from '@/app/stores/useGroupStore'
import { useGroupPayments } from '@/app/lib/groups'
import { formatCurrency, formatDate } from '@/app/lib/helpers/utils'
import { FiDollarSign, FiLogIn, FiLogOut, FiClock } from 'react-icons/fi'
import { Card, Badge } from '@/app/ui/components'

export function GroupDetailSummaryPanel() {
  const { currentGroup } = useGroupStore()
  const groupId = currentGroup?.id
  const { data: paymentsData } = useGroupPayments(groupId)
  const payments = useMemo(() => paymentsData?.payments || [], [paymentsData?.payments])
  const t = useTranslations('groups')

  const balanceStatus = useMemo(() => {
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

    return {
      isPaid: remaining <= 0 && totalExpected > 0,
      totalPaid,
      totalExpected,
      remaining: Math.max(remaining, 0),
    }
  }, [payments, currentGroup])

  if (!currentGroup) return null

  // Calcular estancia en noches
  const arrivalDate = new Date(currentGroup.arrival_date)
  const departureDate = new Date(currentGroup.departure_date)
  const stayNights = Math.ceil(
    (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="sticky top-4 space-y-3">
      <h3 className="text-sm font-semibold text-fg mb-3">{t('stats.summary')}</h3>

      {/* Llegada */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-fg-muted font-medium">{t('table.arrival')}</p>
            <p className="text-sm font-bold text-fg mt-0.5">
              {formatDate(currentGroup.arrival_date, 'long')}
            </p>
          </div>
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <FiLogIn className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      {/* Salida */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-fg-muted font-medium">{t('table.departure')}</p>
            <p className="text-sm font-bold text-fg mt-0.5">
              {formatDate(currentGroup.departure_date, 'long')}
            </p>
          </div>
          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <FiLogOut className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </Card>

      {/* Estancia */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-fg-muted font-medium">{t('summaryPanel.stay')}</p>
            <p className="text-xl font-bold text-fg mt-0.5">
              {stayNights}{' '}
              <span className="text-sm font-normal text-fg-muted">{t('summaryPanel.nights')}</span>
            </p>
          </div>
          <div className="p-2 bg-info/10 rounded-lg">
            <FiClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card>

      {/* Importe Total */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-fg-muted font-medium">{t('overview.totalAmount')}</p>
            <p className="text-xl font-bold text-fg mt-0.5">
              {formatCurrency(currentGroup.total_amount, currentGroup.currency)}
            </p>
          </div>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <FiDollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>

      {/* Balance */}
      <Card padding="md" className={balanceStatus.isPaid ? 'border-success/30' : ''}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-fg-muted font-medium">{t('statusTab.paymentStatus')}</p>
            <Badge tone={balanceStatus.isPaid ? 'success' : 'warning'}>
              {balanceStatus.isPaid ? t('overview.balancePaid') : t('overview.balancePending')}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-fg-subtle">{t('payments.paid')}:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(balanceStatus.totalPaid, currentGroup.currency)}
              </span>
            </div>
            {!balanceStatus.isPaid && balanceStatus.remaining > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-fg-subtle">{t('payments.pending')}:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {formatCurrency(balanceStatus.remaining, currentGroup.currency)}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  balanceStatus.isPaid
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-orange-500 dark:bg-orange-400'
                }`}
                style={{
                  width: `${
                    balanceStatus.totalExpected > 0
                      ? Math.min((balanceStatus.totalPaid / balanceStatus.totalExpected) * 100, 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
