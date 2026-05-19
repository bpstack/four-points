'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import type {
  SchedulingEmployeeRule,
  EmployeeRuleType,
  CreateEmployeeRuleDto,
  UpdateEmployeeRuleDto,
} from '@/app/lib/scheduling'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2, FiEdit2, FiX, FiUsers } from 'react-icons/fi'
import { Checkbox, ConfirmDialog } from '@/app/ui/components'
import { formatUsername } from '@/app/lib/helpers/user'

const RULE_TYPE_OPTIONS: { value: EmployeeRuleType; label: string; description: string }[] = [
  {
    value: 'shift_priority',
    label: 'Turno preferido',
    description: 'Turno preferido del empleado (M, T, N)',
  },
  { value: 'fixed_shift', label: 'Turno fijo', description: 'Siempre el mismo turno' },
  {
    value: 'fixed_days',
    label: 'Días fijos',
    description: 'Días específicos de la semana (1=Lun, 7=Dom)',
  },
  {
    value: 'no_weekends',
    label: 'Sin fines de semana',
    description: 'No trabaja sábados ni domingos',
  },
  {
    value: 'max_shift_per_month',
    label: 'Máx. turnos/mes',
    description: 'Máximo número de turnos por mes',
  },
  {
    value: 'min_shift_per_month',
    label: 'Mín. turnos/mes',
    description: 'Mínimo número de turnos por mes',
  },
]

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

interface EmployeeWithStatus {
  id: string
  username: string
  role_id: number
  is_schedulable: boolean
}

export function RulesTab() {
  const t = useTranslations('scheduling.config.rules')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')
  const tMessages = useTranslations('scheduling.messages')

  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRule, setEditingRule] = useState<SchedulingEmployeeRule | null>(null)
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null)
  const [filterEmployee, setFilterEmployee] = useState<string>('')

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<EmployeeWithStatus[]>({
    queryKey: schedulingKeys.employeesAll(),
    queryFn: schedulingApi.getAllEmployeesWithStatus,
  })

  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey: schedulingKeys.rules(),
    queryFn: async () => schedulingApi.getAllRules(),
    staleTime: 0,
  })

  const rules = rulesData?.rules || []
  const filteredRules = filterEmployee
    ? rules.filter((r) => r.employeeId === filterEmployee)
    : rules

  const getEmployeeName = (employeeId: string, rule?: SchedulingEmployeeRule) => {
    if (rule?.employeeName) return formatUsername(rule.employeeName)
    const emp = employees.find((e) => e.id === employeeId)
    return formatUsername(emp?.username || employeeId)
  }

  const getRuleTypeLabel = (ruleType: EmployeeRuleType) => {
    const option = RULE_TYPE_OPTIONS.find((o) => o.value === ruleType)
    return option?.label || ruleType
  }

  const formatRuleValueDisplay = (ruleType: EmployeeRuleType, value: string) => {
    switch (ruleType) {
      case 'shift_priority':
        return value === 'M'
          ? 'Mañana (M)'
          : value === 'T'
            ? 'Tarde (T)'
            : value === 'N'
              ? 'Noche (N)'
              : value
      case 'fixed_shift':
        return value === 'M'
          ? 'Mañana (M)'
          : value === 'T'
            ? 'Tarde (T)'
            : value === 'N'
              ? 'Noche (N)'
              : value
      case 'fixed_days':
        return value
          .split(',')
          .map((d) => {
            const dayNum = parseInt(d)
            return DAY_NAMES[dayNum] || d
          })
          .join(', ')
      case 'no_weekends':
        return value === 'true' ? 'Sí' : 'No'
      case 'max_shift_per_month':
      case 'min_shift_per_month':
        return `${value} turnos`
      default:
        return value
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (ruleId: number) => schedulingApi.deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.rules() })
      setDeletingRuleId(null)
      toast.success(tToasts('ruleDeleted'))
    },
    onError: () => {
      toast.error(tToasts('ruleDeleteError'))
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: number; isActive: boolean }) =>
      schedulingApi.updateRule(ruleId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.rules() })
      toast.success(tToasts('ruleUpdated'))
    },
    onError: () => {
      toast.error(tToasts('ruleUpdateError'))
    },
  })

  const isLoading = loadingEmployees || loadingRules

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">{t('title')}</h3>
          <p className="text-xs text-fg-subtle">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-2 py-1.5 text-xs border border-border rounded-md bg-surface-hover text-fg"
          >
            <option value="">{t('allEmployees')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {formatUsername(emp.username)}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-accent-fg hover:bg-accent-hover transition-colors"
          >
            <FiPlus className="w-3.5 h-3.5" />
            {t('addRule')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-fg-muted">{tMessages('loadingRules')}</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12">
          <FiUsers className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <p className="text-sm text-fg-muted">{tMessages('noRules')}</p>
          <p className="text-xs text-fg-subtle mt-1">{tMessages('noRulesHint')}</p>
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-surface border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('employee')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('ruleType')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('value')}
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-fg-muted">
                  {t('priority')}
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
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="border-b border-border hover:bg-surface-hover/50">
                  <td className="py-2 px-3 text-fg">{getEmployeeName(rule.employeeId, rule)}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {getRuleTypeLabel(rule.ruleType)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-fg-muted">
                    {formatRuleValueDisplay(rule.ruleType, rule.ruleValue)}
                  </td>
                  <td className="py-2 px-3 text-center text-fg-muted">{rule.priority}</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() =>
                        toggleActiveMutation.mutate({ ruleId: rule.id, isActive: !rule.isActive })
                      }
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        rule.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-surface-sunken text-fg-muted'
                      }`}
                    >
                      {rule.isActive ? t('active') : t('inactive')}
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title={tActions('edit')}
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingRuleId(rule.id)}
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
      )}

      {(showAddModal || editingRule) && (
        <RuleModal
          rule={editingRule}
          employees={employees}
          onClose={() => {
            setShowAddModal(false)
            setEditingRule(null)
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deletingRuleId !== null}
        onClose={() => setDeletingRuleId(null)}
        onConfirm={() => {
          if (deletingRuleId !== null) deleteMutation.mutate(deletingRuleId)
        }}
        title={tActions('delete')}
        message={t('deleteConfirm')}
        confirmText={tActions('delete')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

interface RuleModalProps {
  rule: SchedulingEmployeeRule | null
  employees: EmployeeWithStatus[]
  onClose: () => void
}

function RuleModal({ rule, employees, onClose }: RuleModalProps) {
  const t = useTranslations('scheduling.config.rules')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')

  const queryClient = useQueryClient()
  const isEditing = !!rule

  const [employeeId, setEmployeeId] = useState(rule?.employeeId || '')
  const [ruleType, setRuleType] = useState<EmployeeRuleType>(
    (rule?.ruleType as EmployeeRuleType) || 'shift_priority'
  )
  const [ruleValue, setRuleValue] = useState(rule?.ruleValue || '')
  const [priority, setPriority] = useState(String(rule?.priority || 0))
  const [isActive, setIsActive] = useState(rule?.isActive ?? true)
  const [notes, setNotes] = useState(rule?.notes || '')

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeRuleDto) => schedulingApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.rules() })
      toast.success(tToasts('ruleCreated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('ruleCreateError'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: number; data: UpdateEmployeeRuleDto }) => {
      const snakeData = {
        ...data,
        rule_type: data.ruleType,
        rule_value: data.ruleValue,
        is_active: data.isActive,
      }
      delete snakeData.ruleType
      delete snakeData.ruleValue
      return schedulingApi.updateRule(ruleId, snakeData as unknown as UpdateEmployeeRuleDto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.rules() })
      toast.success(tToasts('ruleUpdated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('ruleUpdateError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!employeeId || !ruleType || !ruleValue) {
      toast.error(t('fillRequired'))
      return
    }

    const data = {
      employee_id: employeeId,
      rule_type: ruleType,
      rule_value: ruleValue,
      priority: parseInt(priority) || 0,
      is_active: isActive,
      notes: notes || null,
    }

    if (isEditing && rule) {
      updateMutation.mutate({ ruleId: rule.id, data })
    } else {
      createMutation.mutate(data as unknown as CreateEmployeeRuleDto)
    }
  }

  const getValueInputForType = () => {
    switch (ruleType) {
      case 'shift_priority':
      case 'fixed_shift': {
        // shift_priority only makes sense for rotating shifts (M/T/N).
        // fixed_shift also supports P (Presencia, manager) and PI (Apoyo Interno).
        const SHIFT_LABELS: Record<string, string> = {
          M: 'Mañana',
          T: 'Tarde',
          N: 'Noche',
          P: 'Presencia',
          PI: 'Apoyo Interno',
        }
        const shifts = ruleType === 'fixed_shift' ? ['M', 'T', 'N', 'P', 'PI'] : ['M', 'T', 'N']
        return (
          <div className="flex flex-wrap gap-2">
            {shifts.map((shift) => (
              <button
                key={shift}
                type="button"
                onClick={() => setRuleValue(shift)}
                className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  ruleValue === shift
                    ? 'bg-accent text-accent-fg border-accent'
                    : 'border-border text-fg hover:bg-surface-hover'
                }`}
              >
                {SHIFT_LABELS[shift]}
              </button>
            ))}
          </div>
        )
      }
      case 'fixed_days':
        return (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const current = ruleValue ? ruleValue.split(',').filter(Boolean) : []
                  if (current.includes(String(day))) {
                    setRuleValue(current.filter((d) => d !== String(day)).join(','))
                  } else {
                    setRuleValue([...current, day].sort().join(','))
                  }
                }}
                className={`px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  ruleValue.split(',').includes(String(day))
                    ? 'bg-accent text-accent-fg border-accent'
                    : 'border-border text-fg hover:bg-surface-hover'
                }`}
              >
                {DAY_NAMES[day].slice(0, 3)}
              </button>
            ))}
          </div>
        )
      case 'no_weekends':
        return (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRuleValue('true')}
              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                ruleValue === 'true'
                  ? 'bg-accent text-accent-fg border-accent'
                  : 'border-border text-fg hover:bg-surface-hover'
              }`}
            >
              {t('yes')}
            </button>
            <button
              type="button"
              onClick={() => setRuleValue('false')}
              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                ruleValue === 'false'
                  ? 'bg-accent text-accent-fg border-accent'
                  : 'border-border text-fg hover:bg-surface-hover'
              }`}
            >
              {t('no')}
            </button>
          </div>
        )
      case 'max_shift_per_month':
      case 'min_shift_per_month':
        return (
          <input
            type="number"
            value={ruleValue}
            onChange={(e) => setRuleValue(e.target.value)}
            min="0"
            max="31"
            className="w-24 px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
            placeholder="0"
          />
        )
      default:
        return (
          <input
            type="text"
            value={ruleValue}
            onChange={(e) => setRuleValue(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
          />
        )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">
            {isEditing ? t('editRule') : t('newRule')}
          </h3>
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
              disabled={isEditing}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg disabled:opacity-50"
              required
            >
              <option value="">{t('selectEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg mb-1">{t('ruleType')} *</label>
            <select
              value={ruleType}
              onChange={(e) => {
                setRuleType(e.target.value as EmployeeRuleType)
                setRuleValue('')
              }}
              disabled={isEditing}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg disabled:opacity-50"
              required
            >
              {RULE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-fg-subtle">
              {RULE_TYPE_OPTIONS.find((o) => o.value === ruleType)?.description}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg mb-1">{t('value')} *</label>
            {getValueInputForType()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">{t('priority')}</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
                max="10"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg"
              />
            </div>
            <div className="flex items-center pt-6">
              <Checkbox
                checked={isActive}
                onCheckedChange={setIsActive}
                label={t('active')}
                strikeOnCheck={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-fg mb-1">{t('notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg resize-none"
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
              disabled={isPending || !employeeId || !ruleType || !ruleValue}
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
