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
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
    <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#1c2128] border-b border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</span>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">{subtitle}</span>
        </div>
        <CopyButton text={content} label="Copiar" />
      </div>
      <pre className="p-3 text-xs font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-[#0d1117] overflow-x-auto whitespace-pre leading-5">
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
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
          Conversión de horario a presencias
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Copia el horario mensual desde Excel (nombre + días separados por tabulador) y pégalo
          aquí.
        </p>
      </div>

      <div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'EMP_06\tP\tB\tL14\tP\t...\nMARTA R\tM\tT\tN\t...'}
          rows={10}
          spellCheck={false}
          className="w-full font-mono text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCalcular}
          disabled={!input.trim()}
          className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Calcular
        </button>
        {(input || result) && (
          <button
            onClick={() => {
              setInput('')
              setResult(null)
            }}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
