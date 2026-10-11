import Link from 'next/link'
import { connection } from 'next/server'

import SearchBar from '@/components/form/search-bar'
import { listInvoices } from '@/api/services/invoice.service'
import { formatDate, formatMoney } from '@/lib/company'
import { isFiltered, readListSearch } from '@/lib/search'

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
  const search = readListSearch(await props.searchParams)
  const invoices = await listInvoices(search)
  const filtered = isFiltered(search)

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

      {filtered && invoices.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {invoices.length} invoice{invoices.length === 1 ? '' : 's'} found.
        </p>
      )}

      {invoices.length === 0 ? (
        <p className="empty-state">
          {filtered ? 'No invoices match this search.' : 'No invoices yet.'}
        </p>
      ) : (
        <div className="table-card">
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
      )}
    </section>
  )
}
