// app/components/groups/shared/StatusBadge.tsx

import { GroupStatus } from '@/app/api/groups/route'

interface StatusBadgeProps {
  status: GroupStatus
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const configs: Record<GroupStatus, { color: string; label: string }> = {
    pending: {
      color:
        'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      label: 'Pendiente',
    },
    confirmed: {
      color:
        'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      label: 'Confirmado',
    },
    in_progress: {
      color:
        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      label: 'En curso',
    },
    completed: {
      color:
        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      label: 'Completado',
    },
    cancelled: {
      color:
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      label: 'Cancelado',
    },
  }

  const config = configs[status]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
    >
      {config.label}
    </span>
  )
}
