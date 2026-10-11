'use client'

import React from 'react'
import { useFormStatus } from 'react-dom'

interface ConfirmDeleteButtonProps {
  /** The server action, with the row already bound to it. */
  action: () => Promise<void>
  /** Asked before anything is sent, e.g. 'Delete order ORD-0012?'. */
  confirmMessage: string
  label?: string
  /** Shown greyed out and unclickable, with this as the reason on hover. */
  disabledReason?: string
}

function SubmitButton({ label, disabledReason }: { label: string; disabledReason?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabledReason !== undefined}
      title={disabledReason}
      className="text-sm font-medium text-rose-600 enabled:hover:text-rose-700 enabled:hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
    >
      {pending ? 'Removing...' : label}
    </button>
  )
}

/** A delete link for a list row. Asks first, since a deletion cannot be undone. */
const ConfirmDeleteButton = ({
  action,
  confirmMessage,
  label = 'Delete',
  disabledReason,
}: ConfirmDeleteButtonProps) => (
  <form
    action={action}
    className="inline"
    onSubmit={(event) => {
      if (!window.confirm(`${confirmMessage} This cannot be undone.`)) {
        event.preventDefault()
      }
    }}
  >
    <SubmitButton label={label} disabledReason={disabledReason} />
  </form>
)

export default ConfirmDeleteButton
