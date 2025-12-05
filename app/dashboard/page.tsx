// app/dashboard/page.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  FiUsers,
  FiActivity,
  FiArrowRight,
  FiBriefcase,
  FiFileText,
  FiBook,
  FiDollarSign,
  FiGrid,
  FiAlertTriangle,
  FiAlertCircle,
  FiRefreshCw,
  FiClock,
  FiZap,
  FiTool,
  FiCheckCircle,
} from 'react-icons/fi'
import { FaCar } from 'react-icons/fa'
import { IoIosRestaurant } from 'react-icons/io'
import { HiOutlineDocumentCheck } from 'react-icons/hi2'
import { useAuth } from '@/app/lib/auth/useAuth'

interface LogbookEntryDisplay {
  id: number
  timestamp: string
  author_name: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'resolved'
  department: string
}

interface Activity {
  action: string
  user: string
  time: string
  type: string
}

export default function DashboardHome() {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const { user: currentUser } = useAuth()
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntryDisplay[]>([])
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const getLocalDateString = useCallback((date: Date = new Date()): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const generateDateRange = useCallback(
    (daysBack: number): string[] => {
      const dates: string[] = []
      const today = new Date()

      for (let i = 0; i <= daysBack; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        dates.push(getLocalDateString(date))
      }

      return dates
    },
    [getLocalDateString]
  )

  const fetchLogbooksByPeriod = useCallback(
    async (period: 'today' | 'week' | 'month') => {
      setLoading(true)
      try {
        const { logbooksApi } = await import('@/app/api/logbooks/route')

        let dates: string[] = []
        let startTimestamp: number
        let endTimestamp: number
        const today = new Date()

        if (period === 'today') {
          const todayStart = new Date(today)
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date(today)
          todayEnd.setHours(23, 59, 59, 999)

          startTimestamp = todayStart.getTime()
          endTimestamp = todayEnd.getTime()
          dates = [getLocalDateString(today)]
        } else if (period === 'week') {
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - 6)
          weekStart.setHours(0, 0, 0, 0)
          const weekEnd = new Date(today)
          weekEnd.setHours(23, 59, 59, 999)

          startTimestamp = weekStart.getTime()
          endTimestamp = weekEnd.getTime()
          dates = generateDateRange(6)
        } else {
          const monthStart = new Date(today)
          monthStart.setDate(today.getDate() - 29)
          monthStart.setHours(0, 0, 0, 0)
          const monthEnd = new Date(today)
          monthEnd.setHours(23, 59, 59, 999)

          startTimestamp = monthStart.getTime()
          endTimestamp = monthEnd.getTime()
          dates = generateDateRange(29)
        }

        const responses = await Promise.all(
          dates.map((date) => logbooksApi.getLogbooksByDay(date).catch(() => []))
        )

        const allLogbooks: any[] = responses.flat().filter(Boolean)

        const logbooksInPeriod = allLogbooks.filter((entry: any) => {
          const createdAt = new Date(entry.created_at).getTime()
          return createdAt >= startTimestamp && createdAt <= endTimestamp
        })

        const priorityLogbooks = logbooksInPeriod.filter((entry: any) => {
          const level = entry.importance_level?.toLowerCase()
          return level === 'urgente' || level === 'alta'
        })

        const entries: LogbookEntryDisplay[] = priorityLogbooks.map((entry: any) => {
          let priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
          const level = entry.importance_level?.toLowerCase()

          if (level === 'urgente') priority = 'critical'
          else if (level === 'alta') priority = 'high'
          else if (level === 'media') priority = 'medium'

          return {
            id: entry.id,
            timestamp: entry.created_at,
            author_name: entry.author_name || 'Unknown',
            description: entry.message,
            priority,
            status: (entry.is_solved === 1 ? 'resolved' : 'pending') as 'resolved' | 'pending',
            department: `Dept ${entry.department_id}`,
          }
        })

        const sortedEntries = entries.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]

          if (priorityDiff !== 0) return priorityDiff

          const dateA = new Date(a.timestamp).getTime()
          const dateB = new Date(b.timestamp).getTime()
          return dateB - dateA
        })

        setLogbookEntries(sortedEntries)

        const activities: Activity[] = sortedEntries.slice(0, 5).map((entry) => ({
          action: 'Logbook entry added',
          user: entry.author_name,
          time: getRelativeTime(entry.timestamp),
          type: 'logbook',
        }))

        setRecentActivity(activities)
      } catch (error) {
        console.error('❌ Error fetching logbooks:', error)
        setLogbookEntries([])
        setRecentActivity([])
      } finally {
        setLoading(false)
      }
    },
    [generateDateRange, getLocalDateString]
  )

  useEffect(() => {
    fetchLogbooksByPeriod(selectedPeriod as 'today' | 'week' | 'month')
  }, [selectedPeriod, fetchLogbooksByPeriod])

  const getRelativeTime = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    const diffDays = Math.floor(diffHours / 24)
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  }

  const isUserAdmin = currentUser?.role?.toLowerCase().trim() === 'admin'

  const quickActionsLine1 = [
    {
      label: 'Nueva Entrada Consigna',
      icon: FiBook,
      href: '/dashboard/logbooks',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Reservar Plaza Parking',
      icon: FaCar,
      href: '/dashboard/parking/bookings/new',
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Imprimir Factura',
      icon: FiFileText,
      href: '/dashboard/parking/invoice',
      color: 'from-green-500 to-green-600',
    },
    {
      label: 'Reserva Nuevo Grupo',
      icon: FiUsers,
      href: '/dashboard/groups?panel=create-group',
      color: 'from-orange-500 to-orange-600',
    },
  ]

  const generalStatusItems = [
    {
      label: 'Control de Parking',
      icon: FaCar,
      href: '/dashboard/parking',
      id: 'parking-mgmt',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
    },
    {
      label: 'Gestión de Grupos',
      icon: FiGrid,
      href: '/dashboard/groups',
      id: 'group-mgmt',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/10',
    },
    {
      label: 'Mantenimiento',
      icon: FiTool,
      href: '/dashboard/maintenance',
      id: 'maintenance',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
    },
    {
      label: 'Restaurante',
      icon: IoIosRestaurant,
      href: '/dashboard/restaurant',
      id: 'restaurant',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/10',
    },
    {
      label: 'Conciliación',
      icon: HiOutlineDocumentCheck,
      href: '/dashboard/conciliation',
      id: 'conciliation',
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/10',
    },
    {
      label: 'Caja Hotel',
      icon: FiDollarSign,
      href: '/dashboard/cashier/hotel',
      id: 'hotel-cashier',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/10',
    },
    {
      label: 'Caja Parking',
      icon: FiDollarSign,
      href: '/dashboard/cashier/parking',
      id: 'parking-cashier',
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/10',
    },
    {
      label: 'Back Office',
      icon: FiBriefcase,
      href: '/dashboard/bo',
      adminOnly: true,
      id: 'back-office',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/10',
    },
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-l-red-500 dark:border-l-red-400 bg-red-50 dark:bg-red-900/10'
      case 'high':
        return 'border-l-4 border-l-yellow-500 dark:border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
      default:
        return 'border-l-4 border-l-[#d0d7de] dark:border-l-[#30363d]'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      case 'high':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-[#f6f8fa] dark:bg-[#21262d] text-[#57606a] dark:text-[#8b949e]'
    }
  }

  const getPeriodLabel = (period: string) => {
    return period === 'today' ? 'Hoy' : period === 'week' ? 'Esta Semana' : 'Este Mes'
  }

  const getPeriodText = (period: string) => {
    return period === 'today'
      ? 'del día de hoy'
      : period === 'week'
        ? 'de los últimos 7 días'
        : 'de los últimos 30 días'
  }

  const getEmptyMessage = (period: string) => {
    return period === 'today' ? 'para hoy' : period === 'week' ? 'esta semana' : 'este mes'
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20">
                  <FiZap className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#24292f] to-[#57606a] dark:from-[#f0f6fc] dark:to-[#c9d1d9] bg-clip-text text-transparent">
                  Dashboard
                </h1>
              </div>
              <p className="text-sm text-[#57606a] dark:text-[#8b949e] ml-14 font-medium">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#161b22] p-1.5 rounded-lg border border-[#d0d7de] dark:border-[#30363d] shadow-sm">
              {['today', 'week', 'month'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-5 py-2 text-sm font-semibold rounded-md transition-all duration-200 capitalize ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-[#0969da] to-[#0550ae] dark:from-[#1f6feb] dark:to-[#1a5ecf] text-white shadow-md'
                      : 'text-[#24292f] dark:text-[#c9d1d9] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d]'
                  }`}
                >
                  {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions & General Status */}
          <div className="xl:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <FiZap className="w-5 h-5 text-[#0969da] dark:text-[#58a6ff]" />
                <h2 className="text-lg font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  Acciones Rápidas
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActionsLine1.map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className="group relative overflow-hidden p-5 bg-gradient-to-br from-[#f6f8fa] to-white dark:from-[#161B22] dark:to-[#161b22] border border-[#d0d7de] dark:border-[#21262d] rounded-xl hover:border-[#0969da] dark:hover:border-[#58a6ff] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={`p-3 bg-gradient-to-br ${action.color} rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <action.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-[#24292f] dark:text-[#c9d1d9] leading-tight group-hover:text-[#0969da] dark:group-hover:text-[#58a6ff] transition-colors">
                        {action.label}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* General Status */}
            <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <FiGrid className="w-5 h-5 text-[#0969da] dark:text-[#58a6ff]" />
                <h2 className="text-lg font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  Estatus Global
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generalStatusItems.map((item) => {
                  if (item.adminOnly && !isUserAdmin) return null

                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      className={`group relative overflow-hidden p-5 ${item.bgColor} border border-[#d0d7de] dark:border-[#30363d] rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
                    >
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div
                          className={`p-3 bg-gradient-to-br ${item.color} rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300`}
                        >
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-[#24292f] dark:text-[#c9d1d9] leading-tight">
                          {item.label}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/5 dark:to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Contextual Help */}
            <div className="bg-gradient-to-br from-[#ddf4ff] to-[#b6e3ff] dark:from-[#051d30] dark:to-[#0a2540] border border-[#9cd7ff] dark:border-[#1f6feb] rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-[#0969da] dark:bg-[#1f6feb] rounded-lg shadow-lg">
                  <FiAlertCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  Ayuda Contextual
                </h3>
              </div>

              <div className="space-y-4 text-sm text-[#24292f] dark:text-[#c9d1d9] leading-relaxed">
                <div className="space-y-2 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2 font-bold text-[#0969da] dark:text-[#58a6ff]">
                    <FiCheckCircle className="w-4 h-4" />
                    ¡Importante para {getPeriodLabel(selectedPeriod)}!
                  </div>
                  <p>
                    Entradas de logbooks con prioridad Alta {getPeriodText(selectedPeriod)}. Muestra
                    tareas pendientes urgentes, solicitudes de mantenimiento prioritarias, quejas de
                    clientes y otros elementos que requieren atención inmediata.
                    {logbookEntries.length > 5 && ' Desplázate para ver todas las entradas.'}
                  </p>
                </div>

                <div className="space-y-2 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                  <div className="flex items-center gap-2 font-bold text-[#0969da] dark:text-[#58a6ff]">
                    <FiCheckCircle className="w-4 h-4" />
                    Cambio de Período
                  </div>
                  <p>
                    Usa los botones en la parte superior (Hoy, Semana, Mes) para filtrar las
                    entradas críticas según el período que necesites revisar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Important Logbooks & Recent Activity */}
          <div className="space-y-6">
            {/* Important Logbooks */}
            <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <FiAlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-sm font-bold text-[#24292f] dark:text-[#f0f6fc]">
                    ¡Importante para {getPeriodLabel(selectedPeriod)}!
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      fetchLogbooksByPeriod(selectedPeriod as 'today' | 'week' | 'month')
                    }
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <FiRefreshCw
                      className={`w-4 h-4 text-[#57606a] dark:text-[#8b949e] ${loading ? 'animate-spin' : ''}`}
                    />
                  </button>
                  <a href="/dashboard/logbooks">
                    <button className="text-xs font-semibold text-[#0969da] dark:text-[#58a6ff] hover:text-[#0550ae] dark:hover:text-[#79c0ff] flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors">
                      Ver todo <FiArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </a>
                </div>
              </div>

              {/* Contador de entradas */}
              {!loading && logbookEntries.length > 0 && (
                <div className="mb-3 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <FiAlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    <strong className="font-bold">{logbookEntries.length}</strong> entrada
                    {logbookEntries.length !== 1 ? 's' : ''} {getEmptyMessage(selectedPeriod)}
                  </span>
                </div>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse p-4 bg-gradient-to-br from-[#f6f8fa] to-white dark:from-[#0d1117] dark:to-[#161b22] rounded-lg border border-[#d0d7de] dark:border-[#21262d] h-28"
                    />
                  ))}
                </div>
              ) : logbookEntries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-3">
                    <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-[#57606a] dark:text-[#8b949e]">
                    No hay items críticos o de alta prioridad {getEmptyMessage(selectedPeriod)}
                  </p>
                </div>
              ) : (
                <div
                  className={`space-y-3 ${logbookEntries.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#d0d7de] dark:scrollbar-thumb-[#30363d] scrollbar-track-transparent' : ''}`}
                >
                  {logbookEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-lg ${getPriorityColor(entry.priority)} border border-[#d0d7de] dark:border-[#30363d] hover:shadow-md transition-shadow duration-200`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FiClock className="w-3.5 h-3.5 text-[#57606a] dark:text-[#8b949e]" />
                          <span className="text-xs font-bold text-[#24292f] dark:text-[#f0f6fc]">
                            {new Date(entry.timestamp).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                            })}{' '}
                            {new Date(entry.timestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.status === 'resolved' ? (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-bold border border-green-200 dark:border-green-800">
                              Resuelto
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800">
                              Pendiente
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border ${getPriorityBadge(entry.priority)}`}
                          >
                            {entry.priority === 'critical' && (
                              <FiAlertTriangle className="w-3 h-3" />
                            )}
                            {entry.priority === 'high' && <FiAlertCircle className="w-3 h-3" />}
                            {entry.priority === 'critical'
                              ? 'Crítico'
                              : entry.priority === 'high'
                                ? 'Alto'
                                : 'Normal'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#57606a] dark:text-[#8b949e] mb-2 font-medium">
                        Por {entry.author_name}
                      </p>
                      <p className="text-xs text-[#24292f] dark:text-[#c9d1d9] leading-relaxed">
                        {entry.description.length > 400
                          ? `${entry.description.substring(0, 400)}...`
                          : entry.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <FiActivity className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-sm font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  Actividad Reciente
                </h2>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#d0d7de] dark:bg-[#30363d] rounded-full mt-2" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-[#d0d7de] dark:bg-[#21262d] rounded w-3/4" />
                        <div className="h-2.5 bg-[#d0d7de] dark:bg-[#21262d] rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-medium text-[#57606a] dark:text-[#8b949e]">
                    No hay actividad reciente
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.slice(0, 5).map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#0d1117] transition-colors duration-150"
                    >
                      <div className="flex-shrink-0 mt-2">
                        <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#24292f] dark:text-[#f0f6fc]">
                          {activity.action}
                        </p>
                        <p className="text-xs text-[#57606a] dark:text-[#8b949e] mt-0.5">
                          {activity.user}
                        </p>
                        <p className="text-[11px] text-[#57606a] dark:text-[#8b949e] mt-0.5 font-medium">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
