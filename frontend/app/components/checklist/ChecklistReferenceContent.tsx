import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ChecklistItem } from '@/app/lib/checklist/types'
import { ChecklistHeader } from './ChecklistHeader'

const components: Components = {
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-5 mb-2 pb-1 border-b border-gray-200 dark:border-gray-800 first:mt-0">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed mb-2">
      {children}
    </p>
  ),
  ul: ({ children }) => <ul className="space-y-1 mb-3 pl-1">{children}</ul>,
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-sm font-mono text-gray-700 dark:text-gray-300">
      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
      {children}
    </code>
  ),
}

export function ChecklistReferenceContent({ item }: { item: ChecklistItem }) {
  return (
    <div>
      <ChecklistHeader item={item} />
      <div className="font-sans">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {item.body ?? ''}
        </ReactMarkdown>
      </div>
    </div>
  )
}
