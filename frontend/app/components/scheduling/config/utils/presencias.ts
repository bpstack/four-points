const WORK_CODES = new Set(['M', 'T', 'N', 'PI', 'P'])
const LIBRE_RE = /^L\d*$/i

export function convertCode(raw: string): string {
  const code = raw.trim().toUpperCase()
  if (WORK_CODES.has(code)) return 'P'
  if (LIBRE_RE.test(code)) return 'L'
  return code
}

export function nightHours(raw: string): number {
  const code = raw.trim().toUpperCase()
  if (code === 'N') return 7
  if (code === 'T') return 1
  return 0
}

export interface ProcessInputResult {
  presencias: string
  variables: string
}

export function processInput(input: string): ProcessInputResult | null {
  const rows = input.trim().split('\n').filter(Boolean)
  if (!rows.length) return null

  const presenciasLines: string[] = []
  const variablesLines: string[] = []

  for (const row of rows) {
    // Excel copy uses tabs; fallback: 2+ spaces
    const cols = row.includes('\t')
      ? row.split('\t').map((s) => s.trim())
      : row.split(/\s{2,}/).map((s) => s.trim())

    const days = cols.slice(1).filter(Boolean)
    if (!days.length) continue

    let presenciasCount = 0
    let totalNights = 0
    const converted: string[] = []

    for (const d of days) {
      totalNights += nightHours(d)
      const c = convertCode(d)
      if (c === 'P') presenciasCount++
      converted.push(c)
    }

    presenciasLines.push([...converted, String(presenciasCount)].join('\t'))
    variablesLines.push(String(totalNights))
  }

  return {
    presencias: presenciasLines.join('\n'),
    variables: variablesLines.join('\n'),
  }
}
