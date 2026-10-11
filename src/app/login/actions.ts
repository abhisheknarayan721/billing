'use server'

import { redirect } from 'next/navigation'

import type { LoginFormState } from '@/lib/auth/login'
import { checkPassword } from '@/lib/auth/password'
import { isRole } from '@/lib/auth/roles'
import { endSession, startSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

/**
 * Only same-site paths are followed after login, so a crafted
 * `?next=https://evil.example` link cannot bounce the user off-site.
 */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (username === '' || password === '') {
    return { message: 'Enter your username and password.', username }
  }

  const user = await prisma.app_user.findUnique({
    where: { username },
    select: { user_id: true, password: true, role: true },
  })

  if (!user || !checkPassword(password, user.password)) {
    // One message for both, so the form does not reveal which usernames exist.
    return { message: 'Incorrect username or password.', username }
  }

  // proxy.ts sends an order-only user on from wherever `next` points.
  await startSession(user.user_id, isRole(user.role) ? user.role : 'user')
  redirect(safeNext(formData.get('next')))
}

export async function logout() {
  await endSession()
  redirect('/login')
}
