// tests/search/search-access.test.ts
// Regression tests for the global search: mantenimiento must not read the
// blacklist or parking, and LIKE wildcards in the query must match literally.

import { describe, it, expect } from 'vitest'
import { searchableModules } from '../../services/search/search-access.js'
import { likeContains } from '../../repositories/shared/like.js'

describe('searchableModules', () => {
  it('keeps mantenimiento to the modules its routes allow', () => {
    expect([...searchableModules('mantenimiento')].sort()).toEqual(['groups', 'maintenance'])
  })

  it('gives the other roles every module', () => {
    for (const role of ['admin', 'recepcionista', 'group-admin', 'demo-admin', 'ADMIN']) {
      expect([...searchableModules(role)].sort()).toEqual([
        'blacklist',
        'groups',
        'maintenance',
        'parking',
      ])
    }
  })

  it('gives nothing when there is no role', () => {
    expect(searchableModules(undefined).size).toBe(0)
    expect(searchableModules('').size).toBe(0)
  })
})

describe('likeContains', () => {
  it('wraps a plain query', () => {
    expect(likeContains('1234ABC')).toBe('%1234ABC%')
  })

  it('escapes % and _ so they no longer match everything', () => {
    expect(likeContains('%%')).toBe('%\\%\\%%')
    expect(likeContains('a_b')).toBe('%a\\_b%')
  })

  it('escapes the escape character itself', () => {
    expect(likeContains('a\\b')).toBe('%a\\\\b%')
  })
})
