// app/components/groups/tabs/HistoryTab.tsx

'use client'

import { useEffect, useState } from 'react'
import { useGroupStore } from '@/app/stores/useGroupStore'
import { groupsApi, GroupHistoryRecord, HistoryAction } from '@/app/api/groups/route'
import { HistoryItem } from '../history/HistoryItem'
import { EmptyState } from '../shared/EmptyState'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { FiClock, FiFilter } from 'react-icons/fi'

const ACTION_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: HistoryAction.CREATED, label: 'Creados' },
  { value: HistoryAction.UPDATED, label: 'Actualizados' },
  { value: HistoryAction.DELETED, label: 'Eliminados' },
  { value: HistoryAction.STATUS_CHANGED, label: 'Estados' },
  { value: HistoryAction.PAYMENT_UPDATED, label: 'Pagos' },
]

export function HistoryTab() {
  const { currentGroup } = useGroupStore()
  const [history, setHistory] = useState<GroupHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (currentGroup) {
      loadHistory()
    }
  }, [currentGroup])

  const loadHistory = async () => {
    if (!currentGroup) return

    try {
      setIsLoading(true)
      const response = await groupsApi.getHistory(currentGroup.id)

      // ← AÑADIR ESTO
      console.log('🔍 DEBUG History records:', response.data)
      console.log('🔍 First record:', response.data?.[0])

      setHistory(response.data || [])
    } catch (error) {
      console.error('Error loading history:', error)
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" message="Cargando historial..." />
      </div>
    )
  }

  const filteredHistory =
    filter === 'all' ? history : history.filter((record) => record.action === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FiClock className="w-4 h-4" />
            Historial de Cambios
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Registro de todas las modificaciones del grupo
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#151b23] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTION_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <EmptyState
          icon={<FiClock className="w-12 h-12" />}
          title={filter === 'all' ? 'No hay historial registrado' : 'No hay cambios de este tipo'}
          description={
            filter === 'all' ? 'Los cambios del grupo aparecerán aquí' : 'Intenta con otro filtro'
          }
        />
      ) : (
        <div className="relative">
          {filteredHistory.map((record) => (
            <HistoryItem key={record.id} record={record} />
          ))}
        </div>
      )}

      {/* Stats */}
      {history.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            📊 <strong>Total de cambios:</strong> {history.length} registros
            {filter !== 'all' && ` (${filteredHistory.length} filtrados)`}
          </p>
        </div>
      )}
    </div>
  )
}
