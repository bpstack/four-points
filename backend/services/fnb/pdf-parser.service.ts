import pdfParse from 'pdf-parse'
import { trackedCodesSet } from './fnb-categories.cache.js'

export interface ParsedPdfData {
  date: string | null // YYYY-MM-DD
  entries: { code: string; amount: number }[]
  grandTotal: number | null
}

export async function parseOperaPdf(buffer: Buffer): Promise<ParsedPdfData> {
  const data = await pdfParse(buffer)
  const text: string = data.text ?? ''

  const tracked = await trackedCodesSet()
  const date = extractDate(text)
  const entries = extractEntries(text, tracked)
  const grandTotal = extractGrandTotal(text)

  return { date, entries, grandTotal }
}

function extractDate(text: string): string | null {
  // Opera filter line: "Calendar/ Month to Date (Date DD/MM/YY)"
  // No fallback — if filter not found, return null so caller returns 422.
  // Print date at top is +1 day from hotel date and would silently corrupt records.
  const m = text.match(/Date\s+(\d{2})\/(\d{2})\/(\d{2})/)
  if (m) {
    return `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

function extractEntries(
  text: string,
  trackedCodes: Set<string>
): { code: string; amount: number }[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const codeRe = /^\d{5}$/

  const codes: string[] = []
  const values: number[] = []
  let phase: 'codes' | 'descriptions' | 'values' = 'codes'

  for (const line of lines) {
    if (phase === 'codes') {
      if (codeRe.test(line)) {
        codes.push(line)
      } else if (line.startsWith('DAY') || line.startsWith('MONTH') || line.startsWith('Actual')) {
        phase = 'values'
      } else if (codes.length > 0) {
        phase = 'descriptions'
      }
    } else if (phase === 'descriptions') {
      if (line.startsWith('DAY') || line.startsWith('MONTH') || line.startsWith('Actual')) {
        phase = 'values'
      } else if (codeRe.test(line)) {
        codes.push(line)
        phase = 'codes'
      }
    } else if (phase === 'values') {
      if (codeRe.test(line)) {
        codes.push(line)
        phase = 'codes'
        continue
      }
      // Require decimal point — filters "2026 2026 2026" year header lines
      if (/^[\d,.\s-]+$/.test(line) && /\d\.\d/.test(line) && values.length < codes.length) {
        const nums = line
          .split(/\s+/)
          .map((p) => parseFloat(p.replace(',', '')))
          .filter((n) => !isNaN(n))
        if (nums.length >= 1) values.push(nums[0])
      }
    }
  }

  const entries: { code: string; amount: number }[] = []
  const len = Math.min(codes.length, values.length)
  for (let i = 0; i < len; i++) {
    if (trackedCodes.has(codes[i])) {
      entries.push({ code: codes[i], amount: values[i] })
    }
  }
  return entries
}

function extractGrandTotal(text: string): number | null {
  for (const line of text.split('\n')) {
    if (line.includes('Grand Total')) {
      const nums = line.replace(/,/g, '').match(/[\d]+\.[\d]+/g)
      if (nums) return parseFloat(nums[0])
    }
  }
  return null
}
