// Who may see what. Kept free of `server-only` and `next/headers` because
// proxy.ts and the (client) app shell both import it.
//
//   admin  everything
//   user   retailer orders only: create, list, edit, print, delete

export const ROLES = ['admin', 'user'] as const
export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** Where an order-only user lands, and is sent back to from anything else. */
export const USER_HOME = '/order/list'

const USER_PATHS = ['/order', '/api/orders']

/** Whether a role may open this path. */
export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === 'admin') return true
  return USER_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`))
}
