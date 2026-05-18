'use client'

import { useState } from 'react'

export function EmailLink({ email, children }: { email: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(email)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="text-info hover:underline font-mono cursor-copy inline"
    >
      {children}
      {copied && <span className="ml-1.5 text-green-600 font-medium text-xs">Copiado!</span>}
    </button>
  )
}
