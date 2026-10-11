'use server'

import { revalidatePath } from 'next/cache'

import { ApiError, ValidationError } from '@/api/lib/http'
import { createUser as createUserRecord, editUser, removeUser } from '@/api/services/user.service'
import { requireAdmin } from '@/lib/auth/session'
import {
  EMPTY_USER_STATE,
  type UserFormState,
  type UserValues,
  readUserForm,
} from '@/lib/user'

function toErrorState(error: unknown, values: UserValues, fallback: string, tag: string): UserFormState {
  if (error instanceof ValidationError) {
    return { status: 'error', errors: error.errors, values, message: error.message }
  }
  console.error(tag, error)
  return { status: 'error', errors: {}, values, message: fallback }
}

function revalidateUsers() {
  revalidatePath('/user')
  revalidatePath('/user/list')
  revalidatePath('/user/[user_id]/edit', 'page')
  // The signed-in admin's own name shows in the sidebar.
  revalidatePath('/', 'layout')
}

export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin()

  const values = readUserForm(formData)

  try {
    const record = await createUserRecord(values)
    revalidateUsers()
    return {
      ...EMPTY_USER_STATE,
      status: 'success',
      message: `Created ${record.role} login "${record.username}".`,
    }
  } catch (error) {
    return toErrorState(error, values, 'Could not create the user. Please try again.', '[createUser]')
  }
}

/** `user_id` is bound on the server by the edit page, never read from the form. */
export async function updateUser(
  userId: number,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const admin = await requireAdmin()

  const values = readUserForm(formData)

  try {
    const record = await editUser(userId, values, admin.userId)
    revalidateUsers()
    return {
      ...EMPTY_USER_STATE,
      status: 'success',
      message: `User "${record.username}" updated.`,
      // Shows what was saved while the page re-renders.
      values,
    }
  } catch (error) {
    return toErrorState(error, values, 'Could not update the user. Please try again.', '[updateUser]')
  }
}

/**
 * `user_id` is bound on the server by the list page. The list offers no Remove
 * button for the administrator or yourself; the service refuses them anyway. A login already gone
 * (removed in another tab) counts as done.
 */
export async function deleteUser(userId: number) {
  const admin = await requireAdmin()

  try {
    await removeUser(userId, admin.userId)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
  revalidateUsers()
}
