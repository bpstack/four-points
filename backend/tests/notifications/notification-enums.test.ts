// tests/notifications/notification-enums.test.ts
// The notification enums must match the ENUM columns of the notifications
// table. NotificationModule lacked 'messages' and NotificationRelatedTo
// lacked 'message', so message notifications were stored as module
// 'system' through `as any` casts.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  NotificationModule,
  NotificationRelatedTo,
  NotificationPriority,
  NotificationStatus,
} from '../../models/notifications/index.js'

const schema = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../db-mysql/aiven/17_notifications.sql'),
  'utf8'
)

function enumColumn(column: string): string[] {
  const m = schema.match(new RegExp('`' + column + '` enum\\(([^)]*)\\)'))
  expect(m, column).not.toBeNull()
  return [...m![1].matchAll(/'([^']+)'/g)].map((v) => v[1]).sort()
}

describe('notification enums match the table', () => {
  it.each([
    ['module', NotificationModule],
    ['related_to', NotificationRelatedTo],
    ['priority', NotificationPriority],
    ['status', NotificationStatus],
  ])('%s', (column, values) => {
    expect(Object.values(values).sort()).toEqual(enumColumn(column))
  })
})
