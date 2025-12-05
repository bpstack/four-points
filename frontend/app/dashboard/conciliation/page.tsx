// app/dashboard/conciliation/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  FiSave,
  FiCheck,
  FiEdit3,
  FiAlertCircle,
  FiLock,
  FiX,
  FiPlus,
  FiTrash2,
  FiClock,
  FiUser,
  FiFileText,
  FiCalendar,
} from 'react-icons/fi'
import {
  conciliationApi,
  ConciliationDetail,
  RECEPTION_REASONS_ORDERED,
  HOUSEKEEPING_REASONS_ORDERED,
  RECEPTION_CONFIG,
  HOUSEKEEPING_CONFIG,
  ReceptionReason,
  HousekeepingReason,
  ReceptionEntryWithReason,
  HousekeepingEntryWithReason,
  FormData,
  Props,
  EntryForm,
  Note,
  MonthlySummary,
} from '@/app/api/conciliation/route'
import { useAuth } from '@/app/lib/auth/useAuth'

export default function ConciliationPage({
  conciliation,
  loading,
  dayStatusMessage,
  onUpdate,
}: Props) {
  const { user } = useAuth()
  const [receptionForm, setReceptionForm] = useState<Record<ReceptionReason, EntryForm>>({} as any)
  const [housekeepingForm, setHousekeepingForm] = useState<Record<HousekeepingReason, EntryForm>>(
    {} as any
  )
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [loadingMonthlySummary, setLoadingMonthlySummary] = useState(false)

  // Estado para popover de habitaciones
  const [roomPopover, setRoomPopover] = useState<{
    type: 'reception' | 'housekeeping'
    reason: string
    rooms: string[]
  } | null>(null)

  // Estado para popover de notas
  const [notePopover, setNotePopover] = useState<{
    type: 'reception' | 'housekeeping'
    reason: string
    notes: string[]
  } | null>(null)

  // ✅ Detectar si es el último día del mes
  const isLastDayOfMonth = (date: string): boolean => {
    const d = new Date(date)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    return d.getDate() === lastDay
  }

  // ✅ Cargar resumen mensual si es el último día
  useEffect(() => {
    if (conciliation && isLastDayOfMonth(conciliation.date)) {
      loadMonthlySummary()
    } else {
      setMonthlySummary(null)
    }
  }, [conciliation])

  const loadMonthlySummary = async () => {
    if (!conciliation) return

    const date = new Date(conciliation.date)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    setLoadingMonthlySummary(true)
    try {
      const data = await conciliationApi.getMonthlySummary(year, month)
      console.log('✅ Resumen mensual cargado:', data)
      setMonthlySummary(data)
    } catch (error) {
      console.error('Error loading monthly summary:', error)
      alert('Error al cargar el resumen mensual. Por favor, intenta de nuevo.')
    } finally {
      setLoadingMonthlySummary(false)
    }
  }

  useEffect(() => {
    if (conciliation) {
      const newReceptionForm: any = {}
      RECEPTION_REASONS_ORDERED.forEach((reason) => {
        const entry = conciliation.reception_entries?.find(
          (e: ReceptionEntryWithReason) => e.reason === reason
        )
        newReceptionForm[reason] = {
          value: entry?.value || 0,
          room_number: entry?.room_number || '',
          notes: entry?.notes || '',
        }
      })
      setReceptionForm(newReceptionForm)

      const newHousekeepingForm: any = {}
      HOUSEKEEPING_REASONS_ORDERED.forEach((reason) => {
        const entry = conciliation.housekeeping_entries?.find(
          (e: HousekeepingEntryWithReason) => e.reason === reason
        )
        newHousekeepingForm[reason] = {
          value: entry?.value || 0,
          room_number: entry?.room_number || '',
          notes: entry?.notes || '',
        }
      })
      setHousekeepingForm(newHousekeepingForm)

      // Parsear notas generales
      if (conciliation.notes) {
        try {
          const parsedNotes = JSON.parse(conciliation.notes)
          if (Array.isArray(parsedNotes)) {
            setNotes(parsedNotes)
          } else {
            setNotes([
              {
                id: Date.now().toString(),
                text: conciliation.notes,
                author: 'Sistema',
                timestamp: new Date().toISOString(),
                author_id: 'system',
              },
            ])
          }
        } catch {
          if (conciliation.notes.trim()) {
            setNotes([
              {
                id: Date.now().toString(),
                text: conciliation.notes,
                author: 'Sistema',
                timestamp: new Date().toISOString(),
                author_id: 'system',
              },
            ])
          } else {
            setNotes([])
          }
        }
      } else {
        setNotes([])
      }
    }
  }, [conciliation])

  const calculateTotals = () => {
    let totalReception = 0
    let totalHousekeeping = 0

    RECEPTION_REASONS_ORDERED.forEach((reason) => {
      const config = RECEPTION_CONFIG[reason]
      const value = receptionForm[reason]?.value || 0
      totalReception += config.direction === 'add' ? value : -value
    })

    HOUSEKEEPING_REASONS_ORDERED.forEach((reason) => {
      const config = HOUSEKEEPING_CONFIG[reason]
      const value = housekeepingForm[reason]?.value || 0
      totalHousekeeping += config.direction === 'add' ? value : -value
    })

    return {
      totalReception,
      totalHousekeeping,
      difference: totalReception - totalHousekeeping,
    }
  }

  const totals = calculateTotals()

  const updateReceptionValue = (reason: ReceptionReason, field: keyof EntryForm, value: any) => {
    setReceptionForm((prev) => ({
      ...prev,
      [reason]: { ...prev[reason], [field]: value },
    }))
  }

  const updateHousekeepingValue = (
    reason: HousekeepingReason,
    field: keyof EntryForm,
    value: any
  ) => {
    setHousekeepingForm((prev) => ({
      ...prev,
      [reason]: { ...prev[reason], [field]: value },
    }))
  }

  // Parsear habitaciones desde string
  const parseRooms = (roomString: string): string[] => {
    if (!roomString.trim()) return []
    return roomString
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
  }

  // Parsear notas desde string
  const parseNotes = (noteString: string): string[] => {
    if (!noteString.trim()) return []
    return noteString
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
  }

  // Mostrar popover con habitaciones
  const handleRoomClick = (
    type: 'reception' | 'housekeeping',
    reason: string,
    roomString: string
  ) => {
    const rooms = parseRooms(roomString)
    setRoomPopover({ type, reason, rooms })
  }

  // Mostrar popover con notas
  const handleNoteClick = (
    type: 'reception' | 'housekeeping',
    reason: string,
    noteString: string
  ) => {
    const notes = parseNotes(noteString)
    setNotePopover({ type, reason, notes })
  }

  // Añadir habitación
  const addRoom = (newRoom: string) => {
    if (!roomPopover) return
    const trimmed = newRoom.trim()
    if (!trimmed || roomPopover.rooms.includes(trimmed)) return
    if (roomPopover.rooms.length >= 15) {
      alert('Máximo 15 habitaciones')
      return
    }

    const updatedRooms = [...roomPopover.rooms, trimmed]
    const roomString = updatedRooms.join(', ')

    if (roomPopover.type === 'reception') {
      updateReceptionValue(roomPopover.reason as ReceptionReason, 'room_number', roomString)
    } else {
      updateHousekeepingValue(roomPopover.reason as HousekeepingReason, 'room_number', roomString)
    }

    setRoomPopover({ ...roomPopover, rooms: updatedRooms })
  }

  // Eliminar habitación
  const removeRoom = (roomToRemove: string) => {
    if (!roomPopover) return

    const updatedRooms = roomPopover.rooms.filter((r) => r !== roomToRemove)
    const roomString = updatedRooms.join(', ')

    if (roomPopover.type === 'reception') {
      updateReceptionValue(roomPopover.reason as ReceptionReason, 'room_number', roomString)
    } else {
      updateHousekeepingValue(roomPopover.reason as HousekeepingReason, 'room_number', roomString)
    }

    setRoomPopover({ ...roomPopover, rooms: updatedRooms })
  }

  // Añadir nota
  const addNote = (newNote: string) => {
    if (!notePopover) return
    const trimmed = newNote.trim()
    if (!trimmed || notePopover.notes.includes(trimmed)) return
    if (trimmed.length > 200) {
      alert('La nota no puede superar 200 caracteres')
      return
    }
    if (notePopover.notes.length >= 10) {
      alert('Máximo 10 notas')
      return
    }

    const updatedNotes = [...notePopover.notes, trimmed]
    const noteString = updatedNotes.join(', ')

    if (notePopover.type === 'reception') {
      updateReceptionValue(notePopover.reason as ReceptionReason, 'notes', noteString)
    } else {
      updateHousekeepingValue(notePopover.reason as HousekeepingReason, 'notes', noteString)
    }

    setNotePopover({ ...notePopover, notes: updatedNotes })
  }

  // Eliminar nota
  const removeNote = (noteToRemove: string) => {
    if (!notePopover) return

    const updatedNotes = notePopover.notes.filter((n) => n !== noteToRemove)
    const noteString = updatedNotes.join(', ')

    if (notePopover.type === 'reception') {
      updateReceptionValue(notePopover.reason as ReceptionReason, 'notes', noteString)
    } else {
      updateHousekeepingValue(notePopover.reason as HousekeepingReason, 'notes', noteString)
    }

    setNotePopover({ ...notePopover, notes: updatedNotes })
  }

  // Añadir nueva nota general
  const addGeneralNote = () => {
    if (!newNoteText.trim() || !user) return

    const newNote: Note = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      author: user.username || user.email || 'Usuario',
      author_id: user.id,
      timestamp: new Date().toISOString(),
    }

    setNotes((prev) => [newNote, ...prev])
    setNewNoteText('')
  }

  // Eliminar nota general
  const deleteGeneralNote = (noteId: string, authorId: string) => {
    if (user?.id !== authorId) {
      alert('Solo el autor puede eliminar esta nota')
      return
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  // Formatear fecha de nota
  const formatNoteDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ✅ Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  // ✅ Obtener día anterior
  const getPreviousDay = (dateString: string) => {
    const date = new Date(dateString)
    date.setDate(date.getDate() - 1)
    return date.getDate()
  }

  // ✅ Obtener base_rooms (habitaciones facturadas día anterior)
  const getBaseRooms = (): number => {
    return receptionForm['base_rooms']?.value || 0
  }

  const handleSave = async () => {
    if (!conciliation) return

    setSaving(true)
    try {
      const formData: FormData = {
        reception: RECEPTION_REASONS_ORDERED.map((reason) => ({
          reason,
          value: receptionForm[reason]?.value || 0,
          room_number: receptionForm[reason]?.room_number || '',
          notes: receptionForm[reason]?.notes || '',
        })),
        housekeeping: HOUSEKEEPING_REASONS_ORDERED.map((reason) => ({
          reason,
          value: housekeepingForm[reason]?.value || 0,
          room_number: housekeepingForm[reason]?.room_number || '',
          notes: housekeepingForm[reason]?.notes || '',
        })),
        notes: JSON.stringify(notes),
      }

      await conciliationApi.updateForm(conciliation.id!, formData)
      onUpdate()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async () => {
    if (!conciliation) return
    await handleSave()

    try {
      await conciliationApi.updateStatus(conciliation.id!, 'confirmed')
      onUpdate()
    } catch (error) {
      console.error('Error confirming:', error)
      alert('Error al confirmar')
    }
  }

  const handleReopen = async () => {
    if (!conciliation) return

    try {
      await conciliationApi.updateStatus(conciliation.id!, 'draft')
      onUpdate()
    } catch (error) {
      console.error('Error reopening:', error)
      alert('Error al reabrir')
    }
  }

  const handleClose = async () => {
    if (!conciliation) return
    if (!confirm('¿Cerrar conciliación? No se podrá modificar después.')) return

    try {
      await conciliationApi.updateStatus(conciliation.id!, 'closed')
      onUpdate()
    } catch (error) {
      console.error('Error closing:', error)
      alert('Error al cerrar')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (!conciliation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <FiAlertCircle className="w-12 h-12 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">
          {dayStatusMessage || 'Selecciona un día'}
        </p>
      </div>
    )
  }

  const isReadOnly = conciliation.status === 'closed'
  const isDraft = conciliation.status === 'draft'
  const isConfirmed = conciliation.status === 'confirmed'
  const showMonthlySummary = isLastDayOfMonth(conciliation.date)

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 relative">
      {/* Popover de habitaciones */}
      {roomPopover && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setRoomPopover(null)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-4 w-80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Habitaciones ({roomPopover.rooms.length}/15)
              </h3>
              <button
                onClick={() => setRoomPopover(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {!isReadOnly && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Añadir habitación (ej: 107)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addRoom(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] placeholder:text-[#57606a] dark:placeholder:text-[#8b949e] focus:bg-white dark:focus:bg-[#0d1117] focus:border-[#0969da] dark:focus:border-[#58a6ff] focus:ring-2 focus:ring-[#0969da]/20 dark:focus:ring-[#58a6ff]/20"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Presiona Enter para añadir
                </p>
              </div>
            )}

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {roomPopover.rooms.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                  No hay habitaciones
                </p>
              ) : (
                roomPopover.rooms.map((room) => (
                  <div
                    key={room}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded text-sm"
                  >
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{room}</span>
                    {!isReadOnly && (
                      <button
                        onClick={() => removeRoom(room)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Popover de notas */}
      {notePopover && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setNotePopover(null)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-4 w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notas ({notePopover.notes.length}/10)
              </h3>
              <button
                onClick={() => setNotePopover(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {!isReadOnly && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Añadir nota (máx. 200 caracteres)"
                  maxLength={200}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addNote(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] placeholder:text-[#57606a] dark:placeholder:text-[#8b949e] focus:bg-white dark:focus:bg-[#0d1117] focus:border-[#0969da] dark:focus:border-[#58a6ff] focus:ring-2 focus:ring-[#0969da]/20 dark:focus:ring-[#58a6ff]/20"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Presiona Enter para añadir
                </p>
              </div>
            )}

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {notePopover.notes.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                  No hay notas
                </p>
              ) : (
                notePopover.notes.map((note, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded text-sm gap-2"
                  >
                    <span className="text-gray-900 dark:text-gray-100 break-words flex-1">
                      {note}
                    </span>
                    {!isReadOnly && (
                      <button
                        onClick={() => removeNote(note)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Totales destacados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Recepción</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {totals.totalReception}
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
            Housekeeping
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
            {totals.totalHousekeeping}
          </div>
        </div>
        <div
          className={`border rounded-lg p-4 ${
            totals.difference === 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div
            className={`text-sm font-medium ${
              totals.difference === 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            Descuadre
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              totals.difference === 0
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {totals.difference}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      {!isReadOnly && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
          >
            <FiSave className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>

          {isDraft && (
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-md transition-colors"
            >
              <FiCheck className="w-4 h-4" />
              Enviar/Firmar
            </button>
          )}

          {isConfirmed && (
            <>
              <button
                onClick={handleReopen}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <FiEdit3 className="w-4 h-4" />
                Reabrir
              </button>
              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
              >
                <FiLock className="w-4 h-4" />
                Cerrar definitivamente
              </button>
            </>
          )}
        </div>
      )}

      {isReadOnly && (
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <FiLock className="w-5 h-5" />
            <span className="font-medium">Conciliación cerrada - Solo lectura</span>
          </div>
        </div>
      )}

      {/* GRID PRINCIPAL: Tablas + Resumen */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:items-start">
        {/* COLUMNA IZQUIERDA: Recepción + Housekeeping + Notas Generales */}
        <div className="xl:col-span-2 space-y-6">
          {/* RECEPCIÓN */}
          <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                Recepción
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50 dark:bg-blue-900/20">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      Concepto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-20">
                      Valor
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-24">
                      Nº Hab
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-24">
                      Notas
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-20">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {RECEPTION_REASONS_ORDERED.map((reason) => {
                    const config = RECEPTION_CONFIG[reason]
                    const entry = receptionForm[reason] || { value: 0, room_number: '', notes: '' }
                    const rooms = parseRooms(entry.room_number)
                    const entryNotes = parseNotes(entry.notes)

                    return (
                      <tr key={reason} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {config.label}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={entry.value === 0 ? '' : entry.value}
                            onChange={(e) =>
                              updateReceptionValue(reason, 'value', parseInt(e.target.value) || 0)
                            }
                            disabled={isReadOnly}
                            placeholder="0"
                            className="w-full px-2 py-1 text-sm text-center border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] placeholder:text-[#57606a] dark:placeholder:text-[#8b949e] disabled:bg-[#eaeef2] dark:disabled:bg-[#161b22] disabled:cursor-not-allowed focus:bg-white dark:focus:bg-[#0d1117] focus:border-[#0969da] dark:focus:border-[#58a6ff] focus:ring-2 focus:ring-[#0969da]/20 dark:focus:ring-[#58a6ff]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleRoomClick('reception', reason, entry.room_number)}
                            disabled={isReadOnly}
                            className="w-full px-2 py-1 text-sm text-left border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] hover:border-[#0969da] dark:hover:border-[#58a6ff] disabled:bg-[#eaeef2] dark:disabled:bg-[#161b22] disabled:cursor-not-allowed truncate transition-colors"
                          >
                            {rooms.length > 0 ? (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">{rooms.length}</span>
                                <span className="text-[#57606a] dark:text-[#8b949e]">hab.</span>
                              </span>
                            ) : (
                              <span className="text-[#57606a] dark:text-[#8b949e]">Añadir</span>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleNoteClick('reception', reason, entry.notes)}
                            disabled={isReadOnly}
                            className="w-full px-2 py-1 text-sm text-left border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] hover:border-[#0969da] dark:hover:border-[#58a6ff] disabled:bg-[#eaeef2] dark:disabled:bg-[#161b22] disabled:cursor-not-allowed truncate transition-colors"
                          >
                            {entryNotes.length > 0 ? (
                              <span className="flex items-center gap-1">
                                <FiFileText className="w-3.5 h-3.5 text-[#57606a] dark:text-[#8b949e]" />
                                <span className="font-medium">{entryNotes.length}</span>
                              </span>
                            ) : (
                              <span className="text-[#57606a] dark:text-[#8b949e]">Añadir</span>
                            )}
                          </button>
                        </td>
                        <td
                          className={`px-3 py-2 text-sm font-medium text-center ${
                            config.direction === 'add'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {config.direction === 'add' ? '+' : '-'}
                          {entry.value}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
                    >
                      Total Recepción
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-center text-blue-700 dark:text-blue-300">
                      {totals.totalReception}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* HOUSEKEEPING */}
          <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                Housekeeping
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50 dark:bg-purple-900/20">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      Concepto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-20">
                      Valor
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-24">
                      Nº Hab
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 w-24">
                      Notas
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-20">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {HOUSEKEEPING_REASONS_ORDERED.map((reason) => {
                    const config = HOUSEKEEPING_CONFIG[reason]
                    const entry = housekeepingForm[reason] || {
                      value: 0,
                      room_number: '',
                      notes: '',
                    }
                    const rooms = parseRooms(entry.room_number)
                    const entryNotes = parseNotes(entry.notes)

                    return (
                      <tr key={reason} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {config.label}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={entry.value === 0 ? '' : entry.value}
                            onChange={(e) =>
                              updateHousekeepingValue(
                                reason,
                                'value',
                                parseInt(e.target.value) || 0
                              )
                            }
                            disabled={isReadOnly}
                            placeholder="0"
                            className="w-full px-2 py-1 text-sm text-center border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] placeholder:text-[#57606a] dark:placeholder:text-[#8b949e] disabled:bg-[#eaeef2] dark:disabled:bg-[#161b22] disabled:cursor-not-allowed focus:bg-white dark:focus:bg-[#0d1117] focus:border-[#0969da] dark:focus:border-[#58a6ff] focus:ring-2 focus:ring-[#0969da]/20 dark:focus:ring-[#58a6ff]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() =>
                              handleRoomClick('housekeeping', reason, entry.room_number)
                            }
                            disabled={isReadOnly}
                            className="w-full px-2 py-1 text-sm text-left border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] hover:border-[#0969da] dark:hover:border-[#58a6ff] disabled:bg-[#eaeef2] dark:disabled:bg-[#161b22] disabled:cursor-not-allowed truncate transition-colors"
                          >
                            {rooms.length > 0 ? (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">{rooms.length}</span>
                                <span className="text-[#57606a] dark:text-[#8b949e]">hab.</span>
                              </span>
                            ) : (
                              <span className="text-[#57606a] dark:text-[#8b949e]">Añadir</span>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleNoteClick('housekeeping', reason, entry.notes)}
                            disabled={isReadOnly}
                            className="w-full px-2 py-1 text-sm text-left border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] hover:bg-[#f6f8fa] dark:hover:bg-[#161b22] hover:border-[#0969da] dark:hover:border-[#58a6ff] disabled:bg-[#eaeef2] dark:disabled:bg-[#161b22] disabled:cursor-not-allowed truncate transition-colors"
                          >
                            {entryNotes.length > 0 ? (
                              <span className="flex items-center gap-1">
                                <FiFileText className="w-3.5 h-3.5 text-[#57606a] dark:text-[#8b949e]" />
                                <span className="font-medium">{entryNotes.length}</span>
                              </span>
                            ) : (
                              <span className="text-[#57606a] dark:text-[#8b949e]">Añadir</span>
                            )}
                          </button>
                        </td>
                        <td
                          className={`px-3 py-2 text-sm font-medium text-center ${
                            config.direction === 'add'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {config.direction === 'add' ? '+' : '-'}
                          {entry.value}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-purple-50 dark:bg-purple-900/20 border-t-2 border-purple-200 dark:border-purple-800">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
                    >
                      Total Housekeeping
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-center text-purple-700 dark:text-purple-300">
                      {totals.totalHousekeeping}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* NOTAS GENERALES */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4" />
                Notas Generales ({notes.length})
              </h3>
            </div>

            <div className="p-4 flex-1 flex flex-col" style={{ maxHeight: '400px' }}>
              {!isReadOnly && (
                <div className="space-y-2 flex-shrink-0 mb-4">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Añadir observación general..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-[#d0d7de] dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117] text-[#24292f] dark:text-[#f0f6fc] placeholder:text-[#57606a] dark:placeholder:text-[#8b949e] focus:bg-white dark:focus:bg-[#0d1117] focus:border-[#0969da] dark:focus:border-[#58a6ff] focus:ring-2 focus:ring-[#0969da]/20 dark:focus:ring-[#58a6ff]/20 resize-none"
                  />
                  <button
                    onClick={addGeneralNote}
                    disabled={!newNoteText.trim()}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Añadir nota
                  </button>
                </div>
              )}

              <div className="space-y-2 overflow-y-auto flex-1">
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                    No hay notas generales
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex flex-col gap-0.5 text-[10px] text-gray-600 dark:text-gray-400 min-w-0">
                          <div className="flex items-center gap-1">
                            <FiUser className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium truncate">{note.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiClock className="w-3 h-3 flex-shrink-0" />
                            <span>{formatNoteDate(note.timestamp)}</span>
                          </div>
                        </div>
                        {!isReadOnly && user?.id === note.author_id && (
                          <button
                            onClick={() => deleteGeneralNote(note.id, note.author_id)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                            title="Eliminar nota"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {note.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Resumen Mensual / Información del Día */}
        <div className="xl:col-span-1">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col xl:sticky xl:top-6">
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {showMonthlySummary ? 'Resumen Mensual' : 'Información del Día'}
              </h3>
            </div>

            <div className="p-4 overflow-y-auto">
              {/* Vista fin de mes: Resumen mensual + Información del día */}
              {showMonthlySummary && (
                <div className="space-y-6">
                  {/* Resumen Mensual */}
                  <div>
                    {loadingMonthlySummary ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                        Cargando resumen...
                      </div>
                    ) : monthlySummary ? (
                      <div className="space-y-4">
                        {/* Info del período */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs">
                          <p className="text-gray-600 dark:text-gray-400 mb-1">
                            Período: {formatDate(monthlySummary.period.start)} -{' '}
                            {formatDate(monthlySummary.period.end)}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            Días: {monthlySummary.period.conciliations_count} /{' '}
                            {monthlySummary.period.total_days}
                          </p>
                          {monthlySummary.period.missing_days > 0 && (
                            <p className="text-red-600 dark:text-red-400 mt-1 font-medium">
                              ⚠️ Faltan {monthlySummary.period.missing_days} día(s)
                            </p>
                          )}
                        </div>

                        {/* Totales del mes */}
                        <div className="space-y-3">
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              Total Recepción
                            </p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {monthlySummary.totals.total_reception}
                            </p>
                          </div>

                          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              Total Housekeeping
                            </p>
                            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {monthlySummary.totals.total_housekeeping}
                            </p>
                          </div>

                          <div
                            className={`border rounded-lg p-3 ${
                              monthlySummary.totals.difference === 0
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            }`}
                          >
                            <p
                              className={`text-xs font-medium ${
                                monthlySummary.totals.difference === 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              Descuadre Total
                            </p>
                            <p
                              className={`text-2xl font-bold ${
                                monthlySummary.totals.difference === 0
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {monthlySummary.totals.difference}
                            </p>
                          </div>
                        </div>

                        {/* Tabla resumen por conceptos */}
                        <div className="space-y-3">
                          {/* Recepción */}
                          <div>
                            <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                              Recepción
                            </h5>
                            <div className="space-y-1">
                              {monthlySummary.reception_summary.map((item) => (
                                <div
                                  key={item.reason}
                                  className="flex justify-between items-center text-xs bg-gray-50 dark:bg-gray-900 rounded px-2 py-1"
                                >
                                  <span className="text-gray-700 dark:text-gray-300 truncate pr-2">
                                    {item.label}
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {item.total}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Housekeeping */}
                          <div>
                            <h5 className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">
                              Housekeeping
                            </h5>
                            <div className="space-y-1">
                              {monthlySummary.housekeeping_summary.map((item) => (
                                <div
                                  key={item.reason}
                                  className="flex justify-between items-center text-xs bg-gray-50 dark:bg-gray-900 rounded px-2 py-1"
                                >
                                  <span className="text-gray-700 dark:text-gray-300 truncate pr-2">
                                    {item.label}
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {item.total}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Errores de validación */}
                        {monthlySummary.validation_errors.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                              ⚠️ No se puede cerrar el mes:
                            </p>
                            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                              {monthlySummary.validation_errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                        No se pudo cargar el resumen mensual
                      </div>
                    )}
                  </div>

                  {/* Divisor */}
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>

                  {/* Información del Día (debajo del resumen mensual) */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Información del Día
                    </h4>
                    <div className="space-y-4">
                      {/* Firma Recepción */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Firma Recepción
                        </h5>
                        <div className="h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg" />
                      </div>

                      {/* Fecha y Facturación */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FiCalendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Fecha:
                          </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatDate(conciliation.date)}
                          </span>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-4">
                            FACTURACIÓN DÍA {getPreviousDay(conciliation.date)}:
                          </p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            Total {getBaseRooms()} habitaciones
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vista diaria normal (días normales) */}
              {!showMonthlySummary && (
                <div className="space-y-6">
                  {/* Firma Recepción */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Firma Recepción
                    </h4>
                    <div className="h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg" />
                  </div>

                  {/* Fecha y Facturación */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FiCalendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Fecha:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDate(conciliation.date)}
                      </span>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                        FACTURACIÓN DÍA {getPreviousDay(conciliation.date)}:
                      </p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        Total {getBaseRooms()} habitaciones
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
