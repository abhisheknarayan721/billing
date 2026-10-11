import Form from 'next/form'
import Link from 'next/link'

import { formatBalance } from '@/lib/ledger/statement'

const inputClass =
  'input'

/** The columns Supplier and Retailer share, under one id and name. */
export interface PartyListRow {
  id: number
  name: string
  contactperson: string | null
  phonenumber: string | null
  email: string | null
  city: string | null
  /** What the party owes, in paise; negative is an advance. Shown when given. */
  balancePaise?: number
}

interface PartyListProps {
  /** Singular name, e.g. 'Supplier'. Drives the headings and labels. */
  entity: string
  /** The add page, e.g. '/ledger/supplier'; the list and edit pages hang off it. */
  basePath: string
  rows: PartyListRow[]
  /** The search currently applied. */
  q: string
  /** When set, each row links to its ledger at this path plus the row's id. */
  ledgerPath?: string
}

/**
 * The "view all" page for a ledger party. Searching is a GET form, so the
 * search lives in the URL and can be bookmarked or reloaded; shared by the
 * supplier and retailer lists so the two cannot drift.
 */
const PartyList = ({ entity, basePath, rows, q, ledgerPath }: PartyListProps) => {
  const plural = `${entity}s`
  const listPath = `${basePath}/list`
  const showBalance = rows.some((row) => row.balancePaise !== undefined)

  return (
    <section className="page">
      <div className="page-header">
        <h2 className="page-title">{plural}</h2>
        <Link
          href={basePath}
          className="btn-primary"
        >
          New {entity.toLowerCase()}
        </Link>
      </div>

      <Form
        action={listPath}
        // Remount so the uncontrolled input picks up the applied search, e.g. after "Clear".
        key={q}
        className="filter-bar flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="search-q" className="mb-1 block text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, contact person, phone, email, city or tax number"
            maxLength={100}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary"
          >
            Search
          </button>
          {q !== '' && (
            <Link href={listPath} className="text-sm text-slate-600 hover:underline">
              Clear
            </Link>
          )}
        </div>
      </Form>

      {q !== '' && rows.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {rows.length} {rows.length === 1 ? entity.toLowerCase() : plural.toLowerCase()} found.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="empty-state">
          {q !== ''
            ? `No ${plural.toLowerCase()} match this search.`
            : `No ${plural.toLowerCase()} yet.`}
        </p>
      ) : (
        <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th className="font-semibold">#</th>
              <th className="font-semibold">Name</th>
              <th className="font-semibold">Contact Person</th>
              <th className="font-semibold">Phone</th>
              <th className="font-semibold">Email</th>
              <th className="font-semibold">City</th>
              {showBalance && <th className="text-right font-semibold">Balance</th>}
              <th className="text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="tabular-nums text-slate-500">{index + 1}</td>
                <td className="font-medium">{row.name}</td>
                <td>{row.contactperson ?? '-'}</td>
                <td>{row.phonenumber ?? '-'}</td>
                <td>{row.email ?? '-'}</td>
                <td>{row.city ?? '-'}</td>
                {showBalance && (
                  <td
                    className={`whitespace-nowrap text-right tabular-nums ${
                      (row.balancePaise ?? 0) > 0 ? 'font-medium text-red-700' : 'text-slate-700'
                    }`}
                  >
                    {formatBalance(row.balancePaise ?? 0)}
                  </td>
                )}
                <td className="text-right whitespace-nowrap">
                  {ledgerPath && (
                    <Link
                      href={`${ledgerPath}${row.id}`}
                      className="mr-3 link"
                    >
                      Ledger
                    </Link>
                  )}
                  <Link
                    href={`${basePath}/${row.id}/edit`}
                    className="link"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </section>
  )
}

export default PartyList
