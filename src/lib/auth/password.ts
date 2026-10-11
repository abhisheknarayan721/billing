// Passwords are stored as plain text in app_user.password (the owner's
// choice), so checking one is a direct comparison.

import 'server-only'

import { timingSafeEqual } from 'node:crypto'

/** Constant-time, so response timing does not hint at how much of it matched. */
export function checkPassword(given: string, stored: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(stored)
  return a.length === b.length && timingSafeEqual(a, b)
}
