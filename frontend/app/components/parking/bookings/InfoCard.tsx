// app/components/parking/bookings/InfoCard.tsx
'use client'

import { ReactNode } from 'react'

interface InfoCardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
}

export function InfoCard({ title, icon, children, className = '' }: InfoCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#151b23] border border-gray-200 dark:border-gray-800 rounded-md ${className}`}
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: ReactNode
  highlight?: boolean
  mono?: boolean
}

export function InfoRow({ label, value, highlight = false, mono = false }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span
        className={`text-sm font-medium ${
          highlight
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-900 dark:text-gray-100'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

export default InfoCard
