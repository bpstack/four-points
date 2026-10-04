// tests/frontend/blacklist-highlight.test.ts
// Tests a dependency-free frontend helper from the backend suite (the
// frontend has no test runner). The blacklist list used to build HTML from
// guest names and inject it with dangerouslySetInnerHTML; splitHighlight
// returns plain text parts that React renders escaped.

import { describe, it, expect } from 'vitest'
import { splitHighlight } from '../../../frontend/app/lib/blacklist/blacklistUtils.js'

const marked = (text: string, term: string) =>
  splitHighlight(text, term)
    .map((p) => (p.match ? `[${p.text}]` : p.text))
    .join('')

describe('splitHighlight', () => {
  it('marks every match, ignoring case and accents, keeping the original text', () => {
    expect(marked('José Pérez', 'jose')).toBe('[José] Pérez')
    expect(marked('Ana ANA ana', 'ana')).toBe('[Ana] [ANA] [ana]')
    expect(marked('12345678Z', '5678')).toBe('1234[5678]Z')
  })

  it('returns the whole text unmarked when there is no term or no match', () => {
    expect(splitHighlight('Juan', '')).toEqual([{ text: 'Juan', match: false }])
    expect(splitHighlight('Juan', '   ')).toEqual([{ text: 'Juan', match: false }])
    expect(marked('Juan', 'xyz')).toBe('Juan')
  })

  it('keeps markup as text: nothing is interpreted as HTML', () => {
    const parts = splitHighlight('<img src=x onerror=alert(1)> Juan', 'juan')
    expect(parts[0]).toEqual({ text: '<img src=x onerror=alert(1)> ', match: false })
    expect(parts[1]).toEqual({ text: 'Juan', match: true })
  })

  it('keeps indexes right with emoji and repeated partial matches', () => {
    expect(marked('😀 Ana', 'ana')).toBe('😀 [Ana]')
    expect(marked('aaaa', 'aa')).toBe('[aa][aa]')
  })
})
