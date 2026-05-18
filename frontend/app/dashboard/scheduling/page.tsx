// app/dashboard/scheduling/page.tsx

import { Suspense } from 'react'
import { SchedulingClient } from '@/app/components/scheduling/SchedulingClient'

export const metadata = {
  title: 'Schedule Planning | Four Points',
  description: 'Reception staff shift management',
}

function SchedulingSkeleton() {
  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1800px] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-72 bg-surface-hover rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-surface-hover rounded animate-pulse" />
            <div className="h-8 w-20 bg-surface-hover rounded animate-pulse" />
          </div>
        </div>

        <div className="bg-surface rounded-md border border-border p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-24 bg-surface-hover rounded animate-pulse" />
              <div className="flex gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-8 w-8 bg-surface-hover rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-md border border-border p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-fg-muted">Loading scheduling...</p>
        </div>
      </div>
    </div>
  )
}

export default function SchedulingPage() {
  return (
    <Suspense fallback={<SchedulingSkeleton />}>
      <SchedulingClient />
    </Suspense>
  )
}
