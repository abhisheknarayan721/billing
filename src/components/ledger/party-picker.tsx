'use client'

import Form from 'next/form'

interface PartyPickerProps {
  /** The page the choice opens, e.g. '/ledger/retailer/statement'. */
  action: string
  /** Query parameter the chosen id travels in. */
  name: string
  label: string
  options: { id: number; name: string }[]
  selectedId?: number
  /** Extra fields submitted with the choice, e.g. a date range. */
  children?: React.ReactNode
}

/**
 * A GET form, so the chosen party is in the URL and the statement can be
 * bookmarked or reloaded. Choosing submits straight away; the button is there
 * for when JavaScript is not.
 */
const PartyPicker = ({
  action,
  name,
  label,
  options,
  selectedId,
  children,
}: PartyPickerProps) => {
  return (
    <Form
      action={action}
      className="filter-bar flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="party-picker" className="mb-1 block text-xs font-medium text-slate-600">
          {label}
        </label>
        <select
          id="party-picker"
          name={name}
          defaultValue={selectedId === undefined ? '' : String(selectedId)}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="input"
        >
          <option value="">- select -</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      {children}
      <button
        type="submit"
        className="btn-primary"
      >
        Show
      </button>
    </Form>
  )
}

export default PartyPicker
