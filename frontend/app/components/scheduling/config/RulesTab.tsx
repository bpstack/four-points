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
import { ConfirmDialog } from '@/app/ui/panels/ConfirmDialog'

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
    if (rule?.employeeName) return rule.employeeName
    const emp = employees.find((e) => e.id === employeeId)
    return emp?.username || employeeId
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('allEmployees')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.username}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-3.5 h-3.5" />
            {t('addRule')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            {tMessages('loadingRules')}
          </p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12">
          <FiUsers className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{tMessages('noRules')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {tMessages('noRulesHint')}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('employee')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('ruleType')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('value')}
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('priority')}
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('status')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                    {getEmployeeName(rule.employeeId, rule)}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {getRuleTypeLabel(rule.ruleType)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {formatRuleValueDisplay(rule.ruleType, rule.ruleValue)}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                    {rule.priority}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() =>
                        toggleActiveMutation.mutate({ ruleId: rule.id, isActive: !rule.isActive })
                      }
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        rule.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
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
        onConfirm={() => deletingRuleId !== null && deleteMutation.mutate(deletingRuleId)}
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
      case 'fixed_shift':
        return (
          <div className="flex gap-2">
            {['M', 'T', 'N'].map((shift) => (
              <button
                key={shift}
                type="button"
                onClick={() => setRuleValue(shift)}
                className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  ruleValue === shift
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {shift === 'M' ? 'Mañana' : shift === 'T' ? 'Tarde' : 'Noche'}
              </button>
            ))}
          </div>
        )
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
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t('yes')}
            </button>
            <button
              type="button"
              onClick={() => setRuleValue('false')}
              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                ruleValue === 'false'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            className="w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
            placeholder="0"
          />
        )
      default:
        return (
          <input
            type="text"
            value={ruleValue}
            onChange={(e) => setRuleValue(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
          />
        )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#151b23] rounded-lg shadow-xl w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('editRule') : t('newRule')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('employee')} *
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isEditing}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 disabled:opacity-50"
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('ruleType')} *
            </label>
            <select
              value={ruleType}
              onChange={(e) => {
                setRuleType(e.target.value as EmployeeRuleType)
                setRuleValue('')
              }}
              disabled={isEditing}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 disabled:opacity-50"
              required
            >
              {RULE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              {RULE_TYPE_OPTIONS.find((o) => o.value === ruleType)?.description}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('value')} *
            </label>
            {getValueInputForType()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('priority')}
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
                max="10"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                {t('active')}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              {tActions('cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending || !employeeId || !ruleType || !ruleValue}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? tActions('saving') : tActions('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
