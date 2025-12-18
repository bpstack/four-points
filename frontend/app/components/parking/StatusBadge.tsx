// app/components/parking/StatusBadge.tsx
'use client'

import { STATUS_CONFIG, type BookingStatus } from './helpers'

interface StatusBadgeProps {
  status: BookingStatus | string
  size?: 'sm' | 'md'
}

/**
 * Badge de estado para reservas de parking
 * Componente compartido para usar en toda la aplicación
 */
export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as BookingStatus] || STATUS_CONFIG.reserved

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-2.5 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium flex-shrink-0 ${config.color} ${sizeClasses}`}
    >
      {config.label}
    </span>
  )
}

export default StatusBadge
