'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { EmployeeTotals } from '../EmployeeTotals'

export function TotalsTab() {
  const t = useTranslations('scheduling.config.totals')

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">{t('title')}</h3>
          <p className="text-xs text-fg-subtle">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-fg-muted">{t('year')}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-28 px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-gray-500 dark:focus:ring-gray-400"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <EmployeeTotals year={selectedYear} />
    </div>
  )
}
