// Shared utilities for all report sections

import React from 'react'
import { FiAlertCircle } from 'react-icons/fi'
import { parseInputDate } from '@/app/lib/helpers/date'

// ─── Date formatters (audit-friendly: short month, Madrid timezone) ──────────

export function formatReportDate(dateStr: string): string {
  return parseInputDate(dateStr).toLocaleDateString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatReportDateTime(dateStr: string): string {
  return parseInputDate(dateStr).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Shared error block ───────────────────────────────────────────────────────

interface ReportErrorProps {
  message: string
}

export function ReportError({ message }: ReportErrorProps) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-center gap-2">
        <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
      </div>
    </div>
  )
}

// ─── Shared list skeleton (cards with badge + 2 lines) ───────────────────────

interface ReportListSkeletonProps {
  rows?: number
}

export function ReportListSkeleton({ rows = 5 }: ReportListSkeletonProps) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-surface-hover rounded-full" />
            <div className="h-3 w-10 bg-surface-hover rounded" />
          </div>
          <div className="h-3 w-3/4 bg-surface-hover rounded" />
          <div className="h-3 w-1/2 bg-surface-hover rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── Shared table skeleton ────────────────────────────────────────────────────

interface ReportTableSkeletonProps {
  cols?: number
  rows?: number
}

export function ReportTableSkeleton({ cols = 5, rows = 8 }: ReportTableSkeletonProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden animate-pulse">
      <div className="bg-surface-hover px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-border rounded" style={{ width: 80 + i * 20 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-t border-border flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 bg-surface-hover rounded" style={{ width: 60 + j * 15 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
