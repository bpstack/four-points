// app/components/groups/shared/EmptyState.tsx

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-fg-subtle">{icon}</div>}
      <h3 className="text-sm font-medium text-fg mb-1">{title}</h3>
      {description && <p className="text-xs text-fg-subtle mb-4 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
