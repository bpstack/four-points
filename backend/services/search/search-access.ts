// services/search/search-access.ts
//
// Which modules the global search may read for a role, and how the query is
// turned into a LIKE pattern. No database access, so it can be tested alone.

import { openableModules } from '../auth/module-access.js'

export type SearchModule = 'parking' | 'maintenance' | 'groups' | 'blacklist'

const SEARCH_MODULES: readonly SearchModule[] = ['parking', 'maintenance', 'groups', 'blacklist']

export function searchableModules(role: string | undefined): Set<SearchModule> {
  return openableModules(role, SEARCH_MODULES)
}

// Escapes LIKE wildcards so "%%" or "_" match literally instead of
// listing every row; backslash is MySQL's default LIKE escape character
export function likeContains(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}
