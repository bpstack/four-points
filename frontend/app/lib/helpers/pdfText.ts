// app/lib/helpers/pdfText.ts

// pdf-lib's standard fonts (Helvetica) only encode WinAnsi: drawText throws on
// anything else, such as an emoji in a voucher note. Each character the font
// lacks becomes its unaccented letter when the font has it (ź -> z), else '?'.
export function toEncodable(str: string, supported: ReadonlySet<number>): string {
  let out = ''
  for (const ch of str.normalize('NFC')) {
    if (supported.has(ch.codePointAt(0)!)) {
      out += ch
      continue
    }
    const base = ch.normalize('NFD')[0]
    out += base !== ch && supported.has(base.codePointAt(0)!) ? base : '?'
  }
  return out
}
