// app/components/notifications/lists/NotificationsList.tsx

'use client'

import { useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { useNotifications } from '@/app/lib/notifications/useNotifications'
import NotificationItem from '../items/NotificationItem'
import { useTranslations } from 'next-intl'

type FilterType = 'all' | 'unread'

export default function NotificationsList() {
  const t = useTranslations('notifications')
  const { notifications, loading, markAsRead, deleteNotification } = useNotifications()
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-accent text-accent-fg'
              : 'bg-surface-hover text-fg-muted hover:text-fg'
          }`}
        >
          {t('list.all', { count: notifications.length })}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            filter === 'unread'
              ? 'bg-accent text-accent-fg'
              : 'bg-surface-hover text-fg-muted hover:text-fg'
          }`}
        >
          {t('list.unread', { count: unreadCount })}
        </button>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-fp-md overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <FiBell className="w-12 h-12 mx-auto text-fg-subtle mb-2" />
            <p className="text-sm text-fg-subtle">
              {filter === 'unread' ? t('list.noUnread') : t('list.noNotifications')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
