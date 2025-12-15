// app/components/groups/layout/GroupHeader.tsx

'use client'

import { GroupWithDetails } from '@/app/lib/groups'
import { StatusBadge } from '../shared/StatusBadge'
import { formatDate, formatCurrency, daysBetween } from '@/app/lib/helpers/utils'
import { FiCalendar, FiDollarSign, FiEdit, FiUsers } from 'react-icons/fi'

interface GroupHeaderProps {
  group: GroupWithDetails
  onEdit?: () => void
  onDelete?: () => void
}

export function GroupHeader({ group, onEdit }: GroupHeaderProps) {
  const nights = daysBetween(group.arrival_date, group.departure_date)

  return (
    <div className="bg-white dark:bg-[#010409] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div className="px-4 sm:px-6 py-4">
        {/* Title y Actions */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {group.name}
              </h1>
              <StatusBadge status={group.status} size="sm" />
            </div>
            {group.agency && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{group.agency}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FiEdit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Fechas */}
          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Llegada</p>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {formatDate(group.arrival_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FiCalendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Salida</p>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {formatDate(group.departure_date)}
              </p>
            </div>
          </div>

          {/* Noches */}
          <div className="flex items-center gap-2">
            <FiUsers className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Estancia</p>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {nights} {nights === 1 ? 'noche' : 'noches'}
              </p>
            </div>
          </div>

          {/* Importe */}
          <div className="flex items-center gap-2">
            <FiDollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Importe</p>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {formatCurrency(group.total_amount, group.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
