// app/components/logbooks/NewLogbookEntry.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiPlus, FiX, FiAlertCircle, FiCalendar, FiAlertTriangle } from 'react-icons/fi'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'
import { formatDateLocal, formatDateForInput } from '@/app/lib/helpers/date'
import SimpleCalendar from '@/app/ui/calendar/simplecalendar'

type ImportanceLevel = 'baja' | 'media' | 'alta' | 'urgente'

export interface NewLogbookEntryPayload {
  message: string
  date: string
  importance_level: ImportanceLevel
  department_id: number
}

export default function NewLogbookEntry({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
  title = 'New Logbook Entry',
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: NewLogbookEntryPayload) => Promise<void>
  defaultDate?: string
  title?: string
}) {
  const { departments } = useDepartments()

  const getLocalDateString = useMemo(() => {
    return (date: Date = new Date()): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }, [])

  const [message, setMessage] = useState('')
  const [date, setDate] = useState<string>(defaultDate || getLocalDateString())
  const [priority, setPriority] = useState<ImportanceLevel>('baja')
  const [department, setDepartment] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [showCalendar, setShowCalendar] = useState(false) // ✅ Estado del calendario

  // ✅ Convertir string YYYY-MM-DD a Date para SimpleCalendar
  const selectedDateObject = useMemo(() => {
    if (!date) return null
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }, [date])

  useEffect(() => {
    if (isOpen) {
      setMessage('')
      setPriority('baja')
      setDepartment(1)
      setDate(defaultDate || getLocalDateString())
      setError('')
      setIsSubmitting(false)
      setShowCalendar(false) // ✅ Resetear calendario
    }
  }, [isOpen, defaultDate, getLocalDateString])

  const handleSave = async () => {
    if (!message.trim()) {
      setError('El mensaje es obligatorio')
      return
    }
    if (message.trim().length < 3) {
      setError('El mensaje debe tener al menos 3 caracteres')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit({
        message: message.trim(),
        date,
        importance_level: priority,
        department_id: department,
      })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la entrada'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Handler para cuando se selecciona una fecha en SimpleCalendar
  const handleDateSelect = (selectedDate: Date | null | undefined) => {
    if (selectedDate) {
      setDate(formatDateForInput(selectedDate))
      setShowCalendar(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-[1024px] bg-white dark:bg-[#0d1117] border-l border-gray-200 dark:border-[#30363d] shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-sm border-b border-gray-200 dark:border-[#30363d] p-6 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiAlertTriangle className="w-5 h-5 text-blue-600 dark:text-[#1f6feb]" />
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create a new logbook entry
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-md transition-colors"
            disabled={isSubmitting}
          >
            <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!isSubmitting) void handleSave()
          }}
          className="p-6 space-y-5"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/10 dark:border-red-800 flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiAlertTriangle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#1f6feb] focus:border-transparent transition-all"
              rows={6}
              placeholder="Describe the issue or event..."
              required
              minLength={3}
              disabled={isSubmitting}
            />
          </div>

          {/* ✅ CAMPO DE FECHA CON CALENDARIO */}
          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiCalendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              Date
            </label>

            <div className="flex gap-2">
              {/* Input de fecha (readonly, solo para mostrar) */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={selectedDateObject ? formatDateLocal(selectedDateObject) : date}
                  readOnly
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#1f6feb] focus:border-transparent transition-all"
                  placeholder="Select a date..."
                  disabled={isSubmitting}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>

              {/* Botón Today */}
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  setDate(formatDateForInput(today))
                  setShowCalendar(false)
                }}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors text-sm"
                disabled={isSubmitting}
              >
                Today
              </button>
            </div>

            {/* ✅ SimpleCalendar desplegable */}
            {showCalendar && (
              <div className="absolute top-full left-0 mt-2 z-50 shadow-2xl">
                <SimpleCalendar
                  selectedDate={selectedDateObject}
                  onSelect={handleDateSelect}
                  onClose={() => setShowCalendar(false)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ImportanceLevel)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#1f6feb] focus:border-transparent transition-all"
                disabled={isSubmitting}
              >
                <option value="baja">Low</option>
                <option value="media">Medium</option>
                <option value="alta">High</option>
                <option value="urgente">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#1f6feb] focus:border-transparent transition-all"
                disabled={isSubmitting}
              >
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Recepción</option>
                    <option value={2}>Housekeeping</option>
                    <option value={3}>Mantenimiento</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-[#1f6feb] dark:hover:bg-[#1a5ecf] text-white rounded-md font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <FiPlus className="w-4 h-4" /> Save Entry
                </>
              )}
            </button>
          </div>
        </form>

        <style jsx>{`
          @keyframes slide-in-right {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in-right {
            animation: slide-in-right 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  )
}
