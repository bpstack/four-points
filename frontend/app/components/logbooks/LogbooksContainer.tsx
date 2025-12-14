// app/components/logbooks/LogbooksContainer.tsx
'use client'

import { useState, useEffect } from 'react'
import { FiChevronLeft, FiChevronRight, FiCalendar, FiPlus } from 'react-icons/fi'
import { logbooksApi } from '@/app/api/logbooks/route'
import { LogEntry } from '@/app/lib/logbooks/types'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'
import { useAuth } from '@/app/lib/auth/useAuth'
import HorizontalDatePicker from '@/app/ui/calendar/HorizontalDatePicker'
import LogbooksList from './LogbooksList'
import NewLogbookEntry from './NewLogbookEntry'

export default function LogbooksContainer() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [dayStatusMessage, setDayStatusMessage] = useState<string>('')
  const [logbookEntries, setLogbookEntries] = useState<LogEntry[]>([])
  const [showNewEntryModal, setShowNewEntryModal] = useState(false)
  const { getDepartmentName } = useDepartments()
  const { user } = useAuth()

  const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' })
  const currentYear = currentDate.getFullYear()

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

              return {
                id: entry.id,
                timestamp: entry.created_at,
                description: entry.message,
                department: getDepartmentName(entry.department_id),
                department_id: entry.department_id,
                priority,
                readBy: [],
                status: (entry.is_solved === 1 ? 'resolved' : 'pending') as 'pending' | 'resolved',
                comments: comments || [],
                author_id: entry.author_id || entry.user_id || entry.created_by || 'unknown',
                author_name: entry.author_name || 'Unknown',
                updated_at: entry.updated_at,
                is_edited: entry.updated_at && entry.updated_at !== entry.created_at,
              }
            } catch {
              let priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
              if (entry.importance_level === 'urgente') priority = 'critical'
              else if (entry.importance_level === 'alta') priority = 'high'
              else if (entry.importance_level === 'media') priority = 'medium'

              return {
                id: entry.id,
                timestamp: entry.created_at,
                description: entry.message,
                department: getDepartmentName(entry.department_id),
                department_id: entry.department_id,
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

  const handleSubmitNewEntry = async (payload: {
    message: string
    date: string
    importance_level: 'baja' | 'media' | 'alta' | 'urgente'
    department_id: number
  }) => {
    if (!user) {
      console.error('No user available')
      return
    }

    await logbooksApi.createLogbook({
      author_id: user.id,
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

  const checkDayEntries = (day: number) => {
    setSelectedDay(day)
    loadEntries(currentYear, currentDate.getMonth() + 1, day)
  }

  useEffect(() => {
    checkDayEntries(selectedDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  const orderedEntries = [...logbookEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#010409] shadow-sm">
        <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-200 dark:border-gray-800">
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-56 flex-shrink-0">
                <h1 className="text-base font-semibold text-gray-900 dark:text-white capitalize truncate">
                  {currentMonth} {currentYear}
                </h1>
              </div>
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
              <button
                onClick={goToToday}
                className="ml-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
              >
                <FiCalendar className="w-4 h-4" /> Today
              </button>
              <div className="ml-4 text-sm text-gray-700 dark:text-gray-400 flex-shrink-0">
                Daily Entries:{' '}
                <span className="font-medium text-gray-900 dark:text-gray-200">
                  {orderedEntries.length}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowNewEntryModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
            >
              <FiPlus className="w-4 h-4" /> New Entry
            </button>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center justify-between gap-2">
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
            <button
              onClick={goToToday}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <FiCalendar className="w-3.5 h-3.5" /> Today
            </button>
            <button
              onClick={() => setShowNewEntryModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
            >
              <FiPlus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <div className="sticky top-[64px] z-30">
        <HorizontalDatePicker
          currentDate={currentDate}
          selectedDay={selectedDay}
          onSelectDay={checkDayEntries}
          locale="en-US"
        />
      </div>

      {/* Logbooks List */}
      <LogbooksList
        entries={orderedEntries}
        dayStatusMessage={dayStatusMessage}
        onCommentAdded={() => loadEntries(currentYear, currentDate.getMonth() + 1, selectedDay)}
      />

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <NewLogbookEntry
          isOpen={showNewEntryModal}
          onClose={() => setShowNewEntryModal(false)}
          onSubmit={handleSubmitNewEntry}
          defaultDate={`${currentYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`}
          title="New Logbook Entry"
        />
      )}
    </div>
  )
}
