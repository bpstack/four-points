/**
 * import-fnb-2026.ts
 *
 * Idempotent one-shot importer: reads "DAILY REVENUE F&B 2026.xlsx"
 * and upserts values into fnb_daily_revenue (DB_ENVIRONMENT=local).
 *
 * Usage:
 *   pnpm exec cross-env DB_ENVIRONMENT=local tsx --env-file=.env scripts/import-fnb-2026.ts [MARZO|ABRIL|MAYO|all]
 */

import xlsx from 'xlsx'
import pool from '../config/db.js'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const XLSX_PATH = 'C:/Users/dz/OneDrive/Desktop/data-trans/DAILY REVENUE F&B 2026.xlsx'

// Row index (0-based) → Opera code
const ROW_TO_CODE: Record<number, string> = {
  3:  '21110', // Breakfast Included
  4:  '21124', // Breakfast Excluded
  5:  '21120', // Breakfast Directo FB
  8:  '21111', // Lunch Food
  9:  '21267', // Lunch Beverage
  11: '21112', // Dinner Food
  12: '21307', // Dinner Beverage
}

const SKIP_SHEETS = new Set(['RESUMEN'])

const MONTH_BY_NAME: Record<string, number> = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
}

const TARGET_YEAR = 2026

function buildDate(month: number, day: number): string {
  return `${TARGET_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function importSheet(
  ws: xlsx.WorkSheet,
  sheetName: string
): Promise<{ upserted: number; skipped: number }> {
  const month = MONTH_BY_NAME[sheetName.toUpperCase()]
  if (!month) {
    console.log(`  ${sheetName}: not a month sheet, skip`)
    return { upserted: 0, skipped: 0 }
  }

  const daysInMonth = new Date(TARGET_YEAR, month, 0).getDate()
  const range = xlsx.utils.decode_range(ws['!ref'] ?? 'A1:Z1')

  // Date derived from COLUMN POSITION (col 2 = day 1, col 3 = day 2, ...).
  // The Excel serial cells in row 1 are unreliable in some sheets (ABRIL has
  // March serials for April columns) so we ignore them entirely.
  const inserts: { date: string; code: string; amount: number }[] = []

  for (const [rowStr, code] of Object.entries(ROW_TO_CODE)) {
    const rowIdx = parseInt(rowStr)
    for (let c = 2; c <= range.e.c; c++) {
      const day = c - 1
      if (day < 1 || day > daysInMonth) continue  // skip TOTAL column

      const cell = ws[xlsx.utils.encode_cell({ r: rowIdx, c })]
      // Skip truly-empty cells. Cells with explicit 0 keep amount=0.
      if (!cell || cell.v === undefined || cell.v === null || cell.v === '') continue

      const amount = parseFloat(String(cell.v))
      if (isNaN(amount)) continue

      inserts.push({ date: buildDate(month, day), code, amount })
    }
  }

  if (!inserts.length) return { upserted: 0, skipped: 0 }

  // Batch upsert — ON DUPLICATE KEY UPDATE (idempotent)
  const BATCH = 200
  let upserted = 0
  for (let i = 0; i < inserts.length; i += BATCH) {
    const batch = inserts.slice(i, i + BATCH)
    const placeholders = batch.map(() => '(?, ?, ?)').join(', ')
    const values = batch.flatMap(r => [r.date, r.code, r.amount])
    await pool.execute(
      `INSERT INTO fnb_daily_revenue (date, category_code, amount)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = CURRENT_TIMESTAMP`,
      values
    )
    upserted += batch.length
  }

  return { upserted, skipped: 0 }
}

async function main() {
  const target = process.argv[2] ?? 'all'
  const wb = xlsx.read(
    await import('fs').then(f => f.readFileSync(XLSX_PATH)),
    { type: 'buffer', cellDates: false }
  )

  console.log(`\nF&B Revenue Importer — target: ${target}`)
  console.log(`Sheets found: ${wb.SheetNames.join(', ')}\n`)

  const sheets = wb.SheetNames.filter(name => {
    if (SKIP_SHEETS.has(name)) return false
    if (target === 'all') return true
    return name.toUpperCase() === target.toUpperCase()
  })

  if (!sheets.length) {
    console.error(`No sheets matched target "${target}"`)
    process.exit(1)
  }

  let total = 0
  for (const sheet of sheets) {
    process.stdout.write(`  Importing ${sheet}... `)
    const ws = wb.Sheets[sheet]
    if (!ws) { console.log('(missing)'); continue }
    const { upserted } = await importSheet(ws, sheet)
    console.log(`${upserted} rows upserted`)
    total += upserted
  }

  console.log(`\nDone. Total rows upserted: ${total}`)
  await pool.end()
}

main().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})
