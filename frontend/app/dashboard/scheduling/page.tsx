// app/dashboard/scheduling/page.tsx - Server Component with SSR

import { Suspense } from 'react'
import { SchedulingClient } from '@/app/components/scheduling/SchedulingClient'

function SchedulingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010409] flex justify-start">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Cargando planificación...</p>
      </div>
    </div>
  )
}

export default function SchedulingPage() {
  return (
    <Suspense fallback={<SchedulingLoading />}>
      <SchedulingClient />
    </Suspense>
  )
}
