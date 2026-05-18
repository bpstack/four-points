// app/components/scheduling/ManageHolidaysModal.tsx

'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import type { SchedulingDay } from '@/app/lib/scheduling'
import { FiX, FiSave, FiCalendar, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ManageHolidaysModalProps {
  monthId: number
  year: number
  month: number
  days: SchedulingDay[]
  onClose: () => void
}

interface DayEdit {
  day_id: number
  is_holiday: boolean
  holiday_name: string | null
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DAY_NAMES_FULL: Record<string, string> = {
  L: 'Lunes',
  M: 'Martes',
  X: 'Miércoles',
  J: 'Jueves',
  V: 'Viernes',
  S: 'Sábado',
  D: 'Domingo',
}

export function ManageHolidaysModal({
  monthId,
  year,
  month,
  days,
  onClose,
}: ManageHolidaysModalProps) {
  const t = useTranslations('scheduling')
  const tToasts = useTranslations('scheduling.toasts')
  const queryClient = useQueryClient()

  // Initialize edits map with current state
  const [edits, setEdits] = useState<Map<number, DayEdit>>(
    new Map(
      days.map((day) => [
        day.id,
        {
          day_id: day.id,
          is_holiday: day.isHoliday,
          holiday_name: day.holidayName,
        },
      ])
    )
  )

  // Mutation to save changes
  const saveMutation = useMutation({
    mutationFn: (data: DayEdit[]) => schedulingApi.bulkUpdateDays(monthId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(monthId) })
      toast.success(tToasts('holidaysUpdated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('holidaysUpdateError'))
    },
  })

  const handleToggleHoliday = (dayId: number) => {
    setEdits((prev) => {
      const newEdits = new Map(prev)
      const current = newEdits.get(dayId)
      if (current) {
        newEdits.set(dayId, {
          ...current,
          is_holiday: !current.is_holiday,
          holiday_name: !current.is_holiday ? '' : null,
        })
      }
      return newEdits
    })
  }

  const handleChangeName = (dayId: number, name: string) => {
    setEdits((prev) => {
      const newEdits = new Map(prev)
      const current = newEdits.get(dayId)
      if (current) {
        newEdits.set(dayId, {
          ...current,
          holiday_name: name || null,
        })
      }
      return newEdits
    })
  }

  const handleSave = () => {
    // Only send days that have changed
    const changes: DayEdit[] = []
    days.forEach((day) => {
      const edit = edits.get(day.id)
      if (edit && (edit.is_holiday !== day.isHoliday || edit.holiday_name !== day.holidayName)) {
        changes.push(edit)
      }
    })

    if (changes.length === 0) {
      toast.success(t('noChangesToSave'))
      onClose()
      return
    }

    saveMutation.mutate(changes)
  }

  // Separate days into holidays and non-holidays
  const holidayDays = useMemo(() => {
    return days
      .map((day) => ({ ...day, edit: edits.get(day.id) }))
      .filter((day) => day.edit?.is_holiday)
      .sort((a, b) => a.dayNumber - b.dayNumber)
  }, [days, edits])

  const regularDays = useMemo(() => {
    return days
      .map((day) => ({ ...day, edit: edits.get(day.id) }))
      .filter((day) => !day.edit?.is_holiday)
      .sort((a, b) => a.dayNumber - b.dayNumber)
  }, [days, edits])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-surface rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-info/10 flex items-center justify-center">
              <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('manageHolidaysTitle')}</h2>
              <p className="text-xs text-fg-muted">
                {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-surface-hover flex items-center justify-center text-fg-subtle transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Holiday days section */}
          <div>
            <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {t('holidayDays')} ({holidayDays.length})
            </h3>
            {holidayDays.length === 0 ? (
              <p className="text-xs text-fg-subtle italic">{t('noHolidaysMarked')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {holidayDays.map((day) => (
                  <div
                    key={day.id}
                    className="flex items-start gap-3 p-3 rounded-md border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10"
                  >
                    <button
                      onClick={() => handleToggleHoliday(day.id)}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-red-500 bg-red-500 flex items-center justify-center flex-shrink-0 hover:bg-red-600 hover:border-red-600 transition-colors"
                    >
                      <FiCheck className="w-3.5 h-3.5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-fg">
                        {DAY_NAMES_FULL[day.dayOfWeek]} {day.dayNumber}
                      </div>
                      <input
                        type="text"
                        value={day.edit?.holiday_name || ''}
                        onChange={(e) => handleChangeName(day.id, e.target.value)}
                        placeholder={t('holidayNamePlaceholder')}
                        className="mt-1 w-full px-2 py-1 text-xs rounded border border-border bg-surface text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regular days section */}
          <div>
            <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              {t('regularDays')} ({regularDays.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {regularDays.map((day) => (
                <button
                  key={day.id}
                  onClick={() => handleToggleHoliday(day.id)}
                  className="flex items-center gap-2 p-2 rounded-md border border-border bg-surface hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-left"
                >
                  <div className="w-4 h-4 rounded border-2 border-border flex-shrink-0"></div>
                  <div className="text-xs text-fg min-w-0">
                    <div className="font-medium">{DAY_NAMES_FULL[day.dayOfWeek]}</div>
                    <div className="text-fg-subtle">Día {day.dayNumber}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface-sunken">
          <p className="text-xs text-fg-muted">{t('clickToToggleHoliday')}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover rounded-md transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover disabled:bg-blue-400 dark:bg-blue-600 dark:hover:bg-accent-hover dark:disabled:bg-blue-800 rounded-md transition-colors flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {saveMutation.isPending ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
