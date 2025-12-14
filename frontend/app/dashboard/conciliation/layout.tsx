// app/dashboard/conciliation/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import ConciliationPage from './page'
import { FiChevronLeft, FiChevronRight, FiCalendar, FiPlus } from 'react-icons/fi'
import { conciliationApi, ConciliationDetail } from '@/app/api/conciliation/route'
import HorizontalDatePicker from '@/app/ui/calendar/HorizontalDatePicker'

export default function ConciliationLayout() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [selectedConciliation, setSelectedConciliation] = useState<ConciliationDetail | null>(null)
  const [dayStatusMessage, setDayStatusMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Info del mes
  const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' })
  const currentYear = currentDate.getFullYear()

  // Cargar conciliación de un día específico
  const loadConciliation = async (year: number, month: number, day: number) => {
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    setLoading(true)
    try {
      // ✅ Llamar directamente a getByDay (igual que logbooks)
      const conciliation = await conciliationApi.getByDay(dateString)

      if (conciliation) {
        // ✅ Encontró conciliación
        setSelectedConciliation(conciliation)
        setDayStatusMessage('')
      } else {
        // ✅ No hay conciliación (caso normal, no es error)
        setSelectedConciliation(null)
        setDayStatusMessage('No hay conciliación para este día.')
      }
    } catch (error: any) {
      // ❌ Error real (500, network, etc.)
      console.error('Error loading conciliation:', error)
      setSelectedConciliation(null)
      setDayStatusMessage('Error cargando conciliación.')
    } finally {
      setLoading(false)
    }
  }

  // Crear nueva conciliación
  const handleCreateConciliation = async () => {
    const dateString = `${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`

    try {
      await conciliationApi.create({
        date: dateString,
        notes: '',
      })

      // Recargar la conciliación creada
      await loadConciliation(currentYear, currentDate.getMonth() + 1, selectedDay)
    } catch (error: any) {
      console.error('Error creating conciliation:', error)
      if (error.message?.includes('Ya existe')) {
        setDayStatusMessage('Ya existe una conciliación para esta fecha')
        // Si ya existe, intentar cargarla
        await loadConciliation(currentYear, currentDate.getMonth() + 1, selectedDay)
      } else {
        setDayStatusMessage('Error al crear conciliación')
      }
    }
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
    setSelectedDay(1)
  }

  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
    setSelectedDay(1)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDay(today.getDate())
    loadConciliation(today.getFullYear(), today.getMonth() + 1, today.getDate())
  }

  const selectDay = (day: number) => {
    setSelectedDay(day)
    loadConciliation(currentYear, currentDate.getMonth() + 1, day)
  }

  useEffect(() => {
    loadConciliation(currentYear, currentDate.getMonth() + 1, selectedDay)
  }, [currentDate])

  return (
    <div className="space-y-6">
      {/* Header sticky principal */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#010409] shadow-sm">
        <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-200 dark:border-gray-800">
          {/* Desktop: compacto en una sola línea */}
          <div className="hidden md:flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Mes y año con ancho fijo */}
              <div className="w-56 flex-shrink-0">
                <h1 className="text-base font-semibold text-gray-900 dark:text-white capitalize truncate">
                  {currentMonth} {currentYear}
                </h1>
              </div>
              {/* Navegación de mes */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
              {/* Today */}
              <button
                onClick={goToToday}
                className="ml-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
              >
                <FiCalendar className="w-4 h-4" /> Hoy
              </button>
              {/* Status */}
              {selectedConciliation && (
                <div className="ml-4 text-sm text-gray-700 dark:text-gray-400 flex-shrink-0">
                  Estado:{' '}
                  <span
                    className={`font-medium px-2 py-0.5 rounded ${
                      selectedConciliation.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : selectedConciliation.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {selectedConciliation.status === 'draft'
                      ? 'Borrador'
                      : selectedConciliation.status === 'confirmed'
                        ? 'Confirmado'
                        : 'Cerrado'}
                  </span>
                </div>
              )}
            </div>
            {/* New Conciliation a la derecha */}
            {!selectedConciliation && (
              <button
                onClick={handleCreateConciliation}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
              >
                <FiPlus className="w-4 h-4" /> Nueva Conciliación
              </button>
            )}
          </div>

          {/* Mobile: conserva distribución actual */}
          <div className="md:hidden flex items-center justify-between gap-2">
            {/* Izquierda: Mes + navegación */}
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white capitalize whitespace-nowrap">
                {currentMonth.slice(0, 3)} {currentYear}
              </h1>
              <button
                onClick={goToPreviousMonth}
                className="p-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Centro: Today */}
            <button
              onClick={goToToday}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <FiCalendar className="w-3.5 h-3.5" /> Hoy
            </button>

            {/* Derecha: New */}
            {!selectedConciliation && (
              <button
                onClick={handleCreateConciliation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
              >
                <FiPlus className="w-3.5 h-3.5" /> Nueva
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Paginación sticky - Calendario de días */}
      <div className="sticky top-[64px] z-30">
        <HorizontalDatePicker
          currentDate={currentDate}
          selectedDay={selectedDay}
          onSelectDay={selectDay}
          locale="es-ES"
        />
      </div>

      {/* Componente Page */}
      <ConciliationPage
        conciliation={selectedConciliation}
        loading={loading}
        dayStatusMessage={dayStatusMessage}
        onUpdate={() => loadConciliation(currentYear, currentDate.getMonth() + 1, selectedDay)}
      />
    </div>
  )
}
