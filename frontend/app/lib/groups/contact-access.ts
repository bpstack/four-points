// app/lib/groups/contact-access.ts

// Same roles as canViewGroupContacts in the backend (middlewares/roleCheck.ts):
// mantenimiento views groups to open its notifications, not their contacts
const GROUP_CONTACT_ROLES = ['admin', 'recepcionista', 'group-admin']

export function canViewGroupContacts(role: string | undefined | null): boolean {
  return !!role && GROUP_CONTACT_ROLES.includes(role.toLowerCase())
}
