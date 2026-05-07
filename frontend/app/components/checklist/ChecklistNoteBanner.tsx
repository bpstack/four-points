import Link from 'next/link'

function parseNoteText(text: string) {
  const parts: React.ReactNode[] = []
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <Link
        key={match.index}
        href={match[2]}
        className="underline text-amber-900 dark:text-amber-200 hover:text-amber-600 dark:hover:text-amber-100"
      >
        {match[1]}
      </Link>
    )
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

export function ChecklistNoteBanner({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-300">
      <span className="mt-0.5 flex-shrink-0 leading-relaxed">⚠️</span>
      <span className="leading-relaxed">{parseNoteText(text)}</span>
    </div>
  )
}
