import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ChecklistItem } from '@/app/lib/checklist/types'
import { ChecklistHeader } from './ChecklistHeader'
import { EmailLink } from './EmailLink'

const components: Components = {
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-5 mb-2 pb-1 border-b border-gray-200 dark:border-gray-800 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-1.5">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed mb-2">
      {children}
    </p>
  ),
  ul: ({ children }) => <ul className="space-y-1 mb-3 pl-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="space-y-1 mb-3 pl-5 list-decimal marker:font-semibold marker:text-gray-500 dark:marker:text-gray-400">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-sm font-mono text-gray-700 dark:text-gray-300">
      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-gray-600 dark:text-gray-400">{children}</em>,
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 whitespace-nowrap">
      {children}
    </code>
  ),
  hr: () => <hr className="my-6 border-0 border-t border-gray-100 dark:border-gray-800/60" />,
  a: ({ href, children }) => {
    const isEmail = typeof href === 'string' && href.startsWith('mailto:')
    if (isEmail) {
      const email = href.replace('mailto:', '')
      return <EmailLink email={email}>{children}</EmailLink>
    }
    const isInternal = typeof href === 'string' && href.startsWith('/')
    if (isInternal) {
      return (
        <Link href={href} className="text-blue-600 dark:text-blue-400 hover:underline font-sans">
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:underline font-sans"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-700">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 font-mono">{children}</td>
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
