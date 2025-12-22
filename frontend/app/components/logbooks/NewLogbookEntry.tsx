// app/components/logbooks/NewLogbookEntry.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiAlertCircle, FiCalendar, FiAlertTriangle, FiSend } from 'react-icons/fi'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'
import { formatDateLocal, formatDateForInput } from '@/app/lib/helpers/date'
import SimpleCalendar from '@/app/ui/calendar/simplecalendar'
import {
  SlidePanel,
  SlidePanelFooterButtons,
  FormField,
  Alert,
  inputClassName,
  selectClassName,
  textareaClassName,
} from '@/app/ui/panels'

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
  const [showCalendar, setShowCalendar] = useState(false)

  // Convert string YYYY-MM-DD to Date for SimpleCalendar
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
      setShowCalendar(false)
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

  // Handler for when a date is selected in SimpleCalendar
  const handleDateSelect = (selectedDate: Date | null | undefined) => {
    if (selectedDate) {
      setDate(formatDateForInput(selectedDate))
      setShowCalendar(false)
    }
  }

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Create a new logbook entry"
      size="xl"
      position="right"
      headerIcon={<FiAlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSave}
          cancelText="Cancel"
          submitText="Save Entry"
          submitIcon={<FiSend className="w-4 h-4" />}
          isSubmitting={isSubmitting}
          submitDisabled={!message.trim()}
          submitVariant="success"
        />
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!isSubmitting) void handleSave()
        }}
        className="space-y-5"
      >
        {error && (
          <Alert variant="error">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        <FormField label="Message" required>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={textareaClassName}
            rows={6}
            placeholder="Describe the issue or event..."
            required
            minLength={3}
            disabled={isSubmitting}
          />
        </FormField>

        {/* Date field with calendar */}
        <div className="relative">
          <FormField label="Date">
            <div className="flex gap-2">
              {/* Date input (readonly, display only) */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={selectedDateObject ? formatDateLocal(selectedDateObject) : date}
                  readOnly
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`${inputClassName} cursor-pointer pr-10`}
                  placeholder="Select a date..."
                  disabled={isSubmitting}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>

              {/* Today button */}
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  setDate(formatDateForInput(today))
                  setShowCalendar(false)
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors text-sm"
                disabled={isSubmitting}
              >
                Today
              </button>
            </div>
          </FormField>

          {/* SimpleCalendar dropdown */}
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
          <FormField label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ImportanceLevel)}
              className={selectClassName}
              disabled={isSubmitting}
            >
              <option value="baja">Low</option>
              <option value="media">Medium</option>
              <option value="alta">High</option>
              <option value="urgente">Critical</option>
            </select>
          </FormField>

          <FormField label="Department">
            <select
              value={department}
              onChange={(e) => setDepartment(Number(e.target.value))}
              className={selectClassName}
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
          </FormField>
        </div>
      </form>
    </SlidePanel>
  )
}
