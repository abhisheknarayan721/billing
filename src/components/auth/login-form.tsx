'use client'

import { useActionState } from 'react'

import { login } from '@/app/login/actions'
import { EMPTY_LOGIN_STATE } from '@/lib/auth/login'

const inputClass =
  'input'

interface LoginFormProps {
  /** Where to go after signing in, carried through from ?next=. */
  next: string
}

const LoginForm = ({ next }: LoginFormProps) => {
  const [state, action, pending] = useActionState(login, EMPTY_LOGIN_STATE)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          defaultValue={state.username}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      {state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full py-2.5"
      >
        {pending ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  )
}

export default LoginForm
