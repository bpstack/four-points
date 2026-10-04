// app/components/groups/status/ContractCard.tsx

'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contractSchema, type ContractFormData } from '@/app/lib/schemas/group-schemas'
import { groupsApi, type GroupStatusRecord } from '@/app/lib/groups'
import { useQueryClient } from '@tanstack/react-query'
import { FiFileText, FiEdit2, FiSave, FiX, FiCheckCircle, FiCalendar } from 'react-icons/fi'
import { formatDateForInput, parseInputDate } from '@/app/lib/helpers/date'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Checkbox } from '@/app/ui/components'

interface ContractCardProps {
  status: GroupStatusRecord
  groupId: number
}

export function ContractCard({ status, groupId }: ContractCardProps) {
  const t = useTranslations('groups')
  const locale = useLocale()
  const [isEditing, setIsEditing] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const queryClient = useQueryClient()

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      signed: status.contract_signed,
      date: status.contract_signed_date
        ? new Date(status.contract_signed_date).toISOString().split('T')[0]
        : '',
    },
  })

  const dateValue = watch('date') ?? ''

  // Cerrar calendario al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.calendar-container')) {
        setShowCalendar(false)
      }
    }

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  const onSubmit = async (data: ContractFormData) => {
    try {
      await groupsApi.updateContract(groupId, data)
      toast.success(t('statusCards.contractUpdateSuccess'))

      await queryClient.invalidateQueries({ queryKey: ['groups', groupId] })

      setIsEditing(false)
      setShowCalendar(false)
    } catch (error) {
      console.error('Error updating contract:', error)
      const message = error instanceof Error ? error.message : t('statusCards.contractUpdateError')
      toast.error(message)
    }
  }

  const handleCancel = () => {
    reset()
    setIsEditing(false)
    setShowCalendar(false)
  }

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return ''
    const date = parseInputDate(dateString)
    return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <FiFileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h4 className="text-sm font-semibold text-fg">{t('statusCards.contract')}</h4>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-fg-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-surface-hover rounded transition-colors"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Signed Checkbox */}
          <Controller
            name="signed"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={!!field.value}
                onCheckedChange={field.onChange}
                label={t('statusCards.contractSignedLabel')}
                strikeOnCheck={false}
                id="contract_signed"
              />
            )}
          />

          {/* Date con Calendar */}
          <div className="relative calendar-container">
            <label className="block text-xs font-medium text-fg mb-1">
              {t('statusCards.signDate')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatDateDisplay(dateValue)}
                readOnly
                placeholder={t('statusCards.selectDate')}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCalendar(!showCalendar)
                }}
                className="w-full px-3 py-1.5 pr-8 text-sm border border-border rounded-md bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
              />
              <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
            </div>
            {errors.date && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date.message}</p>
            )}

            {/* Calendar Dropdown */}
            {showCalendar && (
              <div className="absolute z-50 mt-1" onClick={(e) => e.stopPropagation()}>
                <SimpleCalendarCompact
                  selectedDate={dateValue ? parseInputDate(dateValue) : null}
                  onSelect={(date) => {
                    if (date) {
                      const formatted = formatDateForInput(date)
                      setValue('date', formatted, { shouldValidate: true })
                    }
                    setShowCalendar(false)
                  }}
                  onClose={() => setShowCalendar(false)}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-fg bg-surface border border-border rounded-md hover:bg-surface-hover disabled:opacity-50"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-fg bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSave className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {/* Status Badge */}
          <div>
            {status.contract_signed ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-md text-xs font-medium">
                <FiCheckCircle className="w-3.5 h-3.5" />
                {t('statusCards.signed')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded-md text-xs font-medium">
                {t('statusCards.pending')}
              </span>
            )}
          </div>

          {/* Date */}
          {status.contract_signed_date && (
            <p className="text-xs text-fg-muted">
              {t('statusCards.signedOn')}{' '}
              {new Date(status.contract_signed_date).toLocaleDateString(
                locale === 'es' ? 'es-ES' : 'en-US',
                {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }
              )}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
