// tests/group/group-contacts-access.test.ts
// Regression tests: every role that views groups, mantenimiento included,
// could read the email and phone of a group's contacts, both from
// /contacts and from the history, which keeps each contact as JSON when it
// is created, edited or deleted. Decided on 2026-10-12: mantenimiento keeps
// groups and their notifications, but not the contacts.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../../repositories/group/group-repository', () => ({
  GroupRepository: { getById: vi.fn(async () => ({ id: 4 })) },
}))
vi.mock('../../services/group/group-history-service', () => ({
  GroupHistoryService: {
    getGroupHistory: vi.fn(async () => [
      { id: 1, table_affected: 'hotel_groups', new_value: '{"name":"Boda"}' },
      { id: 2, table_affected: 'group_contacts', new_value: '{"contact_email":"a@b.es"}' },
      { id: 3, table_affected: 'group_payments', new_value: '{"amount":100}' },
    ]),
  },
}))

const { canViewGroupContacts } = await import('../../middlewares/roleCheck.js')
const { GroupHistoryController } =
  await import('../../controllers/group/group-history-controller.js')

function runMiddleware(role: string) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  const next = vi.fn() as NextFunction
  canViewGroupContacts({ user: { role } } as unknown as Request, res as unknown as Response, next)
  return { res, next }
}

async function history(role: string) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  const req = { params: { id: '4' }, query: {}, user: { id: 'u1', role } } as unknown as Request
  await GroupHistoryController.getGroupHistory(req, res as unknown as Response)
  return res.json.mock.calls[0][0] as { data: { table_affected: string }[]; count: number }
}

beforeEach(() => vi.clearAllMocks())

describe('canViewGroupContacts', () => {
  it.each(['admin', 'recepcionista', 'group-admin', 'Admin'])('lets %s through', (role) => {
    expect(runMiddleware(role).next).toHaveBeenCalledOnce()
  })

  it('answers 403 to mantenimiento', () => {
    const { res, next } = runMiddleware('mantenimiento')
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('group history', () => {
  it('leaves out the contact entries for mantenimiento', async () => {
    const body = await history('mantenimiento')
    expect(body.data.map((h) => h.table_affected)).toEqual(['hotel_groups', 'group_payments'])
    expect(body.count).toBe(2)
    expect(JSON.stringify(body)).not.toContain('a@b.es')
  })

  it('keeps every entry for the roles that see contacts', async () => {
    expect((await history('recepcionista')).count).toBe(3)
  })
})

describe('routes', () => {
  const routes = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'routes', 'group', 'group-routes.ts'),
    'utf8'
  )

  it.each(['/:id/contacts', '/:id/contacts/primary'])(
    'GET %s needs canViewGroupContacts',
    (path) => {
      const call = new RegExp(`router\\.get\\(\\s*'${path}',\\s*verifyToken,\\s*(\\w+)`)
      expect(routes.match(call)?.[1]).toBe('canViewGroupContacts')
    }
  )
})
