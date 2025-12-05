// stores/useNotificationStore.ts

import { create } from 'zustand'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NotificationModule = 'groups' | 'parking' | 'logbooks' | 'system'
export type NotificationRelatedTo =
  | 'payment'
  | 'rooming'
  | 'balance'
  | 'contract'
  | 'arrival'
  | 'general'

export interface Notification {
  id: number
  module: NotificationModule
  group_id: number | null
  related_to: NotificationRelatedTo
  related_id: number | null
  direct_link: string | null
  title: string
  message: string | null
  priority: NotificationPriority
  is_read: boolean
  read_at: string | null
  group_name?: string
  created_at: string
  updated_at: string
}

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
