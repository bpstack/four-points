//NUNCA BORRAR ESTOS COMENTARIOS PORQUE SIRVEN DE GUÍA PARA REFACTORIZAR LOS DEMÁS ARCHIVOS

//PASO 3: Page como Server Component que pasa props al Client Component -> // app/dashboard/parking/status/page.tsx
//PASO 4: Client Component que consume hooks y maneja interactividad
// app/dashboard/parking/status/components/ParkingStatusClient.tsx
'use client'

import React from 'react'
import { useParkingStatus } from '../hooks/useParkingStatus'
import ParkingTable from './ParkingTable'
import StatusPanels from './StatusPanels'
import { CheckInModal, CheckOutModal, CancelModal, OverdueModal } from './modals'
import BookingWizard from '@/app/components/booking/BookingWizard'

interface ParkingStatusClientProps {
  selectedDate: string
  levelFromUrl: string
}

export default function ParkingStatusClient({
  selectedDate,
  levelFromUrl,
}: ParkingStatusClientProps) {
  const {
    // Data
    spots,
    availabilityData,
    overdueBookings,
    loading,

    // Modals state
    checkoutModal,
    checkinModal,
    cancelModal,
    overdueModal,
    createModal,
    actionLoading,

    // Setters
    setCheckoutModal,
    setCheckinModal,
    setCancelModal,
    setOverdueModal,
    setCreateModal,

    // Actions
    handleCheckIn,
    confirmCheckIn,
    handleCheckOut,
    confirmCheckOut,
    handleCancelBooking,
    confirmCancelBooking,
    handleCreateBooking,
    handleOverdueAction,
    loadParkingData,
  } = useParkingStatus(selectedDate)

  const filteredSpots =
    levelFromUrl === 'all' ? spots : spots.filter((s) => s.level_code === levelFromUrl)

  const levels = availabilityData?.levels || []
  const selectedLevelData =
    levelFromUrl === 'all'
      ? availabilityData?.summary
      : levels.find((l) => l.level === levelFromUrl)

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-[#010409]">
        {/* Header placeholder */}
        <div className="w-full border-b border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#010409]">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="h-8 w-64 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"></div>
                <div className="h-4 w-48 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mt-2"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton del contenido principal */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Skeleton columna izquierda (tabla) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Skeleton del panel de ocupación */}
              <div className="bg-gray-50 dark:bg-[#0d1117] border-2 border-gray-200 dark:border-[#30363d] rounded-2xl p-5">
                <div className="h-7 w-48 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-3"></div>
                <div className="flex items-center gap-4">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"></div>
                </div>
              </div>

              {/* Skeleton de la tabla */}
              <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
                {/* Header tabla */}
                <div className="bg-gray-50 dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] px-6 py-4">
                  <div className="grid grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-4 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
                {/* Filas tabla */}
                <div className="divide-y divide-gray-200 dark:divide-[#30363d]">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="px-6 py-4">
                      <div className="grid grid-cols-5 gap-4">
                        {[...Array(5)].map((_, j) => (
                          <div
                            key={j}
                            className="h-4 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"
                          ></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Skeleton columna derecha (paneles) */}
            <div className="space-y-6">
              {/* Skeleton panel 1 */}
              <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg p-6">
                <div className="h-6 w-40 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-gray-100 dark:bg-[#161b22] rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              </div>

              {/* Skeleton panel 2 */}
              <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg p-6">
                <div className="h-6 w-32 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-100 dark:bg-[#161b22] rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {selectedLevelData && (
            <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {levelFromUrl === 'all'
                  ? 'Todas las Plantas'
                  : `Planta ${levelFromUrl.replace('-', '')}`}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                  <span>
                    Ocupación:{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {Math.round(selectedLevelData.occupancy_rate)}%
                    </span>
                  </span>
                </div>
                <div className="w-px h-2 bg-gray-300 dark:bg-gray-700" />
                <span>
                  Disponibles:{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedLevelData.available_spots}
                  </span>
                  /{selectedLevelData.total_spots}
                </span>
              </div>
            </div>
          )}

          <ParkingTable
            spots={filteredSpots || []}
            levelFromUrl={levelFromUrl}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onCancel={handleCancelBooking}
            onCreateBooking={handleCreateBooking}
          />
        </div>

        <StatusPanels
          availabilityData={availabilityData}
          spots={filteredSpots || []}
          overdueBookings={overdueBookings || []}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onOverdueClick={(booking) => setOverdueModal({ isOpen: true, booking })}
        />
      </div>

      {/* Modals */}
      <CheckInModal
        booking={checkinModal.booking}
        isOpen={checkinModal.isOpen}
        onClose={() => setCheckinModal({ isOpen: false, booking: null })}
        onConfirm={confirmCheckIn}
        loading={actionLoading}
      />

      <CheckOutModal
        booking={checkoutModal.booking}
        isOpen={checkoutModal.isOpen}
        onClose={() => setCheckoutModal({ isOpen: false, booking: null })}
        onConfirm={confirmCheckOut}
        loading={actionLoading}
      />

      <CancelModal
        booking={cancelModal.booking}
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, booking: null })}
        onConfirm={confirmCancelBooking}
        loading={actionLoading}
      />

      <OverdueModal
        booking={overdueModal.booking}
        isOpen={overdueModal.isOpen}
        onClose={() => setOverdueModal({ isOpen: false, booking: null })}
        onAction={handleOverdueAction}
        loading={actionLoading}
      />

      {createModal.isOpen && createModal.spot && (
        <BookingWizard
          variant="modal"
          preSelectedSpot={createModal.spot}
          selectedDate={selectedDate}
          onSuccess={() => {
            setCreateModal({ isOpen: false, spot: null })
            loadParkingData()
          }}
          onCancel={() => setCreateModal({ isOpen: false, spot: null })}
        />
      )}
    </div>
  )
}
