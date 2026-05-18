// app/components/conciliation/NotePopover.tsx
'use client'

import { FiX } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

interface NotePopoverProps {
  notes: string[]
  isReadOnly: boolean
  onClose: () => void
  onAddNote: (note: string) => void
  onRemoveNote: (note: string) => void
}

export default function NotePopover({
  notes,
  isReadOnly,
  onClose,
  onAddNote,
  onRemoveNote,
}: NotePopoverProps) {
  const t = useTranslations('conciliation')

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-hover border border-border rounded-lg shadow-xl p-4 w-96">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-fg">
            {t('notePopover.title')} ({notes.length}/10)
          </h3>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {!isReadOnly && (
          <div className="mb-3">
            <input
              type="text"
              placeholder={t('notePopover.placeholder')}
              maxLength={200}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAddNote(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-surface text-fg placeholder:text-fg-muted focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors"
            />
            <p className="text-xs text-fg-subtle mt-1">{t('notePopover.pressEnter')}</p>
          </div>
        )}

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-xs text-fg-subtle text-center py-4">{t('notePopover.noNotes')}</p>
          ) : (
            notes.map((note, index) => (
              <div
                key={index}
                className="flex items-start justify-between px-3 py-2 bg-surface-hover rounded text-sm gap-2"
              >
                <span className="text-fg break-words flex-1">{note}</span>
                {!isReadOnly && (
                  <button
                    onClick={() => onRemoveNote(note)}
                    className="text-danger hover:opacity-70 flex-shrink-0"
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
