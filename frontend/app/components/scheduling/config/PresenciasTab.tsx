'use client'

import { useState, useCallback } from 'react'
import { FiCheck, FiCopy } from 'react-icons/fi'
import { processInput } from './utils/presencias'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border text-fg-muted hover:bg-surface-hover transition-colors"
    >
      {copied ? (
        <FiCheck className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <FiCopy className="w-3.5 h-3.5" />
      )}
      {copied ? 'Copiado' : label}
    </button>
  )
}

function OutputBlock({
  title,
  subtitle,
  content,
}: {
  title: string
  subtitle: string
  content: string
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-hover border-b border-border">
        <div>
          <span className="text-xs font-semibold text-fg">{title}</span>
          <span className="ml-2 text-xs text-fg-subtle">{subtitle}</span>
        </div>
        <CopyButton text={content} label="Copiar" />
      </div>
      <pre className="p-3 text-xs font-mono text-fg bg-surface overflow-x-auto whitespace-pre leading-5">
        {content}
      </pre>
    </div>
  )
}

export function PresenciasTab() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof processInput> | null>(null)

  const handleCalcular = useCallback(() => {
    setResult(processInput(input))
  }, [input])

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-fg mb-1">Conversión de horario a presencias</h3>
        <p className="text-xs text-fg-subtle">
          Copia el horario mensual desde Excel (nombre + días separados por tabulador) y pégalo
          aquí.
        </p>
      </div>

      <div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'LAURA\tP\tB\tL14\tP\t...\nMARTA R\tM\tT\tN\t...'}
          rows={10}
          spellCheck={false}
          className="w-full font-mono text-xs rounded-md border border-border bg-surface text-fg p-3 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCalcular}
          disabled={!input.trim()}
          className="px-4 py-2 text-sm font-medium rounded-md bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-accent-fg transition-colors"
        >
          Calcular
        </button>
        {(input || result) && (
          <button
            onClick={() => {
              setInput('')
              setResult(null)
            }}
            className="px-4 py-2 text-sm font-medium rounded-md border border-border text-fg-muted hover:bg-surface-hover transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {result && (
        <div className="space-y-4 pt-1">
          <OutputBlock
            title='Bloque 1 — Pestaña "Presencias"'
            subtitle="pegar desde col día 1"
            content={result.presencias}
          />
          <OutputBlock
            title='Bloque 2 — Pestaña "Variables"'
            subtitle="pegar en columna horas nocturnas"
            content={result.variables}
          />
        </div>
      )}
    </div>
  )
}
