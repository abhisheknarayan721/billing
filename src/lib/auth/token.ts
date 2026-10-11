// Signs and verifies the session cookie. The cookie carries only the user id,
// their role and an expiry, signed with SESSION_SECRET, so it can be checked on every
// request (including in proxy.ts) without a database round trip.
//
// Deliberately free of `server-only` and `next/headers`: proxy.ts imports it,
// and neither of those is available there.

import { createHmac, timingSafeEqual } from 'node:crypto'

import { isRole, type Role } from '@/lib/auth/roles'

export const SESSION_COOKIE = 'billing_session'

/** How long a sign-in lasts before the user has to log in again. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export interface SessionPayload {
  userId: number
  /**
   * The role at sign-in, so proxy.ts can turn pages away without a database
   * lookup. Server actions re-check the role in the database, so a change takes
   * full effect on the next login.
   */
  role: Role
  /** Expiry as Unix seconds. */
  exp: number
}

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Add it to .env at the project root.',
    )
  }
  return value
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

export function createSessionToken(userId: number, role: Role): { token: string; expires: Date } {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  const data = Buffer.from(JSON.stringify({ userId, role, exp } satisfies SessionPayload)).toString(
    'base64url',
  )
  return { token: `${data}.${sign(data)}`, expires: new Date(exp * 1000) }
}

/** The payload of a genuine, unexpired token — otherwise null. Never throws on bad input. */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null

  const [data, signature, ...rest] = token.split('.')
  if (!data || !signature || rest.length > 0) return null

  const expected = Buffer.from(sign(data))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  try {
    const payload: unknown = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !Number.isInteger((payload as SessionPayload).userId) ||
      // A cookie from before roles existed has none; that user signs in again.
      !isRole((payload as SessionPayload).role) ||
      typeof (payload as SessionPayload).exp !== 'number'
    ) {
      return null
    }
    const { userId, role, exp } = payload as SessionPayload
    return exp > Date.now() / 1000 ? { userId, role, exp } : null
  } catch {
    return null
  }
}
