// Session helpers for Server Components and Server Actions.
//
// proxy.ts already turns away requests without a valid cookie, but Server
// Actions are only as protected as the route they are posted to, so every
// action also calls requireUser() itself rather than trusting the proxy alone.

import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { type Role, USER_HOME, isRole } from '@/lib/auth/roles'
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from '@/lib/auth/token'

export interface CurrentUser {
  userId: number
  username: string
  fullname: string | null
  /** Read from the database, so it is current even if the cookie is older. */
  role: Role
}

export async function startSession(userId: number, role: Role) {
  const { token, expires } = createSessionToken(userId, role)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Plain http://localhost in development; https everywhere else.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  })
}

export async function endSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * The signed-in user, or null. Memoised per render so the layout and a page
 * asking in the same request cost one query. A valid cookie for a user who has
 * since been deleted counts as signed out.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return null

  const user = await prisma.app_user.findUnique({
    where: { user_id: session.userId },
    select: { user_id: true, username: true, fullname: true, role: true },
  })
  if (!user) return null
  return {
    userId: user.user_id,
    username: user.username,
    fullname: user.fullname,
    // An unrecognised value grants the least access.
    role: isRole(user.role) ? user.role : 'user',
  }
})

/**
 * A validly signed cookie whose login has since been removed. proxy.ts lets it
 * through (it does not touch the database), so pages check for it and send the
 * browser to /logout to clear it — otherwise /login, which turns signed-in
 * cookies away, and the page would bounce it between them.
 */
export async function hasOrphanedSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return (
    verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value) !== null &&
    (await getCurrentUser()) === null
  )
}

/** The signed-in user; anyone else is sent to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect((await hasOrphanedSession()) ? '/logout' : '/login')
  return user
}

/**
 * The signed-in admin. An order-only user is sent to their orders, so an
 * action posted with an older admin cookie still cannot write.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()
  if (user.role !== 'admin') redirect(USER_HOME)
  return user
}
