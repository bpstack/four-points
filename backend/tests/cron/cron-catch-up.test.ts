// tests/cron/cron-catch-up.test.ts
// Render's free plan sleeps, so node-cron never fired: no job ran in a week of
// logs (2026-10-14). The backend now runs on start whatever is due, and
// runIfDue keeps a period from running twice. The batch payment also failed
// because 'system-cron' was not a user (20261014_cron_catch_up.sql).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const claimRun = vi.fn()
const finishRun = vi.fn()
vi.mock('../../repositories/cron/cron-job-runs-repository.js', () => ({ claimRun, finishRun }))

const processPendingNotifications = vi.fn()
vi.mock('../../services/notifications/notification-generator-service', () => ({
  NotificationGeneratorService: { processPendingNotifications },
}))

const dailyReset = vi.fn(async () => 0)
const purgeOldEventLogs = vi.fn(async () => 0)
vi.mock('../../services/checklist/checklist.service.js', () => ({ dailyReset, purgeOldEventLogs }))

const getValidatedInvoicesCountByMonth = vi.fn()
const markValidatedInvoicesAsPaid = vi.fn()
vi.mock('../../repositories/backoffice/backoffice-repository.js', () => ({
  BackofficeRepository: { getValidatedInvoicesCountByMonth, markValidatedInvoicesAsPaid },
}))

vi.mock('../../repositories/parking/parking.repository.js', () => ({
  extendAvailability: vi.fn(),
}))

const { CronService } = await import('../../services/cron/cron-service.js')

// Monday 2026-10-12 10:00 in Madrid: every job is due
const MONDAY = new Date('2026-10-12T08:00:00Z')

describe('runIfDue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    claimRun.mockResolvedValue(true)
    finishRun.mockResolvedValue(undefined)
    getValidatedInvoicesCountByMonth.mockResolvedValue({ count: 2, total_amount: 300 })
    markValidatedInvoicesAsPaid.mockResolvedValue({ count: 2, invoiceIds: [1, 2] })
  })

  it('does nothing before the job is due', async () => {
    const result = await CronService.runIfDue('notifications', new Date('2026-10-14T04:00:00Z'))
    expect(result).toBe('not-due')
    expect(claimRun).not.toHaveBeenCalled()
    expect(processPendingNotifications).not.toHaveBeenCalled()
  })

  it('does not run a period someone already took', async () => {
    claimRun.mockResolvedValue(false)
    expect(await CronService.runIfDue('notifications', MONDAY)).toBe('done')
    expect(claimRun).toHaveBeenCalledWith('notifications', '2026-10-12')
    expect(processPendingNotifications).not.toHaveBeenCalled()
  })

  it('runs a due job and records it', async () => {
    expect(await CronService.runIfDue('notifications', MONDAY)).toBe('ok')
    expect(processPendingNotifications).toHaveBeenCalledOnce()
    expect(finishRun).toHaveBeenCalledWith('notifications')
  })

  it('records a failure so the next start retries it, without throwing', async () => {
    processPendingNotifications.mockRejectedValueOnce(new Error('db down'))
    expect(await CronService.runIfDue('notifications', MONDAY)).toBe('error')
    expect(finishRun).toHaveBeenCalledWith('notifications', expect.any(Error))
  })

  it('pays the month before the period as the system user', async () => {
    expect(await CronService.runIfDue('batch-payment', MONDAY)).toBe('ok')
    expect(claimRun).toHaveBeenCalledWith('batch-payment', '2026-10')
    expect(markValidatedInvoicesAsPaid).toHaveBeenCalledWith(2026, 9, 'system-cron')
  })

  it('still pays a month the backend slept through, early in the next one', async () => {
    expect(await CronService.runIfDue('batch-payment', new Date('2026-11-02T08:00:00Z'))).toBe('ok')
    expect(claimRun).toHaveBeenCalledWith('batch-payment', '2026-10')
    expect(markValidatedInvoicesAsPaid).toHaveBeenCalledWith(2026, 9, 'system-cron')
  })

  it('marks the batch payment failed when the payment fails', async () => {
    markValidatedInvoicesAsPaid.mockRejectedValueOnce(new Error('foreign key'))
    expect(await CronService.runIfDue('batch-payment', MONDAY)).toBe('error')
    expect(finishRun).toHaveBeenCalledWith('batch-payment', expect.any(Error))
  })
})

describe('catchUp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    claimRun.mockResolvedValue(true)
    finishRun.mockResolvedValue(undefined)
    getValidatedInvoicesCountByMonth.mockResolvedValue({ count: 0, total_amount: 0 })
  })

  it('runs every due job once, in order', async () => {
    await CronService.catchUp(MONDAY)
    expect(claimRun.mock.calls).toEqual([
      ['notifications', '2026-10-12'],
      ['checklist-reset', '2026-10-12'],
      ['checklist-purge', '2026-10-12'],
      ['batch-payment', '2026-10'],
    ])
    expect(processPendingNotifications).toHaveBeenCalledOnce()
    expect(dailyReset).toHaveBeenCalledOnce()
    expect(purgeOldEventLogs).toHaveBeenCalledWith(7)
    expect(getValidatedInvoicesCountByMonth).toHaveBeenCalledWith(2026, 9)
  })

  it('keeps going when one job fails', async () => {
    dailyReset.mockRejectedValueOnce(new Error('boom'))
    await CronService.catchUp(MONDAY)
    expect(purgeOldEventLogs).toHaveBeenCalledOnce()
    expect(getValidatedInvoicesCountByMonth).toHaveBeenCalledOnce()
  })
})
