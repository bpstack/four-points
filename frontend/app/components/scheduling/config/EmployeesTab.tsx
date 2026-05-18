'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import toast from 'react-hot-toast'
import { FiSave, FiUsers } from 'react-icons/fi'
import { Checkbox } from '@/app/ui/components'

interface EmployeeWithStatus {
  id: string
  username: string
  role_id: number
  is_schedulable: boolean
}

export function EmployeesTab() {
  const tConfig = useTranslations('scheduling.config')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')
  const tMessages = useTranslations('scheduling.messages')

  const queryClient = useQueryClient()

  const { data: employees = [], isLoading } = useQuery<EmployeeWithStatus[]>({
    queryKey: schedulingKeys.employeesAll(),
    queryFn: schedulingApi.getAllEmployeesWithStatus,
  })

  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (employees.length > 0 && selectedIds === null) {
      const initialSelected = new Set(employees.filter((e) => e.is_schedulable).map((e) => e.id))
      setSelectedIds(initialSelected)
    }
  }, [employees, selectedIds])

  const currentSelected = selectedIds ?? new Set<string>()

  const toggleEmployee = (id: string) => {
    const newSelected = new Set(currentSelected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    setHasChanges(true)
  }

  const selectAll = () => {
    setSelectedIds(new Set(employees.map((e) => e.id)))
    setHasChanges(true)
  }

  const selectNone = () => {
    setSelectedIds(new Set())
    setHasChanges(true)
  }

  const saveMutation = useMutation({
    mutationFn: (ids: string[]) => schedulingApi.setSchedulableEmployees(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.employeesAll() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.employees() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all })
      toast.success(tToasts('employeesUpdated'))
      setHasChanges(false)
    },
    onError: () => {
      toast.error(tToasts('saveError'))
    },
  })

  const handleSave = () => {
    saveMutation.mutate(Array.from(currentSelected))
  }

  if (isLoading || selectedIds === null) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
        <p className="mt-3 text-xs text-fg-muted">{tMessages('loadingEmployees')}</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">{tConfig('employees.title')}</h3>
          <p className="text-xs text-fg-subtle">{tConfig('employees.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-subtle">
            {tConfig('employees.selectedCount', {
              selected: currentSelected.size,
              total: employees.length,
            })}
          </span>
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {tActions('all')}
          </button>
          <span className="text-fg-subtle">|</span>
          <button
            onClick={selectNone}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {tActions('none')}
          </button>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div>
          {employees.map((employee, index) => (
            <div
              key={employee.id}
              className={`flex items-center gap-3 px-3 py-2 hover:bg-surface-hover/50 cursor-pointer ${
                index !== employees.length - 1 ? 'border-b border-border' : ''
              }`}
              onClick={() => toggleEmployee(employee.id)}
            >
              <Checkbox
                checked={currentSelected.has(employee.id)}
                onCheckedChange={() => toggleEmployee(employee.id)}
                hideLabel
                label={`${tConfig('employees.selectEmployee')} ${employee.username}`}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-fg">{employee.username}</span>
              </div>
              {!hasChanges &&
                (employee.is_schedulable ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {tConfig('employees.active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-sunken text-fg-muted">
                    {tConfig('employees.excluded')}
                  </span>
                ))}
            </div>
          ))}
        </div>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-8">
          <FiUsers className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <p className="text-sm text-fg-muted">{tMessages('noEmployees')}</p>
        </div>
      )}

      {hasChanges && (
        <div className="flex justify-end mt-4 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4" />
            {saveMutation.isPending ? tActions('saving') : tActions('save')}
          </button>
        </div>
      )}
    </div>
  )
}
