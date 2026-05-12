import { getCatalog } from '@/app/lib/checklist/loader'
import { ChecklistTOC } from '@/app/components/checklist/ChecklistTOC'

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  const catalog = getCatalog()

  return (
    <div className="checklist-print-wrapper flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* TOC sidebar */}
      <aside className="w-[25rem] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0d1117] overflow-hidden">
        <ChecklistTOC catalog={catalog} />
      </aside>

      {/* Content */}
      <main className="scrollbar-discrete flex-1 overflow-y-auto bg-white dark:bg-[#010409]">
        <div className="checklist-print-content max-w-[60.5rem] px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
