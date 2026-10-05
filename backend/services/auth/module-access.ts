// services/auth/module-access.ts
//
// Which modules a role can open, for endpoints that gather data from several
// modules at once (global search, recent activity). Mirrors the guard of each
// module's own routes in middlewares/roleCheck.ts: a cross-module view must
// not show what the module itself would answer 403 for.

export type AppModule = 'parking' | 'maintenance' | 'groups' | 'blacklist' | 'cashier' | 'logbook'

const allButMaintenanceRole = (role: string) => role !== 'mantenimiento'
const staffRoles = ['admin', 'recepcionista', 'group-admin', 'mantenimiento']

const MODULE_ACCESS: Record<AppModule, (role: string) => boolean> = {
  parking: allButMaintenanceRole, // excludeMantenimiento
  blacklist: allButMaintenanceRole, // excludeMantenimiento
  cashier: allButMaintenanceRole, // excludeMantenimiento
  logbook: allButMaintenanceRole, // excludeMantenimiento
  maintenance: (role) => staffRoles.includes(role), // canAccessMaintenance
  groups: (role) => staffRoles.includes(role), // canViewGroups
}

export function canOpenModule(role: string | undefined, module: AppModule): boolean {
  const r = role?.toLowerCase()
  return !!r && MODULE_ACCESS[module](r)
}

export function openableModules<M extends AppModule>(
  role: string | undefined,
  modules: readonly M[]
): Set<M> {
  return new Set(modules.filter((m) => canOpenModule(role, m)))
}

// Only admin (the public demo account is an admin too, limited by demoRestriction)
export function isAdminRole(role: string | undefined): boolean {
  return role?.toLowerCase() === 'admin'
}
