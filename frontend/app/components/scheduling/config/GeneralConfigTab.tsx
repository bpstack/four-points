'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import type { SchedulingShift, CreateShiftDto, UpdateShiftDto } from '@/app/lib/scheduling'
import { getShiftClasses } from '@/app/lib/scheduling'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiSave, FiCalendar } from 'react-icons/fi'
import { Checkbox, ConfirmDialog } from '@/app/ui/components'

export function GeneralConfigTab() {
  const t = useTranslations('scheduling.config.general')
  const tToasts = useTranslations('scheduling.toasts')
  const tActions = useTranslations('scheduling.actions')
  const tMessages = useTranslations('scheduling.messages')

  const queryClient = useQueryClient()
  const [editedConfig, setEditedConfig] = useState<Partial<Record<string, string>>>({})
  const [saving, setSaving] = useState(false)

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: schedulingKeys.configMap(),
    queryFn: schedulingApi.getConfigMap,
  })

  const { data: shifts = [] } = useQuery({
    queryKey: schedulingKeys.shifts(),
    queryFn: schedulingApi.getAllShifts,
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      schedulingApi.updateConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.configMap() })
    },
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const promises = Object.entries(editedConfig).map(([key, value]) =>
        updateMutation.mutateAsync({ key, value: value! })
      )
      await Promise.all(promises)
      setEditedConfig({})
      toast.success(tToasts('configSaved'))
    } catch {
      toast.error(tToasts('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = Object.keys(editedConfig).length > 0

  const getValue = (key: string, defaultValue: number) => {
    return editedConfig[key] ?? defaultValue
  }

  const handleChange = (key: string, value: string) => {
    setEditedConfig({ ...editedConfig, [key]: value })
  }

  if (loadingConfig || !config) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
        <p className="mt-3 text-xs text-fg-muted">{tMessages('loadingConfig')}</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-fg mb-3">{t('staffingPerShift')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">
                M
              </span>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('morningShift')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('minimum')}</span>
                <input
                  type="number"
                  value={getValue('min_morning_staff', config.minMorningStaff)}
                  onChange={(e) => handleChange('min_morning_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('preferred')}</span>
                <input
                  type="number"
                  value={getValue('pref_morning_staff', config.prefMorningStaff)}
                  onChange={(e) => handleChange('pref_morning_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('maximum')}</span>
                <input
                  type="number"
                  value={getValue('max_morning_staff', config.maxMorningStaff)}
                  onChange={(e) => handleChange('max_morning_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                T
              </span>
              <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                {t('afternoonShift')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('minimum')}</span>
                <input
                  type="number"
                  value={getValue('min_afternoon_staff', config.minAfternoonStaff)}
                  onChange={(e) => handleChange('min_afternoon_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('preferred')}</span>
                <input
                  type="number"
                  value={getValue('pref_afternoon_staff', config.prefAfternoonStaff)}
                  onChange={(e) => handleChange('pref_afternoon_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('maximum')}</span>
                <input
                  type="number"
                  value={getValue('max_afternoon_staff', config.maxAfternoonStaff)}
                  onChange={(e) => handleChange('max_afternoon_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                N
              </span>
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                {t('nightShift')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('minimum')}</span>
                <input
                  type="number"
                  value={getValue('min_night_staff', config.minNightStaff)}
                  onChange={(e) => handleChange('min_night_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{t('maximum')}</span>
                <input
                  type="number"
                  value={getValue('max_night_staff', config.maxNightStaff)}
                  onChange={(e) => handleChange('max_night_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-hover/50 border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-fg mb-3">{t('weeklyLimits')}</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('maxShiftsPerWeek')}</span>
              <input
                type="number"
                value={getValue('max_weekly_shifts', config.maxWeeklyShifts)}
                onChange={(e) => handleChange('max_weekly_shifts', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('preferredShiftsPerWeek')}</span>
              <input
                type="number"
                value={getValue('pref_weekly_shifts', config.prefWeeklyShifts)}
                onChange={(e) => handleChange('pref_weekly_shifts', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('minRestHours')}</span>
              <input
                type="number"
                value={getValue('min_rest_hours', config.minRestHours)}
                onChange={(e) => handleChange('min_rest_hours', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-hover/50 border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-fg mb-3">{t('nightBlocks')}</h4>
          <p className="text-[10px] text-fg-subtle mb-3">{t('consecutiveNightsAllowed')}</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('minConsecutive')}</span>
              <input
                type="number"
                value={getValue('min_night_block', config.minNightBlock)}
                onChange={(e) => handleChange('min_night_block', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('maxConsecutive')}</span>
              <input
                type="number"
                value={getValue('max_night_block', config.maxNightBlock)}
                onChange={(e) => handleChange('max_night_block', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('preferred')}</span>
              <input
                type="number"
                value={getValue('pref_night_block', config.prefNightBlock)}
                onChange={(e) => handleChange('pref_night_block', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">
            {t('monthlyFreeDays')}
          </h4>
          <p className="text-[10px] text-fg-subtle mb-3">{t('monthlyFreeDaysDesc')}</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('minimum')}</span>
              <input
                type="number"
                value={getValue('min_monthly_libre', config.minMonthlyLibre)}
                onChange={(e) => handleChange('min_monthly_libre', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('maximum')}</span>
              <input
                type="number"
                value={getValue('max_monthly_libre', config.maxMonthlyLibre)}
                onChange={(e) => handleChange('max_monthly_libre', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-rose-800 dark:text-rose-300 mb-1">
            {t('consecutiveWorkDays')}
          </h4>
          <p className="text-[10px] text-fg-subtle mb-3">{t('consecutiveWorkDaysDesc')}</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">{t('maximum')}</span>
              <input
                type="number"
                value={getValue('max_consecutive_work_days', config.maxConsecutiveWorkDays)}
                onChange={(e) => handleChange('max_consecutive_work_days', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      <ShiftsSection shifts={shifts} />

      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4" />
            {saving ? tActions('saving') : tActions('save')}
          </button>
        </div>
      )}
    </div>
  )
}

interface ShiftsSectionProps {
  shifts: SchedulingShift[]
}

function ShiftsSection({ shifts }: ShiftsSectionProps) {
  const t = useTranslations('scheduling.config.shifts')
  const tToasts = useTranslations('scheduling.toasts')
  const tActions = useTranslations('scheduling.actions')

  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingShift, setEditingShift] = useState<SchedulingShift | null>(null)
  const [deletingShift, setDeletingShift] = useState<SchedulingShift | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (shiftId: number) => schedulingApi.deleteShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.shifts() })
      setDeletingShift(null)
      toast.success(tToasts('shiftDeleted'))
    },
    onError: () => {
      toast.error(tToasts('shiftDeleteError'))
    },
  })

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">{t('title')}</h3>
          <p className="text-xs text-fg-subtle">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" />
          {tActions('addShift')}
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-md">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-surface border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                {t('code')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                {t('name')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                {t('schedule')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                {t('hours')}
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-fg-muted">
                {t('work')}
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-fg-muted">
                {t('paid')}
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-fg-muted">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr
                key={shift.id}
                className="border-b border-border last:border-b-0 hover:bg-surface-hover/50"
              >
                <td className="py-2 px-3">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${getShiftClasses(shift.code)}`}
                  >
                    {shift.code}
                  </span>
                </td>
                <td className="py-2 px-3 text-fg">{shift.name}</td>
                <td className="py-2 px-3 text-fg-muted">
                  {shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime}` : '-'}
                </td>
                <td className="py-2 px-3 text-fg-muted">{shift.hours}h</td>
                <td className="py-2 px-3 text-center">
                  {shift.isWorkShift ? (
                    <FiCheck className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <FiX className="w-4 h-4 text-fg-subtle mx-auto" />
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  {shift.isPaid ? (
                    <FiCheck className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <FiX className="w-4 h-4 text-fg-subtle mx-auto" />
                  )}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditingShift(shift)}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title={tActions('edit')}
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingShift(shift)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title={tActions('delete')}
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shifts.length === 0 && (
        <div className="text-center py-8">
          <FiCalendar className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <p className="text-sm text-fg-muted">{t('noShifts')}</p>
        </div>
      )}

      {(showAddModal || editingShift) && (
        <ShiftModal
          shift={editingShift}
          onClose={() => {
            setShowAddModal(false)
            setEditingShift(null)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingShift}
        onClose={() => setDeletingShift(null)}
        onConfirm={() => {
          if (deletingShift) deleteMutation.mutate(deletingShift.id)
        }}
        title={tActions('delete')}
        message={
          deletingShift
            ? t('deleteConfirm', { name: deletingShift.name, code: deletingShift.code })
            : ''
        }
        confirmText={tActions('delete')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

interface ShiftModalProps {
  shift: SchedulingShift | null
  onClose: () => void
}

function ShiftModal({ shift, onClose }: ShiftModalProps) {
  const t = useTranslations('scheduling.config.shifts')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')

  const queryClient = useQueryClient()
  const isEditing = !!shift

  const [code, setCode] = useState(shift?.code || '')
  const [name, setName] = useState(shift?.name || '')
  const [startTime, setStartTime] = useState(shift?.startTime || '')
  const [endTime, setEndTime] = useState(shift?.endTime || '')
  const [hours, setHours] = useState(shift?.hours ? String(shift.hours) : '8')
  const [isWorkShift, setIsWorkShift] = useState(shift?.isWorkShift ?? true)
  const [isPaid, setIsPaid] = useState(shift?.isPaid ?? true)
  const [displayOrder, setDisplayOrder] = useState(
    shift?.displayOrder ? String(shift.displayOrder) : '10'
  )

  const createMutation = useMutation({
    mutationFn: (data: CreateShiftDto) => schedulingApi.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.shifts() })
      toast.success(tToasts('shiftCreated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('shiftCreateError'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateShiftDto }) =>
      schedulingApi.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.shifts() })
      toast.success(tToasts('shiftUpdated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('shiftUpdateError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!code || !name) {
      toast.error(t('codeNameRequired'))
      return
    }

    const data = {
      code: code.toUpperCase(),
      name,
      startTime: startTime || null,
      endTime: endTime || null,
      hours: parseFloat(hours) || 0,
      isWorkShift,
      isPaid,
      displayOrder: parseInt(displayOrder) || 10,
    }

    if (isEditing && shift) {
      updateMutation.mutate({ id: shift.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">
            {isEditing ? t('editShift') : t('newShift')}
          </h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">{t('code')} *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="M, T, N..."
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg uppercase"
                required
                disabled={isEditing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg mb-1">{t('name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">{t('startTime')}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg mb-1">{t('endTime')}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">{t('hours')}</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                step="0.25"
                min="0"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg mb-1">{t('displayOrder')}</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                min="0"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Checkbox
              checked={isWorkShift}
              onCheckedChange={setIsWorkShift}
              label={t('isWorkShift')}
              strikeOnCheck={false}
            />
            <Checkbox
              checked={isPaid}
              onCheckedChange={setIsPaid}
              label={t('isPaid')}
              strikeOnCheck={false}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-fg hover:bg-surface-hover rounded-md transition-colors"
            >
              {tActions('cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm bg-accent text-accent-fg font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {isPending ? tActions('saving') : tActions('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
