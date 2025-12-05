// app/dashboard/cashier/hotel/page.tsx
'use client'

import { useState } from 'react'
import { FiDollarSign, FiAlertCircle, FiLoader } from 'react-icons/fi'
import { useCashierContext } from './layout'
import { useDailyDetails } from '@/app/lib/cashier/queries'
import type { CashierShift } from '@/app/lib/cashier/types'
import InitializeDayModal from '@/app/components/cashier/InitializeDayModal'
import ShiftCard from '@/app/components/cashier/ShiftCard'
import CloseDayModal from '@/app/components/cashier/CloseDayModal'
import ReopenDayModal from '@/app/components/cashier/ReopenDayModal'

export default function CashierPage() {
  const { selectedDate } = useCashierContext()
  const [activeTab, setActiveTab] = useState<'night' | 'morning' | 'afternoon' | 'closing'>('night')
  const [showInitModal, setShowInitModal] = useState(false)
  const [showCloseDayModal, setShowCloseDayModal] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false) // ✅ AÑADIDO

  console.log('🔍 selectedDate from context:', selectedDate)

  const { data: dailyData, isLoading, error } = useDailyDetails(selectedDate)

  console.log('🔍 dailyData received:', dailyData)
  console.log('🔍 isLoading:', isLoading)
  console.log('🔍 error:', error)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <FiLoader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando datos del día...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">
              Error al cargar datos
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    )
  }

  const daily = dailyData

  console.log('🔍 daily:', daily)
  console.log('🔍 daily?.shifts:', daily?.shifts)
  console.log('🔍 daily?.shifts?.length:', daily?.shifts?.length)

  if (!daily) {
    return (
      <>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 text-center">
          <FiDollarSign className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Día no inicializado
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
            Este día aún no ha sido inicializado. Haz clic en "Inicializar Día" para crear los 4
            turnos.
          </p>
          <button
            onClick={() => setShowInitModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <FiDollarSign className="w-4 h-4" />
            Inicializar Día
          </button>
        </div>

        <InitializeDayModal
          isOpen={showInitModal}
          onClose={() => setShowInitModal(false)}
          selectedDate={selectedDate}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen del día */}
      <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiDollarSign className="w-4 h-4 text-green-600" />
            Resumen del Día
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{selectedDate}</span>
            {daily.status === 'closed' && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-medium rounded">
                Cerrado
              </span>
            )}
            {daily.status === 'open' && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium rounded">
                Abierto
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mb-0.5">
              Total Cash
            </p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {parseFloat(daily.total_cash || '0').toFixed(2)}€
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-0.5">
              Tarjeta + Otros
            </p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {(
                parseFloat(daily.total_card || '0') +
                parseFloat(daily.total_bacs || '0') +
                parseFloat(daily.total_web_payment || '0') +
                parseFloat(daily.total_transfer || '0') +
                parseFloat(daily.total_other || '0')
              ).toFixed(2)}
              €
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mb-0.5">
              Gran Total
            </p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
              {parseFloat(daily.grand_total || '0').toFixed(2)}€
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/30 p-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">📝</span>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">
                Vales Activos
              </p>
            </div>
            <p className="text-base font-bold text-orange-600 dark:text-orange-400">
              {parseFloat(daily.active_vouchers_total || '0').toFixed(2)}€
            </p>
          </div>
        </div>

        {daily.validation_errors && daily.validation_errors.length > 0 && (
          <div className="mt-3 p-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              <p className="font-medium mb-1">Validaciones:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {daily.validation_errors.map((error: string, idx: number) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ✅ Botón Cerrar Día (si está abierto) */}
        {daily.can_close && (
          <div className="mt-3">
            <button
              onClick={() => setShowCloseDayModal(true)}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FiDollarSign className="w-4 h-4" />
              Cerrar Día Completo
            </button>
          </div>
        )}

        {/* ✅ AÑADIDO: Botón Reabrir Día (si está cerrado) */}
        {daily.status === 'closed' && (
          <div className="mt-3">
            <button
              onClick={() => setShowReopenModal(true)}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FiAlertCircle className="w-4 h-4" />
              Reabrir Día
            </button>
          </div>
        )}
      </div>

      {/* Tabs de turnos */}
      <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {(['night', 'morning', 'afternoon', 'closing'] as const).map((shift) => {
            const shiftData = daily.shifts?.find((s: CashierShift) => s.shift_type === shift)
            const isOpen = shiftData?.status === 'open'
            const isClosed = shiftData?.status === 'closed'

            return (
              <button
                key={shift}
                onClick={() => setActiveTab(shift)}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors relative ${
                  activeTab === shift
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>
                    {shift === 'night' && '🌙 Noche'}
                    {shift === 'morning' && '☀️ Mañana'}
                    {shift === 'afternoon' && '🌅 Tarde'}
                    {shift === 'closing' && '🔒 Cierre'}
                  </span>
                  {isClosed && (
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Cerrado" />
                  )}
                  {isOpen && (
                    <span
                      className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"
                      title="Abierto"
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-4">
          {(() => {
            const currentShift = daily.shifts?.find((s: CashierShift) => s.shift_type === activeTab)

            console.log('🔍 currentShift for tab', activeTab, ':', currentShift)

            if (!currentShift) {
              return (
                <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
                  <p>Turno no creado</p>
                </div>
              )
            }

            return <ShiftCard shiftId={currentShift.id} shiftType={activeTab} />
          })()}
        </div>
      </div>

      {/* Modal de cerrar día */}
      <CloseDayModal
        isOpen={showCloseDayModal}
        onClose={() => setShowCloseDayModal(false)}
        dailyData={daily}
        selectedDate={selectedDate}
      />

      {/* ✅ AÑADIDO: Modal de reabrir día */}
      <ReopenDayModal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        selectedDate={selectedDate}
      />
    </div>
  )
}
