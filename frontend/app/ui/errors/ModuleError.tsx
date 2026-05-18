// app/ui/errors/ModuleError.tsx
/**
 * Reusable Error Boundary Component for Dashboard Modules
 *
 * Usage in any module's error.tsx:
 * ```tsx
 * 'use client'
 * import { ModuleError } from '@/app/ui/errors/ModuleError'
 *
 * export default function MyModuleError({ error, reset }: ErrorProps) {
 *   return <ModuleError error={error} reset={reset} translationNamespace="myModule" />
 * }
 * ```
 *
 * Requires translations in messages/{locale}/{namespace}.json:
 * ```json
 * {
 *   "error": {
 *     "title": "Module Title",
 *     "subtitle": "An error occurred",
 *     "errorTitle": "Failed to load",
 *     "errorDescription": "Could not load data. Please try again.",
 *     "errorDetails": "Technical details",
 *     "retry": "Retry",
 *     "backToDashboard": "Back to Dashboard",
 *     "helpText": "If the problem persists, contact support."
 *   }
 * }
 * ```
 */

'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'

export interface ModuleErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Translation namespace (e.g., 'logbooks', 'cashier', 'parking') */
  translationNamespace: string
  /** Optional module name for logging (defaults to translationNamespace) */
  moduleName?: string
}

export function ModuleError({ error, reset, translationNamespace, moduleName }: ModuleErrorProps) {
  const t = useTranslations(translationNamespace)
  const logName = moduleName || translationNamespace

  useEffect(() => {
    // Log error to monitoring service
    console.error(`[${logName}] Error:`, error)
  }, [error, logName])

  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1600px]">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-fg">{t('error.title')}</h1>
              <p className="text-xs sm:text-sm text-fg-muted mt-0.5">{t('error.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Error Card */}
        <div className="py-16">
          <div className="bg-surface rounded-lg border border-red-200 dark:border-red-800/50 shadow-sm p-8 max-w-md">
            <div className="flex items-center justify-center w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <FiAlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-lg font-semibold text-fg mb-2">{t('error.errorTitle')}</h2>

            <p className="text-sm text-fg-muted mb-6">{t('error.errorDescription')}</p>

            {/* Error details (dev only) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-fg-subtle cursor-pointer hover:text-fg">
                  {t('error.errorDetails')}
                </summary>
                <pre className="mt-2 p-3 bg-surface-hover rounded text-xs text-red-600 dark:text-red-400 overflow-x-auto">
                  {error.message}
                  {error.digest && `\n\nDigest: ${error.digest}`}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-accent text-accent-fg text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                {t('error.retry')}
              </button>

              <a
                href="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium text-fg rounded-md hover:bg-surface-hover transition-colors"
              >
                {t('error.backToDashboard')}
              </a>
            </div>
          </div>

          {/* Help text */}
          <p className="mt-6 text-xs text-fg-subtle max-w-md">{t('error.helpText')}</p>
        </div>
      </div>
    </div>
  )
}

// Re-export the props type for convenience
export type { ModuleErrorProps as ErrorProps }
