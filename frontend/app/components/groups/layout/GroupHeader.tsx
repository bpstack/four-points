// app/components/groups/layout/GroupHeader.tsx

'use client'

import { GroupWithDetails } from '@/app/lib/groups'
import { StatusBadge } from '../shared/StatusBadge'

interface GroupHeaderProps {
  group: GroupWithDetails
  onEdit?: () => void
  onDelete?: () => void
}

export function GroupHeader({ group }: GroupHeaderProps) {
  return (
    <div className="bg-bg border-b border-border">
      <div className="max-w-[1400px] px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-fg truncate">{group.name}</h1>
          <StatusBadge status={group.status} size="sm" />
        </div>
        {group.agency && <p className="text-sm text-fg-muted mt-1">{group.agency}</p>}
      </div>
    </div>
  )
}
