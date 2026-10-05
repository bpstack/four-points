// tests/security/demo-guards.test.ts
// The public demo account is an admin (ADR-038): what it must not touch is
// guarded on each route with denyDemo or denyDemoWrites. Locks those guards so
// a refactor cannot drop one silently. Reads the sources; no database needed.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const routes = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'routes')
const read = (file: string) => readFileSync(join(routes, file), 'utf8')

// Whole routers: the guard runs on every route right after authentication
const routerGuards: Array<[string, string]> = [
  ['auth/user-routes.ts', 'denyDemoWrites'],
  ['departments/departments-routes.ts', 'denyDemoWrites'],
  ['demo/demo-activity-routes.ts', 'denyDemo'],
]

// Scheduling configuration: reads stay open, writes are blocked
const schedulingConfig = ['/config', '/shifts', '/rules', '/employees', '/contracts']

// Single routes, as method and path
const routeGuards: Array<[string, string, string]> = [
  ['auth/auth-routes.ts', 'post', '/register'],
  ['auth/auth-routes.ts', 'patch', '/me/profile'],
  ['auth/auth-routes.ts', 'patch', '/me/password'],
  ['auth/auth-routes.ts', 'post', '/me/avatar'],
  ['auth/auth-routes.ts', 'delete', '/me/avatar'],
  ['backoffice/backoffice-routes.ts', 'post', '/categories'],
]

// The whole `router.method('path', ...)` statement, also when Prettier splits it
function statement(source: string, method: string, path: string): string | undefined {
  return source.split(/\n(?=router\.)/).find(
    (s) =>
      s.startsWith(`router.${method}(`) &&
      s
        .slice(method.length + 8)
        .trimStart()
        .startsWith(`'${path}'`)
  )
}

describe('demo account guards', () => {
  it.each(routerGuards)('%s runs %s after authenticateToken', (file, guard) => {
    const source = read(file)
    const auth = source.indexOf('router.use(authenticateToken)')
    const guarded = source.indexOf(`router.use(${guard})`)
    expect(auth).toBeGreaterThanOrEqual(0)
    expect(guarded).toBeGreaterThan(auth)
  })

  it('scheduling blocks writes to its configuration after isAdmin', () => {
    const source = read('scheduling/scheduling-routes.ts')
    const line = source.split('\n').find((l) => l.includes('denyDemoWrites)'))
    expect(line).toBeDefined()
    for (const path of schedulingConfig) expect(line).toContain(`'${path}'`)
    expect(source.indexOf(line!)).toBeGreaterThan(source.indexOf('router.use(isAdmin)'))
  })

  it.each(routeGuards)('%s: %s %s carries denyDemo', (file, method, path) => {
    const found = statement(read(file), method, path)
    expect(found, `${method} ${path} not found`).toBeDefined()
    expect(found).toMatch(/\bdenyDemo\b/)
  })
})
