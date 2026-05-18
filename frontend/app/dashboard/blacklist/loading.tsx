// app/dashboard/blacklist/loading.tsx
/**
 * Route-level Loading State for Blacklist
 */

function StatsCardSkeleton() {
  return (
    <div className="bg-surface rounded-md border border-border p-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-surface-hover rounded" />
          <div className="h-6 w-10 bg-surface-hover rounded" />
        </div>
        <div className="w-8 h-8 bg-surface-hover rounded-lg" />
      </div>
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <div className="h-4 w-32 bg-surface-hover rounded" />
            <div className="h-3 w-40 bg-surface-hover rounded" />
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="space-y-1">
          <div className="h-4 w-24 bg-surface-hover rounded" />
          <div className="h-3 w-16 bg-surface-hover rounded" />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="space-y-1">
          <div className="h-3 w-20 bg-surface-hover rounded" />
          <div className="h-3 w-20 bg-surface-hover rounded" />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="h-5 w-16 bg-surface-hover rounded-full" />
      </td>
      <td className="px-3 py-2">
        <div className="h-5 w-14 bg-surface-hover rounded-full" />
      </td>
      <td className="px-3 py-2">
        <div className="space-y-1">
          <div className="h-3 w-20 bg-surface-hover rounded" />
          <div className="h-3 w-16 bg-surface-hover rounded" />
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="h-7 w-7 bg-surface-hover rounded ml-auto" />
      </td>
    </tr>
  )
}

function MobileCardSkeleton() {
  return (
    <div className="bg-surface rounded-md border border-border p-3 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="h-4 w-32 bg-surface-hover rounded" />
          <div className="h-3 w-24 bg-surface-hover rounded" />
        </div>
        <div className="h-6 w-6 bg-surface-hover rounded" />
      </div>
      <div className="h-3 w-full bg-surface-hover rounded mb-2" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-16 bg-surface-hover rounded-full" />
          <div className="h-5 w-14 bg-surface-hover rounded-full" />
        </div>
        <div className="h-3 w-16 bg-surface-hover rounded" />
      </div>
    </div>
  )
}

export default function BlacklistLoading() {
  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1400px] space-y-5">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="h-7 w-28 bg-surface-hover rounded animate-pulse" />
              <div className="h-4 w-48 bg-surface-hover rounded animate-pulse" />
            </div>
            <div className="h-8 w-28 bg-surface-hover rounded-md animate-pulse" />
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 min-[1400px]:grid-cols-4 gap-5">
          {/* Left Column - Main Content */}
          <div className="min-[1400px]:col-span-3 space-y-4">
            {/* Stats - Mobile/Tablet */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-[1400px]:hidden">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 animate-pulse">
              <div className="flex-1 h-8 bg-surface-hover rounded-md" />
              <div className="w-full sm:w-36 h-8 bg-surface-hover rounded-md" />
              <div className="w-full sm:w-32 h-8 bg-surface-hover rounded-md" />
            </div>

            {/* Table - Desktop */}
            <div className="hidden md:block bg-surface rounded-md border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-surface border-b border-border">
                  <tr>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <th key={i} className="px-3 py-2">
                        <div className="h-3 w-16 bg-surface-hover rounded animate-pulse" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(8)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards - Mobile */}
            <div className="md:hidden space-y-2">
              {[...Array(5)].map((_, i) => (
                <MobileCardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Right Column - Stats Sidebar */}
          <div className="hidden min-[1400px]:block space-y-4">
            <div className="sticky top-4 space-y-3">
              <div className="h-5 w-24 bg-surface-hover rounded animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-xl shadow-sm p-4 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-surface-hover rounded" />
                      <div className="h-6 w-10 bg-surface-hover rounded" />
                    </div>
                    <div className="w-9 h-9 bg-surface-hover rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
