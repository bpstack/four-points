// tests/notifications/manual-recipients.test.ts
// Regression tests: manual notifications accepted any user id. An inactive
// user got the notice, and an unknown one broke the recipients insert after
// the notification was created, leaving it without recipients. Both are now
// refused with NOTIFICATIONS_INVALID_RECIPIENTS before anything is written.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

// The controller also loads NotificationRepository: without this the pool's
// config needs a real database password (CI has none)
vi.mock('../../config/db.js', () => ({ default: { query: vi.fn(), getConnection: vi.fn() } }))
vi.mock('../../repositories/auth/user-repository.js', () => ({
  UserRepository: { getActiveIds: vi.fn() },
}))
vi.mock('../../services/notifications/notification-generator-service.js', () => ({
  NotificationGeneratorService: {
    generateManualNotification: vi.fn(),
    generateGeneralNotification: vi.fn(),
  },
}))

const { NotificationController } =
  await import('../../controllers/notifications/notification-controller.js')
const { UserRepository } = await import('../../repositories/auth/user-repository.js')
const { NotificationGeneratorService } =
  await import('../../services/notifications/notification-generator-service.js')
const { ERROR_CODES } = await import('../../config/error-codes.js')

const ACTIVE = '11111111-1111-4111-8111-111111111111'
const INACTIVE = '22222222-2222-4222-8222-222222222222'

function call(
  handler: (req: Request, res: Response) => Promise<Response>,
  body: object,
  params = {}
) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  const req = { user: { id: 'u1' }, params, body } as unknown as Request
  return handler(req, res as unknown as Response).then(() => res)
}

const endpoints = [
  ['general', NotificationController.createGeneralNotification, {}],
  ['group', NotificationController.createManualNotification, { id: '5' }],
] as const

describe('manual notification recipients', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(endpoints)(
    '%s: refuses a recipient that is inactive or unknown',
    async (_, handler, params) => {
      vi.mocked(UserRepository.getActiveIds).mockResolvedValue([ACTIVE])

      const res = await call(
        handler,
        { title: 'T', message: 'M', userIds: [ACTIVE, INACTIVE] },
        params
      )

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: ERROR_CODES.NOTIFICATIONS_INVALID_RECIPIENTS })
      )
      expect(NotificationGeneratorService.generateGeneralNotification).not.toHaveBeenCalled()
      expect(NotificationGeneratorService.generateManualNotification).not.toHaveBeenCalled()
    }
  )

  it.each(endpoints)('%s: sends when every recipient is active', async (_, handler, params) => {
    vi.mocked(UserRepository.getActiveIds).mockResolvedValue([ACTIVE])

    const res = await call(handler, { title: 'T', message: 'M', userIds: [ACTIVE] }, params)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  it.each(endpoints)(
    '%s: without userIds it does not look users up',
    async (_, handler, params) => {
      const res = await call(handler, { title: 'T', message: 'M' }, params)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(UserRepository.getActiveIds).not.toHaveBeenCalled()
    }
  )
})
