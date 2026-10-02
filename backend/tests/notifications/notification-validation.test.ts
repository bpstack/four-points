// tests/notifications/notification-validation.test.ts
// Regression tests for manual notifications: direct_link pointing outside
// the app, and unchecked recipients, titles and messages.

import { describe, it, expect } from 'vitest'
import {
  internalLinkSchema,
  generalNotificationSchema,
  groupNotificationSchema,
} from '../../validations/notifications/notification-schemas.js'

const user = '550e8400-e29b-41d4-a716-446655440001'

describe('internalLinkSchema', () => {
  it('accepts the in-app paths the app uses', () => {
    for (const link of [
      '/dashboard',
      '/dashboard/parking/bookings',
      '/dashboard/profile?panel=settings',
      '/dashboard/groups/12?tab=payments&highlight=3',
    ]) {
      expect(internalLinkSchema.safeParse(link).success).toBe(true)
    }
  })

  it('rejects links that leave the app', () => {
    for (const link of [
      'https://evil.example',
      'http://evil.example/dashboard',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'dashboard',
      '/dashboard with spaces',
      '/' + 'a'.repeat(500),
    ]) {
      expect(internalLinkSchema.safeParse(link).success).toBe(false)
    }
  })
})

describe('generalNotificationSchema', () => {
  // Same shape as GlobalNotificationModal.tsx sends
  const body = {
    title: 'Corte de agua',
    message: 'Mañana de 10:00 a 12:00',
    priority: 'high',
    module: 'system',
    direct_link: '/dashboard/maintenance',
    scheduled_for: '2026-10-03T08:00:00.000Z',
  }

  it('accepts what the admin form sends', () => {
    expect(generalNotificationSchema.safeParse(body).success).toBe(true)
  })

  it('rejects an external direct_link', () => {
    expect(
      generalNotificationSchema.safeParse({ ...body, direct_link: 'https://evil.example' }).success
    ).toBe(false)
  })

  it('rejects blank or oversized texts and bad priorities or modules', () => {
    for (const change of [
      { title: '   ' },
      { title: 'a'.repeat(201) },
      { message: '' },
      { message: 'a'.repeat(16001) },
      { priority: 'critical' },
      { module: 'cashier' },
      { scheduled_for: 'mañana' },
    ]) {
      expect(generalNotificationSchema.safeParse({ ...body, ...change }).success).toBe(false)
    }
  })

  it('rejects recipients that are not user ids, or repeated', () => {
    expect(generalNotificationSchema.safeParse({ ...body, userIds: [user] }).success).toBe(true)
    expect(generalNotificationSchema.safeParse({ ...body, userIds: ['1'] }).success).toBe(false)
    expect(generalNotificationSchema.safeParse({ ...body, userIds: [user, user] }).success).toBe(
      false
    )
  })
})

describe('groupNotificationSchema', () => {
  it('accepts what the group form sends', () => {
    expect(
      groupNotificationSchema.safeParse({
        title: 'Pago pendiente',
        message: 'Recordar el segundo pago',
        priority: 'medium',
      }).success
    ).toBe(true)
  })

  it('rejects a missing message', () => {
    expect(groupNotificationSchema.safeParse({ title: 'Pago' }).success).toBe(false)
  })
})
