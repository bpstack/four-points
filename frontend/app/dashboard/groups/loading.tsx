// app/dashboard/groups/loading.tsx
/**
 * Route-level Loading State for Groups
 */

function StatsCardSkeleton() {
  return (
    <div className="bg-surface rounded-md border border-border p-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-surface-hover rounded" />
          <div className="h-6 w-12 bg-surface-hover rounded" />
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
        <div className="space-y-1">
          <div className="h-4 w-32 bg-surface-hover rounded" />
          <div className="h-3 w-20 bg-surface-hover rounded" />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="h-4 w-24 bg-surface-hover rounded" />
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
        <div className="h-4 w-16 bg-surface-hover rounded" />
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
        <div className="space-y-1 flex-1">
          <div className="h-4 w-32 bg-surface-hover rounded" />
          <div className="h-3 w-20 bg-surface-hover rounded" />
        </div>
        <div className="h-6 w-6 bg-surface-hover rounded" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-surface-hover rounded-full" />
          <div className="h-4 w-12 bg-surface-hover rounded" />
        </div>
        <div className="h-3 w-16 bg-surface-hover rounded" />
      </div>
    </div>
  )
}

export default function GroupsLoading() {
  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1400px] space-y-5">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="h-7 w-32 bg-surface-hover rounded animate-pulse" />
              <div className="h-4 w-48 bg-surface-hover rounded animate-pulse" />
            </div>
            <div className="h-8 w-28 bg-surface-hover rounded-md animate-pulse" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 animate-pulse">
          <div className="flex-1 h-8 bg-surface-hover rounded-md" />
          <div className="w-full sm:w-36 h-8 bg-surface-hover rounded-md" />
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block bg-surface rounded-md border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-surface border-b border-border">
              <tr>
                {[1, 2, 3, 4, 5, 6].map((i) => (
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
    </div>
  )
}
