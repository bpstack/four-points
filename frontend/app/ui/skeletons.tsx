// app/ui/skeletons.tsx

// Shimmer effect Skeleton for users table and cards mobile
const shimmer =
  'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent'

// Skeleton para fila de tabla (Desktop)
function UserTableRowSkeleton() {
  return (
    <tr className="hover:bg-surface-hover/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded bg-surface-hover"></div>
          <div className="h-4 w-24 rounded bg-surface-hover"></div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-32 rounded bg-surface-hover"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 rounded bg-surface-hover"></div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <div className="h-6 w-6 rounded bg-surface-hover"></div>
          <div className="h-6 w-6 rounded bg-surface-hover"></div>
        </div>
      </td>
    </tr>
  )
}

// Skeleton para cards móviles
function UserCardSkeleton() {
  return (
    <div className="bg-surface border border-gray-200 rounded-md p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-surface-hover"></div>
          <div className="h-4 w-32 rounded bg-surface-hover"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-6 rounded bg-surface-hover"></div>
          <div className="h-6 w-6 rounded bg-surface-hover"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-surface-hover"></div>
        <div className="h-3 w-24 rounded bg-surface-hover"></div>
      </div>
    </div>
  )
}

// Componente principal - ESTE es el que exportas
export function UsersTableSkeleton() {
  return (
    <>
      {/* Desktop Table */}
      <div
        className={`${shimmer} relative hidden md:block overflow-hidden overflow-x-auto border border-gray-200 rounded-md`}
      >
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 dark:bg-surface-hover">
            <tr>
              {['Username', 'Email', 'Role', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-2 text-left font-semibold text-fg">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-border bg-surface">
            <UserTableRowSkeleton />
            <UserTableRowSkeleton />
            <UserTableRowSkeleton />
            <UserTableRowSkeleton />
            <UserTableRowSkeleton />
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className={`${shimmer} relative md:hidden space-y-3 overflow-hidden`}>
        <UserCardSkeleton />
        <UserCardSkeleton />
        <UserCardSkeleton />
        <UserCardSkeleton />
        <UserCardSkeleton />
      </div>
    </>
  )
}
