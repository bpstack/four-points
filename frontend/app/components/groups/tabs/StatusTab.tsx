// app/components/groups/tabs/StatusTab.tsx

'use client'

import { useGroupStore } from '@/app/stores/useGroupStore'
import { useGroupStatus } from '@/app/lib/groups'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import { StatusTimeline } from '../status/StatusTimeline'
import { BookingCard } from '../status/BookingCard'
import { ContractCard } from '../status/ContractCard'
import { RoomingCard } from '../status/RoomingCard'
import { BalanceCard } from '../status/BalanceCard'
import { FiActivity } from 'react-icons/fi'

export function StatusTab() {
  const { currentGroup } = useGroupStore()

  const groupId = currentGroup?.id
  const { data: status, isLoading } = useGroupStatus(groupId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" message="Cargando estados..." />
      </div>
    )
  }

  if (!status) {
    return (
      <EmptyState
        icon={<FiActivity className="w-12 h-12" />}
        title="No se pudo cargar el estado"
        description="Intenta recargar la página"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FiActivity className="w-4 h-4" />
          Estado del Grupo
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Seguimiento del progreso administrativo
        </p>
      </div>

      {/* Timeline */}
      <StatusTimeline status={status} />

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BookingCard status={status} groupId={currentGroup!.id} />
        <ContractCard status={status} groupId={currentGroup!.id} />
        <RoomingCard status={status} groupId={currentGroup!.id} />
        <BalanceCard groupId={currentGroup!.id} />
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          💡 <strong>Edición inline:</strong> Haz clic en el icono de editar para actualizar cada
          estado de forma rápida.
        </p>
      </div>
    </div>
  )
}
