'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import type { ChecklistItem, ChecklistStep } from '@/app/lib/checklist/types'
import { checklistApi, checklistKeys } from '@/app/lib/checklist/api'
import type { RunStateDto, StepStateDto } from '@/app/lib/checklist/api'
import { ChecklistHeader } from './ChecklistHeader'
import { ChecklistNoteBanner } from './ChecklistNoteBanner'
import { StepTriggerButtons, StepDetailsPanel } from './StepDetailsPanel'
import { useAuthContext } from '@/app/lib/auth/useAuth'

// ─── Checkbox ────────────────────────────────────────────

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900 ${
        checked
          ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
      }`}
    >
      {checked && <FiCheck className="w-3 h-3 text-white mx-auto" strokeWidth={3} />}
    </button>
  )
}

// ─── Step row ────────────────────────────────────────────

function StepRow({
  checklistId,
  step,
  state,
  onToggle,
}: {
  checklistId: string
  step: ChecklistStep
  state: StepStateDto | undefined
  onToggle: (done: boolean) => void
}) {
  const [openTab, setOpenTab] = useState<'comments' | 'attachments' | null>(null)
  const done = Boolean(state?.done)

  const handleToggleTab = (tab: 'comments' | 'attachments') =>
    setOpenTab((prev) => (prev === tab ? null : tab))

  return (
    <li>
      {/* Main row */}
      <div className="flex items-start gap-3 group">
        <div className="cursor-pointer mt-0.5" onClick={() => onToggle(!done)}>
          <Checkbox checked={done} onToggle={() => onToggle(!done)} />
        </div>
        <div className="flex-1 min-w-0 flex items-start gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggle(!done)}>
            <span
              className={`text-sm leading-snug transition-colors select-none ${
                done
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100'
              }`}
            >
              {step.text}
            </span>
            {done && state?.done_by_username && state.done_at && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {state.done_by_username} ·{' '}
                {new Date(state.done_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          {/* Inline trigger buttons — right side of text */}
          <StepTriggerButtons
            openTab={openTab}
            onToggle={handleToggleTab}
            commentCount={state?.comment_count ?? 0}
            attachmentCount={state?.attachment_count ?? 0}
          />
        </div>
      </div>

      {/* Note — below main row */}
      {step.note && <div className="ml-7"><ChecklistNoteBanner text={step.note} /></div>}

      {/* Panel — below the full row, aligned with text (ml-7 = checkbox width + gap) */}
      {openTab && (
        <div className="ml-7 mt-1.5">
          <StepDetailsPanel
            checklistId={checklistId}
            stepId={step.id}
            tab={openTab}
            onClose={() => setOpenTab(null)}
          />
        </div>
      )}
    </li>
  )
}

// ─── Main component ──────────────────────────────────────

export function ChecklistTasksContent({ item }: { item: ChecklistItem }) {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const queryKey = checklistKeys.run(item.id)

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => checklistApi.getRun(item.id),
    staleTime: 30_000,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ stepId, done }: { stepId: string; done: boolean }) =>
      checklistApi.toggleStep(item.id, stepId, done),
    onMutate: async ({ stepId, done }) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshot = queryClient.getQueryData<RunStateDto>(queryKey)
      queryClient.setQueryData<RunStateDto>(queryKey, (prev) => {
        if (!prev) return prev
        const existing = prev.steps.find((s) => s.step_id === stepId)
        const updated: StepStateDto = existing
          ? {
              ...existing,
              done,
              done_by_user_id: done ? (user?.id ?? null) : null,
              done_at: done ? new Date().toISOString() : null,
              done_by_username: done ? (user?.username ?? null) : null,
            }
          : {
              run_id: prev.run.id,
              step_id: stepId,
              done,
              done_by_user_id: done ? (user?.id ?? null) : null,
              done_at: done ? new Date().toISOString() : null,
              done_by_username: done ? (user?.username ?? null) : null,
              comment_count: 0,
              attachment_count: 0,
            }
        return { ...prev, steps: [...prev.steps.filter((s) => s.step_id !== stepId), updated] }
      })
      return { snapshot }
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) queryClient.setQueryData(queryKey, context.snapshot)
      toast.error('Error al actualizar el paso')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const allSteps = item.sections.flatMap((s) => s.steps)
  const stepMap = new Map(data?.steps.map((s) => [s.step_id, s]) ?? [])
  const totalDone = allSteps.filter((s) => stepMap.get(s.id)?.done).length
  const total = allSteps.length
  const pct = total > 0 ? Math.round((totalDone / total) * 100) : 0

  return (
    <div>
      <ChecklistHeader item={item} />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
          Cargando estado...
        </div>
      )}

      {!isLoading && total > 0 && (
        <div className="mb-6 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {totalDone} de {total} pasos completados
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {item.sections.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">Contenido en elaboración.</p>
      )}

      <div className="space-y-8">
        {item.sections.map((section) => (
          <div key={section.id}>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-1 border-b border-gray-200 dark:border-gray-800">
              {section.title}
            </h2>
            <ul className="space-y-3">
              {section.steps.map((step) => (
                <StepRow
                  key={step.id}
                  checklistId={item.id}
                  step={step}
                  state={stepMap.get(step.id)}
                  onToggle={(done) => toggleMutation.mutate({ stepId: step.id, done })}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
