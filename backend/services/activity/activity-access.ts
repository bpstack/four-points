// services/activity/activity-access.ts
//
// Which activity sources a role may read, and how per-source lists are
// merged. No database access, so it can be tested alone.

import { openableModules } from '../auth/module-access.js'

export type ActivitySource = 'cashier' | 'groups' | 'logbook' | 'maintenance'

export const ACTIVITY_SOURCES: readonly ActivitySource[] = [
  'cashier',
  'groups',
  'logbook',
  'maintenance',
]

export function readableSources(role: string | undefined): Set<ActivitySource> {
  return openableModules(role, ACTIVITY_SOURCES)
}

// Newest first across sources, cut to limit (each list is already sorted)
export function mergeByTimestamp<T extends { timestamp: string | Date }>(
  lists: T[][],
  limit: number
): T[] {
  return lists
    .flat()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}
