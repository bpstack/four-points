'use client'

import { useTransition } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi'
import { Modal, Button, Spinner } from './index'

export type ConfirmDialogVariant = 'danger' | 'warning' | 'success' | 'info' | 'primary'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
  /** External loading state — use when you control the async operation yourself */
  isLoading?: boolean
  disableConfirm?: boolean
  /** Optional bullet list shown below the message (e.g. affected items) */
  details?: string[]
}

const variantMap: Record<
  ConfirmDialogVariant,
  { icon: typeof FiAlertTriangle; iconBg: string; iconColor: string; btnCls: string }
> = {
  danger: {
    icon: FiAlertTriangle,
    iconBg: 'bg-danger/15',
    iconColor: 'text-danger',
    btnCls: 'bg-danger  text-white hover:opacity-90',
  },
  warning: {
    icon: FiAlertTriangle,
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    btnCls: 'bg-warning text-white hover:opacity-90',
  },
  success: {
    icon: FiCheckCircle,
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    btnCls: 'bg-success text-white hover:opacity-90',
  },
  info: {
    icon: FiInfo,
    iconBg: 'bg-info/15',
    iconColor: 'text-info',
    btnCls: 'bg-accent  text-accent-fg hover:bg-accent-hover',
  },
  primary: {
    icon: FiInfo,
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    btnCls: 'bg-accent  text-accent-fg hover:bg-accent-hover',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  disableConfirm = false,
  details,
}: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()
  const busy = isLoading || isPending
  const styles = variantMap[variant]
  const Icon = styles.icon

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await onConfirm()
      } catch {}
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} size="sm" static={busy}>
      <div className="flex flex-col items-center text-center gap-4">
        <div
          className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-6 h-6 ${styles.iconColor}`} />
        </div>

        <div className="w-full">
          <h3 className="text-base font-semibold text-fg mb-1">{title}</h3>
          <p className="text-sm text-fg-muted">{message}</p>

          {details && details.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-fp border border-danger/30 bg-danger/5 p-3 text-left">
              {details.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-danger">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex w-full gap-3 pt-1">
          <Button variant="default" fullWidth onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || disableConfirm}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-fp px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${styles.btnCls}`}
          >
            {busy ? (
              <>
                <Spinner size="xs" tone="current" />
                {confirmText}
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
