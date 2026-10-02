// services/search/search-access.ts
//
// Which modules the global search may read for a role, and how the query is
// turned into a LIKE pattern. No database access, so it can be tested alone.

export type SearchModule = 'parking' | 'maintenance' | 'groups' | 'blacklist'

const ALL_ROLES_BUT_MAINTENANCE = (role: string) => role !== 'mantenimiento'

// Mirrors the guard of each module's own routes (middlewares/roleCheck.ts):
// search must not show what the module itself would answer 403 for
const MODULE_ACCESS: Record<SearchModule, (role: string) => boolean> = {
  // excludeMantenimiento on routes/parking/*
  parking: ALL_ROLES_BUT_MAINTENANCE,
  // canAccessMaintenance
  maintenance: (role) =>
    ['admin', 'recepcionista', 'group-admin', 'mantenimiento', 'demo-admin'].includes(role),
  // canViewGroups
  groups: (role) =>
    ['admin', 'recepcionista', 'group-admin', 'mantenimiento', 'demo-admin'].includes(role),
  // excludeMantenimiento on routes/blacklist/*
  blacklist: ALL_ROLES_BUT_MAINTENANCE,
}

export function searchableModules(role: string | undefined): Set<SearchModule> {
  const r = role?.toLowerCase()
  if (!r) return new Set()
  const modules = Object.keys(MODULE_ACCESS) as SearchModule[]
  return new Set(modules.filter((m) => MODULE_ACCESS[m](r)))
}

// Escapes LIKE wildcards so "%%" or "_" match literally instead of
// listing every row; backslash is MySQL's default LIKE escape character
export function likeContains(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}
