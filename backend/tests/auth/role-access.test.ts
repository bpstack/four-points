// tests/auth/role-access.test.ts
// Pin the current role access behaviour for excludeMantenimiento and
// canOpenModule. This test documents what the code does today; B4 will
// change the implementation but keep these tests green.

import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { excludeMantenimiento } from '../../middlewares/roleCheck.js'
import { canOpenModule, type AppModule } from '../../services/auth/module-access.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Helper to create mock req/res/next
function createMockReqRes(role?: string) {
  const req = {
    user: role ? { role } : undefined,
  } as unknown as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  const next = vi.fn()
  return { req, res, next }
}

describe('excludeMantenimiento', () => {
  it('allows admin', () => {
    const { req, res, next } = createMockReqRes('admin')
    excludeMantenimiento(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('allows recepcionista', () => {
    const { req, res, next } = createMockReqRes('recepcionista')
    excludeMantenimiento(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('allows group-admin', () => {
    const { req, res, next } = createMockReqRes('group-admin')
    excludeMantenimiento(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('blocks mantenimiento with 403', () => {
    const { req, res, next } = createMockReqRes('mantenimiento')
    excludeMantenimiento(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('blocks missing req.user with 403', () => {
    const { req, res, next } = createMockReqRes(undefined)
    excludeMantenimiento(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('allows ADMIN in uppercase (toLowerCase)', () => {
    const { req, res, next } = createMockReqRes('ADMIN')
    excludeMantenimiento(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('blocks unknown role "auditor" with 403', () => {
    const { req, res, next } = createMockReqRes('auditor')
    excludeMantenimiento(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

describe('canOpenModule', () => {
  const roles = ['admin', 'recepcionista', 'group-admin', 'mantenimiento', 'auditor'] as const
  const modules: AppModule[] = [
    'parking',
    'maintenance',
    'groups',
    'blacklist',
    'cashier',
    'logbook',
  ]

  // Expected results based on implementation:
  // - parking, blacklist, cashier, logbook: frontDeskRoles (admin, recepcionista, group-admin)
  // - maintenance: staffRoles (admin, recepcionista, group-admin, mantenimiento)
  // - groups: staffRoles (admin, recepcionista, group-admin, mantenimiento)
  const expected: Record<string, Record<AppModule, boolean>> = {
    admin: {
      parking: true,
      maintenance: true,
      groups: true,
      blacklist: true,
      cashier: true,
      logbook: true,
    },
    recepcionista: {
      parking: true,
      maintenance: true,
      groups: true,
      blacklist: true,
      cashier: true,
      logbook: true,
    },
    'group-admin': {
      parking: true,
      maintenance: true,
      groups: true,
      blacklist: true,
      cashier: true,
      logbook: true,
    },
    mantenimiento: {
      parking: false,
      maintenance: true,
      groups: true,
      blacklist: false,
      cashier: false,
      logbook: false,
    },
    auditor: {
      parking: false,
      maintenance: false,
      groups: false,
      blacklist: false,
      cashier: false,
      logbook: false,
    },
  }

  it.each(roles)('role %s', (role) => {
    for (const mod of modules) {
      expect(canOpenModule(role, mod)).toBe(expected[role][mod])
    }
  })
})

describe('router wiring: excludeMantenimiento', () => {
  const routersWithExcludeMantenimiento = [
    'routes/blacklist/blacklist-routes.ts',
    'routes/cashier/cashier-routes.ts',
    'routes/checklist/checklist-routes.ts',
    'routes/conciliation/conciliation.routes.ts',
    'routes/departments/departments-routes.ts',
    'routes/logbook/logbook-routes.ts',
    'routes/parking/bookings.routes.ts',
    'routes/parking/parking.routes.ts',
    'routes/parking/stats.routes.ts',
  ]

  it.each(routersWithExcludeMantenimiento)('%s uses excludeMantenimiento', (routerPath) => {
    const fullPath = resolve(process.cwd(), routerPath)
    const content = readFileSync(fullPath, 'utf-8')
    expect(content).toContain('excludeMantenimiento')
    expect(content).toMatch(/router\.use\(.*excludeMantenimiento/)
  })
})
