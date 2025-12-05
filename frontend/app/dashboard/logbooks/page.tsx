// app/dashboard/logbooks/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  FiClock,
  FiAlertCircle,
  FiEdit2,
  FiMessageSquare,
  FiEye,
  FiCheckCircle,
  FiClock as FiPending,
  FiX,
  FiTrash2,
  FiSave,
  FiUser,
  FiUsers,
  FiTag,
} from 'react-icons/fi'
import { HiOutlineClipboardList } from 'react-icons/hi'
import { SlBookOpen } from 'react-icons/sl'
import { LogEntry } from '@/app/lib/logbooks/types'
import { useAuth } from '@/app/lib/auth/useAuth'
import { toast } from 'react-hot-toast'
import NewCommentEntry from '@/app/components/logbooks/NewCommentEntry'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'
import { updateLogbookSchema, updateCommentSchema } from '@/app/lib/logbooks/validations'
// ✅ Importar ambas funciones de date.ts
import { formatEditTimestamp, formatMadridDate } from '@/app/lib/helpers/date'

/**
 * Formatea el nombre de usuario: primera letra en mayúscula, resto en minúscula
 */
function formatUsername(username: string | undefined | null): string {
  if (!username) return 'Unknown'
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()
}

// ✅ Interfaz para usuarios que han leído
interface ReadByUser {
  user_id: string
  username: string
  read_at: string
}

// ✅ Función para generar iniciales
function getInitials(username: string): string {
  if (!username) return '?'
  const parts = username.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.substring(0, 2).toUpperCase()
}

// ✅ Componente para mostrar avatares apilados
function ReadByAvatars({ users, maxVisible = 8 }: { users: ReadByUser[]; maxVisible?: number }) {
  const visibleUsers = users.slice(0, maxVisible)
  const remainingCount = users.length - maxVisible

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-red-500',
    'bg-indigo-500',
  ]

  const getColor = (index: number) => colors[index % colors.length]

  const rows: ReadByUser[][] = []
  for (let i = 0; i < visibleUsers.length; i += 4) {
    rows.push(visibleUsers.slice(i, i + 4))
  }

  if (users.length === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-500 italic">Nadie aún</span>
  }

  return (
    <div className="flex flex-col gap-1">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex items-center -space-x-2">
          {row.map((user, index) => {
            const globalIndex = rowIndex * 4 + index
            const initials = getInitials(user.username)
            return (
              <div
                key={user.user_id}
                className={`w-7 h-7 rounded-full ${getColor(globalIndex)} text-white text-xs font-semibold flex items-center justify-center border-2 border-white dark:border-gray-800 cursor-pointer hover:scale-110 transition-transform hover:z-10 relative`}
                title={`${user.username} - ${formatMadridDate(user.read_at)}`}
              >
                {initials}
              </div>
            )
          })}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">
          +{remainingCount} más
        </div>
      )}
    </div>
  )
}

// Helpers de prioridad
function getPriorityLabel(priority: string) {
  switch (priority) {
    case 'critical':
      return 'Critical'
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    default:
      return priority
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical':
      return 'text-red-700 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
    case 'high':
      return 'text-orange-700 bg-orange-100 border-orange-300 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800'
    case 'medium':
      return 'text-yellow-700 bg-yellow-100 border-yellow-300 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800'
    case 'low':
      return 'text-green-700 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800'
    default:
      return 'text-gray-700 bg-gray-100 border-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700'
  }
}

function getPriorityBackground(priority: string) {
  switch (priority) {
    case 'critical':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    case 'high':
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
    default:
      return 'bg-white dark:bg-[#151b23] border-gray-200 dark:border-gray-800'
  }
}

export default function LogbooksPage({
  entries = [],
  dayStatusMessage = '',
  onCommentAdded,
}: {
  entries?: LogEntry[]
  dayStatusMessage?: string
  onCommentAdded?: () => void
}) {
  const { user } = useAuth()
  // ✅ Obtener también loading y displayName
  const { departments, getDepartmentName, loading: departmentsLoading } = useDepartments()

  // Estados existentes
  const [commentModalOpen, setCommentModalOpen] = useState<number | null>(null)
  const [newComment, setNewComment] = useState('')
  const [commentPriority, setCommentPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>(
    'baja'
  )
  const [commentDepartment, setCommentDepartment] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localEntries, setLocalEntries] = useState<LogEntry[]>([])

  // Estados para edición de logbooks
  const [editModalOpen, setEditModalOpen] = useState<number | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [editPriority, setEditPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('baja')
  const [editDepartment, setEditDepartment] = useState<number>(1)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  // Estados para edición de comentarios
  const [editCommentModalOpen, setEditCommentModalOpen] = useState<{
    entryId: number
    commentId: number
  } | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [editCommentPriority, setEditCommentPriority] = useState<
    'baja' | 'media' | 'alta' | 'urgente'
  >('baja')
  const [editCommentDepartment, setEditCommentDepartment] = useState<number>(1)
  const [isEditCommentSubmitting, setIsEditCommentSubmitting] = useState(false)

  // Estado para lectores
  const [readByUsers, setReadByUsers] = useState<Record<number, ReadByUser[]>>({})
  const [loadingReaders, setLoadingReaders] = useState<Record<number, boolean>>({})

  // Cargar lectores desde el backend
  const loadReaders = async (entryId: number) => {
    if (loadingReaders[entryId]) return

    setLoadingReaders((prev) => ({ ...prev, [entryId]: true }))
    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')
      const readers = await logbooksApi.getReaders(entryId)
      setReadByUsers((prev) => ({ ...prev, [entryId]: readers }))
    } catch (error) {
      console.error('Error loading readers:', error)
    } finally {
      setLoadingReaders((prev) => ({ ...prev, [entryId]: false }))
    }
  }

  useEffect(() => {
    setLocalEntries(entries ?? [])
    entries.forEach((entry) => {
      loadReaders(entry.id)
    })
  }, [entries])

  // ═══════════════════════════════════════════════════════════
  // EDICIÓN DE LOGBOOK
  // ═══════════════════════════════════════════════════════════
  const handleEdit = (entryId: number) => {
    const entry = localEntries.find((e) => e.id === entryId)
    if (!entry) return

    if (user?.id !== entry.author_id) {
      toast.error('Solo el autor puede editar esta entrada')
      return
    }

    // Convertir priority a formato backend
    let backendPriority: 'baja' | 'media' | 'alta' | 'urgente' = 'baja'
    if (entry.priority === 'critical') backendPriority = 'urgente'
    else if (entry.priority === 'high') backendPriority = 'alta'
    else if (entry.priority === 'medium') backendPriority = 'media'
    else backendPriority = 'baja'

    // ✅ CORREGIR: Usar directamente entry.department_id en lugar de parsear entry.department
    const deptId = entry.department_id || 1

    setEditMessage(entry.description)
    setEditPriority(backendPriority)
    setEditDepartment(deptId)
    setEditModalOpen(entryId)
  }

  const handleSaveEdit = async () => {
    // ✅ Validación con Zod
    const validation = updateLogbookSchema.safeParse({
      message: editMessage.trim(),
      importance_level: editPriority,
      department_id: editDepartment,
    })

    if (!validation.success) {
      const firstError = validation.error.errors[0]
      toast.error(firstError.message)
      return
    }

    setIsEditSubmitting(true)
    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')

      await logbooksApi.updateLogbook(editModalOpen!, {
        message: editMessage.trim(),
        importance_level: editPriority,
        department_id: editDepartment,
      })

      // Actualizar estado local
      setLocalEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === editModalOpen) {
            let priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
            if (editPriority === 'urgente') priority = 'critical'
            else if (editPriority === 'alta') priority = 'high'
            else if (editPriority === 'media') priority = 'medium'

            return {
              ...entry,
              description: editMessage.trim(),
              priority,
              // ✅ IMPORTANTE: Actualizar tanto department como department_id
              department: getDepartmentName(editDepartment),
              department_id: editDepartment,
              updated_at: new Date().toISOString(),
              is_edited: true,
            }
          }
          return entry
        })
      )

      setEditModalOpen(null)
      toast.success('Entrada actualizada correctamente')

      if (onCommentAdded) onCommentAdded()
    } catch (error: any) {
      console.error('Error updating logbook:', error)
      toast.error(error.message || 'Error al actualizar la entrada')
    } finally {
      setIsEditSubmitting(false)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // COMENTARIOS
  // ═══════════════════════════════════════════════════════════
  const handleOpenCommentModal = (entryId: number) => {
    setCommentModalOpen(entryId)
    setNewComment('')
    setCommentPriority('baja')
    setCommentDepartment(1)
  }

  const handleSaveComment = async (
    entryId: number,
    payload?: {
      comment: string
      department_id: number
      importance_level: 'baja' | 'media' | 'alta' | 'urgente'
    }
  ) => {
    const commentText = payload?.comment ?? newComment
    const deptId = payload?.department_id ?? commentDepartment
    const priorityLevel = payload?.importance_level ?? commentPriority

    if (!commentText.trim()) return

    setIsSubmitting(true)
    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')

      await logbooksApi.comments.createComment(entryId, {
        comment: commentText.trim(),
        department_id: deptId,
        importance_level: priorityLevel,
      })

      setCommentModalOpen(null)
      setNewComment('')
      toast.success('Comentario añadido correctamente')

      if (onCommentAdded) onCommentAdded()
    } catch (error) {
      console.error('Error creating comment:', error)
      toast.error('Error al crear el comentario')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EDICIÓN DE COMENTARIO
  // ═══════════════════════════════════════════════════════════
  const handleEditComment = (entryId: number, commentId: number) => {
    const entry = localEntries.find((e) => e.id === entryId)
    const comment = entry?.comments?.find((c) => c.id === commentId)

    if (!comment) return

    if (user?.id !== comment.user_id) {
      toast.error('Solo el autor puede editar este comentario')
      return
    }

    let backendPriority: 'baja' | 'media' | 'alta' | 'urgente' = 'baja'
    if (comment.importance_level === 'urgente') backendPriority = 'urgente'
    else if (comment.importance_level === 'alta') backendPriority = 'alta'
    else if (comment.importance_level === 'media') backendPriority = 'media'

    setEditCommentText(comment.comment)
    setEditCommentPriority(backendPriority)
    // ✅ Ya está bien, usa comment.department_id directamente
    setEditCommentDepartment(comment.department_id || 1)
    setEditCommentModalOpen({ entryId, commentId })
  }

  const handleSaveEditComment = async () => {
    // ✅ Validación con Zod
    const validation = updateCommentSchema.safeParse({
      comment: editCommentText.trim(),
      importance_level: editCommentPriority,
      department_id: editCommentDepartment,
    })

    if (!validation.success) {
      const firstError = validation.error.errors[0]
      toast.error(firstError.message)
      return
    }

    setIsEditCommentSubmitting(true)
    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')

      await logbooksApi.comments.updateComment(
        editCommentModalOpen!.entryId,
        editCommentModalOpen!.commentId,
        {
          comment: editCommentText.trim(),
          importance_level: editCommentPriority,
          department_id: editCommentDepartment,
        }
      )

      // Actualizar estado local
      setLocalEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === editCommentModalOpen!.entryId) {
            return {
              ...entry,
              comments: entry.comments?.map((c) =>
                c.id === editCommentModalOpen!.commentId
                  ? {
                      ...c,
                      comment: editCommentText.trim(),
                      importance_level: editCommentPriority,
                      department_id: editCommentDepartment,
                      updated_at: new Date().toISOString(),
                    }
                  : c
              ),
            }
          }
          return entry
        })
      )

      setEditCommentModalOpen(null)
      toast.success('Comentario actualizado correctamente')

      if (onCommentAdded) onCommentAdded()
    } catch (error: any) {
      console.error('Error updating comment:', error)
      toast.error(error.message || 'Error al actualizar el comentario')
    } finally {
      setIsEditCommentSubmitting(false)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // OTRAS ACCIONES
  // ═══════════════════════════════════════════════════════════
  const handleToggleStatus = async (entryId: number, currentStatus: string) => {
    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')

      if (currentStatus === 'resolved') {
        await logbooksApi.markAsPending(entryId)
        toast.success('Estado cambiado a pendiente')
      } else {
        await logbooksApi.markAsSolved(entryId)
        toast.success('Estado cambiado a resuelto')
      }

      setLocalEntries((prevEntries) =>
        prevEntries.map((entry) =>
          entry.id === entryId
            ? { ...entry, status: currentStatus === 'resolved' ? 'pending' : 'resolved' }
            : entry
        )
      )
    } catch (error) {
      console.error('Error toggling logbook status:', error)
      toast.error('Error al cambiar el estado')
    }
  }

  const handleToggleRead = async (entryId: number) => {
    if (!user?.id || !user?.username) {
      toast.error('Usuario no autenticado')
      return
    }

    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')

      const currentReaders = readByUsers[entryId] || []
      const alreadyRead = currentReaders.some((reader) => reader.user_id === user.id)

      if (alreadyRead) {
        await logbooksApi.unmarkAsRead(entryId)
        setReadByUsers((prev) => ({
          ...prev,
          [entryId]: currentReaders.filter((reader) => reader.user_id !== user.id),
        }))
        toast.success('Desmarcado como leído')
      } else {
        await logbooksApi.markAsRead(entryId)
        const newReader: ReadByUser = {
          user_id: user.id,
          username: user.username,
          read_at: new Date().toISOString(),
        }
        setReadByUsers((prev) => ({
          ...prev,
          [entryId]: [...currentReaders, newReader],
        }))
        toast.success('Marcado como leído')
      }
    } catch (error) {
      console.error('Error toggling read status:', error)
      toast.error('Error al cambiar el estado de lectura')
    }
  }

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta entrada?')) return

    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')
      await logbooksApi.deleteLogbook(entryId)
      setLocalEntries((prev) => prev.filter((e) => e.id !== entryId))
      toast.success('Entrada eliminada correctamente')
    } catch (error: any) {
      console.error('Error deleting logbook:', error)
      toast.error(error.message || 'Error al eliminar la entrada')
    }
  }

  const handleDeleteComment = async (entryId: number, commentId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este comentario?')) return

    try {
      const { logbooksApi } = await import('@/app/api/logbooks/route')
      await logbooksApi.comments.deleteComment(entryId, commentId)
      setLocalEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === entryId) {
            return {
              ...entry,
              comments: entry.comments?.filter((c) => c.id !== commentId),
            }
          }
          return entry
        })
      )
      toast.success('Comentario eliminado correctamente')
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      toast.error(error.message || 'Error al eliminar el comentario')
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto space-y-3">
      {/* Header - Desktop only */}
      {localEntries.length > 0 && (
        <div className="hidden md:block sticky top-[115px] z-20 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#0d1117] shadow-sm overflow-hidden mb-3">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-950/20 dark:to-gray-900/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                <HiOutlineClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Libro de Consignas
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Última actualización: hoy</span>
            </div>
          </div>

          <div className="flex px-3 py-2.5 bg-gray-50/50 dark:bg-gray-900/20">
            <div className="w-24 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 pr-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                ⏰🙋‍♂️
              </h3>
            </div>
            <div className="flex-1 px-4 border-r border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <SlBookOpen className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Logbook Entries
                </h3>
              </div>
            </div>
            <div className="w-32 flex-shrink-0 px-3 border-r border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <FiUsers className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Department
                </h3>
              </div>
            </div>
            <div className="w-28 flex-shrink-0 px-3 border-r border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <FiTag className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Nivel
                </h3>
              </div>
            </div>
            <div className="w-40 flex-shrink-0 pl-3">
              <div className="flex items-center gap-1.5">
                <FiEye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Leído por
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entradas */}
      {localEntries.map((entry) => (
        <div
          key={entry.id}
          className={`border rounded-lg hover:shadow-md transition-shadow ${
            entry.status === 'resolved'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : getPriorityBackground(entry.priority ?? 'low')
          }`}
        >
          {/* Desktop Layout */}
          <div className="hidden md:flex p-4">
            <div className="w-24 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 pr-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(entry.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiUser className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {formatUsername(entry.author_name)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 px-4 border-r border-slate-200 dark:border-slate-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {entry.description}
              </p>
              {entry.comments && entry.comments.length > 0 && (
                <div className="mt-3 ml-4 space-y-2 border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                  {entry.comments
                    .sort((a, b) => {
                      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
                      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
                      return dateA - dateB
                    })
                    .map((comment: any) => (
                      <div
                        key={comment.id}
                        className={`text-sm rounded-lg p-2 border ${
                          entry.status === 'resolved'
                            ? 'bg-green-100 dark:bg-green-800/20 border-green-200 dark:border-green-600'
                            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                        }`}
                      >
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {comment.comment}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium">
                              {formatUsername(comment.author_name)}
                            </span>
                            <span>·</span>
                            <span>{formatEditTimestamp(comment.created_at)}</span>
                            {comment.updated_at && comment.updated_at !== comment.created_at && (
                              <>
                                <span>·</span>
                                <span
                                  className="italic"
                                  title={`Editado el ${formatEditTimestamp(comment.updated_at)}`}
                                >
                                  editado
                                </span>
                              </>
                            )}
                          </div>
                          {user?.id === comment.user_id && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditComment(entry.id, comment.id)
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Editar comentario"
                              >
                                <FiEdit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteComment(entry.id, comment.id)
                                }}
                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Eliminar comentario"
                              >
                                <FiTrash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="w-32 flex-shrink-0 px-3 border-r border-slate-200 dark:border-slate-700 flex items-start">
              <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md">
                {getDepartmentName(entry.department_id || 1)}
              </span>
            </div>

            <div className="w-28 flex-shrink-0 px-3 border-r border-slate-200 dark:border-slate-700 flex items-start">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getPriorityColor(entry.priority ?? 'low')}`}
              >
                {entry.priority === 'critical' && <FiAlertCircle className="w-3 h-3" />}
                {getPriorityLabel(entry.priority ?? 'low')}
              </span>
            </div>

            <div className="w-40 flex-shrink-0 pl-3 flex items-start">
              <ReadByAvatars users={readByUsers[entry.id] || []} />
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden p-4 space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {entry.description}
            </p>
            {entry.comments && entry.comments.length > 0 && (
              <div className="ml-3 space-y-2 border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                {entry.comments
                  .sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
                    return dateA - dateB
                  })
                  .map((comment: any) => (
                    <div
                      key={comment.id}
                      className={`text-sm rounded-lg p-2 border ${
                        entry.status === 'resolved'
                          ? 'bg-green-100 dark:bg-green-800/20 border-green-200 dark:border-green-600'
                          : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                      }`}
                    >
                      <p className="text-gray-700 dark:text-gray-300 text-xs whitespace-pre-wrap">
                        {comment.comment}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">{formatUsername(comment.author_name)}</span>
                          <span>·</span>
                          <span>{formatEditTimestamp(comment.created_at)}</span>
                          {comment.updated_at && comment.updated_at !== comment.created_at && (
                            <>
                              <span>·</span>
                              <span className="italic">editado</span>
                            </>
                          )}
                        </div>
                        {user?.id === comment.user_id && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditComment(entry.id, comment.id)
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title="Editar comentario"
                            >
                              <FiEdit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteComment(entry.id, comment.id)
                              }}
                              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Eliminar comentario"
                            >
                              <FiTrash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">Leído por:</span>
              <ReadByAvatars users={readByUsers[entry.id] || []} />
            </div>
          </div>

          {/* Footer - Acciones */}
          <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="hidden md:flex">
              <div className="w-24 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 pr-3" />

              <div className="flex-1 px-4 flex items-center gap-4 border-r border-slate-200 dark:border-slate-700">
                {user?.id === entry.author_id && (
                  <button
                    onClick={() => handleEdit(entry.id)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  onClick={() => handleOpenCommentModal(entry.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <FiMessageSquare className="w-4 h-4" />
                  <span>Comment</span>
                </button>

                <button
                  onClick={() => handleToggleStatus(entry.id, entry.status || 'pending')}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    entry.status === 'resolved'
                      ? 'text-green-600 dark:text-green-400 hover:text-green-700'
                      : 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700'
                  }`}
                >
                  {entry.status === 'resolved' ? (
                    <>
                      <FiCheckCircle className="w-4 h-4" />
                      <span>Resolved</span>
                    </>
                  ) : (
                    <>
                      <FiPending className="w-4 h-4" />
                      <span>Pending</span>
                    </>
                  )}
                </button>

                {user?.id === entry.author_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteEntry(entry.id)
                    }}
                    className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 transition-colors"
                    title="Eliminar entrada"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}

                {/* ✅ Mostrar fecha COMPLETA en edición */}
                {entry.updated_at && entry.updated_at !== entry.timestamp && (
                  <div
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ml-auto"
                    title={`Editado el ${formatEditTimestamp(entry.updated_at)}`}
                  >
                    <FiEdit2 className="w-3 h-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      Editado: {formatEditTimestamp(entry.updated_at)}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-32 flex-shrink-0 px-3 border-r border-slate-200 dark:border-slate-700" />
              <div className="w-28 flex-shrink-0 px-3 border-r border-slate-200 dark:border-slate-700" />

              <div className="w-40 flex-shrink-0 pl-3">
                <button
                  onClick={() => handleToggleRead(entry.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <FiEye className="w-4 h-4" />
                  <span>Mark</span>
                </button>
              </div>
            </div>

            {/* Footer Mobile */}
            <div className="md:hidden flex items-center gap-4 flex-wrap">
              {user?.id === entry.author_id && (
                <button
                  onClick={() => handleEdit(entry.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <FiEdit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}

              <button
                onClick={() => handleOpenCommentModal(entry.id)}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <FiMessageSquare className="w-4 h-4" />
                <span>Comment</span>
              </button>

              <button
                onClick={() => handleToggleStatus(entry.id, entry.status || 'pending')}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  entry.status === 'resolved'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                {entry.status === 'resolved' ? (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Resolved</span>
                  </>
                ) : (
                  <>
                    <FiPending className="w-4 h-4" />
                    <span>Pending</span>
                  </>
                )}
              </button>

              {user?.id === entry.author_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteEntry(entry.id)
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 transition-colors"
                  title="Eliminar entrada"
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}

              <button
                onClick={() => handleToggleRead(entry.id)}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <FiEye className="w-4 h-4" />
                <span>Mark</span>
              </button>

              {/* ✅ Mostrar fecha COMPLETA en edición móvil */}
              {entry.updated_at && entry.updated_at !== entry.timestamp && (
                <div
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-auto"
                  title={`Editado el ${formatEditTimestamp(entry.updated_at)}`}
                >
                  <FiEdit2 className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[10px] whitespace-nowrap">
                    Edit: {formatEditTimestamp(entry.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {localEntries.length === 0 && (
        <div className="bg-white dark:bg-[#151b23] border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dayStatusMessage || 'No entries for this day yet'}
          </p>
        </div>
      )}

      {/* Modal de Comentarios */}
      {commentModalOpen !== null && (
        <NewCommentEntry
          isOpen={commentModalOpen !== null}
          onClose={() => setCommentModalOpen(null)}
          onSubmit={async (payload) => {
            await handleSaveComment(commentModalOpen, payload)
          }}
          title="Add Comment"
          initialComment={newComment}
          initialPriority={commentPriority}
          initialDepartment={commentDepartment}
        />
      )}

      {/* ✅ Modal de Edición de Logbook - USAR displayName */}
      {editModalOpen !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0d1117] rounded-lg w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Logbook Entry
              </h3>
              <button
                onClick={() => setEditModalOpen(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                disabled={isEditSubmitting}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={6}
                  placeholder="Edit your message..."
                  disabled={isEditSubmitting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 3 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md"
                    disabled={isEditSubmitting}
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
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md"
                    disabled={isEditSubmitting || departmentsLoading}
                  >
                    {departmentsLoading ? (
                      <option>Cargando...</option>
                    ) : departments.length > 0 ? (
                      departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.displayName}
                        </option>
                      ))
                    ) : (
                      <option value={editDepartment}>No hay departamentos</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setEditModalOpen(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                disabled={isEditSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isEditSubmitting || !editMessage.trim() || editMessage.trim().length < 3}
              >
                {isEditSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal de Edición de Comentario - USAR displayName */}
      {editCommentModalOpen !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0d1117] rounded-lg w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Comment</h3>
              <button
                onClick={() => setEditCommentModalOpen(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                disabled={isEditCommentSubmitting}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={4}
                  placeholder="Edit your comment..."
                  disabled={isEditCommentSubmitting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 3 characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={editCommentPriority}
                    onChange={(e) => setEditCommentPriority(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md"
                    disabled={isEditCommentSubmitting}
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
                    value={editCommentDepartment}
                    onChange={(e) => setEditCommentDepartment(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md"
                    disabled={isEditCommentSubmitting || departmentsLoading}
                  >
                    {departmentsLoading ? (
                      <option>Cargando...</option>
                    ) : departments.length > 0 ? (
                      departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.displayName}
                        </option>
                      ))
                    ) : (
                      <option value={editCommentDepartment}>No hay departamentos</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setEditCommentModalOpen(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                disabled={isEditCommentSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditComment}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  isEditCommentSubmitting ||
                  !editCommentText.trim() ||
                  editCommentText.trim().length < 3
                }
              >
                {isEditCommentSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
