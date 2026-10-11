import Image from 'next/image'
import Link from 'next/link'

import PrintButton from '@/components/invoice/print-button'
import { formatAddress } from '@/lib/address'
import { COMPANY, formatDate, formatMoney } from '@/lib/company'
import type { invoice, invoice_item, retailer } from '@/generated/prisma/client'

const statusTone: Record<string, string> = {
  Paid: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  Sent: 'border-sky-500 bg-sky-50 text-sky-700',
  Draft: 'border-slate-400 bg-slate-50 text-slate-600',
  Cancelled: 'border-rose-500 bg-rose-50 text-rose-700',
}

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${
      statusTone[status] ?? statusTone.Draft
    }`}
  >
    {status}
  </span>
)

interface BillProps {
  invoice: invoice & { invoice_item: invoice_item[]; retailer?: retailer | null }
  /** The back / edit / print bar. Off when several bills share one page. */
  toolbar?: boolean
}

const Bill = ({ invoice, toolbar = true }: BillProps) => {
  const items = invoice.invoice_item

  // Prefer the address snapshotted when the invoice was raised. Invoices
  // created before that column existed fall back to the linked customer.
  const billToAddress =
    invoice.billtoaddress ??
    (invoice.retailer ? formatAddress(invoice.retailer) || null : null)

  // Contact person and phone come from the linked retailer's current record.
  const contact = [
    invoice.retailer?.contactperson,
    invoice.retailer?.phonenumber && `Phone: ${invoice.retailer.phonenumber}`,
  ]
    .filter(Boolean)
    .join(' · ')

  // Invoices saved before CGST/SGST existed (or given a flat tax through the
  // API) have only a combined amount, so they keep a single Tax line with the
  // rate worked back out of the subtotal. A zero subtotal has no rate to recover.
  const splitTax = !invoice.cgstamount.isZero() || !invoice.sgstamount.isZero()
  const taxRate = invoice.subtotal.isZero()
    ? null
    : invoice.taxamount.div(invoice.subtotal).mul(100).toDecimalPlaces(2).toString()

  // Such an invoice was never taxed line by line. Its lines' rates were worked
  // back out of the combined amount when the columns were added, so a flat ₹5
  // would print as an odd "0.32%" that nobody charged; the columns show "-".
  const lineRates = splitTax || invoice.taxamount.isZero()

  // Each line carries its own rates, so the totals can only quote a rate when
  // every line shares it; with mixed rates the label is just "CGST" / "SGST".
  const rateLabel = (key: 'cgstrate' | 'sgstrate') => {
    const rates = new Set(items.map((item) => item[key].toString()))
    return rates.size === 1 ? ` (${[...rates][0]}%)` : ''
  }

  // Round-off is not stored; it is whatever rounding the total to the rupee
  // added or took away. Invoices saved before rounding existed come out as zero.
  const roundOff = invoice.totalamount.sub(invoice.subtotal.add(invoice.taxamount))

  return (
    <div className="mx-auto w-full max-w-3xl print:max-w-none print:px-0 print:py-0">
      {/* Screen-only toolbar — print:hidden keeps it off the paper. The status
          lives here, for information only; the bill itself never shows it. */}
      {toolbar ? (
        <div className="page-header print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/invoice/list" className="text-sm link">
              &larr; All invoices
            </Link>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/invoice/${invoice.inv_id}/edit`}
              className="text-sm link"
            >
              Edit
            </Link>
            <PrintButton />
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600 print:hidden">
          <span className="font-medium text-slate-900">{invoice.invoicenumber}</span>
          <StatusBadge status={invoice.status} />
        </div>
      )}

      {/*
        On paper the sheet becomes a full-page flex column: a growing spacer
        below the items pushes the totals and footer down to the bottom of the
        page, instead of leaving them floating under a short item list.
      */}
      {/* print-color-adjust keeps the accent fills on paper; browsers drop
          background colours when printing unless told otherwise. */}
      <article className="bill-sheet rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm [print-color-adjust:exact] print:flex print:min-h-screen print:flex-col print:rounded-none print:border-0 print:shadow-none">
        <div className="flex grow flex-col p-5 sm:p-8 print:px-0 print:pb-0 print:pt-4">
          {/* Title on the left, the invoice's number and date on the right. */}
          <div className="mb-4 flex items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-wider text-sky-700">INVOICE</h1>
              <div aria-hidden="true" className="mt-1 h-1 w-12 rounded-full bg-indigo-500" />
            </div>
            <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 rounded-xl bg-sky-50 px-3 py-2 text-xs ring-1 ring-sky-100">
              <dt className="text-slate-500">Invoice No</dt>
              <dd className="text-right font-semibold text-slate-900">{invoice.invoicenumber}</dd>
              <dt className="text-slate-500">Date</dt>
              <dd className="text-right font-semibold text-slate-900">
                {formatDate(invoice.invoicedate)}
              </dd>
            </dl>
          </div>

          {/* The seller on the left, the customer on the right. Stacks only on a
              narrow screen; paper is always wide enough for both. */}
          <header className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Image
                src={COMPANY.logo}
                alt=""
                width={48}
                height={48}
                className="h-12 w-9 shrink-0"
              />
              <div className="text-xs leading-4 text-slate-600">
                <p className="text-sm font-semibold text-slate-900">{COMPANY.name}</p>
                {/* Country shares the city/zip line to keep the header compact. */}
                {COMPANY.addressLines.slice(0, -2).map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>{COMPANY.addressLines.slice(-2).join(', ')}</p>
                {/* <p>{COMPANY.email}</p> */}
                <p>{COMPANY.phone}</p>
                {/* <p>Tax No: {COMPANY.taxNumber}</p> */}
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 border-l-4 border-l-sky-600 bg-white p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Bill To
              </h2>
              <p className="mt-0.5 text-sm font-semibold">{invoice.billto}</p>
              {billToAddress && (
                <p className="mt-0.5 whitespace-pre-line text-xs leading-4 text-slate-600">
                  {billToAddress}
                </p>
              )}
              {contact && <p className="text-xs leading-4 text-slate-600">{contact}</p>}
              {/* Like the contact line, read from the linked retailer's current record. */}
              {invoice.retailer?.taxnumber && (
                <p className="mt-1 text-xs leading-4 text-slate-600">
                  Tax No:{' '}
                  <span className="font-medium text-slate-900">{invoice.retailer.taxnumber}</span>
                </p>
              )}
            </section>
          </header>

          {/* A minimum height on screen keeps short bills from looking cramped;
              on paper the spacer below does that job instead.

              Too many items for one page simply carry on onto the next: the
              browser repeats the <thead> at the top of every page, and no row
              is split across two. */}
          <div className="min-h-90 print:min-h-0">
            <div className="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible">
              <table className="w-full border-collapse text-xs">
                <thead className="print:table-header-group">
                  <tr className="bg-sky-700 text-left text-xs uppercase tracking-wide text-white">
                    <th className="w-px pl-4 pr-2 py-2.5 print:py-2 font-semibold">#</th>
                    <th className="w-full pl-2 pr-4 py-2.5 print:py-2 font-semibold">Product</th>
                    <th className="w-px whitespace-nowrap px-2 py-2.5 print:py-2 text-right font-semibold">MRP</th>
                    <th className="w-px whitespace-nowrap px-2 py-2.5 print:py-2 text-right font-semibold">Qty</th>
                    <th className="w-px whitespace-nowrap px-2 py-2.5 print:py-2 text-right font-semibold">Unit Price</th>
                    <th className="w-px whitespace-nowrap px-2 py-2.5 print:py-2 text-right font-semibold">CGST %</th>
                    <th className="w-px whitespace-nowrap px-2 py-2.5 print:py-2 text-right font-semibold">SGST %</th>
                    <th className="w-px whitespace-nowrap pl-2 pr-4 py-2.5 print:py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.item_id}
                      className="border-t border-slate-100 even:bg-slate-50 print:break-inside-avoid"
                    >
                      <td className="pl-4 pr-2 py-2.5 print:py-1.5 align-top text-slate-500">{index + 1}</td>
                      {/* Wraps onto as many lines as it needs. wrap-anywhere (overflow-wrap: anywhere)
                          also splits a single word too long for the column, which
                          would otherwise push the figures off the edge. */}
                      <td className="pl-2 pr-4 py-2.5 print:py-1.5 align-top font-medium wrap-anywhere">
                        {item.productname}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 print:py-1.5 text-right align-top tabular-nums text-slate-600">
                        {item.mrp === null ? '-' : formatMoney(item.mrp)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 print:py-1.5 text-right align-top tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 print:py-1.5 text-right align-top tabular-nums">
                        {formatMoney(item.unitprice)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 print:py-1.5 text-right align-top tabular-nums">
                        {lineRates ? item.cgstrate.toFixed(2) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 print:py-1.5 text-right align-top tabular-nums">
                        {lineRates ? item.sgstrate.toFixed(2) : '-'}
                      </td>
                      <td className="whitespace-nowrap pl-2 pr-4 py-2.5 print:py-1.5 text-right align-top font-semibold tabular-nums">
                        {formatMoney(item.linetotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Print-only: absorbs the leftover height so what follows sits at the foot of the page. */}
          <div aria-hidden="true" className="hidden print:block print:grow" />

          {/* Totals and footer move as one block: if they do not fit under the
              last items, both go to the next page rather than splitting. */}
          <div className="print:break-inside-avoid">
            <div className="mt-4 flex items-end justify-between gap-2 sm:gap-4">
              <figure className="flex shrink-0 flex-col items-center gap-1">
                <Image
                  src="/images/qr-code.jpg"
                  alt="Payment QR code"
                  width={112}
                  height={112}
                  className="h-20 w-20 object-contain sm:h-28 sm:w-28"
                />
                <figcaption className="text-center text-[10px] text-slate-500">
                  Scan to pay
                </figcaption>
              </figure>
              <dl className="w-full min-w-0 max-w-xs space-y-1 text-xs">
                <div className="flex justify-between px-3">
                  <dt className="text-slate-600">Subtotal</dt>
                  <dd className="tabular-nums">{formatMoney(invoice.subtotal)}</dd>
                </div>
                {splitTax ? (
                  <>
                    <div className="flex justify-between px-3">
                      <dt className="text-slate-600">CGST{rateLabel('cgstrate')}</dt>
                      <dd className="tabular-nums">{formatMoney(invoice.cgstamount)}</dd>
                    </div>
                    <div className="flex justify-between px-3">
                      <dt className="text-slate-600">SGST{rateLabel('sgstrate')}</dt>
                      <dd className="tabular-nums">{formatMoney(invoice.sgstamount)}</dd>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between px-3">
                    <dt className="text-slate-600">Tax{taxRate === null ? '' : ` (${taxRate}%)`}</dt>
                    <dd className="tabular-nums">{formatMoney(invoice.taxamount)}</dd>
                  </div>
                )}
                <div className="flex justify-between px-3">
                  <dt className="text-slate-600">Round Off</dt>
                  <dd className="tabular-nums">
                    {roundOff.isPositive() && !roundOff.isZero() ? '+' : ''}
                    {formatMoney(roundOff)}
                  </dd>
                </div>
                <div className="mt-1.5 flex items-center justify-between border-y border-slate-300 px-3 py-2 text-sm font-bold text-slate-900">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMoney(invoice.totalamount)}</dd>
                </div>
              </dl>
            </div>

            <footer className="mt-4 flex flex-col gap-1 border-t border-slate-200 pt-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between print:flex-row print:items-center print:justify-between">
              <p className="font-semibold text-sky-700">Thank you for your business!</p>
              <p>This is a computer-generated invoice and does not require a signature.</p>
            </footer>
          </div>
        </div>
      </article>
    </div>
  )
}

export default Bill
