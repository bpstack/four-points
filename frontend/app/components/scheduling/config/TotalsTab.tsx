'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { FiInfo } from 'react-icons/fi'
import { EmployeeTotals } from '../EmployeeTotals'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'
import type { DropdownOption } from '@/app/ui/components/SelectDropdown'

export function TotalsTab() {
  const t = useTranslations('scheduling.config.totals')

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const yearOptions: DropdownOption<number>[] = [currentYear, currentYear - 1, currentYear - 2].map(
    (y) => ({ value: y, label: String(y) })
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">{t('title')}</h3>
          <p className="text-xs text-fg-subtle">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-fg-muted">{t('year')}</label>
          <SelectDropdown<number>
            value={selectedYear}
            onChange={setSelectedYear}
            options={yearOptions}
            className="w-28"
          />
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-info-bg/50 border border-info-border/30 text-xs text-fg-muted">
        <FiInfo className="w-3.5 h-3.5 shrink-0 text-info" />
        <span>{t('orderHint')}</span>
      </div>

      <EmployeeTotals year={selectedYear} />
    </div>
  )
}
