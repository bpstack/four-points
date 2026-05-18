// app/components/notifications/bell/NotificationBell.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/app/lib/notifications/useNotifications'
import { FiBell, FiCheck, FiExternalLink } from 'react-icons/fi'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Notification } from '@/app/lib/notifications/types'
import { PRIORITY_COLORS } from '@/app/lib/notifications/types'

export default function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Solo las 5 mas recientes no leidas
  const recentUnread = notifications.filter((n) => !n.is_read).slice(0, 5)

  const handleNotificationClick = async (id: number, directLink: string | null) => {
    await markAsRead(id)
    setIsOpen(false)

    if (directLink) {
      router.push(directLink)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button con Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 md:p-2 text-fg-muted hover:bg-surface-hover rounded-lg transition-colors"
      >
        <FiBell className="w-4 h-4 md:w-5 md:h-5" />

        {/* Badge contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 min-w-[16px] md:min-w-[20px] h-4 md:h-5 px-1 bg-red-600 text-white text-[10px] md:text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-14 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-surface border border-border rounded-fp-md shadow-fp-modal z-50 max-h-[70vh] sm:max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-fg">
              Notificaciones {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
              >
                <FiCheck className="w-3 h-3" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto" />
              </div>
            ) : recentUnread.length === 0 ? (
              <div className="p-8 text-center">
                <FiBell className="w-12 h-12 mx-auto text-fg-subtle mb-2" />
                <p className="text-sm text-fg-subtle">No tienes notificaciones nuevas</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentUnread.map((notification) => (
                  <DropdownItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <Link
              href="/dashboard/profile?panel=notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-xs text-accent hover:text-accent-hover py-2 rounded hover:bg-surface-hover transition-colors"
            >
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------
// Dropdown Item (internal component)
// -------------------------------------------------------

interface DropdownItemProps {
  notification: Notification
  onClick: (id: number, directLink: string | null) => void
}

function DropdownItem({ notification, onClick }: DropdownItemProps) {
  const relativeTime = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: es,
  })

  return (
    <button
      onClick={() => onClick(notification.id, notification.direct_link)}
      className={`w-full p-3 hover:bg-surface-hover transition-colors text-left border-l-4 ${
        PRIORITY_COLORS[notification.priority]
      }`}
    >
      {/* Titulo */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-fg line-clamp-1">{notification.title}</p>
        {notification.direct_link && (
          <FiExternalLink className="w-3 h-3 text-fg-subtle flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Mensaje */}
      {notification.message && (
        <p className="text-xs text-fg-muted line-clamp-2 mb-1">{notification.message}</p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-fg-subtle">
        {notification.group_name && (
          <>
            <span className="truncate">{notification.group_name}</span>
            <span>•</span>
          </>
        )}
        <span>{relativeTime}</span>
      </div>
    </button>
  )
}
