// app/dashboard/logbooks/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import LogbooksPage from './page'
import { FiChevronLeft, FiChevronRight, FiCalendar, FiPlus, FiX } from 'react-icons/fi'
import { logbooksApi } from '@/app/api/logbooks/route'
import { LogEntry } from '@/app/lib/logbooks/types'
import NewLogbookEntry from '@/app/components/logbooks/NewLogbookEntry'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'
import { useAuth } from '@/app/lib/auth/useAuth'

// Función helper para obtener fecha local en formato YYYY-MM-DD
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function LogbooksLayout() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [dayStatusMessage, setDayStatusMessage] = useState<string>('')
  const [logbookEntries, setLogbookEntries] = useState<LogEntry[]>([])
  const [showNewEntryModal, setShowNewEntryModal] = useState(false)
  const { departments, getDepartmentName } = useDepartments()

  // ✅ CORRECCIÓN: Llamar useAuth al nivel superior del componente
  const { user } = useAuth()

  // Info del mes
  const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' })
  const currentYear = currentDate.getFullYear()
  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Cargar registros de un día
  const loadEntries = async (year: number, month: number, day: number) => {
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    try {
      const data = await logbooksApi.getLogbooksByDay(dateString)
      if (Array.isArray(data) && data.length > 0) {
        const entriesWithComments = await Promise.all(
          data.map(async (entry: any) => {
            try {
              const res = await logbooksApi.comments.getComments(entry.id)
              const comments = Array.isArray(res.comments) ? res.comments : []

              let priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
              if (entry.importance_level === 'urgente') priority = 'critical'
              else if (entry.importance_level === 'alta') priority = 'high'
              else if (entry.importance_level === 'media') priority = 'medium'
              else priority = 'low'

              return {
                id: entry.id,
                timestamp: entry.created_at,
                description: entry.message,
                // ✅ IMPORTANTE: Pasar tanto el nombre formateado como el ID
                department: getDepartmentName(entry.department_id),
                department_id: entry.department_id, // ✅ AÑADIR ESTA LÍNEA
                priority,
                readBy: [],
                status: (entry.is_solved === 1 ? 'resolved' : 'pending') as 'pending' | 'resolved',
                comments: comments || [],
                author_id: entry.author_id || entry.user_id || entry.created_by || 'unknown',
                author_name: entry.author_name || 'Unknown',
                updated_at: entry.updated_at,
                is_edited: entry.updated_at && entry.updated_at !== entry.created_at,
              }
            } catch (err) {
              let priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
              if (entry.importance_level === 'urgente') priority = 'critical'
              else if (entry.importance_level === 'alta') priority = 'high'
              else if (entry.importance_level === 'media') priority = 'medium'
              else priority = 'low'

              return {
                id: entry.id,
                timestamp: entry.created_at,
                description: entry.message,
                // ✅ IMPORTANTE: También aquí en el catch
                department: getDepartmentName(entry.department_id),
                department_id: entry.department_id, // ✅ AÑADIR ESTA LÍNEA
                priority,
                readBy: [],
                status: (entry.is_solved === 1 ? 'resolved' : 'pending') as 'pending' | 'resolved',
                comments: [],
                author_id: entry.author_id || entry.user_id || entry.created_by || 'unknown',
                author_name: entry.author_name || 'Unknown',
                updated_at: entry.updated_at,
                is_edited: entry.updated_at && entry.updated_at !== entry.created_at,
              }
            }
          })
        )
        setLogbookEntries(entriesWithComments)
        setDayStatusMessage('')
      } else {
        setLogbookEntries([])
        setDayStatusMessage('No hay registros para este día.')
      }
    } catch (error) {
      console.error('Error loading logbooks:', error)
      setLogbookEntries([])
      setDayStatusMessage('Error cargando registros.')
    }
  }

  // Guardar nueva entrada (usado por el componente)
  const handleSubmitNewEntry = async (payload: {
    message: string
    date: string
    importance_level: 'baja' | 'media' | 'alta' | 'urgente'
    department_id: number
  }) => {
    // ✅ CORRECCIÓN: Usar el user que ya obtuvimos arriba
    if (!user) {
      console.error('No user available')
      return
    }

    await logbooksApi.createLogbook({
      author_id: user.id, // ✅ Ahora user ya está disponible
      message: payload.message,
      importance_level: payload.importance_level,
      department_id: payload.department_id,
      date: payload.date,
    })

    const [year, month, day] = payload.date.split('-').map(Number)

    setShowNewEntryModal(false)

    const entryDate = new Date(year, month - 1, day)
    setCurrentDate(entryDate)
    setSelectedDay(day)

    await loadEntries(year, month, day)
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
    loadEntries(today.getFullYear(), today.getMonth() + 1, today.getDate())
  }

  const checkDayEntries = async (day: number) => {
    setSelectedDay(day)
    loadEntries(currentYear, currentDate.getMonth() + 1, day)
  }

  const openNewEntryModal = () => {
    setShowNewEntryModal(true)
  }

  useEffect(() => {
    checkDayEntries(new Date().getDate())
  }, [currentDate])

  const orderedEntries = [...logbookEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return (
    <div className="space-y-6">
      {/* Header sticky principal */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#010409] shadow-sm">
        <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-200 dark:border-gray-800">
          {/* Desktop: compacto en una sola línea */}
          <div className="hidden md:flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Mes y año con ancho fijo para estabilidad */}
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
                <FiCalendar className="w-4 h-4" /> Today
              </button>
              {/* Daily Entries */}
              <div className="ml-4 text-sm text-gray-700 dark:text-gray-400 flex-shrink-0">
                Daily Entries:{' '}
                <span className="font-medium text-gray-900 dark:text-gray-200">
                  {orderedEntries.length}
                </span>
              </div>
            </div>
            {/* New Entry a la derecha */}
            <button
              onClick={openNewEntryModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
            >
              <FiPlus className="w-4 h-4" /> New Entry
            </button>
          </div>

          {/* Mobile: conserva distribución actual */}
          <div className="md:hidden flex items-center justify-between gap-2">
            {/* Izquierda: Mes + navegación */}
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white capitalize whitespace-nowrap w-20">
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
              <FiCalendar className="w-3.5 h-3.5" /> Today
            </button>

            {/* Derecha: New Entry */}
            <button
              onClick={openNewEntryModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
            >
              <FiPlus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>
      </div>

      {/* Paginación sticky */}
      <div className="sticky top-[64px] z-30 bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {days.map((day) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }) // Mon, Tue, Wed...

            const isToday =
              day === new Date().getDate() &&
              currentDate.getMonth() === new Date().getMonth() &&
              currentDate.getFullYear() === new Date().getFullYear()

            const isSelected = day === selectedDay

            return (
              <button
                key={day}
                onClick={() => checkDayEntries(day)}
                className={`flex-shrink-0 w-12 h-12 rounded-lg font-medium flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : isToday
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-[10px] font-normal">{weekday}</span>
                <span className="text-sm font-medium">{day}</span>
              </button>
            )
          })}
        </div>
      </div>

      <LogbooksPage
        entries={orderedEntries}
        dayStatusMessage={dayStatusMessage}
        onCommentAdded={() => loadEntries(currentYear, currentDate.getMonth() + 1, selectedDay)}
      />

      {showNewEntryModal && (
        <NewLogbookEntry
          isOpen={showNewEntryModal}
          onClose={() => setShowNewEntryModal(false)}
          onSubmit={handleSubmitNewEntry}
          defaultDate={`${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`} // ✅ SINCRONIZADO
          title="New Logbook Entry"
        />
      )}
    </div>
  )
}
