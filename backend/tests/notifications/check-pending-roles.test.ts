// tests/notifications/check-pending-roles.test.ts
// Any role with groups access (maintenance included) could run the manual
// generation of pending notifications. Decided on 2026-10-02: admin and
// group-admin only (demo-admin is disabled). The settings screen hid none of
// its buttons; it now uses the same roles as the backend routes.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  canRunNotificationCheckRole,
  isAdminRole,
} from '../../../frontend/app/lib/helpers/utils.js'

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
  it('is guarded by canRunNotificationCheck', () => {
    const routes = read('routes', 'notifications', 'notifications-routes.ts').replace(/\s+/g, ' ')
    expect(routes).toContain(
      "router.post( '/check-pending', verifyToken, canRunNotificationCheck, NotificationController.checkPendingNotifications )"
    )
  })

  it('lets admin and group-admin in, not demo-admin, reception or maintenance', () => {
    expect(allowedRoles('canRunNotificationCheck').sort()).toEqual(['admin', 'group-admin'])
  })

  it('the screen offers each button to the roles its route allows', () => {
    for (const role of ROLES) {
      expect(canRunNotificationCheckRole(role), role).toBe(
        allowedRoles('canRunNotificationCheck').includes(role)
      )
      expect(isAdminRole(role), role).toBe(allowedRoles('isAdmin').includes(role))
    }
  })
})
