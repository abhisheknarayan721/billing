'use client'

import React, { useState } from 'react'

/**
 * A password input with a Show / Hide toggle; otherwise a plain <input>.
 * Shown by default, so an admin can read and edit it straight away.
 */
const PasswordInput = (props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) => {
  const [visible, setVisible] = useState(true)

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${props.className ?? ''} pr-16`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-sky-700 hover:text-sky-900 disabled:opacity-50"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export default PasswordInput
