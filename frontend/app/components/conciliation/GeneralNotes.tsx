// app/components/conciliation/GeneralNotes.tsx
'use client'

import { FiAlertCircle, FiPlus, FiUser, FiClock, FiTrash2 } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

interface Note {
  id: string
  text: string
  author: string
  timestamp: string
  author_id: string
}

interface GeneralNotesProps {
  notes: Note[]
  newNoteText: string
  isReadOnly: boolean
  currentUserId: string | undefined
  onNewNoteChange: (text: string) => void
  onAddNote: () => void
  onDeleteNote: (noteId: string, authorId: string) => void
}

function formatNoteDate(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function GeneralNotes({
  notes,
  newNoteText,
  isReadOnly,
  currentUserId,
  onNewNoteChange,
  onAddNote,
  onDeleteNote,
}: GeneralNotesProps) {
  const t = useTranslations('conciliation')

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="bg-surface-hover px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4" />
          {t('generalNotes.title')} ({notes.length})
        </h3>
      </div>

      <div className="p-4 flex-1 flex flex-col" style={{ maxHeight: '400px' }}>
        {!isReadOnly && (
          <div className="space-y-2 flex-shrink-0 mb-4">
            <textarea
              value={newNoteText}
              onChange={(e) => onNewNoteChange(e.target.value)}
              placeholder={t('generalNotes.placeholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-surface text-fg placeholder:text-fg-muted focus:bg-surface focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors resize-none"
            />
            <button
              onClick={onAddNote}
              disabled={!newNoteText.trim()}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              {t('generalNotes.addNote')}
            </button>
          </div>
        )}

        <div className="space-y-2 overflow-y-auto flex-1">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-fg-subtle text-xs">
              {t('generalNotes.noNotes')}
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-surface-hover border border-border rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex flex-col gap-0.5 text-[10px] text-fg-muted min-w-0">
                    <div className="flex items-center gap-1">
                      <FiUser className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium truncate">{note.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiClock className="w-3 h-3 flex-shrink-0" />
                      <span>{formatNoteDate(note.timestamp)}</span>
                    </div>
                  </div>
                  {!isReadOnly && currentUserId === note.author_id && (
                    <button
                      onClick={() => onDeleteNote(note.id, note.author_id)}
                      className="text-danger hover:opacity-70 flex-shrink-0"
                      title={t('generalNotes.deleteNote')}
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-fg whitespace-pre-wrap break-words">{note.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
