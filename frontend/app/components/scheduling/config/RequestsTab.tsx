'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import type {
  SchedulingConstraint,
  UpdateConstraintDto,
  ConstraintType,
} from '@/app/lib/scheduling'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2, FiEdit, FiX, FiCheck, FiCalendar } from 'react-icons/fi'
import DatePickerInput from '@/app/ui/calendar/DatePickerInput'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'
import type { DropdownOption } from '@/app/ui/components/SelectDropdown'
import { ApiError } from '@/app/lib/apiClient'
import { formatUsername } from '@/app/lib/helpers/user'
import { formatLocalDate } from './utils/date'

interface Employee {
  id: string
  username: string
}

// ConstraintType -> shift code generado al precargar el mes (initializeAssignments).
// Espejo de backend/controllers/scheduling/scheduling-controller.ts:constraintToShiftCode.
// Solo los 6 tipos "tipo ausencia" se exponen en la UI; request_shift / request_no_shift
// requieren shift_code adicional y no se gestionan desde este modal todavía.
type SelectableConstraintType = Extract<
  ConstraintType,
  'request_off' | 'vacation' | 'sick_leave' | 'holiday' | 'sick_day' | 'training'
>

const CONSTRAINT_TYPE_TO_SHIFT: Record<SelectableConstraintType, string> = {
  request_off: 'L',
  vacation: 'V',
  sick_leave: 'IT',
  holiday: 'B',
  sick_day: 'E',
  training: 'FO',
}

const SELECTABLE_CONSTRAINT_TYPES: SelectableConstraintType[] = [
  'request_off',
  'vacation',
  'sick_leave',
  'holiday',
  'sick_day',
  'training',
]

// Colores de badge por shift_code generado. Reutiliza la paleta del módulo.
const SHIFT_BADGE_CLASSES: Record<string, string> = {
  L: 'bg-surface-hover text-fg-muted',
  V: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  IT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  B: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  E: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  FO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function shiftCodeForConstraint(type: string): string {
  return CONSTRAINT_TYPE_TO_SHIFT[type as SelectableConstraintType] ?? 'L'
}

const AVAILABLE_MONTHS: DropdownOption<number>[] = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

export function RequestsTab() {
  const t = useTranslations('scheduling.config.requests')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')
  const tMessages = useTranslations('scheduling.messages')

  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRequest, setEditingRequest] = useState<SchedulingConstraint | null>(null)

  const currentYear = new Date().getFullYear()
  const availableYears: DropdownOption<number>[] = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ].map((y) => ({ value: y, label: String(y) }))

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  const periodKey = schedulingKeys.constraintsByPeriod(selectedYear, selectedMonth)

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: periodKey,
    queryFn: async () => {
      const constraints = await schedulingApi.getConstraintsByPeriod(selectedYear, selectedMonth)
      return constraints.filter((c) =>
        (SELECTABLE_CONSTRAINT_TYPES as string[]).includes(c.constraintType)
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (constraintId: number) => schedulingApi.deleteConstraint(constraintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodKey })
      toast.success(tToasts('requestDeleted'))
    },
    onError: () => {
      toast.error(tToasts('ruleDeleteError'))
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) =>
      schedulingApi.approveConstraint(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: periodKey })
      toast.success(tToasts('requestUpdated'))
    },
    onError: () => {
      toast.error(tToasts('ruleUpdateError'))
    },
  })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('T')[0].split('-')
    return `${d}-${m}-${y.slice(2)}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return t('approved')
      case 'rejected':
        return t('rejected')
      default:
        return t('pending')
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">{t('title')}</h3>
          <p className="text-xs text-fg-subtle">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <SelectDropdown<number>
              value={selectedMonth}
              onChange={setSelectedMonth}
              options={AVAILABLE_MONTHS}
              className="w-32"
            />
            <SelectDropdown<number>
              value={selectedYear}
              onChange={setSelectedYear}
              options={availableYears}
              className="w-24"
            />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            title={t('newRequest')}
            className={
              `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ` +
              'bg-accent text-accent-fg hover:bg-accent-hover'
            }
          >
            <FiPlus className="w-3.5 h-3.5" />
            {t('newRequest')}
          </button>
        </div>
      </div>

      {loadingRequests ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-fg-muted">{tMessages('loadingRequests')}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <FiCalendar className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <p className="text-sm text-fg-muted">{tMessages('noRequests')}</p>
          <p className="text-xs text-fg-subtle mt-1">{tMessages('noRequestsHint')}</p>
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-surface border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('employee')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('type')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('dates')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('reasonLabel')}
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('status')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-border hover:bg-surface-hover/50">
                  <td className="py-2 px-3 text-fg">{formatUsername(request.employeeName)}</td>
                  <td className="py-2 px-3">
                    {(() => {
                      const code = shiftCodeForConstraint(request.constraintType)
                      const cls = SHIFT_BADGE_CLASSES[code] ?? 'bg-surface-hover text-fg-muted'
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}
                        >
                          {code}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-2 px-3 text-fg-muted">
                    {formatDate(request.startDate)}
                    {request.startDate !== request.endDate && ` - ${formatDate(request.endDate)}`}
                  </td>
                  <td className="py-2 px-3 text-fg-muted">{request.notes || '-'}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              approveMutation.mutate({ id: request.id, status: 'approved' })
                            }
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title={t('approved')}
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              approveMutation.mutate({ id: request.id, status: 'rejected' })
                            }
                            className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                            title={t('rejected')}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditingRequest(request)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title={tActions('edit')}
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(request.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title={tActions('delete')}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && (
        <AddRequestModal
          initialYear={selectedYear}
          initialMonth={selectedMonth}
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: periodKey })
          }}
        />
      )}

      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: periodKey })
            setEditingRequest(null)
          }}
        />
      )}
    </div>
  )
}

interface EditRequestModalProps {
  request: SchedulingConstraint
  onClose: () => void
  onSuccess: () => void
}

function EditRequestModal({ request, onClose, onSuccess }: EditRequestModalProps) {
  const t = useTranslations('scheduling.config.requests')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')

  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date(request.startDate)))
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date(request.endDate)))
  const [notes, setNotes] = useState(request.notes || '')
  const [constraintType, setConstraintType] = useState<SelectableConstraintType>(
    (SELECTABLE_CONSTRAINT_TYPES as string[]).includes(request.constraintType)
      ? (request.constraintType as SelectableConstraintType)
      : 'request_off'
  )

  const updateMutation = useMutation({
    mutationFn: (data: {
      constraintId: number
      constraintType: string
      startDate: string
      endDate: string
      notes?: string
    }) => {
      const { constraintId, ...rest } = data
      return schedulingApi.updateConstraint(constraintId, rest as UpdateConstraintDto)
    },
    onSuccess: () => {
      toast.success(tToasts('requestUpdated'))
      onSuccess()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        toast.error(err.message)
        return
      }
      if (err instanceof Error) {
        toast.error(err.message)
        return
      }
      toast.error(tToasts('requestUpdateError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) {
      toast.error(t('completeRequired'))
      return
    }
    updateMutation.mutate({
      constraintId: request.id,
      constraintType,
      startDate,
      endDate: endDate || startDate,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">
            {tActions('edit')} {t('newRequest')}
          </h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg mb-1">{t('employee')}</label>
            <input
              type="text"
              value={request.employeeName}
              disabled
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface-sunken text-fg-muted cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePickerInput
              label={`${t('from')} *`}
              value={startDate}
              onChange={(v) => {
                const val = v || ''
                setStartDate(val)
                if (val && endDate && val > endDate) setEndDate(val)
              }}
              clearable={false}
            />
            <DatePickerInput
              label={t('until')}
              value={endDate || startDate}
              onChange={(v) => setEndDate(v || startDate)}
              minDate={startDate ? new Date(startDate + 'T12:00:00') : null}
              clearable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg mb-1">{t('reason')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('reasonPlaceholder')}
              maxLength={46}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
            />
            <p className="text-xs text-fg-subtle mt-1">{notes.length}/46 caracteres</p>
          </div>

          <ConstraintTypePicker value={constraintType} onChange={setConstraintType} />

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
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm bg-accent text-accent-fg font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? tActions('saving') : tActions('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface AddRequestModalProps {
  initialYear: number
  initialMonth: number
  onClose: () => void
  onSuccess: () => void
}

function AddRequestModal({ initialYear, initialMonth, onClose, onSuccess }: AddRequestModalProps) {
  const t = useTranslations('scheduling.config.requests')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')

  const defaultStart = `${initialYear}-${String(initialMonth).padStart(2, '0')}-01`

  const [monthId, setMonthId] = useState<number | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [constraintType, setConstraintType] = useState<SelectableConstraintType>('request_off')

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: schedulingKeys.employees(),
    queryFn: schedulingApi.getSchedulableEmployees,
  })

  // Resolve (or create) the month for a given YYYY-MM-DD date string
  const ensureMonthForDate = async (dateStr: string): Promise<number> => {
    const [yStr, mStr] = dateStr.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    const { months: all } = await schedulingApi.getAllMonths({ year: y })
    const existing = all.find((x) => x.month === m)
    if (existing) return existing.id
    const created = await schedulingApi.createMonth({ year: y, month: m })
    return created.id
  }

  // Pre-resolve the month for the initially selected period so the submit
  // button is enabled even if the user doesn't change the date.
  useEffect(() => {
    void ensureMonthForDate(defaultStart)
      .then(setMonthId)
      .catch(() => setMonthId(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStart])

  const createMutation = useMutation({
    mutationFn: (data: {
      monthId: number
      employeeId: string
      constraintType: string
      startDate: string
      endDate: string
      notes?: string
    }) =>
      schedulingApi.createConstraint(data as Parameters<typeof schedulingApi.createConstraint>[0]),
    onSuccess: () => {
      toast.success(tToasts('requestCreated'))
      onSuccess()
      onClose()
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        toast.error(err.message)
        return
      }
      if (err instanceof Error) {
        toast.error(err.message)
        return
      }
      toast.error(tToasts('requestCreateError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!monthId || !employeeId || !startDate) {
      toast.error(t('completeRequired'))
      return
    }
    createMutation.mutate({
      monthId,
      employeeId,
      constraintType,
      startDate,
      endDate: endDate || startDate,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">{t('newRequest')}</h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-fg mb-1">{t('employee')} *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
              required
            >
              <option value="">{t('selectEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {formatUsername(emp.username)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePickerInput
              label={`${t('from')} *`}
              value={startDate}
              onChange={(v) => {
                const val = v || ''
                setStartDate(val)
                if (val && endDate && val > endDate) setEndDate(val)
                if (val) {
                  void ensureMonthForDate(val)
                    .then(setMonthId)
                    .catch(() => setMonthId(null))
                }
              }}
              clearable={false}
            />
            <DatePickerInput
              label={t('until')}
              value={endDate || startDate}
              onChange={(v) => setEndDate(v || startDate)}
              minDate={startDate ? new Date(startDate + 'T12:00:00') : null}
              clearable={false}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg mb-1">{t('reason')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('reasonPlaceholder')}
              maxLength={46}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
            />
            <p className="text-xs text-fg-subtle mt-1">{notes.length}/46 caracteres</p>
          </div>

          <ConstraintTypePicker value={constraintType} onChange={setConstraintType} />

          <p className="text-xs text-fg-subtle">{t('approvedNote')}</p>

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
              disabled={createMutation.isPending || !monthId}
              className="px-4 py-2 text-sm bg-accent text-accent-fg font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? tActions('saving') : tActions('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ConstraintTypePicker: button grid con los 6 tipos visibles. Devuelve el
// constraintType que se enviará al backend. El badge muestra el shift_code
// resultante (L/V/IT/B/E/FO) para que el usuario sepa qué se aplicará al mes.
// ─────────────────────────────────────────────────────────────────────────────
interface ConstraintTypePickerProps {
  value: SelectableConstraintType
  onChange: (type: SelectableConstraintType) => void
}

function ConstraintTypePicker({ value, onChange }: ConstraintTypePickerProps) {
  const t = useTranslations('scheduling.config.requests')
  return (
    <div>
      <label className="block text-xs font-medium text-fg mb-1.5">{t('typeLabel')}</label>
      <div className="grid grid-cols-2 gap-2">
        {SELECTABLE_CONSTRAINT_TYPES.map((type) => {
          const code = CONSTRAINT_TYPE_TO_SHIFT[type]
          const badgeCls = SHIFT_BADGE_CLASSES[code] ?? 'bg-surface-hover text-fg-muted'
          const isActive = value === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors text-left ${
                isActive
                  ? 'border-accent bg-accent/10 text-fg ring-1 ring-accent'
                  : 'border-border text-fg hover:bg-surface-hover'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeCls}`}
              >
                {code}
              </span>
              <span className="flex-1">{t(`types.${type}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
