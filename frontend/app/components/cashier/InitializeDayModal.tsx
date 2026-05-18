// app/components/cashier/InitializeDayModal.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FiX, FiDollarSign, FiLoader } from 'react-icons/fi'
import { useAuth } from '@/app/lib/auth/useAuth'
import { useInitializeDay } from '@/app/lib/cashier/queries'
import { toast } from 'react-hot-toast'

interface InitializeDayModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
}

export default function InitializeDayModal({
  isOpen,
  onClose,
  selectedDate,
}: InitializeDayModalProps) {
  const t = useTranslations('cashier')
  const { user } = useAuth()
  const [initialFund, setInitialFund] = useState('200')

  const initializeMutation = useInitializeDay()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast.error(t('error.userNotAuthenticated'))
      return
    }

    try {
      await initializeMutation.mutateAsync({
        date: selectedDate,
        data: {
          opened_by: user.id,
          primary_user_id: user.id,
          initial_fund: parseFloat(initialFund),
        },
      })

      toast.success(t('initializeDay.dayInitialized'))
      onClose()
    } catch (error) {
      console.error('Error inicializando día:', error)
      const errorMessage = error instanceof Error ? error.message : t('error.initializeDayError')
      toast.error(errorMessage)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg w-full max-w-md shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <FiDollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-fg">{t('initializeDay.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-fg-subtle hover:text-fg transition-colors"
            disabled={initializeMutation.isPending}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="bg-info/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {t('initializeDay.shiftsWillBeCreated')}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-400">
                <li>🌙 {t('shifts.nightFull')}</li>
                <li>☀️ {t('shifts.morningFull')}</li>
                <li>🌅 {t('shifts.afternoonFull')}</li>
                <li>🔒 {t('shifts.closingFull')}</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                {t('initializeDay.date')}
              </label>
              <input
                type="text"
                value={selectedDate}
                disabled
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-lg text-fg-subtle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                {t('initializeDay.initialFund')} (€)
              </label>
              <input
                type="number"
                value={initialFund}
                onChange={(e) => setInitialFund(e.target.value)}
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-fg focus:ring-2 focus:ring-accent/50 focus:border-transparent"
                disabled={initializeMutation.isPending}
              />
              <p className="text-xs text-fg-subtle mt-1">{t('initializeDay.initialFundHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                {t('initializeDay.responsible')}
              </label>
              <input
                type="text"
                value={user?.username || 'N/A'}
                disabled
                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-lg text-fg-subtle"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg text-fg hover:bg-surface-hover transition-colors"
              disabled={initializeMutation.isPending}
            >
              {t('initializeDay.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-accent-fg hover:bg-accent-hover rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={initializeMutation.isPending || !initialFund}
            >
              {initializeMutation.isPending ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  {t('initializeDay.initializing')}
                </>
              ) : (
                <>
                  <FiDollarSign className="w-4 h-4" />
                  {t('initializeDay.initialize')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
