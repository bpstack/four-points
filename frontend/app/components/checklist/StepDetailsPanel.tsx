'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiTrash2, FiSend, FiUpload, FiX, FiMessageSquare, FiPaperclip } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { checklistApi, checklistKeys } from '@/app/lib/checklist/api'
import type { CommentDto, AttachmentDto } from '@/app/lib/checklist/api'
import { useAuthContext } from '@/app/lib/auth/useAuth'

// ── Comment list ──────────────────────────────────────────

function CommentList({ checklistId, stepId }: { checklistId: string; stepId: string }) {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

  const { data: comments = [], isLoading } = useQuery({
    queryKey: checklistKeys.comments(checklistId, stepId),
    queryFn: () => checklistApi.getComments(checklistId, stepId),
  })

  const addMutation = useMutation({
    mutationFn: (text: string) => checklistApi.addComment(checklistId, stepId, text),
    onSuccess: (comment) => {
      queryClient.setQueryData<CommentDto[]>(
        checklistKeys.comments(checklistId, stepId),
        (prev) => [...(prev ?? []), comment]
      )
      queryClient.invalidateQueries({ queryKey: checklistKeys.run(checklistId) })
      setBody('')
    },
    onError: () => toast.error('Error al añadir comentario'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => checklistApi.deleteComment(checklistId, stepId, id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<CommentDto[]>(checklistKeys.comments(checklistId, stepId), (prev) =>
        (prev ?? []).filter((c) => c.id !== id)
      )
      queryClient.invalidateQueries({ queryKey: checklistKeys.run(checklistId) })
    },
    onError: () => toast.error('Error al eliminar comentario'),
  })

  const isAdmin = user?.role?.toLowerCase() === 'admin'

  return (
    <div className="space-y-2.5">
      {isLoading && <p className="text-xs text-gray-400">Cargando...</p>}
      {!isLoading && comments.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin comentarios aún.</p>
      )}
      <div className="space-y-1.5">
        {comments.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-2 bg-gray-50 dark:bg-[#1c2128] rounded px-2.5 py-2"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {c.username}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(c.created_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 break-words">{c.body}</p>
            </div>
            {(isAdmin || c.user_id === user?.id) && (
              <button
                onClick={() => deleteMutation.mutate(c.id)}
                className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 transition-colors"
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              body.trim() && addMutation.mutate(body.trim())
            }
          }}
          placeholder="Comentario... (Ctrl+Enter)"
          rows={2}
          className="flex-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={() => body.trim() && addMutation.mutate(body.trim())}
          disabled={!body.trim() || addMutation.isPending}
          className="self-end w-7 h-7 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex-shrink-0"
        >
          <FiSend className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Attachment list ───────────────────────────────────────

function AttachmentList({ checklistId, stepId }: { checklistId: string; stepId: string }) {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: checklistKeys.attachments(checklistId, stepId),
    queryFn: () => checklistApi.getAttachments(checklistId, stepId),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => checklistApi.deleteAttachment(checklistId, stepId, id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AttachmentDto[]>(
        checklistKeys.attachments(checklistId, stepId),
        (prev) => (prev ?? []).filter((a) => a.id !== id)
      )
      queryClient.invalidateQueries({ queryKey: checklistKeys.run(checklistId) })
    },
    onError: () => toast.error('Error al eliminar imagen'),
  })

  const isAdmin = user?.role?.toLowerCase() === 'admin'

  return (
    <div className="space-y-2.5">
      {isLoading && <p className="text-xs text-gray-400">Cargando...</p>}
      {!isLoading && attachments.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin imágenes aún.</p>
      )}
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="relative group rounded overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square"
            >
              <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                <img src={a.file_url} alt="" className="w-full h-full object-cover" />
              </a>
              {(isAdmin || a.user_id === user?.id) && (
                <button
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-opacity"
                >
                  <FiX className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() =>
          toast('La subida de imágenes está deshabilitada temporalmente.', { icon: '🚧' })
        }
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
      >
        <FiUpload className="w-3 h-3" />
        Subir imagen
      </button>
    </div>
  )
}

// ── Panel (controlled externally) ─────────────────────────

type PanelTab = 'comments' | 'attachments'

interface StepDetailsPanelProps {
  checklistId: string
  stepId: string
  tab: PanelTab
  onClose: () => void
}

export function StepDetailsPanel({
  checklistId,
  stepId,
  tab: initialTab,
  onClose,
}: StepDetailsPanelProps) {
  const [tab, setTab] = useState<PanelTab>(initialTab)

  return (
    <div className="mt-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1117] overflow-hidden">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('comments')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${tab === 'comments' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
        >
          <FiMessageSquare className="w-3 h-3" /> Comentarios
        </button>
        <button
          onClick={() => setTab('attachments')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${tab === 'attachments' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
        >
          <FiPaperclip className="w-3 h-3" /> Imágenes
        </button>
        <button
          onClick={onClose}
          className="ml-auto px-2 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-2.5">
        {tab === 'comments' ? (
          <CommentList checklistId={checklistId} stepId={stepId} />
        ) : (
          <AttachmentList checklistId={checklistId} stepId={stepId} />
        )}
      </div>
    </div>
  )
}

// ── Inline trigger buttons only (no panel — panel is rendered by StepRow) ──

export function StepTriggerButtons({
  openTab,
  onToggle,
  commentCount,
  attachmentCount,
}: {
  openTab: 'comments' | 'attachments' | null
  onToggle: (tab: 'comments' | 'attachments') => void
  commentCount: number
  attachmentCount: number
}) {
  const hasActivity = commentCount > 0 || attachmentCount > 0

  return (
    <div
      className={`flex items-center gap-1 flex-shrink-0 transition-opacity ${hasActivity ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle('comments')
        }}
        title="Comentarios"
        className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
          openTab === 'comments'
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        <FiMessageSquare className="w-3 h-3" />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle('attachments')
        }}
        title="Imágenes"
        className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
          openTab === 'attachments'
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        <FiPaperclip className="w-3 h-3" />
        {attachmentCount > 0 && <span>{attachmentCount}</span>}
      </button>
    </div>
  )
}
