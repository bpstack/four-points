// app/components/conciliation/RoomPopover.tsx
'use client'

import { FiX } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

interface RoomPopoverProps {
  rooms: string[]
  isReadOnly: boolean
  onClose: () => void
  onAddRoom: (room: string) => void
  onRemoveRoom: (room: string) => void
}

export default function RoomPopover({
  rooms,
  isReadOnly,
  onClose,
  onAddRoom,
  onRemoveRoom,
}: RoomPopoverProps) {
  const t = useTranslations('conciliation')

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-hover border border-border rounded-lg shadow-xl p-4 w-80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-fg">
            {t('roomPopover.title')} ({rooms.length}/15)
          </h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {!isReadOnly && (
          <div className="mb-3">
            <input
              type="text"
              placeholder={t('roomPopover.placeholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAddRoom(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-surface text-fg placeholder:text-fg-muted focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors"
            />
            <p className="text-xs text-fg-subtle mt-1">{t('roomPopover.pressEnter')}</p>
          </div>
        )}

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {rooms.length === 0 ? (
            <p className="text-xs text-fg-subtle text-center py-4">{t('roomPopover.noRooms')}</p>
          ) : (
            rooms.map((room) => (
              <div
                key={room}
                className="flex items-center justify-between px-3 py-2 bg-surface-hover rounded text-sm"
              >
                <span className="text-fg font-medium">{room}</span>
                {!isReadOnly && (
                  <button
                    onClick={() => onRemoveRoom(room)}
                    className="text-danger hover:opacity-70"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
