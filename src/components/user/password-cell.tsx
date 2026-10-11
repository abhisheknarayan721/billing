'use client'

import React, { useState } from 'react'

/** A list cell showing a password, with Hide for when someone is watching. */
const PasswordCell = ({ password }: { password: string }) => {
  const [visible, setVisible] = useState(true)

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm">{visible ? password : '••••••••'}</span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="text-xs font-medium text-sky-700 hover:text-sky-900"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </span>
  )
}

export default PasswordCell
