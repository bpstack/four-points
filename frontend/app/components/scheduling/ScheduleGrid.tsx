// app/components/scheduling/ScheduleGrid.tsx

'use client'

import { useMemo } from 'react'
import type { SchedulingMonthFull, SchedulingShift, DayOfWeek } from '@/app/lib/scheduling'
import { getShiftClasses } from '@/app/lib/scheduling'

interface ScheduleGridProps {
  monthData: SchedulingMonthFull
  shiftsMap: Record<string, SchedulingShift>
  onCellClick?: (employeeId: string, dayId: number, currentShift: string | null, event: React.MouseEvent) => void
  editable?: boolean
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  L: 'Lun',
  M: 'Mar',
  X: 'Mié',
  J: 'Jue',
  V: 'Vie',
  S: 'Sáb',
  D: 'Dom',
}

// Stats columns after the days
const STATS_COLUMNS = [
  { key: 'M', label: 'M', color: 'text-amber-600 dark:text-amber-400' },
  { key: 'T', label: 'T', color: 'text-orange-600 dark:text-orange-400' },
  { key: 'N', label: 'N', color: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'L', label: 'L', color: 'text-green-600 dark:text-green-400' },
  { key: 'V', label: 'V', color: 'text-purple-600 dark:text-purple-400' },
  { key: 'B', label: 'B', color: 'text-rose-600 dark:text-rose-400' },
] as const

export function ScheduleGrid({ monthData, shiftsMap, onCellClick, editable = false }: ScheduleGridProps) {
  const { days, employees, dailyStats } = monthData

  // Group days by week
  const weeks = useMemo(() => {
    const grouped: { weekNumber: number; days: typeof days }[] = []
    let currentWeek: typeof days = []
    let currentWeekNumber = 0

    days.forEach((day) => {
      if (day.weekNumber !== currentWeekNumber) {
        if (currentWeek.length > 0) {
          grouped.push({ weekNumber: currentWeekNumber, days: currentWeek })
        }
        currentWeek = []
        currentWeekNumber = day.weekNumber
      }
      currentWeek.push(day)
    })

    if (currentWeek.length > 0) {
      grouped.push({ weekNumber: currentWeekNumber, days: currentWeek })
    }

    return grouped
  }, [days])

  const isWeekend = (dayOfWeek: DayOfWeek) => dayOfWeek === 'S' || dayOfWeek === 'D'

  return (
    <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50 dark:bg-[#0d1117]">
              <th className="sticky left-0 z-20 bg-gray-50 dark:bg-[#0d1117] px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-200 dark:border-gray-700 min-w-[120px]">
                Empleado
              </th>
              {days.map((day) => (
                <th
                  key={day.id}
                  className={`px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 min-w-[36px] ${
                    isWeekend(day.dayOfWeek)
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      : 'text-gray-700 dark:text-gray-300'
                  } ${day.isHoliday ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                >
                  <div className="flex flex-col items-center">
                    <span className={day.isHoliday ? 'text-red-600 dark:text-red-400' : ''}>
                      {DAY_NAMES[day.dayOfWeek]}
                    </span>
                    <span className={`text-[11px] font-bold ${day.isHoliday ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {day.dayNumber}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-l border-gray-200 dark:border-gray-700 min-w-[36px] bg-gray-100 dark:bg-gray-800/50">
                Tot
              </th>
              {STATS_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 min-w-[32px] bg-gray-100 dark:bg-gray-800/50 ${col.color}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td
                  colSpan={days.length + 2 + STATS_COLUMNS.length}
                  className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                >
                  No hay empleados asignados. Genera los horarios para ver las asignaciones.
                </td>
              </tr>
            ) : (
              employees.map((employee, empIndex) => {
                const totalWorkShifts = Object.values(employee.assignments).filter(
                  (a) => a && shiftsMap[a.shiftCode]?.isWorkShift
                ).length

                return (
                  <tr
                    key={employee.id}
                    className={`${
                      empIndex % 2 === 0 ? 'bg-white dark:bg-[#151b23]' : 'bg-gray-50/50 dark:bg-[#0d1117]/50'
                    } hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors`}
                  >
                    {/* Employee Name */}
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                      {employee.name}
                    </td>

                    {/* Day Cells */}
                    {days.map((day) => {
                      const assignment = employee.assignments[day.dayNumber]
                      const shiftCode = assignment?.shiftCode || null
                      const shiftClasses = getShiftClasses(shiftCode)

                      return (
                        <td
                          key={day.id}
                          className={`px-0.5 py-1 text-center border-gray-100 dark:border-gray-800 ${
                            isWeekend(day.dayOfWeek) ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''
                          }`}
                        >
                          <button
                            onClick={(e) => editable && onCellClick?.(employee.id, day.id, shiftCode, e)}
                            disabled={!editable}
                            className={`
                              w-8 h-6 rounded text-[10px] font-bold border transition-all
                              ${editable ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-default'}
                              ${shiftClasses}
                            `}
                            title={shiftCode ? shiftsMap[shiftCode]?.name : 'Sin asignar'}
                          >
                            {shiftCode || '-'}
                          </button>
                        </td>
                      )
                    })}

                    {/* Total + Stats columns */}
                    <td className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                      {totalWorkShifts}
                    </td>
                    {STATS_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className="px-1 py-1.5 text-center text-[10px] font-medium bg-gray-50 dark:bg-gray-800/30"
                      >
                        <span className={col.color}>
                          {employee.stats?.[col.key as keyof typeof employee.stats] || 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                )
              })
            )}

            {/* Footer - Daily Totals */}
            {employees.length > 0 && (
              <>
                <tr className="bg-gray-100 dark:bg-[#161b22] border-t-2 border-gray-300 dark:border-gray-700">
                  <td className="sticky left-0 z-10 bg-gray-100 dark:bg-[#161b22] px-3 py-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                    M (Mañana)
                  </td>
                  {dailyStats.map((stat, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      <span className={`text-[10px] font-bold ${stat.M === 0 ? 'text-red-500 dark:text-red-600' : 'text-amber-600 dark:text-amber-600/90'}`}>
                        {stat.M}
                      </span>
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center text-[10px] font-bold text-gray-600 dark:text-gray-500 border-l border-gray-200 dark:border-gray-700">
                    {dailyStats.reduce((sum, s) => sum + s.M, 0)}
                  </td>
                  <td colSpan={STATS_COLUMNS.length} className="bg-gray-50 dark:bg-[#161b22]"></td>
                </tr>
                <tr className="bg-gray-100 dark:bg-[#161b22]">
                  <td className="sticky left-0 z-10 bg-gray-100 dark:bg-[#161b22] px-3 py-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                    T (Tarde)
                  </td>
                  {dailyStats.map((stat, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      <span className={`text-[10px] font-bold ${stat.T === 0 ? 'text-red-500 dark:text-red-600' : 'text-orange-600 dark:text-orange-600/90'}`}>
                        {stat.T}
                      </span>
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center text-[10px] font-bold text-gray-600 dark:text-gray-500 border-l border-gray-200 dark:border-gray-700">
                    {dailyStats.reduce((sum, s) => sum + s.T, 0)}
                  </td>
                </tr>
                <tr className="bg-gray-100 dark:bg-[#161b22]">
                  <td className="sticky left-0 z-10 bg-gray-100 dark:bg-[#161b22] px-3 py-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                    N (Noche)
                  </td>
                  {dailyStats.map((stat, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      <span className={`text-[10px] font-bold ${stat.N === 0 ? 'text-red-500 dark:text-red-600' : 'text-indigo-600 dark:text-indigo-500/90'}`}>
                        {stat.N}
                      </span>
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center text-[10px] font-bold text-gray-600 dark:text-gray-500 border-l border-gray-200 dark:border-gray-700">
                    {dailyStats.reduce((sum, s) => sum + s.N, 0)}
                  </td>
                </tr>
                <tr className="bg-gray-100 dark:bg-[#161b22]">
                  <td className="sticky left-0 z-10 bg-gray-100 dark:bg-[#161b22] px-3 py-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                    PI (Partido I)
                  </td>
                  {dailyStats.map((stat, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      <span className={`text-[10px] font-bold ${(stat.PI || 0) === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-cyan-600 dark:text-cyan-600/90'}`}>
                        {stat.PI || 0}
                      </span>
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center text-[10px] font-bold text-gray-600 dark:text-gray-500 border-l border-gray-200 dark:border-gray-700">
                    {dailyStats.reduce((sum, s) => sum + (s.PI || 0), 0)}
                  </td>
                </tr>
                <tr className="bg-gray-100 dark:bg-[#161b22]">
                  <td className="sticky left-0 z-10 bg-gray-100 dark:bg-[#161b22] px-3 py-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                    P (Partido)
                  </td>
                  {dailyStats.map((stat, i) => (
                    <td key={i} className="px-0.5 py-1 text-center">
                      <span className={`text-[10px] font-bold ${(stat.P || 0) === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-teal-600 dark:text-teal-600/90'}`}>
                        {stat.P || 0}
                      </span>
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center text-[10px] font-bold text-gray-600 dark:text-gray-500 border-l border-gray-200 dark:border-gray-700">
                    {dailyStats.reduce((sum, s) => sum + (s.P || 0), 0)}
                  </td>
                </tr>
                <tr className="bg-gray-200 dark:bg-[#1c2128] border-t border-gray-300 dark:border-gray-700">
                  <td className="sticky left-0 z-10 bg-gray-200 dark:bg-[#1c2128] px-3 py-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                    TOTAL
                  </td>
                  {dailyStats.map((stat, i) => {
                    const total = stat.M + stat.T + stat.N + (stat.PI || 0) + (stat.P || 0)
                    return (
                      <td key={i} className="px-0.5 py-1 text-center">
                        <span className={`text-[10px] font-bold ${total < 3 ? 'text-red-600 dark:text-red-600' : total < 5 ? 'text-amber-600 dark:text-amber-600/90' : 'text-green-600 dark:text-green-600/90'}`}>
                          {total}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-2 py-1 text-center text-[10px] font-bold text-gray-700 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                    {dailyStats.reduce((sum, s) => sum + s.M + s.T + s.N + (s.PI || 0) + (s.P || 0), 0)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
