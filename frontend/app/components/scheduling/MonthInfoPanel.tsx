// app/components/scheduling/MonthInfoPanel.tsx
// Panel showing employee rules and approved requests

'use client'

import { useQuery } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import { FiInfo, FiCalendar, FiUsers } from 'react-icons/fi'

interface MonthInfoPanelProps {
  monthId: number
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(day)} ${monthNames[parseInt(month) - 1]}`
}

export function MonthInfoPanel({ monthId }: MonthInfoPanelProps) {
  const { data: monthInfo, isLoading } = useQuery({
    queryKey: schedulingKeys.monthInfo(monthId),
    queryFn: () => schedulingApi.getMonthInfo(monthId),
    enabled: !!monthId,
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-4">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (!monthInfo) {
    return null
  }

  const { requests, employeeRules, summary } = monthInfo

  const hasRequests = requests && requests.length > 0
  const hasRules = employeeRules && employeeRules.length > 0

  if (!hasRequests && !hasRules) {
    return (
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <FiInfo className="w-4 h-4" />
          <span>Información del Mes</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
          Sin reglas ni peticiones aprobadas este mes
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <FiInfo className="w-4 h-4" />
        <span>Información del Mes</span>
      </div>

      {/* Two columns: Requests (left) and Employee Rules (right) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Approved Requests - Left Column */}
        {hasRequests && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <FiCalendar className="w-3 h-3 text-blue-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Peticiones aprobadas ({requests.length})
              </span>
            </div>
            <div className="space-y-1 pl-5">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="text-xs text-gray-600 dark:text-gray-400">
                  {req.employeeName}: {req.typeLabel} ({formatDate(req.startDate)} -{' '}
                  {formatDate(req.endDate)})
                </div>
              ))}
              {requests.length > 5 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{requests.length - 5} más...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Employee Rules - Right Column */}
        {hasRules && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <FiUsers className="w-3 h-3 text-green-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Empleados con reglas ({employeeRules.length})
              </span>
            </div>
            <div className="space-y-1 pl-5">
              {employeeRules.map((emp) => (
                <div key={emp.employeeId} className="text-xs text-gray-600 dark:text-gray-400">
                  {emp.employeeName}: {emp.rules.join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
