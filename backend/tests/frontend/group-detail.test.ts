// tests/frontend/group-detail.test.ts
// Regression tests for the group page (the frontend has no test runner).
// After "Grupo actualizado correctamente" the page kept the old amount: it
// paints the group from useGroupStore, filled once from the server, and the
// useGroup query was never read nor invalidated. And mantenimiento, which
// may not see contacts since 2026-10-12, would get a 403 from the contacts
// tab: the tab and its query are left out for it.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canViewGroupContacts } from '../../../frontend/app/lib/groups/contact-access.js'

const groups = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'frontend',
  'app',
  'components',
  'groups'
)
const read = (...p: string[]) => readFileSync(join(groups, ...p), 'utf8')
const detail = read('GroupDetailClient.tsx')

describe('the group page after an edit', () => {
  it('copies the fresh useGroup data into the store', () => {
    expect(detail).toMatch(/const \{ data: groupData \} = useGroup\(/)
    expect(detail).toMatch(/if \(groupData\) setCurrentGroup\(groupData\)/)
  })

  it('invalidates the group, its payments and status on success', () => {
    const handler = detail.slice(detail.indexOf('const handleEditSuccess'))
    expect(handler.slice(0, 300)).toContain(
      'queryClient.invalidateQueries({ queryKey: groupsKeys.detail(currentGroup.id) })'
    )
  })
})

describe('contacts by role', () => {
  it('mirrors canViewGroupContacts of the backend', () => {
    for (const role of ['admin', 'recepcionista', 'group-admin', 'Admin']) {
      expect(canViewGroupContacts(role), role).toBe(true)
    }
    for (const role of ['mantenimiento', '', undefined]) {
      expect(canViewGroupContacts(role), String(role)).toBe(false)
    }
  })

  it('the contacts tab and its query depend on it', () => {
    expect(read('layout', 'TabNavigation.tsx')).toContain('canViewGroupContacts(')
    expect(detail).toContain(
      "const activeTab = requestedTab === 'contacts' && !showContacts ? 'overview' : requestedTab"
    )
    expect(detail).toMatch(/useGroupContacts\(currentGroup\?\.id, showContacts\)/)
  })
})
