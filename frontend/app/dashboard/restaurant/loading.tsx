// app/dashboard/restaurant/loading.tsx
/**
 * Route-level Loading State for Restaurant
 */

function StatsCardSkeleton() {
  return (
    <div className="bg-surface rounded-md border border-border p-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-border rounded" />
          <div className="h-6 w-14 bg-border rounded" />
        </div>
        <div className="w-8 h-8 bg-border rounded-lg" />
      </div>
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-2">
        <div className="h-4 w-32 bg-border rounded" />
      </td>
      <td className="px-3 py-2">
        <div className="h-4 w-20 bg-border rounded" />
      </td>
      <td className="px-3 py-2">
        <div className="h-4 w-16 bg-border rounded" />
      </td>
      <td className="px-3 py-2">
        <div className="h-4 w-12 bg-border rounded" />
      </td>
      <td className="px-3 py-2">
        <div className="h-5 w-14 bg-border rounded-full" />
      </td>
      <td className="px-3 py-2 text-right">
        <div className="h-7 w-7 bg-border rounded ml-auto" />
      </td>
    </tr>
  )
}

export default function RestaurantLoading() {
  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1600px] space-y-5">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="h-7 w-32 bg-border rounded animate-pulse" />
              <div className="h-4 w-48 bg-surface-hover rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="border-b border-border">
          <nav className="flex space-x-4 sm:space-x-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-1.5 px-1 py-3 animate-pulse">
                <div className="w-4 h-4 bg-border rounded" />
                <div className="w-16 h-4 bg-border rounded" />
              </div>
            ))}
          </nav>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 animate-pulse">
            <div className="flex-1 h-8 bg-border rounded-md" />
            <div className="w-full sm:w-32 h-8 bg-border rounded-md" />
            <div className="w-full sm:w-28 h-8 bg-border rounded-md" />
          </div>

          {/* Table */}
          <div className="bg-surface rounded-md border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-sunken border-b border-border">
                <tr>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <th key={i} className="px-3 py-2">
                      <div className="h-3 w-16 bg-border rounded animate-pulse" />
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
        </div>
      </div>
    </div>
  )
}
