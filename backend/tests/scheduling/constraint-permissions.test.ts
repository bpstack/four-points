// tests/scheduling/constraint-permissions.test.ts
// Regression tests: any role except mantenimiento could create, edit or delete
// any constraint, also someone else's or an approved one. Deleting an approved
// constraint left its code in the cells without the lock (the foreign key sets
// source_constraint_id to NULL), and editing one left the lock on the old
// dates. Scheduling is edited only by admin; the rest only view it.
// Reads the sources; no database.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const routes = read('routes', 'scheduling', 'scheduling-routes.ts')
const controller = read('controllers', 'scheduling', 'scheduling-controller.ts')

// Body of `export async function name(` up to the next exported function
function fn(name: string): string {
  const start = controller.indexOf(`export async function ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = controller.indexOf('export async function ', start + 1)
  return controller.slice(start, next === -1 ? undefined : next)
}

describe('scheduling write routes', () => {
  it('every POST, PUT, PATCH and DELETE requires admin, except validating a month', () => {
    const writes = routes
      .split('\n')
      .filter((l) => /^router\.(post|put|patch|delete)\(/.test(l))
      .filter((l) => !l.includes("'/months/:id/validate'"))
    expect(writes.length).toBeGreaterThan(0)
    for (const line of writes) expect(line, line).toContain('isAdmin')
  })
})

describe('approved constraints keep the grid consistent', () => {
  it('updateConstraint moves the locked cells to the new dates', () => {
    const body = fn('updateConstraint')
    expect(body).toContain(
      "if (existing.status === 'approved') await releaseConstraintCells(existing)"
    )
    expect(body).toContain('await lockConstraintCells(constraint)')
    expect(body.indexOf('releaseConstraintCells')).toBeLessThan(
      body.indexOf('repo.updateConstraint')
    )
  })

  it('deleteConstraint frees the locked cells before deleting', () => {
    const body = fn('deleteConstraint')
    expect(body.indexOf('releaseConstraintCells(existing)')).toBeGreaterThan(-1)
    expect(body.indexOf('releaseConstraintCells(existing)')).toBeLessThan(
      body.indexOf('repo.deleteConstraint')
    )
  })

  it('editing and deleting leave history', () => {
    expect(fn('updateConstraint')).toContain("repo.createHistory(existing.month_id, 'manual_edit'")
    expect(fn('deleteConstraint')).toContain("repo.createHistory(existing.month_id, 'manual_edit'")
  })

  it('releasing only touches the cells this constraint locked', () => {
    expect(controller).toContain('if (assignment.source_constraint_id === c.id)')
  })
})

describe('health data', () => {
  it('every scheduling route requires admin, reads included', () => {
    expect(routes).toMatch(/router\.use\(authenticateToken\)\s*router\.use\(isAdmin\)/)
  })

  it('the INFEASIBLE log has counts, not the locked cells or the tail', () => {
    const generate = read('controllers', 'scheduling', 'schedule-generate.controller.ts')
    const start = generate.indexOf("solverOutput.status === 'infeasible'")
    const block = generate.slice(start, generate.indexOf('recordSolverRun', start))
    expect(block).toContain('lockedDays:')
    expect(block).not.toMatch(/lockedCells:\s*solverInput/)
    expect(block).not.toMatch(/tail:\s*tail\[/)
  })
})
