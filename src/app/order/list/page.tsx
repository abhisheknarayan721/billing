import Link from 'next/link'
import { connection } from 'next/server'

import SearchBar from '@/components/form/search-bar'
import ConfirmDeleteButton from '@/components/form/confirm-delete-button'
import { deleteOrder } from '@/app/order/actions'
import { getOrder, listOrders } from '@/api/services/order.service'
import { formatDate, formatMoney } from '@/lib/company'
import { ORDER_STATUS_TONE, ORDER_STATUSES } from '@/lib/order'
import { isFiltered, readListSearch } from '@/lib/search'

export const metadata = {
  title: 'Orders',
}

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

export default async function OrderListPage(props: PageProps<'/order/list'>) {
  // Must reflect the database at request time, not build time.
  await connection()
  const params = await props.searchParams
  const search = readListSearch(params)
  // Anything other than a known status (a hand-edited URL) shows every order.
  const rawStatus = first(params.status)
  const status = (ORDER_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : ''
  // Set by a successful update, which lands back here.
  const updatedRaw = first(params.updated)

  const [orders, updated] = await Promise.all([
    listOrders({ ...search, status }),
    /^\d+$/.test(updatedRaw) ? getOrder(Number(updatedRaw)) : null,
  ])
  const filtered = isFiltered(search) || status !== ''

  /** Keeps the text and date filters when switching status. */
  const statusHref = (value: string) => {
    const query = new URLSearchParams()
    if (search.q) query.set('q', search.q)
    if (search.from) query.set('from', search.from)
    if (search.to) query.set('to', search.to)
    if (value) query.set('status', value)
    const qs = query.toString()
    return qs ? `/order/list?${qs}` : '/order/list'
  }

  return (
    <section className="page">
      <div className="page-header">
        <h2 className="page-title">Orders</h2>
        <Link href="/order" className="btn-primary">
          New order
        </Link>
      </div>

      {updated && (
        <p role="status" className="alert-success mb-6">
          Order {updated.ordernumber} updated — total {updated.totalamount.toFixed(2)}.
        </p>
      )}

      <SearchBar
        action="/order/list"
        search={search}
        textLabel="Order number or retailer"
        textPlaceholder="e.g. ORD-0012 or Sharma Stores"
      />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {['', ...ORDER_STATUSES].map((value) => {
          const active = value === status
          return (
            <Link
              key={value || 'all'}
              href={statusHref(value)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                active
                  ? 'bg-sky-600 text-white ring-sky-600'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {value || 'All'}
            </Link>
          )
        })}
      </nav>

      {filtered && orders.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {orders.length} order{orders.length === 1 ? '' : 's'} found.
        </p>
      )}

      {orders.length === 0 ? (
        <p className="empty-state">
          {filtered ? 'No orders match this search.' : 'No orders yet.'}
        </p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="font-semibold">Number</th>
                <th className="font-semibold">Date</th>
                <th className="font-semibold">Retailer</th>
                <th className="font-semibold">Status</th>
                <th className="text-right font-semibold">Items</th>
                <th className="text-right font-semibold">Total</th>
                <th className="text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.ord_id}>
                  <td className="font-medium">{order.ordernumber}</td>
                  <td>{formatDate(order.orderdate)}</td>
                  <td>{order.retailername}</td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ORDER_STATUS_TONE[order.status] ?? ORDER_STATUS_TONE.Pending}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{order._count.order_item}</td>
                  <td className="text-right tabular-nums">{formatMoney(order.totalamount)}</td>
                  <td className="whitespace-nowrap text-right">
                    <Link href={`/order/${order.ord_id}/edit`} className="link">
                      Edit
                    </Link>
                    <Link href={`/order/${order.ord_id}`} className="ml-3 link">
                      Print
                    </Link>
                    <span className="ml-3">
                      <ConfirmDeleteButton
                        action={deleteOrder.bind(null, order.ord_id)}
                        confirmMessage={`Delete order ${order.ordernumber}?`}
                      />
                    </span>
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
