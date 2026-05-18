'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiFileText, FiBookOpen } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { Checkbox } from '@/app/ui/components'
import type { ChecklistItem, ChecklistStep } from '@/app/lib/checklist/types'
import { checklistApi, checklistKeys } from '@/app/lib/checklist/api'
import type { RunStateDto, StepStateDto } from '@/app/lib/checklist/api'
import { ChecklistHeader } from './ChecklistHeader'
import { ChecklistNoteBanner } from './ChecklistNoteBanner'
import { StepTriggerButtons, StepDetailsPanel } from './StepDetailsPanel'
import { useAuthContext } from '@/app/lib/auth/useAuth'
import { formatMadridTime } from '@/app/lib/helpers/date'
import { ConfirmDialog } from '@/app/ui/components'

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
  const { user } = useAuthContext()
  const [openTab, setOpenTab] = useState<'comments' | 'attachments' | null>(null)
  const [confirmUntick, setConfirmUntick] = useState(false)
  const done = Boolean(state?.done)

  const handleToggleTab = (tab: 'comments' | 'attachments') =>
    setOpenTab((prev) => (prev === tab ? null : tab))

  const handleToggle = () => {
    const newDone = !done
    // Solo pedir confirmación al DESMARCAR un paso marcado por OTRO usuario
    if (newDone === false && state?.done_by_user_id && state.done_by_user_id !== user?.id) {
      setConfirmUntick(true)
      return
    }
    onToggle(newDone)
  }

  const confirmedUntick = () => {
    onToggle(false)
    setConfirmUntick(false)
  }

  return (
    <li>
      {/* Main row */}
      <div className="flex items-start gap-1">
        <Checkbox
          checked={done}
          onCheckedChange={handleToggle}
          strikeOnCheck={false}
          className="flex-1 min-w-0"
          label={
            <span className="text-sm leading-snug select-none">
              {(checklistId === 'cl-morning-shift' ||
                checklistId === 'cl-afternoon-shift' ||
                checklistId === 'cl-night-audit') && (
                <span className="mr-1.5 font-mono text-[11px] text-fg-subtle tabular-nums">
                  {step.id.replace(/^s/, '').replace('-', '.')}
                </span>
              )}
              <span className={done ? 'line-through decoration-fg-subtle text-fg-muted' : ''}>
                {step.text}
              </span>
              {done && state?.done_by_username && state.done_at && (
                <span className="block text-xs text-fg-subtle mt-0.5 font-normal">
                  {state.done_by_username} · {formatMadridTime(state.done_at)}
                </span>
              )}
            </span>
          }
        />
        {/* Trigger buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-1.5">
          <StepTriggerButtons
            openTab={openTab}
            onToggle={handleToggleTab}
            commentCount={state?.comment_count ?? 0}
            attachmentCount={state?.attachment_count ?? 0}
          />
          {step.ref &&
            (Array.isArray(step.ref) ? step.ref : [step.ref]).map((ref) => {
              const isGuide = ref.startsWith('guide:')
              return (
                <Link
                  key={ref}
                  href={`/dashboard/checklist/cl-${ref.split(':')[1]}`}
                  onClick={(e) => e.stopPropagation()}
                  title={isGuide ? 'Ver procedimiento' : 'Ver referencia'}
                  className="flex items-center px-1.5 py-0.5 rounded text-accent hover:text-accent-hover hover:bg-accent/10 transition-colors"
                >
                  {isGuide ? (
                    <FiFileText className="w-3 h-3" />
                  ) : (
                    <FiBookOpen className="w-3 h-3" />
                  )}
                </Link>
              )
            })}
        </div>
      </div>

      {/* Note — below main row */}
      {step.note && (
        <div className="ml-9 mt-2">
          <ChecklistNoteBanner text={step.note} />
        </div>
      )}

      {/* Panel — below the full row */}
      {openTab && (
        <div className="ml-9 mt-1.5">
          <StepDetailsPanel
            checklistId={checklistId}
            stepId={step.id}
            tab={openTab}
            onClose={() => setOpenTab(null)}
          />
        </div>
      )}

      {/* Confirmación al desmarcar un paso marcado por otro usuario */}
      <ConfirmDialog
        isOpen={confirmUntick}
        onClose={() => setConfirmUntick(false)}
        onConfirm={confirmedUntick}
        variant="warning"
        title="¿Desmarcar este paso?"
        message={`Este paso fue marcado por ${state?.done_by_username ?? 'otro usuario'}${
          state?.done_at ? ` a las ${formatMadridTime(state.done_at)}` : ''
        }.`}
        confirmText="Sí, desmarcar"
        cancelText="Cancelar"
      />
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
        <div className="flex items-center gap-2 text-sm text-fg-subtle py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-r-transparent" />
          Cargando estado...
        </div>
      )}

      {!isLoading && total > 0 && (
        <div className="mb-6 space-y-1.5">
          <div className="flex justify-between text-xs text-fg-subtle">
            <span>
              {totalDone} de {total} pasos completados
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border">
            <div
              className="h-1.5 rounded-full bg-accent transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {item.sections.length === 0 && (
        <p className="text-sm text-fg-subtle italic">Contenido en elaboración.</p>
      )}

      <div className="space-y-8">
        {item.sections.map((section) => (
          <div key={section.id}>
            <h2 className="text-sm font-semibold text-fg mb-3 pb-1 border-b border-border">
              {section.title}
            </h2>
            <ul className="space-y-4">
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
