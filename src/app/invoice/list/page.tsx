import Link from 'next/link'
import { connection } from 'next/server'

import SearchBar from '@/components/form/search-bar'
import { listInvoicePage } from '@/api/services/invoice.service'
import { formatDate, formatMoney } from '@/lib/company'
import { isFiltered, readListSearch } from '@/lib/search'

const PAGE_SIZE = 10

const statusTone: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Sent: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Draft: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export const metadata = {
  title: 'Invoices',
}

export default async function InvoiceListPage(props: PageProps<'/invoice/list'>) {
  // Must reflect the database at request time, not build time.
  await connection()
  const params = await props.searchParams
  const search = readListSearch(params)
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page
  const parsedPage = Number(rawPage)
  const page =
    rawPage && /^\d+$/.test(rawPage) && Number.isSafeInteger(parsedPage) && parsedPage > 0
      ? parsedPage
      : 1
  const results = await listInvoicePage(search, (page - 1) * PAGE_SIZE, PAGE_SIZE + 1)
  const hasNextPage = results.length > PAGE_SIZE
  const invoices = results.slice(0, PAGE_SIZE)
  const filtered = isFiltered(search)
  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams()
    if (search.q) query.set('q', search.q)
    if (search.from) query.set('from', search.from)
    if (search.to) query.set('to', search.to)
    query.set('page', String(targetPage))
    return `/invoice/list?${query.toString()}`
  }

  return (
    <section className="page">
      <div className="page-header">
        <h2 className="page-title">Invoices</h2>
        <div className="flex items-center gap-3">
          <Link href="/invoice/print" className="btn-secondary">
            Print range
          </Link>
          <Link
            href="/invoice"
            className="btn-primary"
          >
            New invoice
          </Link>
        </div>
      </div>

      <SearchBar
        action="/invoice/list"
        search={search}
        textLabel="Invoice number"
        textPlaceholder="e.g. INV-0012"
      />

      {filtered && results.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          Showing {invoices.length} invoice{invoices.length === 1 ? '' : 's'} on this page.
        </p>
      )}

      {invoices.length === 0 ? (
        <p className="empty-state">
          {filtered ? 'No invoices match this search.' : 'No invoices yet.'}
        </p>
      ) : (
        <>
          <ul className="space-y-3 sm:hidden">
            {invoices.map((invoice) => (
              <li key={invoice.inv_id} className="card min-w-0 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words text-sm font-semibold text-slate-900">
                    {invoice.invoicenumber}
                  </h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusTone[invoice.status] ?? statusTone.Draft}`}>
                    {invoice.status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-slate-500">Date</dt>
                  <dd className="min-w-0 text-right text-slate-700">
                    {formatDate(invoice.invoicedate)}
                  </dd>
                  <dt className="text-slate-500">Bill To</dt>
                  <dd className="min-w-0 break-words text-right text-slate-700">
                    {invoice.billto}
                  </dd>
                  <dt className="font-medium text-slate-700">Total</dt>
                  <dd className="text-right font-semibold tabular-nums text-slate-900">
                    {formatMoney(invoice.totalamount)}
                  </dd>
                </dl>
                <div className="mt-3 flex justify-end gap-4 border-t border-slate-100 pt-3">
                  <Link href={`/invoice/${invoice.inv_id}/edit`} className="link">
                    Edit
                  </Link>
                  <Link href={`/invoice/${invoice.inv_id}`} className="link">
                    Print
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="table-card hidden sm:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-semibold">Number</th>
                  <th className="font-semibold">Date</th>
                  <th className="font-semibold">Bill To</th>
                  <th className="font-semibold">Status</th>
                  <th className="text-right font-semibold">Total</th>
                  <th className="text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.inv_id}>
                    <td className="font-medium">{invoice.invoicenumber}</td>
                    <td>{formatDate(invoice.invoicedate)}</td>
                    <td>{invoice.billto}</td>
                    <td>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusTone[invoice.status] ?? statusTone.Draft}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">
                      {formatMoney(invoice.totalamount)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/invoice/${invoice.inv_id}/edit`}
                        className="link"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/invoice/${invoice.inv_id}`}
                        className="ml-3 link"
                      >
                        Print
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(page > 1 || hasNextPage) && (
        <nav
          aria-label="Invoice pages"
          className="mt-6 flex items-center justify-between gap-4"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn-secondary">
              Newer invoices
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-slate-600">Page {page}</span>
          {hasNextPage ? (
            <Link href={pageHref(page + 1)} className="btn-secondary">
              Older invoices
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  )
}
