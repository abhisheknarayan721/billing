// Clears the session cookie and goes to the login page. Used when a cookie is
// still validly signed but its login has been removed: Server Components cannot
// delete cookies, so they redirect here instead. The log-out button keeps using
// its server action.

import { NextResponse, type NextRequest } from 'next/server'

import { SESSION_COOKIE } from '@/lib/auth/token'

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.nextUrl))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
