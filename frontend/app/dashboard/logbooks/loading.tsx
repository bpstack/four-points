// app/dashboard/logbooks/loading.tsx
/**
 * Route-level Loading State for Logbooks
 */

function DatePickerSkeleton() {
  return (
    <div className="flex gap-1 overflow-hidden py-2">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-12 h-16 bg-surface-hover rounded-lg animate-pulse"
        />
      ))}
    </div>
  )
}

function LogbookEntrySkeleton() {
  return (
    <div className="bg-surface rounded-lg border border-border p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-surface-hover rounded-full" />
          <div className="space-y-1">
            <div className="h-4 w-24 bg-surface-hover rounded" />
            <div className="h-3 w-16 bg-surface-hover rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 bg-surface-hover rounded-full" />
          <div className="h-5 w-16 bg-surface-hover rounded-full" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 w-full bg-surface-hover rounded" />
        <div className="h-4 w-3/4 bg-surface-hover rounded" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="h-3 w-20 bg-surface-hover rounded" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-surface-hover rounded" />
          <div className="h-6 w-6 bg-surface-hover rounded" />
        </div>
      </div>
    </div>
  )
}

export default function LogbooksLoading() {
  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="h-7 w-28 bg-surface-hover rounded animate-pulse" />
            <div className="h-4 w-44 bg-surface-hover rounded animate-pulse" />
          </div>
          <div className="h-8 w-28 bg-surface-hover rounded-md animate-pulse" />
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 bg-surface-hover rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-32 bg-surface-hover rounded animate-pulse" />
            <div className="w-6 h-6 bg-surface-hover rounded animate-pulse" />
          </div>
          <div className="w-9 h-9 bg-surface-hover rounded animate-pulse" />
        </div>

        {/* Date Picker Skeleton */}
        <DatePickerSkeleton />

        {/* Entries List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-surface-hover rounded animate-pulse" />
            <div className="h-3 w-20 bg-surface-hover rounded animate-pulse" />
          </div>

          {[...Array(4)].map((_, i) => (
            <LogbookEntrySkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
