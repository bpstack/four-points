export function ChecklistNoteBanner({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
      <span className="mt-0.5 flex-shrink-0">⚠️</span>
      <span>{text}</span>
    </div>
  )
}
