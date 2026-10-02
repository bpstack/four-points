// tests/frontend/csv-cell.test.ts
// The paid invoices CSV export wrapped cells in quotes as they were, so a
// supplier name or invoice number starting with "=" ran as a spreadsheet
// formula. Tests the dependency-free frontend helper from the backend suite.

import { describe, it, expect } from 'vitest'
import { csvCell } from '../../../frontend/app/lib/helpers/csv.js'

describe('csvCell', () => {
  it('quotes plain values', () => {
    expect(csvCell('Acme S.L.')).toBe('"Acme S.L."')
    expect(csvCell('121.00')).toBe('"121.00"')
    expect(csvCell(null)).toBe('""')
  })

  it('doubles inner quotes', () => {
    expect(csvCell('Bar "El Puerto"')).toBe('"Bar ""El Puerto"""')
  })

  it('neutralises formula starters', () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe('"\'=HYPERLINK(""http://evil"",""x"")"')
    expect(csvCell('+34 600')).toBe('"\'+34 600"')
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"')
    expect(csvCell('-cmd')).toBe('"\'-cmd"')
    expect(csvCell('\t=1')).toBe('"\'\t=1"')
  })

  it('keeps negative numbers as numbers', () => {
    expect(csvCell('-12.50')).toBe('"-12.50"')
    expect(csvCell('-3,75')).toBe('"-3,75"')
  })
})
