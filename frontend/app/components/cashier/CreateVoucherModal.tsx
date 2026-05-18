// app/components/cashier/CreateVoucherModal.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FiX, FiSave, FiAlertCircle } from 'react-icons/fi'
import { useCreateVoucher } from '@/app/lib/cashier/queries'
import { useAuth } from '@/app/lib/auth/useAuth'
import { toast } from 'react-hot-toast'

interface CreateVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  shiftId: number
  currentVouchersCount: number
}

export default function CreateVoucherModal({
  isOpen,
  onClose,
  shiftId,
  currentVouchersCount,
}: CreateVoucherModalProps) {
  const t = useTranslations('cashier')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const createVoucherMutation = useCreateVoucher()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Verificar que hay usuario autenticado
    if (!user?.id) {
      toast.error(t('error.userNotAuthenticated'))
      return
    }

    // Validaciones
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(t('error.amountMustBeGreater'))
      return
    }

    if (reason.trim().length < 5) {
      toast.error(t('error.reasonMinLength'))
      return
    }

    if (currentVouchersCount >= 5) {
      toast.error(t('voucher.maxPerShift'))
      return
    }

    try {
      await createVoucherMutation.mutateAsync({
        shiftId,
        data: {
          amount: amountNum,
          reason: reason.trim(),
          created_by: user.id,
        },
      })

      toast.success(t('voucher.voucherCreated'))
      setAmount('')
      setReason('')
      onClose()
    } catch (error) {
      console.error('Error creando vale:', error)
      const errorMessage = error instanceof Error ? error.message : t('error.createVoucherError')
      toast.error(errorMessage)
    }
  }

  const handleCancel = () => {
    setAmount('')
    setReason('')
    onClose()
  }

  if (!isOpen) return null

  const isLoading = createVoucherMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-lg shadow-xl border border-border w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
            📝 {t('voucher.newVoucher')}
          </h3>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1 text-fg-subtle hover:text-fg rounded transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Alert */}
        {currentVouchersCount >= 4 && (
          <div className="mx-4 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <p className="font-medium">{t('voucher.limitAlmostReached')}</p>
              <p className="text-xs mt-1">
                {t('voucher.youHave')} {currentVouchersCount} {t('voucher.of')} 5{' '}
                {t('voucher.vouchers')}. {t('voucher.thisWillBe')}{' '}
                {currentVouchersCount === 4 ? t('voucher.last') : t('voucher.secondToLast')}.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              {t('voucher.voucherAmount')}{' '}
              <span className="text-red-500">{t('common.required')}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                    setAmount(value)
                  }
                }}
                placeholder="0.00"
                disabled={isLoading}
                className="w-full px-4 py-2 pr-8 text-lg font-semibold text-fg bg-surface border border-border rounded-lg focus:ring-2 focus:ring-accent/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle font-medium">
                €
              </span>
            </div>
            <p className="mt-1 text-xs text-fg-subtle">{t('voucher.enterAmount')}</p>
          </div>

          {/* Razón */}
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              {t('voucher.reason')} <span className="text-red-500">{t('common.required')}</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('voucher.reasonPlaceholder')}
              disabled={isLoading}
              rows={3}
              className="w-full px-4 py-2 text-sm text-fg bg-surface border border-border rounded-lg focus:ring-2 focus:ring-accent/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              required
              minLength={5}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-fg-subtle">{t('voucher.minCharacters')}</span>
              <span
                className={`font-medium ${
                  reason.length < 5
                    ? 'text-fg-subtle'
                    : reason.length < 20
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                }`}
              >
                {reason.length} {t('voucher.characters')}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-fg bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !amount || reason.length < 5}
              className="px-4 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('voucher.creating')}
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  {t('voucher.createVoucher')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
