import pdfParse from 'pdf-parse'
import { trackedCodesSet } from './fnb-categories.cache.js'

export interface ParsedPdfData {
  date: string | null // YYYY-MM-DD
  entries: { code: string; amount: number }[]
  grandTotal: number | null
}

// Thrown for uploads that are not a readable Opera PDF; the global error
// handler answers with its status instead of 500
export class FnbPdfError extends Error {
  status = 422
}

const PDF_MAGIC = Buffer.from('%PDF-')
// Opera's F&B report is 3 pages; anything far longer is not that report
const MAX_PAGES = 20
export const PARSE_TIMEOUT_MS = 15_000

// PDF readers accept the header anywhere in the first 1024 bytes
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).includes(PDF_MAGIC)
}

// Stops waiting for the parser; pdf.js cannot be aborted, so the page limit is
// what bounds the work left running in the background
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FnbPdfError('El PDF tardó demasiado en procesarse')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export async function parseOperaPdf(buffer: Buffer): Promise<ParsedPdfData> {
  if (!isPdfBuffer(buffer)) {
    throw new FnbPdfError('El fichero no es un PDF')
  }

  let data: Awaited<ReturnType<typeof pdfParse>>
  try {
    data = await withTimeout(pdfParse(buffer, { max: MAX_PAGES }), PARSE_TIMEOUT_MS)
  } catch (err) {
    if (err instanceof FnbPdfError) throw err
    throw new FnbPdfError('No se pudo leer el PDF')
  }
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
