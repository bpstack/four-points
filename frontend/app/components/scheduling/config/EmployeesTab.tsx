'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import toast from 'react-hot-toast'
import { FiSave, FiUsers } from 'react-icons/fi'

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
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          {tMessages('loadingEmployees')}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {tConfig('employees.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tConfig('employees.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
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
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={selectNone}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {tActions('none')}
          </button>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div>
          {employees.map((employee, index) => (
            <div
              key={employee.id}
              className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                index !== employees.length - 1
                  ? 'border-b border-gray-100 dark:border-gray-800'
                  : ''
              }`}
              onClick={() => toggleEmployee(employee.id)}
            >
              <input
                type="checkbox"
                checked={currentSelected.has(employee.id)}
                onChange={() => toggleEmployee(employee.id)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {employee.username}
                </span>
              </div>
              {!hasChanges &&
                (employee.is_schedulable ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {tConfig('employees.active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                    {tConfig('employees.excluded')}
                  </span>
                ))}
            </div>
          ))}
        </div>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-8">
          <FiUsers className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{tMessages('noEmployees')}</p>
        </div>
      )}

      {hasChanges && (
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4" />
            {saveMutation.isPending ? tActions('saving') : tActions('save')}
          </button>
        </div>
      )}
    </div>
  )
}
