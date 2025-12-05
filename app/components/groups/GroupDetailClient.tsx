// app/components/groups/GroupDetailClient.tsx

'use client'

// TODO (Estado unificado):
// Actualmente existe lógica de sincronización entre hotel_groups.status
// y group_status.booking_confirmed porque ambas tablas duplican el estado del grupo.
// Cuando se elimine esta duplicidad en la base de datos:
//   1. ELIMINAR toda la lógica de sincronización.
//   2. Unificar el estado en una sola tabla (decidir entre hotel_groups o group_status).
//   3. Simplificar updateGroup() y updateBooking() para evitar actualizaciones cruzadas.
//   4. Actualizar modelos, DTOs y store del frontend.
// IMPORTANTE: Este archivo depende directamente del diseño actual duplicado.

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGroupStore } from '@/app/stores/useGroupStore'
import { GroupWithDetails } from '@/app/api/groups/route'
import { GroupHeader } from './layout/GroupHeader'
import { TabNavigation } from './layout/TabNavigation'
import { OverviewTab } from './tabs/OverviewTab'
import { PaymentsTab } from './tabs/PaymentsTab'
import { ContactsTab } from './tabs/ContactsTab'
import { RoomsTab } from './tabs/RoomsTab'
import { StatusTab } from './tabs/StatusTab'
import { HistoryTab } from './tabs/HistoryTab'
import { PaymentPanel } from './panels/PaymentPanel'
import { ContactPanel } from './panels/ContactPanel'
import { RoomPanel } from './panels/RoomPanel'
import { EditGroupPanel } from './panels/EditGroupPanel' // ← NUEVO IMPORT
import { LoadingSpinner } from './shared/LoadingSpinner'

interface GroupDetailClientProps {
  initialGroup: GroupWithDetails
}

export function GroupDetailClient({ initialGroup }: GroupDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const panel = searchParams.get('panel')
  const highlightId = searchParams.get('highlight')

  const {
    currentGroup,
    payments,
    contacts,
    rooms,
    setCurrentGroup,
    setActiveTab,
    setHighlight,
    refreshGroup,
    refreshStatus, // ← Usar esto para refrescar después de editar
    isLoadingGroup,
  } = useGroupStore()

  // Inicializar grupo en el store
  useEffect(() => {
    setCurrentGroup(initialGroup)
  }, [initialGroup, setCurrentGroup])

  // Sincronizar activeTab con query params
  useEffect(() => {
    setActiveTab(activeTab)
  }, [activeTab, setActiveTab])

  // Sincronizar highlight con query params
  useEffect(() => {
    if (highlightId) {
      setHighlight(parseInt(highlightId))
    } else {
      setHighlight(null)
    }
  }, [highlightId, setHighlight])

  const handleEdit = () => {
    // ✅ CAMBIO: Abrir panel de edición
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'edit-group')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleDelete = () => {
    // TODO: Abrir modal de confirmación
    console.log('Delete group:', currentGroup?.id)
  }

  const handleClosePanel = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('panel')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // ✅ NUEVO: Refrescar grupo después de editar
  const handleEditSuccess = async () => {
    if (currentGroup) {
      await refreshGroup(currentGroup.id)
      await refreshStatus(currentGroup.id) // ← Esto debe estar
    }
  }

  // Payment Panel Logic
  const isPaymentPanelOpen =
    panel === 'new-payment' || (panel?.startsWith('edit-payment-') ?? false)
  const editingPaymentId = panel?.startsWith('edit-payment-')
    ? parseInt(panel.replace('edit-payment-', ''))
    : null
  const editingPayment = editingPaymentId
    ? payments.find((p) => p.id === editingPaymentId)
    : undefined

  // Contact Panel Logic
  const isContactPanelOpen =
    panel === 'new-contact' || (panel?.startsWith('edit-contact-') ?? false)
  const editingContactId = panel?.startsWith('edit-contact-')
    ? parseInt(panel.replace('edit-contact-', ''))
    : null
  const editingContact = editingContactId
    ? contacts.find((c) => c.id === editingContactId)
    : undefined

  // Room Panel Logic
  const isRoomPanelOpen = panel === 'new-room' || (panel?.startsWith('edit-room-') ?? false)
  const editingRoomId = panel?.startsWith('edit-room-')
    ? parseInt(panel.replace('edit-room-', ''))
    : null
  const editingRoom = editingRoomId ? rooms.find((r) => r.id === editingRoomId) : undefined

  // ✅ NUEVO: Edit Group Panel Logic
  const isEditGroupPanelOpen = panel === 'edit-group'

  if (!currentGroup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando grupo..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010409]">
      <GroupHeader group={currentGroup} onEdit={handleEdit} onDelete={handleDelete} />

      <TabNavigation groupId={currentGroup.id} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'contacts' && <ContactsTab />}
        {activeTab === 'rooms' && <RoomsTab />}
        {activeTab === 'status' && <StatusTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>

      {/* Payment Panel */}
      <PaymentPanel
        isOpen={isPaymentPanelOpen}
        onClose={handleClosePanel}
        payment={editingPayment}
        groupId={currentGroup.id}
        totalAmount={currentGroup.total_amount || 0}
      />

      {/* Contact Panel */}
      <ContactPanel
        isOpen={isContactPanelOpen}
        onClose={handleClosePanel}
        contact={editingContact}
        groupId={currentGroup.id}
      />

      {/* Room Panel */}
      <RoomPanel
        isOpen={isRoomPanelOpen}
        onClose={handleClosePanel}
        room={editingRoom}
        groupId={currentGroup.id}
      />

      {/* ✅ NUEVO: Edit Group Panel */}
      <EditGroupPanel
        isOpen={isEditGroupPanelOpen}
        onClose={handleClosePanel}
        group={currentGroup}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
