// Business rules for managing logins from the admin pages.

import { ApiError, ValidationError } from '@/api/lib/http'
import {
  deleteUserExceptAdministrator,
  findUserById,
  findUsers,
  insertUser,
  updateUser,
} from '@/api/repository/user.repository'
import { ADMINISTRATOR_USERNAME, type UserValues, validateUser } from '@/lib/user'

function check(values: UserValues, mode: 'create' | 'edit', errors: Record<string, string> = {}) {
  const all = { ...validateUser(values, mode), ...errors }
  if (Object.keys(all).length > 0) {
    throw new ValidationError(all, 'Please correct the highlighted fields.')
  }
}

/** username is UNIQUE; surface a clash on the field rather than as a 500. */
function asUsernameError(error: unknown, username: string) {
  if ((error as { code?: string } | null)?.code === 'P2002') {
    return new ValidationError(
      { username: `Username "${username}" is already taken.` },
      'Please correct the highlighted fields.',
    )
  }
  return error
}

export async function createUser(values: UserValues) {
  check(values, 'create')
  try {
    return await insertUser(values)
  } catch (error) {
    throw asUsernameError(error, values.username)
  }
}

/**
 * `actingUserId` is the admin making the change. They cannot take away their
 * own admin role: with no admin left, nobody could manage logins (or anything
 * but orders) from the app.
 */
export async function editUser(id: number, values: UserValues, actingUserId: number) {
  const errors: Record<string, string> = {}
  if (id === actingUserId && values.role !== 'admin') {
    errors.role = 'You cannot remove your own admin access.'
  }

  // The administrator keeps its name and role, so it stays protected.
  const existing = await findUserById(id)
  if (existing?.username === ADMINISTRATOR_USERNAME) {
    if (values.username !== ADMINISTRATOR_USERNAME) {
      errors.username = `The administrator account must stay "${ADMINISTRATOR_USERNAME}".`
    }
    if (values.role !== 'admin') errors.role = 'The administrator account must stay an admin.'
  }

  check(values, 'edit', errors)
  try {
    const updated = await updateUser(id, values)
    if (!updated) throw new ApiError(`User ${id} was not found.`, 404)
    return updated
  } catch (error) {
    throw asUsernameError(error, values.username)
  }
}

/**
 * Any login can be removed except the administrator account and your own.
 * Removing someone signs them out on their next request (see
 * hasOrphanedSession).
 */
export async function removeUser(id: number, actingUserId: number) {
  if (id === actingUserId) throw new ApiError('You cannot remove your own login.', 400)
  if ((await deleteUserExceptAdministrator(id)) > 0) return

  const user = await findUserById(id)
  if (!user) throw new ApiError(`User ${id} was not found.`, 404)
  throw new ApiError('The administrator account cannot be removed.', 400)
}

export async function listUsers() {
  return findUsers()
}

export async function getUser(id: number) {
  return findUserById(id)
}
