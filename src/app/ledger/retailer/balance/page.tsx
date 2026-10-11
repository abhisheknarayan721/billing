import Form from 'next/form'
import Link from 'next/link'
import { connection } from 'next/server'

import PrintButton from '@/components/invoice/print-button'
import { listRetailersWithBalance } from '@/api/services/retailer.service'
import { COMPANY, formatDateTime, formatMoney } from '@/lib/company'
import { readPartySearch } from '@/lib/ledger/party-search'
import { formatBalance } from '@/lib/ledger/statement'

export const metadata = {
  title: 'Retailer Balances',
}

const filters = [
  { value: 'due', label: 'Balance due' },
  { value: 'advance', label: 'Advance' },
  { value: 'settled', label: 'Settled' },
  { value: 'all', label: 'All' },
] as const

type Filter = (typeof filters)[number]['value']

function readFilter(params: Record<string, string | string[] | undefined>): Filter {
  const raw = Array.isArray(params.show) ? params.show[0] : params.show
  return filters.find((filter) => filter.value === raw)?.value ?? 'due'
}

const rupees = (paise: number) => formatMoney(paise / 100)

export default async function RetailerBalancePage(props: PageProps<'/ledger/retailer/balance'>) {
  // Must reflect the database at request time, not build time.
  await connection()
  const params = await props.searchParams
  const q = readPartySearch(params)
  const show = readFilter(params)

  const all = await listRetailersWithBalance(q)

  // The tiles cover every retailer the search matched, whichever tab is open.
  const duePaise = all.reduce((sum, row) => sum + Math.max(row.balancePaise, 0), 0)
  const advancePaise = all.reduce((sum, row) => sum + Math.max(-row.balancePaise, 0), 0)
  const dueCount = all.filter((row) => row.balancePaise > 0).length

  const rows = all
    .filter((row) =>
      show === 'due'
        ? row.balancePaise > 0
        : show === 'advance'
          ? row.balancePaise < 0
          : show === 'settled'
            ? row.balancePaise === 0
            : true,
    )
    // Largest amount owed first; advances sink to the bottom.
    .sort((a, b) => b.balancePaise - a.balancePaise)

  const totals = rows.reduce(
    (sum, row) => ({
      invoiced: sum.invoiced + row.invoicedPaise,
      paid: sum.paid + row.paidPaise,
      balance: sum.balance + row.balancePaise,
    }),
    { invoiced: 0, paid: 0, balance: 0 },
  )

  const tabHref = (value: Filter) => {
    const search = new URLSearchParams({ show: value })
    if (q) search.set('q', q)
    return `/ledger/retailer/balance?${search}`
  }

  const tiles = [
    { label: 'Total outstanding', value: rupees(duePaise), note: `${dueCount} retailer${dueCount === 1 ? '' : 's'} owe money`, tone: 'text-red-700' },
    { label: 'Advances held', value: rupees(advancePaise), note: 'Paid ahead of invoices', tone: 'text-emerald-700' },
    { label: 'Net receivable', value: rupees(duePaise - advancePaise), note: `Across ${all.length} retailer${all.length === 1 ? '' : 's'}`, tone: 'text-slate-900' },
  ]

  return (
    <section className="page print:max-w-none">
      <div className="page-header print:hidden">
        <div>
          <h2 className="page-title">Retailer Balances</h2>
          <p className="mt-1 text-sm text-slate-500">What each retailer owes, largest first.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/ledger/retailer/list" className="btn-secondary">
            All retailers
          </Link>
          {rows.length > 0 && <PrintButton label="Print" />}
        </div>
      </div>

      {/* Paper-only heading. */}
      <header className="mb-6 hidden border-b border-slate-200 pb-4 print:block">
        <p className="text-base font-semibold text-slate-900">{COMPANY.name}</p>
        <h1 className="text-xl font-bold text-slate-900">
          Retailer Balances — {filters.find((filter) => filter.value === show)?.label}
        </h1>
        <p className="text-xs text-slate-600">
          As of {formatDateTime(new Date())}
          {q && ` · Search: “${q}”`}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 print:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tile.label}</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${tile.tone}`}>{tile.value}</p>
            <p className="mt-1 text-xs text-slate-500">{tile.note}</p>
          </div>
        ))}
      </div>

      <div className="filter-bar flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <nav aria-label="Filter by balance" className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={tabHref(filter.value)}
              aria-current={filter.value === show ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter.value === show
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </nav>

        {/* GET form, so the search and tab live in the URL and survive a reload. */}
        <Form action="/ledger/retailer/balance" key={q} className="flex w-full gap-2 lg:max-w-md">
          <input type="hidden" name="show" value={show} />
          <label htmlFor="search-q" className="sr-only">
            Search retailers
          </label>
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, phone, city…"
            maxLength={100}
            className="input"
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
          {q !== '' && (
            <Link href={`/ledger/retailer/balance?show=${show}`} className="btn-secondary">
              Clear
            </Link>
          )}
        </Form>
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">
          {q !== ''
            ? 'No retailers match this search.'
            : show === 'due'
              ? 'No retailer owes anything right now. 🎉'
              : 'No retailers in this list.'}
        </p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Phone</th>
                <th>City</th>
                <th className="text-right">Invoiced</th>
                <th className="text-right">Received</th>
                <th className="text-right">Balance</th>
                <th className="text-right print:hidden">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ret_id}>
                  <td>
                    <span className="block font-medium text-slate-900">{row.retailername}</span>
                    {row.contactperson && (
                      <span className="block text-xs text-slate-500">{row.contactperson}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{row.phonenumber ?? '-'}</td>
                  <td>{row.city ?? '-'}</td>
                  <td className="text-right tabular-nums">{rupees(row.invoicedPaise)}</td>
                  <td className="text-right tabular-nums">{rupees(row.paidPaise)}</td>
                  <td className="text-right">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums print:bg-transparent print:p-0 ${
                        row.balancePaise > 0
                          ? 'bg-red-50 text-red-700'
                          : row.balancePaise < 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {formatBalance(row.balancePaise)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right print:hidden">
                    <Link href={`/ledger/retailer/statement?ret_id=${row.ret_id}`} className="link">
                      Ledger
                    </Link>
                    <Link href={`/payment`} className="link ml-3">
                      Add payment
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={3}>
                  Total · {rows.length} retailer{rows.length === 1 ? '' : 's'}
                </td>
                <td className="text-right tabular-nums">{rupees(totals.invoiced)}</td>
                <td className="text-right tabular-nums">{rupees(totals.paid)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">
                  {formatBalance(totals.balance)}
                </td>
                <td className="print:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
