'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiTrash2, FiSend, FiUpload, FiX, FiMessageSquare, FiPaperclip } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { checklistApi, checklistKeys } from '@/app/lib/checklist/api'
import type { CommentDto, AttachmentDto } from '@/app/lib/checklist/api'
import { useAuthContext } from '@/app/lib/auth/useAuth'
import { formatTimestampSmart } from '@/app/lib/helpers/date'
import Image from 'next/image'

// ── Comment list ──────────────────────────────────────────

const COMMENT_MAX_LENGTH = 500

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

  const submitComment = () => {
    const trimmed = body.trim()
    if (!trimmed || trimmed.length > COMMENT_MAX_LENGTH) return
    addMutation.mutate(trimmed)
  }

  const isInvalid = !body.trim() || body.length > COMMENT_MAX_LENGTH

  return (
    <div className="space-y-2.5">
      {isLoading && <p className="text-xs text-fg-subtle">Cargando...</p>}
      {!isLoading && comments.length === 0 && (
        <p className="text-xs text-fg-subtle italic">Sin comentarios aún.</p>
      )}
      <div className="space-y-1.5">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2 bg-surface-hover rounded px-2.5 py-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-medium text-fg">{c.username}</span>
                <span className="text-[10px] text-fg-subtle">
                  {formatTimestampSmart(c.created_at)}
                </span>
              </div>
              <p className="text-xs text-fg break-words">{c.body}</p>
            </div>
            {(isAdmin || c.user_id === user?.id) && (
              <button
                onClick={() => deleteMutation.mutate(c.id)}
                className="text-fg-subtle hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 transition-colors"
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1 flex flex-col gap-0.5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                submitComment()
              }
            }}
            placeholder="Comentario... (Ctrl+Enter)"
            rows={2}
            maxLength={COMMENT_MAX_LENGTH}
            className="text-xs rounded border border-border bg-surface text-fg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
          />
          <span
            className={`text-[10px] self-end tabular-nums ${
              body.length >= COMMENT_MAX_LENGTH ? 'text-red-500' : 'text-fg-subtle'
            }`}
          >
            {body.length}/{COMMENT_MAX_LENGTH}
          </span>
        </div>
        <button
          onClick={submitComment}
          disabled={isInvalid || addMutation.isPending}
          className="self-start w-7 h-7 flex items-center justify-center rounded bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-fg flex-shrink-0"
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
      {isLoading && <p className="text-xs text-fg-subtle">Cargando...</p>}
      {!isLoading && attachments.length === 0 && (
        <p className="text-xs text-fg-subtle italic">Sin imágenes aún.</p>
      )}
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="relative group rounded overflow-hidden border border-border aspect-square"
            >
              <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                <Image src={a.file_url} alt="" fill className="object-cover" />
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
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border text-fg-subtle cursor-not-allowed opacity-60"
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
    <div className="mt-1.5 rounded border border-border bg-surface overflow-hidden">
      <div className="flex items-center border-b border-border">
        <button
          onClick={() => setTab('comments')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${tab === 'comments' ? 'border-blue-500 text-info' : 'border-transparent text-fg-subtle hover:text-fg'}`}
        >
          <FiMessageSquare className="w-3 h-3" /> Comentarios
        </button>
        <button
          onClick={() => setTab('attachments')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${tab === 'attachments' ? 'border-blue-500 text-info' : 'border-transparent text-fg-subtle hover:text-fg'}`}
        >
          <FiPaperclip className="w-3 h-3" /> Imágenes
        </button>
        <button onClick={onClose} className="ml-auto px-2 py-1.5 text-fg-subtle hover:text-fg">
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
            ? 'bg-blue-100 dark:bg-blue-900/40 text-info'
            : 'text-fg-subtle hover:text-fg'
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
            ? 'bg-blue-100 dark:bg-blue-900/40 text-info'
            : 'text-fg-subtle hover:text-fg'
        }`}
      >
        <FiPaperclip className="w-3 h-3" />
        {attachmentCount > 0 && <span>{attachmentCount}</span>}
      </button>
    </div>
  )
}
