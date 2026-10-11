import Link from 'next/link'
import { connection } from 'next/server'

import PrintButton from '@/components/invoice/print-button'
import PartyPicker from '@/components/ledger/party-picker'
import { getProductLedger, listProducts } from '@/api/services/product.service'
import { formatDate, formatMoney } from '@/lib/company'
import { readListSearch } from '@/lib/search'

export const metadata = {
  title: 'Product Ledger',
}

export default async function ProductLedgerPage(props: PageProps<'/ledger/product'>) {
  // Must reflect the database at request time, not build time.
  await connection()

  const params = await props.searchParams
  // Only from/to are used; readListSearch also checks them and swaps a reversed range.
  const { from, to } = readListSearch(params)
  const raw = params.p_id
  const param = Array.isArray(raw) ? raw[0] : raw
  const selectedId = param && /^\d+$/.test(param) ? Number(param) : undefined

  // e.g. "01 Apr 2026 to 30 Sept 2026", "From 01 Apr 2026", or '' for all time.
  const day = (value: string) => formatDate(new Date(value))
  const period =
    from !== '' && to !== ''
      ? `${day(from)} to ${day(to)}`
      : from !== ''
        ? `From ${day(from)}`
        : to !== ''
          ? `Up to ${day(to)}`
          : ''

  const [products, result] = await Promise.all([
    listProducts(),
    selectedId === undefined ? null : getProductLedger(selectedId, from, to),
  ])

  return (
    // report-sheet: printed without the browser's date/title header and URL
    // footer, so the heading below is the only one on the paper.
    <section className="report-sheet page max-w-5xl print:max-w-none print:px-0">
      <div className="page-header print:hidden">
        <h2 className="page-title">Product Ledger</h2>
        <div className="flex items-center gap-4">
          <Link href="/product" className="text-sm link">
            All products
          </Link>
          {result && <PrintButton label="Print ledger" />}
        </div>
      </div>

      <div className="print:hidden">
        <PartyPicker
          // Remount when the applied filters change so the uncontrolled boxes
          // show them, e.g. after "Clear dates".
          key={`${selectedId}|${from}|${to}`}
          action="/ledger/product"
          name="p_id"
          label="Product"
          options={products.map((row) => ({ id: row.p_id, name: row.p_name }))}
          selectedId={result ? selectedId : undefined}
        >
          <div>
            <label htmlFor="ledger-from" className="mb-1 block text-xs font-medium text-slate-600">
              From date
            </label>
            <input id="ledger-from" name="from" type="date" defaultValue={from} className="input" />
          </div>
          <div>
            <label htmlFor="ledger-to" className="mb-1 block text-xs font-medium text-slate-600">
              To date
            </label>
            <input id="ledger-to" name="to" type="date" defaultValue={to} className="input" />
          </div>
        </PartyPicker>
        {(from !== '' || to !== '') && selectedId !== undefined && (
          <Link href={`/ledger/product?p_id=${selectedId}`} className="-mt-2 mb-4 inline-block text-sm link">
            Clear dates
          </Link>
        )}
      </div>

      {selectedId === undefined ? (
        <p className="empty-state">
          Choose a product to see which invoices it was billed on.
        </p>
      ) : result === null ? (
        <p className="alert-error">That product was not found.</p>
      ) : (
        <>
          <h1 className="mb-4 hidden text-xl font-bold text-slate-900 print:block">
            Product Ledger — {result.product.p_name}
          </h1>

          {period && <p className="mb-4 text-sm text-slate-600">Period: {period}</p>}

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3">
            {[
              { label: 'Quantity billed', value: String(result.totalQuantity) },
              { label: 'Amount billed', value: formatMoney(result.totalAmountPaise / 100) },
              { label: 'Current stock', value: String(result.product.p_stock ?? '-') },
            ].map((tile) => (
              <div key={tile.label} className="card p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {tile.value}
                </p>
              </div>
            ))}
          </div>

          {result.items.length === 0 ? (
            <p className="empty-state">
              {period
                ? 'This product was not billed on any invoice in these dates.'
                : 'This product has not been billed on any invoice yet.'}
            </p>
          ) : (
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="font-semibold">Date</th>
                    <th className="font-semibold">Invoice</th>
                    <th className="font-semibold">Retailer</th>
                    <th className="text-right font-semibold">Qty</th>
                    <th className="text-right font-semibold">Rate</th>
                    <th className="text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => {
                    const { invoice } = item
                    const cancelled = invoice.status === 'Cancelled'
                    return (
                      <tr key={item.item_id} className={cancelled ? 'text-slate-400' : ''}>
                        <td className="whitespace-nowrap">{formatDate(invoice.invoicedate)}</td>
                        <td className="whitespace-nowrap">
                          <Link
                            href={`/invoice/${invoice.inv_id}`}
                            className={`hover:underline ${cancelled ? 'line-through' : 'text-sky-700 print:text-slate-900'}`}
                          >
                            {invoice.invoicenumber}
                          </Link>
                          {invoice.status !== 'Sent' && invoice.status !== 'Paid' && (
                            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                              {invoice.status}
                            </span>
                          )}
                        </td>
                        <td>
                          {invoice.retailer ? (
                            <Link
                              href={`/ledger/retailer/statement?ret_id=${invoice.retailer.ret_id}`}
                              className="hover:underline"
                            >
                              {invoice.retailer.retailername}
                            </Link>
                          ) : (
                            invoice.billto
                          )}
                        </td>
                        <td className="text-right tabular-nums">{item.quantity}</td>
                        <td className="text-right tabular-nums">{formatMoney(item.unitprice)}</td>
                        <td className="text-right tabular-nums">{formatMoney(item.linetotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={3} className="text-right">
                      Total
                    </td>
                    <td className="text-right tabular-nums">{result.totalQuantity}</td>
                    <td />
                    <td className="text-right tabular-nums">
                      {formatMoney(result.totalAmountPaise / 100)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}
