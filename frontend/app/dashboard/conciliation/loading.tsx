// app/dashboard/conciliation/loading.tsx
/**
 * Route-level Loading State for Conciliation
 */

function DatePickerSkeleton() {
  return (
    <div className="flex gap-1 overflow-hidden py-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-12 h-16 bg-border rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function FormSectionSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4 animate-pulse">
      <div className="h-5 w-32 bg-border rounded mb-4" />
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-40 bg-surface-hover rounded" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-border rounded" />
              <div className="h-8 w-16 bg-surface-hover rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border flex justify-between">
        <div className="h-4 w-16 bg-border rounded" />
        <div className="h-5 w-12 bg-border rounded font-bold" />
      </div>
    </div>
  )
}

export default function ConciliationLoading() {
  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="h-7 w-36 bg-border rounded animate-pulse" />
            <div className="h-4 w-52 bg-surface-hover rounded animate-pulse" />
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 bg-border rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-32 bg-border rounded animate-pulse" />
            <div className="w-6 h-6 bg-border rounded animate-pulse" />
          </div>
          <div className="w-9 h-9 bg-border rounded animate-pulse" />
        </div>

        {/* Date Picker Skeleton */}
        <DatePickerSkeleton />

        {/* Form Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSectionSkeleton rows={5} />
          <FormSectionSkeleton rows={7} />
        </div>

        {/* Summary Section */}
        <div className="bg-surface rounded-lg border border-border p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-border rounded" />
              <div className="h-6 w-16 bg-border rounded" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-4 w-20 bg-border rounded ml-auto" />
              <div className="h-6 w-12 bg-border rounded ml-auto" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <div className="h-9 w-24 bg-border rounded-md animate-pulse" />
          <div className="h-9 w-28 bg-border rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  )
}
