'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import { SHIFT_STYLES } from '@/app/lib/scheduling'
import { FiRefreshCw } from 'react-icons/fi'
import type { ShiftStatsResponse } from '@/app/lib/scheduling'
import { formatUsername } from '@/app/lib/helpers/user'

const SHIFT_LABEL: Record<string, string> = {
  M: 'Mañana',
  T: 'Tarde',
  N: 'Noche',
  PI: 'PI',
  P: 'Presencia',
  L: 'Libre',
  V: 'Vacaciones',
  B: 'Bonificable',
  E: 'Enfermedad',
  IT: 'Baja IT',
  FO: 'Día libre',
  A: 'Ausencia',
}

export function ShiftStatsTab() {
  const [year, setYear] = useState(new Date().getFullYear())

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: schedulingKeys.shiftStats(year),
    queryFn: () => schedulingApi.getShiftStats(year),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Contabilidad de turnos</h2>
          <p className="text-xs text-fg-subtle mt-0.5">
            Acumulado anual por empleado — publicados y borradores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-xs rounded-md border border-border bg-surface text-fg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Actualizar"
            className="p-1.5 rounded-md border border-border text-fg-subtle hover:bg-surface-hover disabled:opacity-40 transition-colors"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-accent border-r-transparent" />
        </div>
      ) : !data || data.employees.length === 0 ? (
        <p className="text-center py-12 text-sm text-fg-subtle">No hay datos para {year}</p>
      ) : (
        <ShiftStatsTable data={data} />
      )}
    </div>
  )
}

function ShiftStatsTable({ data }: { data: ShiftStatsResponse }) {
  const { shiftCodes, employees } = data

  const totals: Record<string, number> = {}
  for (const emp of employees) {
    for (const code of shiftCodes) {
      totals[code] = (totals[code] ?? 0) + (emp.counts[code] ?? 0)
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-surface-hover">
            <th className="sticky left-0 z-10 bg-surface-hover text-left px-3 py-2.5 font-semibold text-fg border-b border-r border-border whitespace-nowrap">
              Empleado
            </th>
            {shiftCodes.map((code) => (
              <th
                key={code}
                className="px-3 py-2.5 text-center font-semibold border-b border-border whitespace-nowrap"
              >
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${SHIFT_STYLES[code] ?? ''}`}
                >
                  {code}
                </span>
                <div className="text-[10px] font-normal text-fg-subtle mt-0.5">
                  {SHIFT_LABEL[code] ?? code}
                </div>
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-semibold text-fg border-b border-l border-border whitespace-nowrap">
              Total días
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, i) => {
            const rowTotal = shiftCodes.reduce((s, c) => s + (emp.counts[c] ?? 0), 0)
            return (
              <tr
                key={emp.employeeId}
                className={`
                  border-b border-border
                  ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-hover'}
                  hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors
                `}
              >
                <td className="sticky left-0 z-10 px-3 py-2 font-medium text-fg border-r border-border bg-inherit whitespace-nowrap">
                  {formatUsername(emp.employeeName)}
                </td>
                {shiftCodes.map((code) => {
                  const count = emp.counts[code] ?? 0
                  return (
                    <td key={code} className="px-3 py-2 text-center tabular-nums">
                      {count > 0 ? (
                        <span
                          className={`inline-block min-w-[2rem] px-1.5 py-0.5 rounded border text-[11px] font-semibold ${SHIFT_STYLES[code] ?? 'text-fg'}`}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-center font-semibold text-fg border-l border-border tabular-nums">
                  {rowTotal}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-surface-hover border-t-2 border-border">
            <td className="sticky left-0 z-10 bg-surface-hover px-3 py-2 font-semibold text-fg border-r border-border text-xs">
              Total
            </td>
            {shiftCodes.map((code) => (
              <td
                key={code}
                className="px-3 py-2 text-center font-semibold text-fg tabular-nums text-[11px]"
              >
                {totals[code] ?? 0}
              </td>
            ))}
            <td className="px-3 py-2 text-center font-bold text-fg border-l border-border tabular-nums">
              {shiftCodes.reduce((s, c) => s + (totals[c] ?? 0), 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
