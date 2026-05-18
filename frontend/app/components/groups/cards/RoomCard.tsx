// app/components/groups/cards/RoomCard.tsx

'use client'

import { GroupRoom, RoomType } from '@/app/lib/groups'
import { FiEdit, FiUsers, FiFileText } from 'react-icons/fi'

interface RoomCardProps {
  room: GroupRoom
  onEdit: () => void
}

const ROOM_TYPE_CONFIG = {
  [RoomType.SINGLE]: {
    // ← CAMBIAR
    label: 'Individual',
    icon: '🛏️',
    color: 'from-blue-500 to-cyan-600',
  },
  [RoomType.DOUBLE_BED]: {
    // ← CAMBIAR
    label: 'Doble (1 cama)',
    icon: '🛏️',
    color: 'from-purple-500 to-pink-600',
  },
  [RoomType.TWIN_BEDS]: {
    // ← CAMBIAR
    label: 'Doble (2 camas)',
    icon: '🛏️🛏️',
    color: 'from-green-500 to-emerald-600',
  },
} as const

export function RoomCard({ room, onEdit }: RoomCardProps) {
  const config = ROOM_TYPE_CONFIG[room.room_type]
  const totalGuests = room.quantity * room.guests_per_room

  return (
    <div className="bg-surface rounded-lg border border-border p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center text-lg`}
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-fg">{config.label}</h3>
            <p className="text-xs text-fg-subtle">
              {room.quantity} {room.quantity === 1 ? 'habitación' : 'habitaciones'}
            </p>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-8 h-8 text-fg-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-surface-hover rounded transition-colors"
        >
          <FiEdit className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 bg-info/10 rounded-md flex items-center justify-center">
            <FiUsers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-fg-subtle">Por habitación</p>
            <p className="text-sm font-semibold text-fg">
              {room.guests_per_room} {room.guests_per_room === 1 ? 'persona' : 'personas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-50 dark:bg-purple-900/20 rounded-md flex items-center justify-center">
            <FiUsers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] text-fg-subtle">Total huéspedes</p>
            <p className="text-sm font-semibold text-fg">{totalGuests}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {room.notes && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-start gap-2">
            <FiFileText className="w-3.5 h-3.5 text-fg-subtle flex-shrink-0 mt-0.5" />
            <p className="text-xs text-fg-muted line-clamp-2">{room.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
