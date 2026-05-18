// app/components/conciliation/ConciliationTable.tsx
'use client'

import { FiFileText } from 'react-icons/fi'
import { useTranslations } from 'next-intl'
import type { EntryForm } from '@/app/lib/conciliation'

interface ReasonConfig {
  label: string
  direction: 'add' | 'subtract'
}

interface ConciliationTableProps<T extends string> {
  title: string
  reasons: readonly T[]
  config: Record<T, ReasonConfig>
  form: Record<T, EntryForm>
  onUpdateValue: (reason: T, field: keyof EntryForm, value: string | number) => void
  onRoomClick: (reason: T, roomString: string) => void
  onNoteClick: (reason: T, noteString: string) => void
  isReadOnly: boolean
  total: number
  colorScheme: 'blue' | 'purple'
}

function parseRooms(roomString: string): string[] {
  if (!roomString.trim()) return []
  return roomString
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
}

function parseNotes(noteString: string): string[] {
  if (!noteString.trim()) return []
  return noteString
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
}

const colorSchemes = {
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    accent: 'bg-blue-500',
    thead: 'bg-info/10',
    tfoot: 'bg-info/10 border-t-2 border-blue-200 dark:border-blue-800',
    totalText: 'text-blue-700 dark:text-blue-300',
  },
  purple: {
    border: 'border-purple-200 dark:border-purple-800',
    accent: 'bg-purple-500',
    thead: 'bg-purple-50 dark:bg-purple-900/20',
    tfoot: 'bg-purple-50 dark:bg-purple-900/20 border-t-2 border-purple-200 dark:border-purple-800',
    totalText: 'text-purple-700 dark:text-purple-300',
  },
}

export default function ConciliationTable<T extends string>({
  title,
  reasons,
  config,
  form,
  onUpdateValue,
  onRoomClick,
  onNoteClick,
  isReadOnly,
  total,
  colorScheme,
}: ConciliationTableProps<T>) {
  const colors = colorSchemes[colorScheme]
  const t = useTranslations('conciliation')

  return (
    <div className={`border ${colors.border} rounded-lg overflow-hidden`}>
      <div className="bg-surface-hover/50 px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
          <div className={`w-1 h-4 ${colors.accent} rounded-full`}></div>
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={colors.thead}>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-fg">
                {t('table.concept')}
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-fg w-20">
                {t('table.value')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-fg w-24">
                {t('table.roomNumber')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-fg w-24">
                {t('table.notes')}
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-fg w-20">
                {t('table.result')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reasons.map((reason) => {
              const reasonConfig = config[reason]
              const entry = form[reason] || { value: 0, room_number: '', notes: '' }
              const rooms = parseRooms(entry.room_number)
              const entryNotes = parseNotes(entry.notes)

              return (
                <tr key={reason} className="hover:bg-surface-hover/50">
                  <td className="px-3 py-2 text-sm text-fg">{reasonConfig.label}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={entry.value === 0 ? '' : entry.value}
                      onChange={(e) =>
                        onUpdateValue(reason, 'value', parseInt(e.target.value) || 0)
                      }
                      disabled={isReadOnly}
                      placeholder="0"
                      className="w-full px-2 py-1 text-sm text-center border border-border rounded bg-surface text-fg placeholder:text-fg-muted disabled:bg-surface-hover disabled:opacity-60 disabled:cursor-not-allowed focus:bg-surface focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onRoomClick(reason, entry.room_number)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 text-sm text-left border border-border rounded bg-surface text-fg hover:bg-surface-hover hover:border-accent disabled:bg-surface-hover disabled:opacity-60 disabled:cursor-not-allowed truncate transition-colors"
                    >
                      {rooms.length > 0 ? (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{rooms.length}</span>
                          <span className="text-fg-muted">{t('table.rooms')}</span>
                        </span>
                      ) : (
                        <span className="text-fg-muted">{t('table.add')}</span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onNoteClick(reason, entry.notes)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 text-sm text-left border border-border rounded bg-surface text-fg hover:bg-surface-hover hover:border-accent disabled:bg-surface-hover disabled:opacity-60 disabled:cursor-not-allowed truncate transition-colors"
                    >
                      {entryNotes.length > 0 ? (
                        <span className="flex items-center gap-1">
                          <FiFileText className="w-3.5 h-3.5 text-fg-muted" />
                          <span className="font-medium">{entryNotes.length}</span>
                        </span>
                      ) : (
                        <span className="text-fg-muted">{t('table.add')}</span>
                      )}
                    </button>
                  </td>
                  <td
                    className={`px-3 py-2 text-sm font-medium text-center ${
                      reasonConfig.direction === 'add'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {reasonConfig.direction === 'add' ? '+' : '-'}
                    {entry.value}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className={colors.tfoot}>
            <tr>
              <td colSpan={4} className="px-3 py-3 text-sm font-semibold text-fg">
                {t('table.total')} {title}
              </td>
              <td className={`px-3 py-3 text-sm font-bold text-center ${colors.totalText}`}>
                {total}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
