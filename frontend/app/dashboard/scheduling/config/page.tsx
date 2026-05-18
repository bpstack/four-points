// app/dashboard/scheduling/config/page.tsx

import { Suspense } from 'react'
import { SchedulingConfigClient } from '@/app/components/scheduling/SchedulingConfigClient'

export const metadata = {
  title: 'Schedule Configuration | Four Points',
  description: 'Global parameters, shifts and employee rules',
}

function ConfigSkeleton() {
  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1400px] space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-md bg-surface-hover animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-64 bg-surface-hover rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 bg-surface-hover rounded animate-pulse" />
        <div className="h-96 bg-surface-hover rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function SchedulingConfigPage() {
  return (
    <Suspense fallback={<ConfigSkeleton />}>
      <SchedulingConfigClient />
    </Suspense>
  )
}
