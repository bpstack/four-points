// app/lib/helpers/csv.ts

const FORMULA_START = /^[=+\-@\t\r]/
const NUMBER = /^-?\d+(?:[.,]\d+)?$/

/**
 * One quoted CSV cell. Inner quotes are doubled, and text a spreadsheet would
 * run as a formula (starting with =, +, -, @, tab or CR) gets a leading
 * apostrophe so it shows as text. Plain numbers, negative ones included,
 * stay as they are.
 */
export function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (FORMULA_START.test(text) && !NUMBER.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
