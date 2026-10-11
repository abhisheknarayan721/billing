// Data access for `app_user`. Only layer that touches Prisma. Passwords are
// plain text (the owner's choice) and admins may view them, so the list and
// the edit page read them; nothing else does.

import { prisma } from '@/lib/prisma'
import { ADMINISTRATOR_USERNAME, type UserValues } from '@/lib/user'

/** What a save returns — the password is not needed there. */
const PUBLIC_FIELDS = {
  user_id: true,
  username: true,
  fullname: true,
  role: true,
  createddate: true,
  updateddate: true,
} as const

export function insertUser(values: UserValues) {
  const now = new Date()
  return prisma.app_user.create({
    data: {
      username: values.username,
      fullname: values.fullname === '' ? null : values.fullname,
      role: values.role,
      password: values.password,
      createddate: now,
      updateddate: now,
    },
    select: PUBLIC_FIELDS,
  })
}

/** A blank password keeps the current one. Returns null for an unknown id. */
export async function updateUser(id: number, values: UserValues) {
  const { count } = await prisma.app_user.updateMany({
    where: { user_id: id },
    data: {
      username: values.username,
      fullname: values.fullname === '' ? null : values.fullname,
      role: values.role,
      ...(values.password !== '' && { password: values.password }),
      updateddate: new Date(),
    },
  })
  return count === 0 ? null : findUserById(id)
}

export function findUsers() {
  return prisma.app_user.findMany({
    orderBy: { username: 'asc' },
    select: { ...PUBLIC_FIELDS, password: true },
  })
}

export function findUserById(id: number) {
  return prisma.app_user.findUnique({
    where: { user_id: id },
    select: { ...PUBLIC_FIELDS, password: true },
  })
}

/**
 * Removes a login unless it is the administrator account, checked in the same
 * statement as the delete. Returns how many were removed: 0 for the
 * administrator or an unknown id.
 */
export async function deleteUserExceptAdministrator(id: number) {
  const { count } = await prisma.app_user.deleteMany({
    where: { user_id: id, username: { not: ADMINISTRATOR_USERNAME } },
  })
  return count
}
