// app/components/blacklist/ui/Highlight.tsx
// Highlights search matches as React nodes, so the text is always escaped
// (it used to be injected with dangerouslySetInnerHTML)

import { Fragment } from 'react'
import { splitHighlight } from '@/app/lib/blacklist/blacklistUtils'

export function Highlight({ text, search }: { text: string; search: string }) {
  return (
    <>
      {splitHighlight(text, search).map((part, i) =>
        part.match ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        )
      )}
    </>
  )
}
