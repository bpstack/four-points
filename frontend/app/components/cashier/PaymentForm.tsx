// app/components/cashier/PaymentForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FiSave, FiX } from 'react-icons/fi'
import { useUpdatePayments } from '@/app/lib/cashier/queries'
import { toast } from 'react-hot-toast'

interface PaymentFormProps {
  shiftId: number
  initialPayments?: Array<{
    id: number
    payment_method_id: number
    payment_method_name: string
    amount: string
  }>
  onSave: () => void
  onCancel: () => void
}

export default function PaymentForm({
  shiftId,
  initialPayments = [],
  onSave,
  onCancel,
}: PaymentFormProps) {
  const t = useTranslations('cashier')
  const [payments, setPayments] = useState<Record<number, string>>({})
  const updatePaymentsMutation = useUpdatePayments()

  const PAYMENT_METHODS = [
    { id: 1, name: t('payment.card'), icon: '💳', color: 'blue' },
    { id: 2, name: t('payment.bacs'), icon: '🏦', color: 'green' },
    { id: 3, name: t('payment.webPay'), icon: '🌐', color: 'purple' },
    { id: 4, name: t('payment.transfer'), icon: '💸', color: 'orange' },
    { id: 5, name: t('payment.others'), icon: '📝', color: 'gray' },
  ]

  useEffect(() => {
    const initialValues: Record<number, string> = {}
    PAYMENT_METHODS.forEach((method) => {
      const existing = initialPayments.find((p) => p.payment_method_id === method.id)
      initialValues[method.id] = existing ? parseFloat(existing.amount).toFixed(2) : '0.00'
    })
    setPayments(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPayments])

  const totalPayments = Object.values(payments).reduce(
    (sum, amount) => sum + parseFloat(amount || '0'),
    0
  )
  const completedCount = Object.values(payments).filter(
    (amount) => parseFloat(amount || '0') > 0
  ).length

  const handleAmountChange = (methodId: number, value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setPayments((prev) => ({ ...prev, [methodId]: value }))
    }
  }

  const handleSave = async () => {
    try {
      const paymentsToSend = PAYMENT_METHODS.map((method) => ({
        payment_method_id: method.id,
        amount: parseFloat(payments[method.id] || '0'),
      })).filter((p) => p.amount > 0)

      await updatePaymentsMutation.mutateAsync({ shiftId, payments: paymentsToSend })
      toast.success(t('payment.paymentsSaved'))
      setTimeout(() => onSave(), 100)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('error.saveError')
      toast.error(errorMessage)
    }
  }

  const isLoading = updatePaymentsMutation.isPending

  return (
    <div className="space-y-3">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-fg-muted mb-0.5">{t('payment.totalPayments')}</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {totalPayments.toFixed(2)}€
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-fg-subtle mb-0.5">{t('payment.completed')}</p>
            <p className="text-sm font-semibold text-fg">
              {completedCount}/{PAYMENT_METHODS.length}
            </p>
          </div>
        </div>
      </div>

      {/* Grid compacto - una columna para evitar overflow en contenedores pequeños */}
      <div className="grid grid-cols-1 gap-2">
        {PAYMENT_METHODS.map((method) => {
          const amount = parseFloat(payments[method.id] || '0')
          const hasValue = amount > 0
          return (
            <div
              key={method.id}
              className={`bg-surface border rounded-lg p-2 transition-all ${
                hasValue
                  ? 'border-green-300 dark:border-green-700 ring-1 ring-green-100 dark:ring-green-900/30'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{method.icon}</span>
                <p className="text-xs font-medium text-fg flex-1">{method.name}</p>
                {hasValue && (
                  <span className="text-[9px] text-green-600 dark:text-green-400">✓</span>
                )}
                <input
                  type="text"
                  inputMode="decimal"
                  value={payments[method.id] || ''}
                  onChange={(e) => handleAmountChange(method.id, e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className="w-24 px-2 py-1.5 text-sm font-semibold text-right text-fg bg-surface border border-border rounded focus:ring-1 focus:ring-accent/50 focus:border-transparent disabled:opacity-50"
                />
                <span className="text-xs text-fg-subtle font-medium">€</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-medium text-fg bg-surface border border-border rounded hover:bg-surface-hover disabled:opacity-50 flex items-center gap-1.5"
        >
          <FiX className="w-3 h-3" />
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded disabled:opacity-50 flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <FiSave className="w-3 h-3" />
              {t('common.save')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
