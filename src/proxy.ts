// Every page and API route requires a signed-in user, except the login page,
// and an order-only user (role 'user') is kept to the order pages and API.
// This is the cookie-signature check only (no database lookup), which is cheap
// enough to run on every request, prefetches included. Server Actions repeat
// the check themselves via requireUser().

import { NextResponse, type NextRequest } from 'next/server'

import { USER_HOME, canAccessPath } from '@/lib/auth/roles'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/token'

const PUBLIC_PATHS = ['/login']

/** Clears a cookie whose login was removed; open to anyone, signed in or not. */
const LOGOUT_PATH = '/logout'

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (pathname === LOGOUT_PATH) return NextResponse.next()

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  const signedIn = session !== null
  const isPublic = PUBLIC_PATHS.includes(pathname)

  if (isPublic) {
    // Already signed in — the login page has nothing to offer.
    return signedIn ? NextResponse.redirect(new URL('/', request.nextUrl)) : NextResponse.next()
  }

  if (session) {
    if (canAccessPath(session.role, pathname)) return NextResponse.next()
    if (pathname.startsWith('/api/')) {
      return Response.json({ message: 'Not allowed.' }, { status: 403 })
    }
    return NextResponse.redirect(new URL(USER_HOME, request.nextUrl))
  }

  if (pathname.startsWith('/api/')) {
    return Response.json({ message: 'Not signed in.' }, { status: 401 })
  }

  // Remember where they were headed so login can send them back there.
  const loginUrl = new URL('/login', request.nextUrl)
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname + search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Everything except Next's own assets and files served from public/.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|images/|.*\\.svg$).*)'],
}
