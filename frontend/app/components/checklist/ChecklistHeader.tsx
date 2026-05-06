'use client'

import type { ChecklistMeta } from '@/app/lib/checklist/types'
import { SHIFT_LABELS, DEPT_LABELS } from '@/app/lib/checklist/types'
import { FiPrinter } from 'react-icons/fi'

const TYPE_LABELS = { tasks: 'Tareas', guide: 'Guía', reference: 'Referencia' }
const TYPE_COLORS = {
  tasks: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  guide: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  reference: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function ChecklistHeader({ item }: { item: ChecklistMeta }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-6 checklist-no-print-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type]}`}>
              {TYPE_LABELS[item.type]}
            </span>
            {item.shift && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                {SHIFT_LABELS[item.shift]}
              </span>
            )}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {DEPT_LABELS[item.department] ?? item.department}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{item.title}</h1>
          {item.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
          )}
          <div className="mt-2 flex gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>v{item.version}</span>
            <span>{item.author}</span>
            <span>Actualizado {item.updated}</span>
          </div>
        </div>

        <button
          onClick={() => {
            const content = document.querySelector('.checklist-print-content')
            if (content) {
              content.setAttribute(
                'data-print-date',
                new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              )
            }
            window.print()
          }}
          title="Exportar PDF / Imprimir"
          className="checklist-no-print flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mt-1"
        >
          <FiPrinter className="w-3.5 h-3.5" />
          PDF
        </button>
      </div>
    </div>
  )
}
