// app/dashboard/parking/loading.tsx
/**
 * Route-level Loading State for Parking Dashboard
 * Shows skeleton UI while parking data is being fetched
 */

export default function ParkingLoading() {
  return (
    <div className="min-h-screen bg-bg px-4 md:px-5 lg:px-6 pt-4 md:-mt-2 md:pt-0 pb-4">
      <div className="max-w-[1600px] space-y-5">
        {/* Skeleton Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 bg-surface-hover rounded-lg animate-pulse"></div>
              <div className="h-6 w-24 bg-surface-hover rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-36 bg-surface-hover rounded-lg animate-pulse"></div>
          </div>
          <div className="h-3 w-48 bg-surface-hover rounded animate-pulse mt-2 sm:hidden"></div>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="space-y-5">
            {/* Stats Card */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="h-5 w-32 bg-surface-hover rounded mb-4 animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-3 w-20 bg-surface-hover rounded" />
                    <div className="h-8 w-16 bg-border rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Occupancy Chart */}
            <div className="bg-surface border border-border rounded-xl p-5 h-48 animate-pulse">
              <div className="h-5 w-28 bg-surface-hover rounded mb-4" />
              <div className="h-32 bg-surface-hover rounded" />
            </div>
          </div>

          <div className="space-y-5">
            {/* Today's Activity */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="h-5 w-36 bg-surface-hover rounded mb-4 animate-pulse" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-surface-hover rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-surface-hover rounded" />
                      <div className="h-3 w-20 bg-surface-hover rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="h-5 w-32 bg-surface-hover rounded mb-4 animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-surface-hover rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
