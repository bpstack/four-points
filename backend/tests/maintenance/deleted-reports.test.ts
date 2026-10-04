// tests/maintenance/deleted-reports.test.ts
// Any role could list deleted reports with include_deleted (the screen shows
// that filter to admins only) and read their detail, photos and history, and
// a deleted report still took notes and photos. Tests the role rule and reads
// the handler sources; no database.

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
  it('is admin only: the demo-admin user is disabled', () => {
    for (const role of ['admin', 'ADMIN']) expect(isAdminRole(role), role).toBe(true)
    for (const role of [
      'demo-admin',
      'recepcionista',
      'group-admin',
      'mantenimiento',
      '',
      undefined,
    ]) {
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

  it('only admins read one: detail, photos and history answer 404 otherwise', () => {
    expect(method(controller, 'getById')).toMatch(
      /if \(!report \|\| \(report\.is_deleted && !isAdminRole\(req\.user\?\.role\)\)\) \{\s*res\.status\(404\)/
    )
    for (const name of ['getImages', 'getHistory']) {
      expect(method(controller, name), name).toMatch(
        /if \(!\(await visibleReport\(id, req\.user\?\.role\)\)\) \{\s*res\.status\(404\)/
      )
    }
    expect(controller).toContain(
      'return deleted === false || (deleted === true && isAdminRole(role))'
    )
  })

  it.each(['uploadImage', 'deleteImage'])('%s refuses a deleted report', (name) => {
    expect(method(controller, name)).toMatch(/if \(report\.is_deleted\) \{\s*res\.status\(400\)/)
  })

  // The repository throws for a deleted report: the handler must answer 400,
  // not the generic 500 (status, priority and assign did until 2026-10-04)
  it.each(['update', 'updateStatus', 'updatePriority', 'addResolutionNotes', 'assignReport'])(
    '%s answers 400, not 500, for a deleted report',
    (name) => {
      expect(method(controller, name)).toMatch(
        /if \(error\.message\.includes\('eliminado'\)\) \{\s*res\.status\(400\)/
      )
    }
  )

  it.each(['update', 'updateStatus', 'updatePriority', 'addResolutionNotes'])(
    'repository %s refuses a deleted report',
    (name) => {
      expect(method(repository, name)).toMatch(/if \(current\.is_deleted\) \{\s*throw new Error/)
    }
  )
})
