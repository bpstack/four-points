// app/components/dashboard/RecentActivityCard.tsx
'use client'

import React from 'react'
import { FiActivity, FiRefreshCw } from 'react-icons/fi'
import { FaCar } from 'react-icons/fa'
import { FiUsers, FiBook, FiTool } from 'react-icons/fi'

export type ActivitySource = 'cashier' | 'groups' | 'logbook' | 'maintenance'

export interface UnifiedActivity {
  id: string
  source: ActivitySource
  action: string
  user_id: string
  username: string
  timestamp: string
  record_id: string | number | null
}

interface RecentActivityCardProps {
  activities: UnifiedActivity[]
  loading: boolean
  onRefresh?: () => void
}

// Traducciones de acciones por fuente
const actionTranslations: Record<ActivitySource, Record<string, string>> = {
  cashier: {
    create: 'Turno creado',
    created: 'Turno creado',
    updated: 'Turno actualizado',
    shift_opened: 'Turno abierto',
    shift_closed: 'Turno cerrado',
    status_changed: 'Estado cambiado',
    day_initialized: 'Día inicializado',
    day_closed: 'Día cerrado',
    payment_added: 'Pago añadido',
    payment_deleted: 'Pago eliminado',
    voucher_created: 'Voucher creado',
    voucher_deleted: 'Voucher eliminado',
    denomination_updated: 'Denominación actualizada',
    default: 'Acción en caja',
  },
  groups: {
    create: 'Grupo creado',
    created: 'Grupo creado',
    updated: 'Grupo actualizado',
    deleted: 'Grupo eliminado',
    status_changed: 'Estado cambiado',
    contact_added: 'Contacto añadido',
    room_added: 'Habitación añadida',
    payment_added: 'Pago registrado',
    default: 'Acción en grupos',
  },
  logbook: {
    create: 'Entrada creada',
    created: 'Entrada creada',
    edited: 'Entrada editada',
    updated: 'Entrada editada',
    deleted: 'Entrada eliminada',
    solved: 'Marcada resuelta',
    unsolved: 'Marcada pendiente',
    comment_added: 'Comentario añadido',
    comment_edited: 'Comentario editado',
    default: 'Acción en consigna',
  },
  maintenance: {
    create: 'Reporte creado',
    created: 'Reporte creado',
    updated: 'Reporte actualizado',
    status_changed: 'Estado cambiado',
    assigned: 'Asignación cambiada',
    resolved: 'Reporte resuelto',
    closed: 'Reporte cerrado',
    deleted: 'Reporte eliminado',
    restored: 'Reporte restaurado',
    priority_changed: 'Prioridad cambiada',
    default: 'Acción en mantenimiento',
  },
}

// Nombres de fuentes en español
const sourceNames: Record<ActivitySource, string> = {
  cashier: 'Caja',
  groups: 'Grupos',
  logbook: 'Consigna',
  maintenance: 'Mantenimiento',
}

// Colores por fuente
const sourceColors: Record<ActivitySource, string> = {
  cashier: 'from-emerald-500 to-emerald-600',
  groups: 'from-orange-500 to-orange-600',
  logbook: 'from-blue-500 to-blue-600',
  maintenance: 'from-yellow-500 to-yellow-600',
}

// Iconos por fuente
const SourceIcon: React.FC<{ source: ActivitySource; className?: string }> = ({
  source,
  className,
}) => {
  const iconClass = className || 'w-3 h-3'
  switch (source) {
    case 'cashier':
      return <FaCar className={iconClass} />
    case 'groups':
      return <FiUsers className={iconClass} />
    case 'logbook':
      return <FiBook className={iconClass} />
    case 'maintenance':
      return <FiTool className={iconClass} />
  }
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()

  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    return timestamp // Retornar el timestamp original si no es válido
  }

  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  // Normalizar fechas a medianoche en zona local para comparación correcta
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffTime = today.getTime() - targetDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // Si es hoy
  if (diffDays === 0) {
    return `Hoy, ${time}`
  }

  // Si es ayer
  if (diffDays === 1) {
    return `Ayer, ${time}`
  }

  // Si es dentro de la última semana (2-6 días atrás)
  if (diffDays >= 2 && diffDays < 7) {
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1)
    return `${capitalizedDay}, ${time}`
  }

  // Datos para fecha más antigua
  const day = date.getDate()
  const month = date.toLocaleDateString('es-ES', { month: 'short' })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  const year = date.getFullYear()
  const currentYear = now.getFullYear()

  // Si es de este año, mostrar día y mes
  if (year === currentYear) {
    return `${day} ${capitalizedMonth}, ${time}`
  }

  // Si es de otro año, incluir el año
  return `${day} ${capitalizedMonth} ${year}, ${time}`
}

const translateAction = (source: ActivitySource, action: string): string => {
  const translations = actionTranslations[source]
  return translations[action] || translations['default'] || action
}

export function RecentActivityCard({ activities, loading, onRefresh }: RecentActivityCardProps) {
  return (
    <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <FiActivity className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-sm font-bold text-[#24292f] dark:text-[#f0f6fc]">
            Actividad Reciente
          </h2>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <FiRefreshCw
              className={`w-4 h-4 text-[#57606a] dark:text-[#8b949e] ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-6 h-6 bg-[#d0d7de] dark:bg-[#30363d] rounded-full mt-1" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[#d0d7de] dark:bg-[#21262d] rounded w-3/4" />
                <div className="h-2.5 bg-[#d0d7de] dark:bg-[#21262d] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-medium text-[#57606a] dark:text-[#8b949e]">
            No hay actividad reciente
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#0d1117] transition-colors duration-150"
            >
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className={`w-6 h-6 flex items-center justify-center bg-gradient-to-br ${sourceColors[activity.source]} rounded-full shadow-sm`}
                >
                  <SourceIcon source={activity.source} className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-[#24292f] dark:text-[#f0f6fc]">
                    {translateAction(activity.source, activity.action)}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f6f8fa] dark:bg-[#21262d] text-[#57606a] dark:text-[#8b949e] font-medium">
                    {sourceNames[activity.source]}
                  </span>
                </div>
                <p className="text-xs text-[#57606a] dark:text-[#8b949e]">{activity.username}</p>
                <p className="text-[11px] text-[#57606a] dark:text-[#8b949e] mt-0.5 font-medium">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
