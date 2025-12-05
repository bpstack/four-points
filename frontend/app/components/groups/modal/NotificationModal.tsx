'use client'

//TODO INSTALAR CRON PARA PROGRAMAR LAS NOTIFICACIONES YA QUE AHORA MISMO SOLO SE PUEDEN ENVIAR AL INSTANTE

import { useState, useRef, useEffect } from 'react'
import { FiBell, FiX, FiCalendar, FiClock } from 'react-icons/fi'
import { groupsApi } from '@/app/api/notifications/route'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import TimePicker from '@/app/ui/calendar/timepicker'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: number
  groupName: string
}

export function NotificationModal({ isOpen, onClose, groupId, groupName }: NotificationModalProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Estados para controlar dropdowns
  const [showCalendar, setShowCalendar] = useState(false)

  const calendarRef = useRef<HTMLDivElement>(null)

  // Cerrar calendar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Formatear fecha para mostrar
  const formatDate = (date: Date | null) => {
    if (!date) return 'Seleccionar fecha'
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Validar que la fecha/hora sea al menos 5 minutos en el futuro
  const isValidDateTime = () => {
    if (scheduleType === 'now') return true
    if (!selectedDate) return false

    const [hours, minutes] = selectedTime.split(':').map(Number)
    const scheduledDateTime = new Date(selectedDate)
    scheduledDateTime.setHours(hours, minutes, 0, 0)

    const now = new Date()
    const minDateTime = new Date(now.getTime() + 5 * 60000) // +5 minutos

    return scheduledDateTime >= minDateTime
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (scheduleType === 'scheduled' && !isValidDateTime()) {
      setError('La fecha/hora debe ser al menos 5 minutos en el futuro')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data: any = {
        title,
        message,
        priority,
      }

      // Construir scheduled_for si es programada
      if (scheduleType === 'scheduled' && selectedDate) {
        const [hours, minutes] = selectedTime.split(':').map(Number)
        const scheduledDateTime = new Date(selectedDate)
        scheduledDateTime.setHours(hours, minutes, 0, 0)
        data.scheduled_for = scheduledDateTime.toISOString()
      }

      await groupsApi.createNotification(groupId, data)

      setSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Error al crear la notificación')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setMessage('')
    setPriority('medium')
    setSelectedDate(null)
    setSelectedTime('09:00')
    setScheduleType('now')
    setError(null)
    setSuccess(false)
    setShowCalendar(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151b23] rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#151b23] z-10">
          <div className="flex items-center gap-2">
            <FiBell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Crear Notificación
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {/* Group Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-2">
            <p className="text-[10px] text-gray-600 dark:text-gray-400">Grupo:</p>
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{groupName}</p>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Título *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ej: Recordatorio de pago"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Mensaje *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              placeholder="Describe la notificación..."
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Prioridad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    priority === p
                      ? p === 'high'
                        ? 'bg-red-600 text-white'
                        : p === 'medium'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Programación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('now')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  scheduleType === 'now'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <FiClock className="w-3 h-3" />
                <span className="hidden sm:inline">Enviar Ahora</span>
                <span className="sm:hidden">Ahora</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('scheduled')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  scheduleType === 'scheduled'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <FiCalendar className="w-3 h-3" />
                Programar
              </button>
            </div>
          </div>

          {/* Scheduled DateTime (solo si es programada) */}
          {scheduleType === 'scheduled' && (
            <div className="space-y-2">
              {/* Fecha con Calendario */}
              <div className="relative" ref={calendarRef}>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                >
                  <span>{formatDate(selectedDate)}</span>
                  <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Calendario hacia arriba */}
                {showCalendar && (
                  <div className="absolute z-20 bottom-full mb-1 left-0 sm:left-auto sm:right-0">
                    <SimpleCalendarCompact
                      selectedDate={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        setShowCalendar(false)
                      }}
                      onClose={() => setShowCalendar(false)}
                    />
                  </div>
                )}
              </div>

              {/* Hora con TimePicker HACIA ARRIBA */}
              <div>
                <TimePicker
                  value={selectedTime}
                  onChange={setSelectedTime}
                  openTo="left"
                  openDirection="up"
                  label="Hora *"
                />
              </div>

              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Mínimo 5 minutos desde ahora
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2">
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Notificación {scheduleType === 'now' ? 'enviada' : 'programada'} exitosamente
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || success || (scheduleType === 'scheduled' && !selectedDate)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? 'Creando...'
                : success
                  ? '✓ Creada'
                  : scheduleType === 'now'
                    ? 'Enviar'
                    : 'Programar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
