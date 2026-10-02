// tests/notifications/check-pending-roles.test.ts
// Any role with groups access (maintenance included) could run the manual
// generation of pending notifications. Decided on 2026-10-02: admin and
// group-admin only, the canManageGroups roles. The settings screen hid none
// of its buttons; it now uses the same roles as the backend routes.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canManageGroupsRole, isAdminRole } from '../../../frontend/app/lib/helpers/utils.js'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(backend, ...p), 'utf8')

function allowedRoles(middleware: string): string[] {
  const src = read('middlewares', 'roleCheck.ts')
  const m = src.match(
    new RegExp(
      `export const ${middleware}: RoleCheckMiddleware[\\s\\S]*?allowedRoles = \\[([^\\]]*)\\]`
    )
  )
  return [...(m?.[1] ?? '').matchAll(/'([^']+)'/g)].map((r) => r[1])
}

const ROLES = ['admin', 'demo-admin', 'group-admin', 'recepcionista', 'mantenimiento']

describe('manual pending-notification check', () => {
  it('is guarded by canManageGroups', () => {
    const routes = read('routes', 'notifications', 'notifications-routes.ts').replace(/\s+/g, ' ')
    expect(routes).toContain(
      "router.post( '/check-pending', verifyToken, canManageGroups, NotificationController.checkPendingNotifications )"
    )
  })

  it('canManageGroups lets admin and group-admin in, not reception or maintenance', () => {
    expect(allowedRoles('canManageGroups').sort()).toEqual(['admin', 'demo-admin', 'group-admin'])
  })

  it('the screen offers each button to the roles its route allows', () => {
    for (const role of ROLES) {
      expect(canManageGroupsRole(role), role).toBe(allowedRoles('canManageGroups').includes(role))
      expect(isAdminRole(role), role).toBe(allowedRoles('isAdmin').includes(role))
    }
  })
})
