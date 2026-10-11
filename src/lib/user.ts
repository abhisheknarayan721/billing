// Field contract for the `app_user` table, as admins manage it on /user.
//
//   username  VARCHAR(100) NOT NULL UNIQUE
//   fullname  VARCHAR(250)
//   role      'admin' | 'user'           -> see src/lib/auth/roles.ts
//   password  VARCHAR(255) NOT NULL      -> plain text, by the owner's choice
//
// A password is required for a new login. The edit page opens with the current
// one filled in and visible (Hide masks it); clearing it keeps the current.

import {
  EMPTY_FORM_STATE,
  type FieldSpec,
  type FormState,
  type FormValues,
  readForm,
  validateFields,
} from '@/lib/form/field'
import { ROLES } from '@/lib/auth/roles'

export const PASSWORD_MIN_LENGTH = 8

/**
 * The administrator account. It can never be removed, renamed or demoted, so
 * there is always one login that can manage everything. Its password can still
 * be changed.
 */
export const ADMINISTRATOR_USERNAME = 'admin'

const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  admin: 'Admin — everything',
  user: 'User — orders only',
}

export function userFields(mode: 'create' | 'edit'): FieldSpec[] {
  return [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      maxLength: 100,
      required: true,
      autoComplete: 'off',
    },
    { name: 'fullname', label: 'Full Name', type: 'text', maxLength: 250 },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
      required: true,
      defaultValue: 'user',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      maxLength: 255,
      required: mode === 'create',
      autoComplete: 'new-password',
    },
  ]
}

export type UserValues = FormValues
export type UserFormState = FormState
export const EMPTY_USER_STATE = EMPTY_FORM_STATE

export function readUserForm(formData: FormData): UserValues {
  return {
    ...readForm(formData, userFields('create')),
    // Not trimmed: spaces are allowed in a password.
    password: String(formData.get('password') ?? ''),
  }
}

export function validateUser(values: UserValues, mode: 'create' | 'edit') {
  const errors = validateFields(values, userFields(mode))

  if (!errors.username && /\s/.test(values.username)) {
    errors.username = 'Username cannot contain spaces.'
  }
  if (!errors.password && values.password !== '' && values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }

  return errors
}
