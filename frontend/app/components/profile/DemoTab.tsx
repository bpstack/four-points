// app/components/profile/DemoTab.tsx
'use client'

/**
 * Configuración → Demo (ADR-038): estado del reinicio diario, reinicio a mano y
 * guardar los horarios actuales como base. Solo con NEXT_PUBLIC_DEMO_MODE=true
 * y para admins que no son la cuenta demo; el backend lo comprueba igual.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'
import { FiRefreshCw, FiSave, FiAlertTriangle } from 'react-icons/fi'
import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'
import { CenterModal, CenterModalFooterButtons } from '@/app/ui/panels'

interface DemoStatus {
  lastReset: {
    startedAt: string
    ok: boolean
    trigger: 'auto' | 'manual'
    details: string | null
  } | null
  snapshot: { savedAt: string; details: string | null } | null
}

type Action = 'reset' | 'snapshot'

const API = `${API_BASE_URL}/api/demo`

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })

export function DemoTab() {
  const t = useTranslations('profile.settings.demo')
  const [status, setStatus] = useState<DemoStatus | null>(null)
  const [confirm, setConfirm] = useState<Action | null>(null)
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: DemoStatus }>(`${API}/status`)
      setStatus(res.data)
    } catch {
      toast.error(t('loadError'))
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const run = async () => {
    if (!confirm) return
    setRunning(true)
    try {
      await apiClient.post(`${API}/${confirm}`)
      toast.success(confirm === 'reset' ? t('resetDone') : t('snapshotDone'))
      setConfirm(null)
      await load()
    } catch {
      toast.error(t('actionError'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-base font-semibold text-fg">{t('title')}</h3>
        <p className="mt-1 text-sm text-fg-muted">{t('description')}</p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-fg-muted">{t('lastReset')}</dt>
            <dd className="text-fg">
              {status?.lastReset
                ? `${formatDate(status.lastReset.startedAt)} · ${
                    status.lastReset.trigger === 'auto' ? t('auto') : t('manual')
                  } · ${status.lastReset.ok ? t('ok') : t('failed')}`
                : t('never')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">{t('snapshot')}</dt>
            <dd className="text-fg">
              {status?.snapshot ? formatDate(status.snapshot.savedAt) : t('noSnapshot')}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirm('reset')}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            <FiRefreshCw className="h-4 w-4" />
            {t('resetButton')}
          </button>
          <button
            type="button"
            onClick={() => setConfirm('snapshot')}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-sunken"
          >
            <FiSave className="h-4 w-4" />
            {t('snapshotButton')}
          </button>
        </div>
      </div>

      <CenterModal
        isOpen={confirm !== null}
        onClose={() => !running && setConfirm(null)}
        title={confirm === 'reset' ? t('resetButton') : t('snapshotButton')}
        size="sm"
        headerIcon={<FiAlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
        footer={
          <CenterModalFooterButtons
            onCancel={() => setConfirm(null)}
            onSubmit={run}
            submitText={t('confirm')}
            isSubmitting={running}
            submitVariant="danger"
          />
        }
      >
        <p className="text-sm text-fg">
          {confirm === 'reset' ? t('resetWarning') : t('snapshotWarning')}
        </p>
      </CenterModal>
    </div>
  )
}
