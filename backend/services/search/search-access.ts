// services/search/search-access.ts
//
// Which modules the global search may read for a role. No database access, so
// it can be tested alone.

import { openableModules } from '../auth/module-access.js'

export type SearchModule = 'parking' | 'maintenance' | 'groups' | 'blacklist'

const SEARCH_MODULES: readonly SearchModule[] = ['parking', 'maintenance', 'groups', 'blacklist']

export function searchableModules(role: string | undefined): Set<SearchModule> {
  return openableModules(role, SEARCH_MODULES)
}
