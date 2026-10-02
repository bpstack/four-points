// tests/maintenance/deleted-reports.test.ts
// Any role could list deleted reports with include_deleted (the screen shows
// that filter to admins only), and a deleted report still took notes and
// photos. Tests the role rule and reads the handler sources; no database.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isAdminRole } from '../../services/auth/module-access.js'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(backend, ...p), 'utf8')
const controller = read('controllers', 'maintenance', 'maintenance-controller.ts')
const repository = read('repositories', 'maintenance', 'maintenance-repository.ts')

// Body of `static async name(` up to the next static method
function method(source: string, name: string): string {
  const start = source.indexOf(`static async ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = source.indexOf('static async ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('isAdminRole', () => {
  it('matches the isAdmin middleware', () => {
    const middleware = read('middlewares', 'roleCheck.ts')
    expect(middleware).toMatch(
      /export const isAdmin: RoleCheckMiddleware[\s\S]*?allowedRoles = \['admin', 'demo-admin'\]/
    )
    for (const role of ['admin', 'demo-admin', 'ADMIN']) expect(isAdminRole(role), role).toBe(true)
    for (const role of ['recepcionista', 'group-admin', 'mantenimiento', '', undefined]) {
      expect(isAdminRole(role), String(role)).toBe(false)
    }
  })
})

describe('deleted maintenance reports', () => {
  it('only admins list them', () => {
    expect(method(controller, 'getAll')).toMatch(
      /if \(filters\.include_deleted && !isAdminRole\(req\.user\?\.role\)\) \{\s*res\.status\(403\)/
    )
  })

  it.each(['uploadImage', 'deleteImage'])('%s refuses a deleted report', (name) => {
    expect(method(controller, name)).toMatch(/if \(report\.is_deleted\) \{\s*res\.status\(400\)/)
  })

  it.each(['update', 'updateStatus', 'updatePriority', 'addResolutionNotes'])(
    'repository %s refuses a deleted report',
    (name) => {
      expect(method(repository, name)).toMatch(/if \(current\.is_deleted\) \{\s*throw new Error/)
    }
  )
})
