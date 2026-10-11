import Link from 'next/link'
import { connection } from 'next/server'

import SearchBar from '@/components/form/search-bar'
import { listPayments } from '@/api/services/payment.service'
import { formatDateTime, formatMoney } from '@/lib/company'
import { isFiltered, readListSearch } from '@/lib/search'

export const metadata = {
  title: 'Payments',
}

export default async function PaymentListPage(props: PageProps<'/payment/list'>) {
  // Must reflect the database at request time, not build time.
  await connection()
  const search = readListSearch(await props.searchParams)
  const payments = await listPayments(search)
  const filtered = isFiltered(search)

  // Summed in paise so adding many DECIMAL(18,2) amounts cannot drift.
  const totalPaise = payments.reduce(
    (sum, payment) =>
      sum + (payment.pay_amt === null ? 0 : Math.round(Number(payment.pay_amt.toFixed(2)) * 100)),
    0,
  )

  return (
    <section className="page">
      <div className="page-header">
        <h2 className="page-title">Payments</h2>
        <Link
          href="/payment"
          className="btn-primary"
        >
          New payment
        </Link>
      </div>

      <SearchBar
        action="/payment/list"
        search={search}
        textLabel="Supplier / retailer or method"
        textPlaceholder="e.g. Acme or UPI"
      />

      {filtered && payments.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {payments.length} payment{payments.length === 1 ? '' : 's'} found.
        </p>
      )}

      {payments.length === 0 ? (
        <p className="empty-state">
          {filtered ? 'No payments match this search.' : 'No payments yet.'}
        </p>
      ) : (
        <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th className="font-semibold">#</th>
              <th className="font-semibold">Date</th>
              <th className="font-semibold">Supplier / Retailer</th>
              <th className="font-semibold">Method</th>
              <th className="text-right font-semibold">Amount</th>
              <th className="text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <tr key={payment.pay_id}>
                <td className="tabular-nums text-slate-500">{index + 1}</td>
                <td>
                  {payment.createddate ? formatDateTime(payment.createddate) : '-'}
                </td>
                <td className="font-medium">{payment.pay_name}</td>
                <td>{payment.pay_method ?? '-'}</td>
                <td className="text-right tabular-nums">
                  {payment.pay_amt === null ? '-' : formatMoney(payment.pay_amt)}
                </td>
                <td className="text-right">
                  <Link
                    href={`/payment/${payment.pay_id}/edit`}
                    className="link"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={4} className="text-right">
                Total
              </td>
              <td className="text-right tabular-nums">
                {formatMoney(totalPaise / 100)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        </div>
      )}
    </section>
  )
}
