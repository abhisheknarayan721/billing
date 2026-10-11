// Form state for the login page, shared by the server action and the form.
// It lives outside actions.ts because a 'use server' file may export only
// async functions.

export interface LoginFormState {
  message: string
  username: string
}

export const EMPTY_LOGIN_STATE: LoginFormState = { message: '', username: '' }
