export type PortalRole = 'ADMIN' | 'SUPER_ADMIN'

const PORTAL_ROLES: readonly PortalRole[] = ['ADMIN', 'SUPER_ADMIN']

const SUPER_ADMIN_PATHS = [
  '/dashboard/finance',
  '/dashboard/admin-users',
  '/dashboard/configurations',
  '/dashboard/cities',
  '/dashboard/locations',
] as const

export function isPortalRole(role: unknown): role is PortalRole {
  return typeof role === 'string' && PORTAL_ROLES.includes(role as PortalRole)
}

export function canAccessDashboardPath(role: PortalRole, pathname: string): boolean {
  if (role === 'SUPER_ADMIN') return true

  return !SUPER_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}
