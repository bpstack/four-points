// app/components/conciliation/DaySummary.tsx
'use client'

import { useMemo } from 'react'
import { FiCalendar } from 'react-icons/fi'
import { useTranslations } from 'next-intl'
import { useMonthlySummary, type ConciliationDetail } from '@/app/lib/conciliation'

interface DaySummaryProps {
  conciliation: ConciliationDetail
  baseRooms: number
}

// Detectar si es el ultimo dia del mes
function isLastDayOfMonth(date: string): boolean {
  const d = new Date(date)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return d.getDate() === lastDay
}

// Formatear fecha
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// Obtener dia anterior
function getPreviousDay(dateString: string): number {
  const date = new Date(dateString)
  date.setDate(date.getDate() - 1)
  return date.getDate()
}

export default function DaySummary({ conciliation, baseRooms }: DaySummaryProps) {
  const t = useTranslations('conciliation')

  const showMonthlySummary = isLastDayOfMonth(conciliation.date)

  // Extraer año y mes de la fecha
  const { year, month } = useMemo(() => {
    const date = new Date(conciliation.date)
    return { year: date.getFullYear(), month: date.getMonth() + 1 }
  }, [conciliation.date])

  // React Query: cargar resumen mensual solo si es último día del mes
  const { data: monthlySummary, isLoading: loadingMonthlySummary } = useMonthlySummary(year, month)

  // Componente de firma
  const SignatureSection = () => (
    <div>
      <h4 className="text-sm font-semibold text-fg mb-2">{t('daySummary.signatureReception')}</h4>
      <div className="h-40 border-2 border-dashed border-border rounded-lg" />
    </div>
  )

  // Componente de fecha y facturacion
  const DateAndBillingSection = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <FiCalendar className="w-4 h-4 text-fg-muted" />
        <span className="font-medium text-fg">{t('daySummary.date')}:</span>
        <span className="text-fg">{formatDate(conciliation.date)}</span>
      </div>

      <div className="bg-info/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
          {t('daySummary.billingDay')} {getPreviousDay(conciliation.date)}:
        </p>
        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
          {t('daySummary.totalRooms', { count: baseRooms })}
        </p>
      </div>
    </div>
  )

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col xl:sticky xl:top-6">
      <div className="bg-surface-hover px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-fg">
          {showMonthlySummary ? t('daySummary.monthlySummary') : t('daySummary.dayInfo')}
        </h3>
      </div>

      <div className="p-4 overflow-y-auto">
        {/* Vista fin de mes: Resumen mensual + Informacion del dia */}
        {showMonthlySummary && (
          <div className="space-y-6">
            {/* Resumen Mensual */}
            <div>
              {loadingMonthlySummary ? (
                <div className="text-center py-8 text-fg-subtle text-sm">
                  {t('daySummary.loadingSummary')}
                </div>
              ) : monthlySummary ? (
                <div className="space-y-4">
                  {/* Info del periodo */}
                  <div className="bg-surface-hover rounded-lg p-3 text-xs">
                    <p className="text-fg-muted mb-1">
                      {t('daySummary.period')}: {formatDate(monthlySummary.period.start)} -{' '}
                      {formatDate(monthlySummary.period.end)}
                    </p>
                    <p className="text-fg-muted">
                      {t('daySummary.days')}: {monthlySummary.period.conciliations_count} /{' '}
                      {monthlySummary.period.total_days}
                    </p>
                    {monthlySummary.period.missing_days > 0 && (
                      <p className="text-red-600 dark:text-red-400 mt-1 font-medium">
                        {t('daySummary.missingDays', { count: monthlySummary.period.missing_days })}
                      </p>
                    )}
                  </div>

                  {/* Totales del mes */}
                  <div className="space-y-3">
                    <div className="bg-info/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {t('daySummary.totalReception')}
                      </p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {monthlySummary.totals.total_reception}
                      </p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {t('daySummary.totalHousekeeping')}
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
                        {t('daySummary.totalDiscrepancy')}
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
                    {/* Recepcion */}
                    <div>
                      <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                        {t('table.reception')}
                      </h5>
                      <div className="space-y-1">
                        {monthlySummary.reception_summary.map((item) => (
                          <div
                            key={item.reason}
                            className="flex justify-between items-center text-xs bg-surface-hover rounded px-2 py-1"
                          >
                            <span className="text-fg truncate pr-2">{item.label}</span>
                            <span className="font-semibold text-fg">{item.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Housekeeping */}
                    <div>
                      <h5 className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">
                        {t('table.housekeeping')}
                      </h5>
                      <div className="space-y-1">
                        {monthlySummary.housekeeping_summary.map((item) => (
                          <div
                            key={item.reason}
                            className="flex justify-between items-center text-xs bg-surface-hover rounded px-2 py-1"
                          >
                            <span className="text-fg truncate pr-2">{item.label}</span>
                            <span className="font-semibold text-fg">{item.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Errores de validacion */}
                  {monthlySummary.validation_errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">
                        {t('daySummary.cannotCloseMonth')}
                      </p>
                      <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                        {monthlySummary.validation_errors.map((error, index) => (
                          <li key={index}>- {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-fg-subtle text-sm">
                  {t('daySummary.couldNotLoad')}
                </div>
              )}
            </div>

            {/* Divisor */}
            <div className="border-t border-border"></div>

            {/* Informacion del Dia (debajo del resumen mensual) */}
            <div>
              <h4 className="text-sm font-semibold text-fg mb-3">{t('daySummary.dayInfo')}</h4>
              <div className="space-y-4">
                <SignatureSection />
                <DateAndBillingSection />
              </div>
            </div>
          </div>
        )}

        {/* Vista diaria normal (dias normales) */}
        {!showMonthlySummary && (
          <div className="space-y-6">
            <SignatureSection />
            <DateAndBillingSection />
          </div>
        )}
      </div>
    </div>
  )
}
