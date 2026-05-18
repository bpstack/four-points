import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ChecklistItem } from '@/app/lib/checklist/types'
import { ChecklistHeader } from './ChecklistHeader'
import { EmailLink } from './EmailLink'

const components: Components = {
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-fg mt-5 mb-2 pb-1 border-b border-border first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="text-sm font-semibold text-fg mt-4 mb-1.5">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-fg font-mono leading-relaxed mb-2">{children}</p>,
  ul: ({ children }) => <ul className="space-y-1 mb-3 pl-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="space-y-1 mb-3 pl-5 list-decimal marker:font-semibold marker:text-fg-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-sm font-mono text-fg">
      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  em: ({ children }) => <em className="italic text-fg-muted">{children}</em>,
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-info/10 text-info border border-blue-100 dark:border-blue-900 whitespace-nowrap">
      {children}
    </code>
  ),
  hr: () => <hr className="my-6 border-0 border-t border-border" />,
  a: ({ href, children }) => {
    const isEmail = typeof href === 'string' && href.startsWith('mailto:')
    if (isEmail) {
      const email = href.replace('mailto:', '')
      return <EmailLink email={email}>{children}</EmailLink>
    }
    const isInternal = typeof href === 'string' && href.startsWith('/')
    if (isInternal) {
      return (
        <Link href={href} className="text-info hover:underline font-sans">
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        className="text-info hover:underline font-sans"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface border-b border-border">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-fg-subtle uppercase tracking-wide">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2.5 text-sm text-fg font-mono">{children}</td>,
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
