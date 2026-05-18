// app/components/profile/NotificationsPanel.tsx

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FiBell, FiCheck } from 'react-icons/fi'
import { useNotifications } from '@/app/lib/notifications/useNotifications'
import NotificationItem from '@/app/components/notifications/items/NotificationItem'

type FilterType = 'all' | 'unread'

export function NotificationsPanel() {
  const t = useTranslations('notifications')
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications()
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-fp-md p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-fp-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">{t('panel.title')}</h2>
            <p className="text-xs text-fg-subtle mt-0.5">
              {unreadCount > 0
                ? t('panel.unreadCount', { count: unreadCount })
                : t('panel.allRead')}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 text-xs font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded-md transition-colors flex items-center gap-1.5"
            >
              <FiCheck className="w-3 h-3" />
              {t('panel.markAll')}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
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
      </div>

      {/* List */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
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
