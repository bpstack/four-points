// stores/useNotificationStore.ts

import { create } from 'zustand'
import type { Notification } from '@/app/lib/notifications/types'

// Re-export types for convenience
export type {
  Notification,
  NotificationPriority,
  NotificationModule,
  NotificationRelatedTo,
} from '@/app/lib/notifications/types'

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null

  // Actions
  setNotifications: (notifications: Notification[]) => void
  setUnreadCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  removeNotification: (id: number) => void
  reset: () => void
}

// ═══════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  setNotifications: (notifications) => set({ notifications }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    }),
}))
