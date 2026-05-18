'use client'

import { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { ChecklistTOC } from '@/app/components/checklist/ChecklistTOC'
import type { Catalog } from '@/app/lib/checklist/types'

interface Props {
  catalog: Catalog
  children: React.ReactNode
}

export default function ChecklistClientWrapper({ catalog, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="checklist-print-wrapper flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden md:flex-row">
      {/* TOC sidebar */}
      <aside
        className={`w-full flex-shrink-0 overflow-hidden border-b border-border bg-surface md:h-auto md:w-[25rem] md:border-b-0 md:border-r md:border-border md:rounded-tr-xl md:shadow-[2px_0_8px_rgba(0,0,0,0.06)] dark:md:shadow-[2px_0_8px_rgba(0,0,0,0.25)] ${
          collapsed ? 'md:w-12' : ''
        }`}
      >
        {/* Mobile collapse header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border md:hidden">
          <h2 className="text-sm font-semibold text-fg">Check List</h2>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg"
            aria-label={collapsed ? 'Expandir checklist' : 'Colapsar checklist'}
          >
            {collapsed ? (
              <FiChevronDown className="w-4 h-4" />
            ) : (
              <FiChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* TOC content */}
        {!collapsed && (
          <ChecklistTOC
            catalog={catalog}
            onItemClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setCollapsed(true)
              }
            }}
          />
        )}
      </aside>

      {/* Content */}
      <main className="scrollbar-discrete min-h-0 flex-1 overflow-y-auto bg-bg">
        <div className="checklist-print-content mx-auto max-w-[60.5rem] px-4 py-5 sm:px-6 sm:py-8 md:mx-0">
          {children}
        </div>
      </main>
    </div>
  )
}
