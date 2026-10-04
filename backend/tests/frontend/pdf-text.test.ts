// tests/frontend/pdf-text.test.ts
// The cashier PDF export drew users, payment methods and voucher notes as they
// were: pdf-lib's Helvetica only encodes WinAnsi, so one emoji threw and no
// PDF was produced. Tests the dependency-free frontend helper from the backend
// suite, against the real pdf-lib the frontend uses.

import { describe, it, expect } from 'vitest'
import { PDFDocument, StandardFonts } from '../../../frontend/node_modules/pdf-lib/cjs/index.js'
import { toEncodable, encodableFor } from '../../../frontend/app/lib/helpers/pdfText.js'

async function helvetica() {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  return { page: doc.addPage(), font, supported: new Set(font.getCharacterSet()) }
}

describe('toEncodable', () => {
  it('reproduces the failure on the raw text', async () => {
    const { page, font } = await helvetica()
    expect(() => page.drawText('Vale 😀 cliente', { font })).toThrow(/WinAnsi cannot encode/)
  })

  it('keeps Spanish text, the euro sign and punctuation as they are', async () => {
    const { supported } = await helvetica()
    const text = 'Ñoño pagó 12,50 € en el café — ¿vale? ¡sí! «ok»'
    expect(toEncodable(text, supported)).toBe(text)
  })

  it('folds accented letters the font lacks and marks the rest', async () => {
    const { supported } = await helvetica()
    expect(toEncodable('Łódź', supported)).toBe('?ódz')
    expect(toEncodable('Vale 😀 → caja', supported)).toBe('Vale ? ? caja')
    expect(toEncodable('cafe\u0301', supported)).toBe('café')
  })

  it('always returns text pdf-lib can draw', async () => {
    const { page, font, supported } = await helvetica()
    for (const raw of ['Vale 😀 cliente', 'Łódź', '→ ok', '✨🎨 notas', '中文', 'á']) {
      expect(() => page.drawText(toEncodable(raw, supported), { font }), raw).not.toThrow()
    }
  })

  it('encodableFor reads the charset of the embedded font, and lets it measure the text', async () => {
    const { font } = await helvetica()
    const text = encodableFor(font, 'Proveedor 😀 Łódź')
    expect(text).toBe('Proveedor ? ?ódz')
    expect(font.widthOfTextAtSize(text, 8)).toBeGreaterThan(0)
    expect(() => font.widthOfTextAtSize('😀', 8)).toThrow()
  })
})
