//app/dashboard/profile/notifications/page.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/app/lib/notifications/useNotifications'
import { FiArrowLeft, FiCheck, FiTrash2, FiBell, FiFilter } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  const priorityColors = {
    low: 'border-gray-300 dark:border-gray-600',
    medium: 'border-blue-400 dark:border-blue-600',
    high: 'border-yellow-400 dark:border-yellow-600',
    urgent: 'border-red-500 dark:border-red-600',
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-white text-gray-800 dark:bg-[#010409] dark:text-gray-300">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/profile">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors">
                <FiArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Notificaciones
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2"
              >
                <FiCheck className="w-3 h-3" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#21262d] dark:text-gray-300 dark:hover:bg-[#30363d]'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#21262d] dark:text-gray-300 dark:hover:bg-[#30363d]'
              }`}
            >
              Sin leer ({unreadCount})
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <FiBell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-[#30363d]">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  priorityColors={priorityColors}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationItem({ notification, onMarkAsRead, onDelete, priorityColors }: any) {
  const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: es,
  })

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }
    if (notification.direct_link) {
      window.location.href = notification.direct_link
    }
  }

  return (
    <div
      className={`p-4 border-l-4 ${priorityColors[notification.priority]} ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={handleClick} className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            {!notification.is_read && (
              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
            )}
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {notification.title}
            </h3>
          </div>
          {notification.message && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{notification.message}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {notification.group_name && (
              <>
                <span>{notification.group_name}</span>
                <span>•</span>
              </>
            )}
            <span>{relativeTime}</span>
          </div>
        </button>

        <div className="flex gap-1">
          {!notification.is_read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Marcar como leída"
            >
              <FiCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Eliminar"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
