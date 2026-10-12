// tests/frontend/settings-tab.test.ts
// resolveSettingsTab returns the requested tab if available, otherwise the
// first available tab. Runs the real helper (the frontend has no test runner).

import { describe, it, expect } from 'vitest'
import { resolveSettingsTab } from '../../../frontend/app/lib/helpers/settingsTab.js'

describe('resolveSettingsTab', () => {
  const available = ['users', 'notifications', 'security'] as const

  it('returns the requested tab when it is available', () => {
    expect(resolveSettingsTab('notifications', available)).toBe('notifications')
    expect(resolveSettingsTab('security', available)).toBe('security')
    expect(resolveSettingsTab('users', available)).toBe('users')
  })

  it('returns available[0] when requested tab is not in available (no permission)', () => {
    expect(resolveSettingsTab('users', ['notifications', 'security'])).toBe('notifications')
  })

  it('returns available[0] when requested tab does not exist', () => {
    expect(resolveSettingsTab('nonexistent', available)).toBe('users')
  })

  it('returns available[0] when requested is null', () => {
    expect(resolveSettingsTab(null, available)).toBe('users')
  })

  it('returns available[0] when requested is empty string', () => {
    expect(resolveSettingsTab('', available)).toBe('users')
  })
})
