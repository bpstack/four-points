// tests/frontend/safe-href.test.ts
// Links written in checklist content are rendered through safeHref: a
// javascript: or data: URL must never become a clickable href, in any of the
// spellings browsers still execute. Runs the real helper (the frontend has
// no test runner).

import { describe, it, expect } from 'vitest'
import { safeHref } from '../../../frontend/app/lib/helpers/safeHref.js'

describe('safeHref refuses executable URLs', () => {
  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'java\nscript:alert(1)',
    'java\tscript:alert(1)',
    'java\rscript:alert(1)',
    '\u0000javascript:alert(1)',
    'javascript&colon;alert(1)'.replace('&colon;', ':'),
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('%j', (href) => {
    expect(safeHref(href)).toBeUndefined()
  })
})

describe('safeHref keeps ordinary links', () => {
  it.each([
    '/dashboard/checklist',
    'checklist/night-audit',
    '#paso-3',
    'https://www.example.com/manual',
    'http://intranet.example.com',
    'mailto:recepcion@example.com',
    'tel:+34900000000',
  ])('%j', (href) => {
    expect(safeHref(href)).toBe(href)
  })

  it('returns undefined for empty values', () => {
    expect(safeHref('')).toBeUndefined()
    expect(safeHref(undefined)).toBeUndefined()
    expect(safeHref(null)).toBeUndefined()
  })
})
