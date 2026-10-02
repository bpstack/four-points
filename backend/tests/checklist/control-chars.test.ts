// tests/checklist/control-chars.test.ts
// Regression tests: checklist comments accepted control characters, and
// scripts/checklist-report.ts printed them to the terminal as they were
// (an ESC sequence can rewrite what the terminal shows).

import { describe, it, expect } from 'vitest'
import { hasNoControlChars, printable } from '../../services/text/control-chars.js'
import { createCommentSchema } from '../../validations/checklist/checklist-schemas.js'

const ESC = String.fromCharCode(27)

describe('createCommentSchema', () => {
  it('accepts normal comments, with accents, tabs and line breaks', () => {
    expect(createCommentSchema.safeParse({ body: 'Revisado\tOK\nFalta café ☕' }).success).toBe(
      true
    )
  })

  it('rejects ANSI escapes and other control characters', () => {
    for (const body of [`${ESC}[2J borrado`, 'a\u0000b', 'x\u0007', 'y\u009b31m']) {
      expect(createCommentSchema.safeParse({ body }).success, JSON.stringify(body)).toBe(false)
    }
  })
})

describe('printable', () => {
  it('replaces control characters and keeps the rest', () => {
    expect(printable(`${ESC}[31mrojo`)).toBe('?[31mrojo')
    expect(printable('línea 1\nlínea 2')).toBe('línea 1\nlínea 2')
    expect(printable(null)).toBe('')
  })

  it('agrees with hasNoControlChars', () => {
    expect(hasNoControlChars(printable(`a${ESC}b\u0000c`))).toBe(true)
  })
})
