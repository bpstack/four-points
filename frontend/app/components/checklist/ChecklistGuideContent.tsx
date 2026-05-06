import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ChecklistItem } from '@/app/lib/checklist/types'
import { ChecklistHeader } from './ChecklistHeader'
import { ChecklistNoteBanner } from './ChecklistNoteBanner'

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-2 pb-1 border-b border-gray-200 dark:border-gray-800 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-1.5">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => <ul className="space-y-1.5 mb-4 pl-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="space-y-1.5 mb-4 pl-1 list-decimal list-inside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-gray-600 dark:text-gray-400">{children}</em>,
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <div className="my-3">
      <ChecklistNoteBanner text={children as string} />
    </div>
  ),
  hr: () => <hr className="my-5 border-gray-200 dark:border-gray-800" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-600 dark:text-blue-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
}

export function ChecklistGuideContent({ item }: { item: ChecklistItem }) {
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
