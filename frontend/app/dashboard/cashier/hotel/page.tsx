// app/dashboard/cashier/hotel/page.tsx
'use client'

import {
  useCashierStore,
  useSelectedDate,
  useActiveTab,
  useActiveModal,
} from '@/app/stores/useCashierStore'
import { useDailyDetails } from '@/app/lib/cashier/queries'
import type { CashierShift } from '@/app/lib/cashier/types'

// Components
import LoadingState from '@/app/components/cashier/LoadingState'
import ErrorState from '@/app/components/cashier/ErrorState'
import UninitializedDayState from '@/app/components/cashier/UninitializedDayState'
import DaySummaryCard from '@/app/components/cashier/DaySummaryCard'
import ShiftTabs from '@/app/components/cashier/ShiftTabs'
import ShiftCard from '@/app/components/cashier/ShiftCard'

// Modals
import InitializeDayModal from '@/app/components/cashier/InitializeDayModal'
import CloseDayModal from '@/app/components/cashier/CloseDayModal'
import ReopenDayModal from '@/app/components/cashier/ReopenDayModal'

export default function CashierPage() {
  // Zustand selectors (optimizados para evitar re-renders innecesarios)
  const selectedDate = useSelectedDate()
  const activeTab = useActiveTab()
  const activeModal = useActiveModal()
  const { setActiveTab, openModal, closeModal } = useCashierStore()

  const { data: dailyData, isLoading, error } = useDailyDetails(selectedDate)

  if (isLoading) {
    return <LoadingState message="Cargando datos del día..." />
  }

  if (error) {
    return <ErrorState message={(error as Error).message} />
  }

  if (!dailyData) {
    return (
      <>
        <UninitializedDayState onInitialize={() => openModal('initializeDay')} />
        <InitializeDayModal
          isOpen={activeModal === 'initializeDay'}
          onClose={closeModal}
          selectedDate={selectedDate}
        />
      </>
    )
  }

  const currentShift = dailyData.shifts?.find((s: CashierShift) => s.shift_type === activeTab)

  return (
    <div className="space-y-4">
      {/* Resumen del día */}
      <DaySummaryCard
        daily={dailyData}
        selectedDate={selectedDate}
        onCloseDay={() => openModal('closeDay')}
        onReopenDay={() => openModal('reopenDay')}
      />

      {/* Tabs de turnos */}
      <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <ShiftTabs shifts={dailyData.shifts} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="p-4">
          {currentShift ? (
            <ShiftCard shiftId={currentShift.id} shiftType={activeTab} />
          ) : (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
              <p>Turno no creado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de cerrar día */}
      <CloseDayModal
        isOpen={activeModal === 'closeDay'}
        onClose={closeModal}
        dailyData={dailyData}
        selectedDate={selectedDate}
      />

      {/* Modal de reabrir día */}
      <ReopenDayModal
        isOpen={activeModal === 'reopenDay'}
        onClose={closeModal}
        selectedDate={selectedDate}
      />
    </div>
  )
}
