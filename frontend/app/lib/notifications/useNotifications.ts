// lib/notifications/useNotifications.ts

import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '@/app/stores/useNotificationStore'
import { apiClient } from '@/app/lib/apiClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function useNotifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    setNotifications,
    setUnreadCount,
    setLoading,
    setError,
    markAsRead: markAsReadStore,
    markAllAsRead: markAllAsReadStore,
    removeNotification: removeNotificationStore,
  } = useNotificationStore()

  /**
   * Obtener todas las notificaciones del usuario
   */
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get(`${API_URL}/api/notifications`)
      setNotifications(data.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar notificaciones'
      setError(message)
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setNotifications])

  /**
   * Obtener solo notificaciones no leídas
   */
  const fetchUnreadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.get(`${API_URL}/api/notifications/unread`)
      setNotifications(data.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar notificaciones no leídas'
      setError(message)
      console.error('Error fetching unread notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setNotifications])

  /**
   * Obtener contador de no leídas
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiClient.get(`${API_URL}/api/notifications/unread/count`)
      setUnreadCount(data.count || 0)
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }, [setUnreadCount])

  /**
   * Marcar como leída
   */
  const markAsRead = useCallback(
    async (id: number) => {
      try {
        await apiClient.patch(`${API_URL}/api/notifications/${id}/read`)
        markAsReadStore(id)
        await fetchUnreadCount() // Actualizar contador
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al marcar como leída'
        setError(message)
        console.error('Error marking as read:', err)
      }
    },
    [markAsReadStore, fetchUnreadCount, setError]
  )

  /**
   * Marcar todas como leídas
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch(`${API_URL}/api/notifications/read-all`)
      markAllAsReadStore()
      setUnreadCount(0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al marcar todas como leídas'
      setError(message)
      console.error('Error marking all as read:', err)
    }
  }, [markAllAsReadStore, setUnreadCount, setError])

  /**
   * Eliminar notificación (solo admin)
   */
  const deleteNotification = useCallback(
    async (id: number) => {
      try {
        await apiClient.delete(`${API_URL}/api/notifications/${id}`)
        removeNotificationStore(id)
        await fetchUnreadCount() // Actualizar contador
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar notificación'
        setError(message)
        console.error('Error deleting notification:', err)
      }
    },
    [removeNotificationStore, fetchUnreadCount, setError]
  )

  /**
   * Auto-fetch al montar el componente
   */
  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
  }, [fetchNotifications, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
