import Link from 'next/link'
import { connection } from 'next/server'

import { listPurchases } from '@/api/services/purchase.service'
import { formatDate, formatMoney } from '@/lib/company'

export const metadata = {
  title: 'Purchases',
}

export default async function PurchaseListPage() {
  // Must reflect the database at request time, not build time.
  await connection()
  const purchases = await listPurchases()

  return (
    <section className="page">
      <div className="page-header">
        <h2 className="page-title">Purchases</h2>
        <Link
          href="/purchase"
          className="btn-primary"
        >
          New purchase
        </Link>
      </div>

      {purchases.length === 0 ? (
        <p className="empty-state">No purchases yet.</p>
      ) : (
        <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th className="font-semibold">Date</th>
              <th className="font-semibold">Purchased By</th>
              <th className="font-semibold">Product</th>
              <th className="text-right font-semibold">Qty</th>
              <th className="text-right font-semibold">Unit Price</th>
              <th className="text-right font-semibold">Total</th>
              <th className="font-semibold">Status</th>
              <th className="text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.pur_id}>
                <td>
                  {purchase.invoicedate ? formatDate(purchase.invoicedate) : '-'}
                </td>
                <td>{purchase.purchasedby ?? '-'}</td>
                <td className="font-medium">{purchase.productname ?? '-'}</td>
                <td className="text-right tabular-nums">
                  {purchase.quantity ?? '-'}
                </td>
                <td className="text-right tabular-nums">
                  {purchase.unitprice === null ? '-' : formatMoney(purchase.unitprice)}
                </td>
                <td className="text-right tabular-nums">
                  {purchase.totalamount === null
                    ? '-'
                    : formatMoney(purchase.totalamount)}
                </td>
                <td>
                  <span
                    className={
                      purchase.status === 'Cancelled'
                        ? 'text-slate-400 line-through'
                        : undefined
                    }
                  >
                    {purchase.status ?? '-'}
                  </span>
                </td>
                <td className="text-right">
                  <Link
                    href={`/purchase/${purchase.pur_id}/edit`}
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
