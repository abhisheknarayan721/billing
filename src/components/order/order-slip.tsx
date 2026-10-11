import Image from 'next/image'
import Link from 'next/link'

import PrintButton from '@/components/invoice/print-button'
import { formatAddress } from '@/lib/address'
import { COMPANY, formatDate, formatMoney } from '@/lib/company'
import { ORDER_STATUS_TONE } from '@/lib/order'
import type { retailer, retailer_order, retailer_order_item } from '@/generated/prisma/client'

interface OrderSlipProps {
  order: retailer_order & { order_item: retailer_order_item[]; retailer: retailer | null }
}

/**
 * A printable copy of an order, laid out like the invoice bill. No tax lines:
 * an order is priced before GST, which is charged on the invoice.
 */
const OrderSlip = ({ order }: OrderSlipProps) => {
  const items = order.order_item
  const address = order.retailer ? formatAddress(order.retailer) || null : null
  const contact = [
    order.retailer?.contactperson,
    order.retailer?.phonenumber && `Phone: ${order.retailer.phonenumber}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mx-auto w-full max-w-3xl print:max-w-none print:px-0 print:py-0">
      {/* Screen-only toolbar; the status is for information and is not printed. */}
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/order/list" className="text-sm link">
            &larr; All orders
          </Link>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ORDER_STATUS_TONE[order.status] ?? ORDER_STATUS_TONE.Pending}`}
          >
            {order.status}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/order/${order.ord_id}/edit`} className="text-sm link">
            Edit
          </Link>
          <PrintButton label="Print order" />
        </div>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm [print-color-adjust:exact] print:flex print:min-h-screen print:flex-col print:rounded-none print:border-0 print:shadow-none">
        <div className="flex grow flex-col p-5 sm:p-8 print:px-0 print:pb-0 print:pt-4">
          <div className="mb-4 flex items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-wider text-sky-700">ORDER</h1>
              <div aria-hidden="true" className="mt-1 h-1 w-12 rounded-full bg-indigo-500" />
            </div>
            <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 rounded-xl bg-sky-50 px-3 py-2 text-xs ring-1 ring-sky-100">
              <dt className="text-slate-500">Order No</dt>
              <dd className="text-right font-semibold text-slate-900">{order.ordernumber}</dd>
              <dt className="text-slate-500">Date</dt>
              <dd className="text-right font-semibold text-slate-900">{formatDate(order.orderdate)}</dd>
            </dl>
          </div>

          <header className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Image src={COMPANY.logo} alt="" width={48} height={48} className="h-12 w-12 shrink-0" />
              <div className="text-xs leading-4 text-slate-600">
                <p className="text-sm font-semibold text-slate-900">{COMPANY.name}</p>
                {COMPANY.addressLines.slice(0, -2).map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>{COMPANY.addressLines.slice(-2).join(', ')}</p>
                <p>{COMPANY.email}</p>
                <p>{COMPANY.phone}</p>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 border-l-4 border-l-sky-600 bg-white p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Ordered By
              </h2>
              <p className="mt-0.5 text-sm font-semibold">{order.retailername}</p>
              {address && (
                <p className="mt-0.5 whitespace-pre-line text-xs leading-4 text-slate-600">{address}</p>
              )}
              {contact && <p className="text-xs leading-4 text-slate-600">{contact}</p>}
            </section>
          </header>

          <div className="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible">
            <table className="w-full border-collapse text-xs">
              <thead className="print:table-header-group">
                <tr className="bg-sky-700 text-left text-xs uppercase tracking-wide text-white">
                  <th className="w-px py-2.5 pl-4 pr-2 font-semibold print:py-2">#</th>
                  <th className="w-full py-2.5 pl-2 pr-4 font-semibold print:py-2">Product</th>
                  <th className="w-px whitespace-nowrap px-2 py-2.5 text-right font-semibold print:py-2">Qty</th>
                  <th className="w-px whitespace-nowrap px-2 py-2.5 text-right font-semibold print:py-2">Unit Price</th>
                  <th className="w-px whitespace-nowrap py-2.5 pl-2 pr-4 text-right font-semibold print:py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.item_id}
                    className="border-t border-slate-100 even:bg-slate-50 print:break-inside-avoid"
                  >
                    <td className="py-2.5 pl-4 pr-2 align-top text-slate-500 print:py-1.5">{index + 1}</td>
                    <td className="py-2.5 pl-2 pr-4 align-top font-medium wrap-anywhere print:py-1.5">
                      {item.productname}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right align-top tabular-nums print:py-1.5">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right align-top tabular-nums print:py-1.5">
                      {formatMoney(item.unitprice)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pl-2 pr-4 text-right align-top font-semibold tabular-nums print:py-1.5">
                      {formatMoney(item.linetotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Print-only: pushes the total and footer to the foot of the page. */}
          <div aria-hidden="true" className="hidden print:block print:grow" />

          <div className="print:break-inside-avoid">
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
              {order.notes ? (
                <div className="max-w-sm text-xs text-slate-600">
                  <p className="font-semibold uppercase tracking-wider text-sky-700">Notes</p>
                  <p className="mt-0.5 whitespace-pre-line">{order.notes}</p>
                </div>
              ) : (
                <span />
              )}
              <dl className="w-full max-w-xs space-y-1 text-xs sm:ml-auto">
                <div className="flex justify-between px-3">
                  <dt className="text-slate-600">Total no. of products</dt>
                  <dd className="tabular-nums">{items.length}</dd>
                </div>
                <div className="mt-1.5 flex items-center justify-between border-y border-slate-300 px-3 py-2 text-sm font-bold text-slate-900">
                  <dt>Total Amount</dt>
                  <dd className="tabular-nums">{formatMoney(order.totalamount)}</dd>
                </div>
              </dl>
            </div>

            <footer className="mt-4 border-t border-slate-200 pt-2 text-xs text-slate-500">
              <p>Order copy — prices before GST. This is not a tax invoice.</p>
            </footer>
          </div>
        </div>
      </article>
    </div>
  )
}

export default OrderSlip
