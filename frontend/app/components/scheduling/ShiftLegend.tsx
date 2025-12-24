// app/components/scheduling/ShiftLegend.tsx

'use client'

import type { SchedulingShift } from '@/app/lib/scheduling'

interface ShiftLegendProps {
  shifts: SchedulingShift[]
}

export function ShiftLegend({ shifts }: ShiftLegendProps) {
  // Group shifts by work/non-work
  const workShifts = shifts.filter((s) => s.isWorkShift)
  const nonWorkShifts = shifts.filter((s) => !s.isWorkShift)

  return (
    <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {/* Work Shifts */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Turnos:
          </span>
          {workShifts.map((shift) => (
            <div key={shift.code} className="flex items-center gap-1">
              <span
                className="w-6 h-5 rounded text-[10px] font-bold flex items-center justify-center border"
                style={{
                  backgroundColor: shift.color,
                  borderColor: adjustColor(shift.color, -20),
                  color: getContrastColor(shift.color),
                }}
              >
                {shift.code}
              </span>
              <span className="text-[10px] text-gray-600 dark:text-gray-400">{shift.name}</span>
            </div>
          ))}
        </div>

        {/* Non-Work Shifts */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Ausencias:
          </span>
          {nonWorkShifts.map((shift) => (
            <div key={shift.code} className="flex items-center gap-1">
              <span
                className="w-6 h-5 rounded text-[10px] font-bold flex items-center justify-center border"
                style={{
                  backgroundColor: shift.color,
                  borderColor: adjustColor(shift.color, -20),
                  color: getContrastColor(shift.color),
                }}
              >
                {shift.code}
              </span>
              <span className="text-[10px] text-gray-600 dark:text-gray-400">{shift.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper to darken/lighten a hex color
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

// Helper to get contrasting text color
function getContrastColor(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}
