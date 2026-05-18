// app/components/notifications/header/NotificationsHeader.tsx

'use client'

import Link from 'next/link'
import { FiArrowLeft, FiCheck } from 'react-icons/fi'
import { useNotifications } from '@/app/lib/notifications/useNotifications'

export default function NotificationsHeader() {
  const { notifications, markAllAsRead } = useNotifications()
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard/profile">
          <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
            <FiArrowLeft className="w-5 h-5 text-fg-subtle" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-fg mb-1">Notificaciones</h1>
          <p className="text-xs text-fg-subtle">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leidas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 text-xs font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded-md transition-colors flex items-center gap-2"
          >
            <FiCheck className="w-3 h-3" />
            Marcar todas
          </button>
        )}
      </div>
    </div>
  )
}
